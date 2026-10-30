import type { Settings } from './types'

export interface PeriodRange {
  start: Date
  end: Date
}

export function payDate(year: number, month: number, payday: number): Date {
  const lastDay = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(payday, lastDay))
}

function adjacentMonth(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function periodOf(
  date: Date,
  payday: Settings['payday'],
): PeriodRange {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)

  const year = day.getFullYear()
  const month = day.getMonth() + 1
  const thisMonthPayday = payDate(year, month, payday)
  const startMonth =
    day >= thisMonthPayday
      ? { year, month }
      : adjacentMonth(year, month, -1)
  const endMonth = adjacentMonth(startMonth.year, startMonth.month, 1)

  return {
    start: payDate(startMonth.year, startMonth.month, payday),
    end: payDate(endMonth.year, endMonth.month, payday),
  }
}
