import { useEffect, useState } from 'react'
import type { Expense, Income, Settings } from './core/types'
import { loadStore, saveStore, type StoredData } from './storage'

export function useStore() {
  const [data, setData] = useState<StoredData>(loadStore)

  useEffect(() => {
    saveStore(data)
  }, [data])

  const update = (updater: (current: StoredData) => StoredData) => {
    setData((current) => updater(current))
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
  }
}
