import { describe, expect, it } from 'vitest'
import { parseAmount } from './parseAmount'

describe('parseAmount', () => {
  it.each([
    ['780', 780],
    ['¥780', 780],
    ['￥１，２８０', 1_280],
    ['1,280円', 1_280],
    ['780.00', 780],
    ['780.5', 780],
    ['JPY 780', 780],
    [780, 780],
  ])('%s を金額として読み取る', (value, expected) => {
    expect(parseAmount(value)).toBe(expected)
  })

  it.each(['0', '-500', 'abc', '', '10000000', null, undefined])(
    '%s は金額として読み取らない',
    (value) => {
      expect(parseAmount(value)).toBeUndefined()
    },
  )
})
