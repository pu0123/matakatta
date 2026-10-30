import type { Expense } from './core/types'

export function noteSuggestions(expenses: Expense[], limit = 6): string[] {
  const stats = new Map<string, { count: number; latest: number }>()

  for (const expense of expenses) {
    const note = expense.note?.trim()
    if (!note) continue

    const at = new Date(expense.at).getTime()
    const previous = stats.get(note)
    stats.set(note, {
      count: (previous?.count ?? 0) + 1,
      latest: Math.max(previous?.latest ?? Number.NEGATIVE_INFINITY, at),
    })
  }

  return [...stats.entries()]
    .sort((first, second) => {
      const countDifference = second[1].count - first[1].count
      return countDifference !== 0
        ? countDifference
        : second[1].latest - first[1].latest
    })
    .slice(0, limit)
    .map(([note]) => note)
}
