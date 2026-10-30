import { describe, expect, it } from 'vitest'
import { parseShortcutParams } from './shortcutParams'

describe('parseShortcutParams', () => {
  it('共通の金額読み取りを使う', () => {
    expect(parseShortcutParams('?amount=%EF%BF%A5%EF%BC%91%EF%BC%8C%EF%BC%92%EF%BC%98%EF%BC%90').amount).toBe(1_280)
  })

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
