import type { Expense, Settings, Yen } from './types'
import { weekRange } from './week'

export interface UnneededSummary {
  total: Yen
  count: number
}

export function unneededSummary(
  expenses: Expense[],
  from: Date,
  to: Date,
): UnneededSummary {
  const fromTime = from.getTime()
  const toTime = to.getTime()

  return expenses.reduce<UnneededSummary>(
    (summary, expense) => {
      const at = new Date(expense.at).getTime()
      if (expense.verdict !== 'unneeded' || at < fromTime || at >= toTime) {
        return summary
      }
      return {
        total: summary.total + expense.amount,
        count: summary.count + 1,
      }
    },
    { total: 0, count: 0 },
  )
}

export function unneededTotal(
  expenses: Expense[],
  from: Date,
  to: Date,
): Yen {
  return unneededSummary(expenses, from, to).total
}

export function pendingReview(
  expenses: Expense[],
  now: Date,
  settings: Settings,
): Expense[] {
  const currentWeekStart = weekRange(now, settings.weekStartsOn).start.getTime()
  const startedAt = new Date(settings.startedAt).getTime()

  return expenses
    .filter(
      (expense) =>
        expense.verdict === undefined &&
        new Date(expense.at).getTime() >= startedAt &&
        new Date(expense.at).getTime() < currentWeekStart,
    )
    .sort(
      (first, second) =>
        new Date(first.at).getTime() - new Date(second.at).getTime(),
    )
}
