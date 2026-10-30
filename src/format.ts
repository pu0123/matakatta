const yenFormatter = new Intl.NumberFormat('ja-JP')
const weekdays = ['日', '月', '火', '水', '木', '金', '土']

export function yen(value: number): string {
  return `${value < 0 ? '−' : ''}¥${yenFormatter.format(Math.abs(value))}`
}

export function formatNumber(value: number): string {
  return yenFormatter.format(value)
}

export function formatAmountInput(value: number): string {
  return value === 0 ? '' : yenFormatter.format(value)
}

export function parseAmountInput(value: string, max = Number.MAX_SAFE_INTEGER): number {
  const ascii = value.replace(/[０-９]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
  )
  const digits = ascii.replace(/\D/g, '')
  const amount = Number(digits || 0)
  return Math.min(Number.isFinite(amount) ? Math.floor(amount) : 0, max)
}

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dayBefore(date: Date): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - 1)
  return result
}

export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatDay(date: Date): string {
  return `${formatMonthDay(date)}（${weekdays[date.getDay()]}）`
}

export function formatWeek(start: Date, end: Date): string {
  return `${formatDay(start)}〜 ${formatDay(dayBefore(end))}`
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
