import { useEffect, useRef, useState } from 'react'
import type { Expense, Income, Settings } from './core/types'
import { mergeInboxItems, type InboxItem } from './inbox'
import { loadStore, saveStore, type StoredData } from './storage'

export function useStore() {
  const [data, setData] = useState<StoredData>(loadStore)
  const dataRef = useRef(data)

  useEffect(() => {
    saveStore(data)
  }, [data])

  const update = (updater: (current: StoredData) => StoredData) => {
    setData((current) => {
      const next = updater(current)
      dataRef.current = next
      return next
    })
  }

  return {
    ...data,
    setSettings(settings: Settings) {
      update((current) => ({ ...current, settings }))
    },
    saveSetup(settings: Settings, income: Income) {
      update((current) => ({
        ...current,
        settings,
        incomes: [
          ...current.incomes.filter(
            (item) => item.periodStart !== income.periodStart,
          ),
          income,
        ],
      }))
    },
    saveIncome(income: Income) {
      update((current) => ({
        ...current,
        incomes: [
          ...current.incomes.filter(
            (item) => item.periodStart !== income.periodStart,
          ),
          income,
        ],
      }))
    },
    addExpense(expense: Expense) {
      update((current) => ({
        ...current,
        expenses: [...current.expenses, expense],
      }))
    },
    updateExpense(id: string, changes: Partial<Expense>) {
      update((current) => ({
        ...current,
        expenses: current.expenses.map((expense) =>
          expense.id === id ? { ...expense, ...changes } : expense,
        ),
      }))
    },
    deleteExpense(id: string) {
      update((current) => ({
        ...current,
        expenses: current.expenses.filter((expense) => expense.id !== id),
      }))
    },
    receiveInboxItems(items: InboxItem[]): string[] {
      const merged = mergeInboxItems(dataRef.current.inbox, items)
      const next = { ...dataRef.current, inbox: merged.items }
      if (!saveStore(next)) return []

      dataRef.current = next
      setData(next)
      return merged.deleteIds
    },
    discardInboxItem(id: string) {
      update((current) => ({
        ...current,
        inbox: current.inbox.filter((item) => item.id !== id),
      }))
    },
    recordInboxItems(ids: string[]) {
      const selected = new Set(ids)
      update((current) => {
        const items = current.inbox.filter((item) => selected.has(item.id))
        return {
          ...current,
          expenses: [
            ...current.expenses,
            ...items.map((item) => ({
              id: crypto.randomUUID(),
              amount: item.amount,
              at: item.receivedAt,
              ...(item.note ? { note: item.note } : {}),
            })),
          ],
          inbox: current.inbox.filter((item) => !selected.has(item.id)),
        }
      })
    },
  }
}
