import { describe, expect, it } from 'vitest'
import { mergeInboxItems, type InboxItem } from './inbox'

const item = (id: string): InboxItem => ({
  id,
  amount: 100,
  receivedAt: '2026-10-30T12:00:00.000Z',
})

describe('mergeInboxItems', () => {
  it('同じ id を二度入れない', () => {
    expect(
      mergeInboxItems([item('saved')], [item('saved'), item('new'), item('new')])
        .items.map(({ id }) => id),
    ).toEqual(['saved', 'new'])
  })

  it('端末に存在する受信 id だけを DELETE 対象にする', () => {
    expect(
      mergeInboxItems([item('saved')], [item('saved'), item('new'), item('new')])
        .deleteIds,
    ).toEqual(['saved', 'new'])
  })
})
