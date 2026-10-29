import type { Settings } from './types'

export interface WeekRange {
  start: Date
  end: Date
}

export function weekRange(
  date: Date,
  weekStartsOn: Settings['weekStartsOn'],
): WeekRange {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const daysFromStart = (start.getDay() - weekStartsOn + 7) % 7
  start.setDate(start.getDate() - daysFromStart)

  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return { start, end }
}
