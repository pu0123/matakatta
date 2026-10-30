import { describe, expect, it } from 'vitest'
import { emptyStore, loadStore, saveStore } from './storage'

function memoryStorage(initial: string | null = null) {
  let value = initial
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next
    },
    value: () => value,
  }
}

describe('storage', () => {
  it('空なら初期状態を返す', () => {
    expect(loadStore(memoryStorage())).toEqual(emptyStore())
  })

  it('壊れたJSONでも初期状態を返す', () => {
    expect(loadStore(memoryStorage('{broken'))).toEqual(emptyStore())
  })

  it('正常なデータを読み書きできる', () => {
    const storage = memoryStorage()
    const data = {
      settings: null,
      expenses: [{ id: '1', amount: 780, at: '2026-10-30T12:00:00.000Z' }],
      incomes: [],
      inbox: [],
    }

    saveStore(data, storage)

    expect(storage.value()).toContain('"expenses"')
    expect(loadStore(storage)).toEqual(data)
  })

  it('以前の保存データには空の受け箱を補う', () => {
    const storage = memoryStorage(
      JSON.stringify({ settings: null, expenses: [], incomes: [] }),
    )
    expect(loadStore(storage).inbox).toEqual([])
  })
})
