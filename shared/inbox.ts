import { parseAmount } from './parseAmount'

export const MAX_INBOX_BODY_BYTES = 2 * 1024

export interface ParsedInboxInput {
  amount: number
  note?: string
}

export type InboxInputResult =
  | { ok: true; value: ParsedInboxInput }
  | { ok: false; status: 400 | 413; error: 'amount' | 'body' }

export function isValidInboxToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(token)
}

export function normalizeInboxNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const note = value.trim().slice(0, 30)
  return note || undefined
}

function inputFromBody(
  body: string,
  contentType: string,
): { amount?: unknown; note?: unknown } {
  if (!body) return {}

  if (contentType.toLowerCase().includes('application/json')) {
    try {
      const parsed: unknown = JSON.parse(body)
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as { amount?: unknown; note?: unknown })
        : {}
    } catch {
      return {}
    }
  }

  const params = new URLSearchParams(body)
  return {
    ...(params.has('amount') ? { amount: params.get('amount') } : {}),
    ...(params.has('note') ? { note: params.get('note') } : {}),
  }
}

export function parseInboxInput(
  url: string,
  contentType: string | null,
  body: string,
): InboxInputResult {
  if (new TextEncoder().encode(body).byteLength > MAX_INBOX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'body' }
  }

  const query = new URL(url).searchParams
  const input = query.has('amount')
    ? {
        amount: query.get('amount'),
        ...(query.has('note') ? { note: query.get('note') } : {}),
      }
    : inputFromBody(body, contentType ?? '')
  const amount = parseAmount(input.amount)

  if (amount === undefined) {
    return { ok: false, status: 400, error: 'amount' }
  }

  const note = normalizeInboxNote(input.note)
  return {
    ok: true,
    value: { amount, ...(note ? { note } : {}) },
  }
}
