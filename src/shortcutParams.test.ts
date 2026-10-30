import { describe, expect, it } from 'vitest'
import { parseShortcutParams } from './shortcutParams'

describe('parseShortcutParams', () => {
  it.each([
    ['780', 780],
    ['¥780', 780],
    ['￥１，２８０', 1_280],
    ['1,280円', 1_280],
    ['780.00', 780],
    ['780.5', 780],
    ['JPY 780', 780],
  ])('%s を金額として読み取る', (value, expected) => {
    expect(parseShortcutParams(`?amount=${encodeURIComponent(value)}`).amount).toBe(expected)
  })

  it.each(['0', '-500', 'abc', '', '10000000'])(
    '%s は金額として読み取らない',
    (value) => {
      const result = parseShortcutParams(`?amount=${encodeURIComponent(value)}`)
      expect(result.hasAmount).toBe(true)
      expect(result.amount).toBeUndefined()
    },
  )

  it('amount が無いことを区別する', () => {
    expect(parseShortcutParams('?note=店名').hasAmount).toBe(false)
  })

  it('メモの前後の空白を除き、30文字に切る', () => {
    const result = parseShortcutParams(
      `?note=${encodeURIComponent(`  ${'あ'.repeat(31)}  `)}`,
    )
    expect(result.note).toBe('あ'.repeat(30))
  })

  it('空のメモは含めない', () => {
    expect(parseShortcutParams('?note=%20%20').note).toBeUndefined()
  })

  it('via=shortcut を判定する', () => {
    expect(parseShortcutParams('?via=shortcut').viaShortcut).toBe(true)
    expect(parseShortcutParams('?via=other').viaShortcut).toBe(false)
  })
})
