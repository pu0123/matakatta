import { describe, expect, it } from 'vitest'
import {
  isValidInboxToken,
  MAX_INBOX_BODY_BYTES,
  normalizeInboxNote,
  parseInboxInput,
} from './inbox'

describe('inbox input', () => {
  it('トークン形式を検証する', () => {
    expect(isValidInboxToken('a'.repeat(32))).toBe(true)
    expect(isValidInboxToken(`Ab0_-${'x'.repeat(59)}`)).toBe(true)
    expect(isValidInboxToken('a'.repeat(31))).toBe(false)
    expect(isValidInboxToken('a'.repeat(65))).toBe(false)
    expect(isValidInboxToken(`${'a'.repeat(31)}!`)).toBe(false)
  })

  it('JSON 本文から取り出す', () => {
    expect(
      parseInboxInput(
        'https://example.com/api/inbox/token',
        'application/json',
        JSON.stringify({ amount: '￥１，２８０', note: ' 店 ' }),
      ),
    ).toEqual({ ok: true, value: { amount: 1_280, note: '店' } })
  })

  it('フォーム本文から取り出す', () => {
    expect(
      parseInboxInput(
        'https://example.com/api/inbox/token',
        'application/x-www-form-urlencoded',
        'amount=780&note=%E5%BA%97',
      ),
    ).toEqual({ ok: true, value: { amount: 780, note: '店' } })
  })

  it('クエリから取り出す', () => {
    expect(
      parseInboxInput(
        'https://example.com/api/inbox/token?amount=500&note=%E5%BA%97',
        null,
        '',
      ),
    ).toEqual({ ok: true, value: { amount: 500, note: '店' } })
  })

  it('店名の前後を除き30文字に切る', () => {
    expect(normalizeInboxNote(`  ${'あ'.repeat(31)}  `)).toBe('あ'.repeat(30))
  })

  it('2KB を超える本文を拒否する', () => {
    const result = parseInboxInput(
      'https://example.com/api/inbox/token',
      'application/x-www-form-urlencoded',
      `amount=1&note=${'a'.repeat(MAX_INBOX_BODY_BYTES)}`,
    )
    expect(result).toEqual({ ok: false, status: 413, error: 'body' })
  })
})
