import { describe, expect, it } from 'vitest'
import { formatAmountInput, parseAmountInput } from './format'

describe('amount input formatting', () => {
  it('入力中の金額を3桁区切りで表示する', () => {
    expect(formatAmountInput(98_000)).toBe('98,000')
  })

  it('全角数字を半角の数値として読み取る', () => {
    expect(parseAmountInput('１２３，４５６円')).toBe(123_456)
  })

  it('数字以外を保存値に含めない', () => {
    expect(parseAmountInput('a9b8,000')).toBe(98_000)
  })
})
