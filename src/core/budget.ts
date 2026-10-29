import type { Expense, Settings, Yen } from './types'
import { weekRange } from './week'

export interface Remaining {
  budget: Yen
  carriedDeficit: Yen
  spent: Yen
  left: Yen
  perDay: Yen
  daysLeft: number
}

function spentBetween(expenses: Expense[], from: Date, to: Date): Yen {
  const fromTime = from.getTime()
  const toTime = to.getTime()

  return expenses.reduce((total, expense) => {
    const at = new Date(expense.at).getTime()
    return at >= fromTime && at < toTime ? total + expense.amount : total
  }, 0)
}

export function spentInWeek(
  expenses: Expense[],
  date: Date,
  settings: Settings,
): Yen {
  const { start, end } = weekRange(date, settings.weekStartsOn)
  return spentBetween(expenses, start, end)
}

function carriedDeficit(
  expenses: Expense[],
  date: Date,
  settings: Settings,
): Yen {
  const currentWeekStart = weekRange(date, settings.weekStartsOn).start
  const startedAt = new Date(settings.startedAt)
  const firstWeekStart = weekRange(startedAt, settings.weekStartsOn).start

  if (currentWeekStart <= firstWeekStart) {
    return 0
  }

  let deficit = 0
  let weekStart = firstWeekStart

  while (weekStart < currentWeekStart) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // 利用開始前の支出は、同じ週にあっても繰り越しに含めない。
    const from = weekStart < startedAt ? startedAt : weekStart
    const spent = spentBetween(expenses, from, weekEnd)
    const budget = settings.weeklyBudget - deficit
    deficit = Math.max(0, spent - budget)
    weekStart = weekEnd
  }

  return deficit
}

export function remaining(
  expenses: Expense[],
  now: Date,
  settings: Settings,
): Remaining {
  const deficit = carriedDeficit(expenses, now, settings)
  const budget = settings.weeklyBudget - deficit
  const spent = spentInWeek(expenses, now, settings)
  const left = budget - spent
  const daysFromWeekStart = (now.getDay() - settings.weekStartsOn + 7) % 7
  const daysLeft = 7 - daysFromWeekStart
  const perDay = left > 0 ? Math.floor(left / daysLeft) : 0

  return {
    budget,
    carriedDeficit: deficit,
    spent,
    left,
    perDay,
    daysLeft,
  }
}
