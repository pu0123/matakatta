import { describe, expect, it } from 'vitest'
import type { Expense } from './core/types'
import { noteSuggestions } from './noteSuggestions'

const expense = (id: string, note: string, day: number): Expense => ({
  id,
  note,
  amount: 100,
  at: `2026-10-${String(day).padStart(2, '0')}T12:00:00+09:00`,
})

describe('noteSuggestions', () => {
  it('回数が多い順、同数なら新しい順に最大6件を返す', () => {
    const expenses = [
      expense('1', '昼ごはん', 20),
      expense('2', 'コンビニ', 21),
      expense('3', '昼ごはん', 22),
      expense('4', '本', 29),
      expense('5', 'コーヒー', 28),
      expense('6', '電車', 27),
      expense('7', '服', 26),
      expense('8', '映画', 25),
    ]

    expect(noteSuggestions(expenses)).toEqual([
      '昼ごはん',
      '本',
      'コーヒー',
      '電車',
      '服',
      '映画',
    ])
  })

  it('空のメモを候補に含めない', () => {
    expect(
      noteSuggestions([
        expense('1', '   ', 20),
        { ...expense('2', '本', 21), note: undefined },
      ]),
    ).toEqual([])
  })
})
