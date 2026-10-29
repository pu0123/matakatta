import { describe, expect, it } from 'vitest'
import { weekRange } from './week'

describe('weekRange', () => {
  it('月曜0時から翌月曜0時までを半開区間として返す', () => {
    const atBoundary = weekRange(new Date('2025-01-06T00:00:00+09:00'), 1)
    expect(atBoundary.start).toEqual(new Date('2025-01-06T00:00:00+09:00'))
    expect(atBoundary.end).toEqual(new Date('2025-01-13T00:00:00+09:00'))

    const atWeekEnd = weekRange(new Date('2025-01-12T23:59:59+09:00'), 1)
    expect(atWeekEnd.start).toEqual(new Date('2025-01-06T00:00:00+09:00'))
    expect(atWeekEnd.end).toEqual(new Date('2025-01-13T00:00:00+09:00'))
  })

  it('日曜始まりの週を返す', () => {
    const range = weekRange(new Date('2025-01-08T12:00:00+09:00'), 0)

    expect(range.start).toEqual(new Date('2025-01-05T00:00:00+09:00'))
    expect(range.end).toEqual(new Date('2025-01-12T00:00:00+09:00'))
  })
})
