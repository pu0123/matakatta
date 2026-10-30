import { describe, expect, it } from 'vitest'
import type { Expense, Settings } from './types'
import { pendingReview, unneededTotal } from './review'

const settings: Settings = {
  payday: 25,
  weekStartsOn: 1,
  savings: { mode: 'amount', amount: 20_000 },
  fixedCosts: { mode: 'total', total: 80_000 },
  leftover: 'toSavings',
  startedAt: '2025-01-06T00:00:00+09:00',
  initialFree: 10_000,
}

describe('unneededTotal', () => {
  it('半開区間内の不要な支出だけを合計する', () => {
    const expenses: Expense[] = [
      { id: 'from', amount: 100, at: '2025-01-01T00:00:00+09:00', verdict: 'unneeded' },
      { id: 'needed', amount: 200, at: '2025-01-02T00:00:00+09:00', verdict: 'needed' },
      { id: 'to', amount: 400, at: '2025-01-03T00:00:00+09:00', verdict: 'unneeded' },
    ]

    expect(
      unneededTotal(
        expenses,
        new Date('2025-01-01T00:00:00+09:00'),
        new Date('2025-01-03T00:00:00+09:00'),
      ),
    ).toBe(100)
  })
})

describe('pendingReview', () => {
  it('先週以前の未判定支出を古い順で返す', () => {
    const expenses: Expense[] = [
      { id: 'before-start', amount: 50, at: '2025-01-05T12:00:00+09:00' },
      { id: 'recent-old', amount: 200, at: '2025-01-12T12:00:00+09:00' },
      { id: 'current', amount: 400, at: '2025-01-13T00:00:00+09:00' },
      { id: 'reviewed', amount: 800, at: '2025-01-10T12:00:00+09:00', verdict: 'needed' },
      { id: 'oldest', amount: 100, at: '2025-01-01T12:00:00+09:00' },
    ]

    const result = pendingReview(
      expenses,
      new Date('2025-01-15T12:00:00+09:00'),
      settings,
    )

    expect(result.map(({ id }) => id)).toEqual(['recent-old'])
  })
})
