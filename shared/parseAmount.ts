function toAscii(value: string): string {
  return value
    .replace(/[！-～]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0),
    )
    .replace(/\u3000/g, ' ')
}

export function parseAmount(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined

  const normalized = toAscii(String(value)).replace(/[¥￥円]|JPY|\s|,/gi, '')

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return undefined

  const amount = Math.floor(Number(normalized))
  return Number.isInteger(amount) && amount >= 1 && amount <= 9_999_999
    ? amount
    : undefined
}
