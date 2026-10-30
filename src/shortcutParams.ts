export interface ShortcutParams {
  hasAmount: boolean
  amount?: number
  note?: string
  viaShortcut: boolean
}

function toAscii(value: string): string {
  return value
    .replace(/[！-～]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0),
    )
    .replace(/\u3000/g, ' ')
}

function parseAmount(value: string): number | undefined {
  const normalized = toAscii(value)
    .replace(/[¥￥円]|JPY|\s|,/gi, '')

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return undefined

  const amount = Math.floor(Number(normalized))
  return Number.isInteger(amount) && amount >= 1 && amount <= 9_999_999
    ? amount
    : undefined
}

export function parseShortcutParams(search: string): ShortcutParams {
  const params = new URLSearchParams(search)
  const hasAmount = params.has('amount')
  const amount = hasAmount ? parseAmount(params.get('amount') ?? '') : undefined
  const trimmedNote = (params.get('note') ?? '').trim().slice(0, 30)

  return {
    hasAmount,
    ...(amount === undefined ? {} : { amount }),
    ...(trimmedNote ? { note: trimmedNote } : {}),
    viaShortcut: params.get('via') === 'shortcut',
  }
}
