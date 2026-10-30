import type { Expense, Income, Settings } from './core/types'
import type { InboxItem } from './inbox'

export const STORAGE_KEY = 'matakatta:v1'

export interface StoredData {
  settings: Settings | null
  expenses: Expense[]
  incomes: Income[]
  inbox: InboxItem[]
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const emptyStore = (): StoredData => ({
  settings: null,
  expenses: [],
  incomes: [],
  inbox: [],
})

function isStoredData(value: unknown): value is Omit<StoredData, 'inbox'> & {
  inbox?: InboxItem[]
} {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<StoredData>
  return (
    (candidate.settings === null || typeof candidate.settings === 'object') &&
    Array.isArray(candidate.expenses) &&
    Array.isArray(candidate.incomes)
  )
}

export function loadStore(
  storage: StorageLike = window.localStorage,
): StoredData {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return emptyStore()

    const parsed: unknown = JSON.parse(raw)
    return isStoredData(parsed)
      ? { ...parsed, inbox: Array.isArray(parsed.inbox) ? parsed.inbox : [] }
      : emptyStore()
  } catch {
    return emptyStore()
  }
}

export function saveStore(
  data: StoredData,
  storage: StorageLike = window.localStorage,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    // 保存できない環境でも、現在の操作は継続できるようにする。
    return false
  }
}
