import { describe, expect, it } from 'vitest'
import { payDate, periodOf } from './period'

describe('payDate', () => {
  it.each([
    [2024, 2, '2024-02-29T00:00:00+09:00'],
    [2025, 2, '2025-02-28T00:00:00+09:00'],
    [2025, 4, '2025-04-30T00:00:00+09:00'],
  ])('31日払いを月末に丸める', (year, month, expected) => {
    expect(payDate(year, month, 31)).toEqual(new Date(expected))
  })
})

describe('periodOf', () => {
  it('直前の給料日から次の給料日までを返す', () => {
    expect(periodOf(new Date('2025-03-10T12:00:00+09:00'), 25)).toEqual({
      start: new Date('2025-02-25T00:00:00+09:00'),
      end: new Date('2025-03-25T00:00:00+09:00'),
    })
  })

  it('給料日の0時を新しい期間に含める', () => {
    expect(periodOf(new Date('2025-03-25T00:00:00+09:00'), 25)).toEqual({
      start: new Date('2025-03-25T00:00:00+09:00'),
      end: new Date('2025-04-25T00:00:00+09:00'),
    })
  })
})
