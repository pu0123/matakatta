import { parseAmount } from '../shared/parseAmount'

export interface ShortcutParams {
  hasAmount: boolean
  amount?: number
  note?: string
  viaShortcut: boolean
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
