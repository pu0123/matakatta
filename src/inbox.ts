export interface InboxItem {
  id: string
  amount: number
  note?: string
  receivedAt: string
}

export interface MergeInboxResult {
  items: InboxItem[]
  deleteIds: string[]
}

export function mergeInboxItems(
  current: InboxItem[],
  received: InboxItem[],
): MergeInboxResult {
  const items: InboxItem[] = []
  const knownIds = new Set<string>()

  for (const item of [...current, ...received]) {
    if (knownIds.has(item.id)) continue
    knownIds.add(item.id)
    items.push(item)
  }

  return {
    items,
    deleteIds: [...new Set(received.map((item) => item.id))],
  }
}

function isInboxItem(value: unknown): value is InboxItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<InboxItem>
  return (
    typeof item.id === 'string' &&
    Number.isInteger(item.amount) &&
    Number(item.amount) >= 1 &&
    Number(item.amount) <= 9_999_999 &&
    (item.note === undefined ||
      item.note === null ||
      typeof item.note === 'string') &&
    typeof item.receivedAt === 'string' &&
    Number.isFinite(new Date(item.receivedAt).getTime())
  )
}

function inboxUrl(token: string): string {
  return `${location.origin}/api/inbox/${token}`
}

export function createInboxToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function syncInbox(
  token: string,
  saveReceived: (items: InboxItem[]) => string[],
): Promise<void> {
  try {
    const response = await fetch(inboxUrl(token), { cache: 'no-store' })
    if (!response.ok) return

    const payload: unknown = await response.json()
    if (typeof payload !== 'object' || payload === null) return
    const rawItems = (payload as { items?: unknown }).items
    if (!Array.isArray(rawItems)) return

    const items = rawItems
      .filter(isInboxItem)
      .map((item) => ({
        id: item.id,
        amount: item.amount,
        ...(typeof item.note === 'string' && item.note
          ? { note: item.note }
          : {}),
        receivedAt: item.receivedAt,
      }))
    const ids = saveReceived(items)
    if (ids.length === 0) return

    await fetch(inboxUrl(token), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  } catch {
    // 受け取りはバックグラウンドで再試行するため、通信エラーを画面に出さない。
  }
}

export async function sendInboxTest(token: string): Promise<boolean> {
  try {
    const response = await fetch(inboxUrl(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1, note: 'テスト' }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function clearRemoteInbox(token: string): Promise<boolean> {
  try {
    const response = await fetch(inboxUrl(token), { method: 'DELETE' })
    return response.ok
  } catch {
    return false
  }
}
