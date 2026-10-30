import { describe, expect, it } from 'vitest'
import type { Expense, Income, Settings } from './types'
import { closedPeriods, current } from './budget'

const settings: Settings = {
  payday: 25,
  weekStartsOn: 1,
  savings: { mode: 'amount', amount: 20_000 },
  fixedCosts: { mode: 'total', total: 80_000 },
  leftover: 'toSavings',
  startedAt: '2025-01-10T12:00:00+09:00',
  initialFree: 15_000,
}

function expense(id: string, amount: number, at: string): Expense {
  return { id, amount, at }
}

function income(periodStart: string, amount: number): Income {
  return { periodStart, amount }
}

describe('current', () => {
  it('最初の期間は開始日の0時から区切り、収入ではなくinitialFreeを使う', () => {
    const result = current(
      [
        expense('before', 10_000, '2025-01-10T10:00:00+09:00'),
        expense('after', 1_000, '2025-01-10T13:00:00+09:00'),
      ],
      [income('2025-01-10', 999_999)],
      new Date('2025-01-12T12:00:00+09:00'),
      settings,
    )

    expect(result.period).toMatchObject({
      start: new Date('2025-01-10T00:00:00+09:00'),
      end: new Date('2025-01-25T00:00:00+09:00'),
      free: 15_000,
      income: 0,
      isEstimate: false,
      spent: 1_000,
    })
  })

  it('給料日をまたぐ週を2区間に分け、日数で配分する', () => {
    const onPreviousSide = current(
      [],
      [],
      new Date('2025-01-24T12:00:00+09:00'),
      { ...settings, initialFree: 15_000 },
    )
    expect(onPreviousSide.week).toMatchObject({
      start: new Date('2025-01-20T00:00:00+09:00'),
      end: new Date('2025-01-25T00:00:00+09:00'),
      budget: 5_000,
      daysLeft: 1,
    })

    const onNextSide = current(
      [],
      [income('2025-01-25', 131_000)],
      new Date('2025-01-25T12:00:00+09:00'),
      settings,
    )
    expect(onNextSide.period.free).toBe(31_000)
    expect(onNextSide.week).toMatchObject({
      start: new Date('2025-01-25T00:00:00+09:00'),
      end: new Date('2025-01-27T00:00:00+09:00'),
      budget: 2_000,
      daysLeft: 2,
    })
  })

  it('配分の端数を最後の区間に寄せ、合計を期間のfreeと一致させる', () => {
    const exactSettings: Settings = {
      ...settings,
      startedAt: '2025-01-25T00:00:00+09:00',
      initialFree: 100,
    }
    const segmentStarts = [
      '2025-01-25T12:00:00+09:00',
      '2025-01-27T12:00:00+09:00',
      '2025-02-03T12:00:00+09:00',
      '2025-02-10T12:00:00+09:00',
      '2025-02-17T12:00:00+09:00',
      '2025-02-24T12:00:00+09:00',
    ]
    const allocations = segmentStarts.map(
      (at) => current([], [], new Date(at), exactSettings).week.budget,
    )

    expect(allocations).toEqual([6, 22, 22, 22, 22, 6])
    expect(allocations.reduce((total, value) => total + value, 0)).toBe(100)
  })

  it('未入力の収入は直近の過去を見込みにし、過去にもなければ0にする', () => {
    const estimated = current(
      [],
      [income('2025-01-25', 200_000)],
      new Date('2025-02-25T12:00:00+09:00'),
      settings,
    )
    expect(estimated.period).toMatchObject({
      income: 200_000,
      isEstimate: true,
      free: 100_000,
    })

    const noHistory = current(
      [],
      [],
      new Date('2025-01-25T12:00:00+09:00'),
      settings,
    )
    expect(noHistory.period).toMatchObject({
      income: 0,
      isEstimate: true,
      free: -100_000,
    })
  })

  it('percent貯金の円未満を切り捨てる', () => {
    const result = current(
      [],
      [income('2025-01-25', 10_001)],
      new Date('2025-01-25T12:00:00+09:00'),
      {
        ...settings,
        fixedCosts: {
          mode: 'items',
          items: [{ id: 'rent', name: '家賃', amount: 1 }],
        },
        savings: { mode: 'percent', percent: 10 },
      },
    )

    expect(result.period.free).toBe(9_000)
  })

  it('期間内の赤字を連鎖させ、余りは次の区間に持ち越さない', () => {
    const periodSettings: Settings = {
      ...settings,
      startedAt: '2025-01-25T00:00:00+09:00',
      initialFree: 29_000,
    }
    const expenses = [
      expense('first', 3_000, '2025-01-25T12:00:00+09:00'),
      expense('second', 8_000, '2025-01-27T12:00:00+09:00'),
      expense('third', 1_000, '2025-02-03T12:00:00+09:00'),
    ]

    const second = current(
      expenses,
      [],
      new Date('2025-01-27T18:00:00+09:00'),
      periodSettings,
    )
    expect(second.week.carriedDeficit).toBe(1_130)
    expect(second.week.budget).toBe(5_418)

    const third = current(
      expenses,
      [],
      new Date('2025-02-03T18:00:00+09:00'),
      periodSettings,
    )
    expect(third.week.carriedDeficit).toBe(2_582)

    const fourth = current(
      expenses,
      [],
      new Date('2025-02-10T18:00:00+09:00'),
      periodSettings,
    )
    expect(fourth.week.carriedDeficit).toBe(0)
  })

  it('固定費と貯金が収入を上回るとovercommittedになりperDayは0になる', () => {
    const result = current(
      [],
      [income('2025-01-25', 50_000)],
      new Date('2025-01-25T12:00:00+09:00'),
      settings,
    )

    expect(result.period.free).toBe(-50_000)
    expect(result.period.overcommitted).toBe(true)
    expect(result.week.perDay).toBe(0)
  })
})

describe('closedPeriods', () => {
  it('toSavingsとcarryOverで余りの扱いを変える', () => {
    const incomes = [income('2025-01-25', 200_000)]
    const toSavings = current(
      [],
      incomes,
      new Date('2025-01-25T12:00:00+09:00'),
      settings,
    )
    const carryOver = current(
      [],
      incomes,
      new Date('2025-01-25T12:00:00+09:00'),
      { ...settings, leftover: 'carryOver' },
    )
    expect(toSavings.period.free).toBe(100_000)
    expect(carryOver.period.free).toBe(115_000)

    const closed = closedPeriods(
      [],
      incomes,
      new Date('2025-01-25T12:00:00+09:00'),
      settings,
    )
    expect(closed[0]).toMatchObject({
      leftover: 15_000,
      savedFromLeftover: 15_000,
      deficit: 0,
    })

    const carriedClosed = closedPeriods(
      [],
      incomes,
      new Date('2025-01-25T12:00:00+09:00'),
      { ...settings, leftover: 'carryOver' },
    )
    expect(carriedClosed[0]?.savedFromLeftover).toBe(0)
  })

  it('期間の赤字を次のfreeから1回だけ引く', () => {
    const expenses = [
      expense('overspent', 20_000, '2025-01-12T12:00:00+09:00'),
    ]
    const result = current(
      expenses,
      [income('2025-01-25', 200_000)],
      new Date('2025-01-25T12:00:00+09:00'),
      settings,
    )

    expect(result.period.free).toBe(95_000)
    expect(result.week.carriedDeficit).toBe(0)
  })
})
