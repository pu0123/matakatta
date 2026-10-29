import type { Expense, Settings, Yen } from './types'
import { weekRange } from './week'

export function unneededTotal(
  expenses: Expense[],
  from: Date,
  to: Date,
): Yen {
  const fromTime = from.getTime()
  const toTime = to.getTime()

  return expenses.reduce((total, expense) => {
    const at = new Date(expense.at).getTime()
    return expense.verdict === 'unneeded' && at >= fromTime && at < toTime
      ? total + expense.amount
      : total
  }, 0)
}

export function pendingReview(
  expenses: Expense[],
  now: Date,
  settings: Settings,
): Expense[] {
  const currentWeekStart = weekRange(now, settings.weekStartsOn).start.getTime()

  return expenses
    .filter(
      (expense) =>
        expense.verdict === undefined &&
        new Date(expense.at).getTime() < currentWeekStart,
    )
    .sort(
      (first, second) =>
        new Date(first.at).getTime() - new Date(second.at).getTime(),
    )
}
