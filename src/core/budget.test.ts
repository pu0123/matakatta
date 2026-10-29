import { describe, expect, it } from 'vitest'
import type { Expense, Settings } from './types'
import { remaining, spentInWeek } from './budget'

const settings: Settings = {
  weeklyBudget: 10_000,
  weekStartsOn: 1,
  startedAt: '2025-01-06T00:00:00+09:00',
}

function expense(id: string, amount: number, at: string): Expense {
  return { id, amount, at }
}

describe('spentInWeek', () => {
  it('週の開始を含み、次の週の開始を含まない', () => {
    const expenses = [
      expense('start', 100, '2025-01-06T00:00:00+09:00'),
      expense('end', 200, '2025-01-12T23:59:59+09:00'),
      expense('next', 400, '2025-01-13T00:00:00+09:00'),
    ]

    expect(
      spentInWeek(expenses, new Date('2025-01-08T12:00:00+09:00'), settings),
    ).toBe(300)
  })
})

describe('remaining', () => {
  it('2週連続の赤字を連鎖させる', () => {
    const expenses = [
      expense('week-1', 12_000, '2025-01-06T12:00:00+09:00'),
      expense('week-2', 9_000, '2025-01-13T12:00:00+09:00'),
    ]

    const result = remaining(
      expenses,
      new Date('2025-01-20T12:00:00+09:00'),
      settings,
    )

    expect(result.carriedDeficit).toBe(1_000)
    expect(result.budget).toBe(9_000)
  })

  it('余った週の翌週には繰り越さない', () => {
    const expenses = [
      expense('week-1', 12_000, '2025-01-06T12:00:00+09:00'),
      expense('week-2', 9_000, '2025-01-13T12:00:00+09:00'),
      expense('week-3', 5_000, '2025-01-20T12:00:00+09:00'),
    ]

    const result = remaining(
      expenses,
      new Date('2025-01-27T12:00:00+09:00'),
      settings,
    )

    expect(result.carriedDeficit).toBe(0)
    expect(result.budget).toBe(10_000)
  })

  it('利用開始日時より前の支出を繰り越し計算に含めない', () => {
    const startedMidweek: Settings = {
      ...settings,
      startedAt: '2025-01-08T12:00:00+09:00',
    }
    const expenses = [
      expense('before-start', 20_000, '2025-01-06T12:00:00+09:00'),
      expense('after-start', 2_000, '2025-01-09T12:00:00+09:00'),
    ]

    const result = remaining(
      expenses,
      new Date('2025-01-13T12:00:00+09:00'),
      startedMidweek,
    )

    expect(result.carriedDeficit).toBe(0)
  })

  it.each([
    { amount: 10_000, left: 0 },
    { amount: 11_000, left: -1_000 },
  ])('残額が$leftのとき1日あたりを0にする', ({ amount, left }) => {
    const result = remaining(
      [expense('current', amount, '2025-01-08T12:00:00+09:00')],
      new Date('2025-01-08T18:00:00+09:00'),
      settings,
    )

    expect(result.left).toBe(left)
    expect(result.perDay).toBe(0)
    expect(result.daysLeft).toBe(5)
  })
})
