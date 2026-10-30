import { isValidInboxToken, parseInboxInput } from '../../../shared/inbox'
import type { D1Database, PagesFunction } from '../../types'

interface Env {
  INBOX: D1Database
}

interface InboxRow {
  id: string
  amount: number
  note: string | null
  received_at: string
}

const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  })
}

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// 使われなくなった受け箱の分も残さないよう、トークンを問わず14日より古い行を消す
async function deleteExpired(database: D1Database): Promise<void> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  await database
    .prepare('DELETE FROM inbox_items WHERE received_at < ?')
    .bind(cutoff)
    .run()
}

async function post(request: Request, database: D1Database, hash: string) {
  const body = await request.text()
  const input = parseInboxInput(
    request.url,
    request.headers.get('Content-Type'),
    body,
  )
  if (!input.ok) return json({ error: input.error }, input.status)

  const count = await database
    .prepare('SELECT COUNT(*) AS count FROM inbox_items WHERE token_hash = ?')
    .bind(hash)
    .first<{ count: number }>()
  if (Number(count?.count ?? 0) >= 100) return json({ error: 'limit' }, 429)

  await database
    .prepare(
      'INSERT INTO inbox_items (id, token_hash, amount, note, received_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(
      crypto.randomUUID(),
      hash,
      input.value.amount,
      input.value.note ?? null,
      new Date().toISOString(),
    )
    .run()

  return json({ ok: true }, 201)
}

async function get(database: D1Database, hash: string) {
  const result = await database
    .prepare(
      'SELECT id, amount, note, received_at FROM inbox_items WHERE token_hash = ? ORDER BY received_at ASC',
    )
    .bind(hash)
    .all<InboxRow>()

  return json({
    items: (result.results ?? []).map((item) => ({
      id: item.id,
      amount: item.amount,
      note: item.note,
      receivedAt: item.received_at,
    })),
  })
}

async function remove(request: Request, database: D1Database, hash: string) {
  const body = await request.text()
  let input: unknown = {}
  if (body) {
    try {
      input = JSON.parse(body)
    } catch {
      return json({ error: 'body' }, 400)
    }
  }

  if (typeof input !== 'object' || input === null) {
    return json({ error: 'body' }, 400)
  }

  const ids = (input as { ids?: unknown }).ids
  if (ids === undefined) {
    await database
      .prepare('DELETE FROM inbox_items WHERE token_hash = ?')
      .bind(hash)
      .run()
    return json({ ok: true })
  }
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    return json({ error: 'body' }, 400)
  }

  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length > 0) {
    const placeholders = uniqueIds.map(() => '?').join(', ')
    await database
      .prepare(
        `DELETE FROM inbox_items WHERE token_hash = ? AND id IN (${placeholders})`,
      )
      .bind(hash, ...uniqueIds)
      .run()
  }
  return json({ ok: true })
}

export const onRequest: PagesFunction<Env, 'token'> = async ({
  request,
  env,
  params,
}) => {
  const tokenParam = params.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  if (!token || !isValidInboxToken(token)) return json({ error: 'not_found' }, 404)

  const hash = await tokenHash(token)
  await deleteExpired(env.INBOX)

  switch (request.method) {
    case 'POST':
      return post(request, env.INBOX, hash)
    case 'GET':
      return get(env.INBOX, hash)
    case 'DELETE':
      return remove(request, env.INBOX, hash)
    default:
      return json({ error: 'method' }, 405)
  }
}
