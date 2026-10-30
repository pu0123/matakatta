import { useEffect, useState } from 'react'
import { current, type CurrentBudget } from './core/budget'
import type { Expense } from './core/types'
import { Entry } from './screens/Entry'
import { History } from './screens/History'
import { Home } from './screens/Home'
import { Payday } from './screens/Payday'
import { Review } from './screens/Review'
import { Setup } from './screens/Setup'
import type { Screen } from './screens/types'
import { useStore } from './useStore'
import './styles.css'

function App() {
  const store = useStore()
  const [screen, setScreen] = useState<Screen>('home')
  const [undo, setUndo] = useState<Expense | null>(null)
  const now = new Date()

  useEffect(() => {
    if (!undo) return
    const timer = window.setTimeout(() => setUndo(null), 5000)
    return () => window.clearTimeout(timer)
  }, [undo])

  if (!store.settings) {
    return (
      <div className="app-shell">
        <Setup
          existing={null}
          incomes={store.incomes}
          onSave={(settings, forecast) => store.saveSetup(settings, forecast)}
        />
      </div>
    )
  }

  if (now.getTime() < new Date(store.settings.startedAt).getTime()) {
    return <div className="app-shell"><main className="screen date-error">日付を確認してください</main></div>
  }

  let budget: CurrentBudget
  try {
    budget = current(store.expenses, store.incomes, now, store.settings)
  } catch {
    return <div className="app-shell"><main className="screen date-error">日付を確認してください</main></div>
  }

  const content = (() => {
    switch (screen) {
      case 'entry':
        return (
          <Entry
            budget={budget}
            expenses={store.expenses}
            onCancel={() => setScreen('home')}
            onRecord={(expense) => {
              store.addExpense(expense)
              setUndo(expense)
              setScreen('home')
            }}
          />
        )
      case 'review':
        return (
          <Review
            expenses={store.expenses}
            settings={store.settings}
            onVerdict={(id, verdict) => store.updateExpense(id, { verdict })}
            onClose={() => setScreen('home')}
          />
        )
      case 'payday':
        return (
          <Payday
            settings={store.settings}
            expenses={store.expenses}
            incomes={store.incomes}
            budget={budget}
            onCancel={() => setScreen('home')}
            onSave={(income) => {
              store.saveIncome(income)
              setScreen('home')
            }}
          />
        )
      case 'records':
        return (
          <History
            expenses={store.expenses}
            budget={budget}
            onBack={() => setScreen('home')}
            onUpdate={store.updateExpense}
            onDelete={store.deleteExpense}
          />
        )
      case 'settings':
        return (
          <Setup
            existing={store.settings}
            incomes={store.incomes}
            editing
            onCancel={() => setScreen('home')}
            onSave={(settings, forecast) => {
              store.saveSetup(settings, forecast)
              setScreen('home')
            }}
          />
        )
      default:
        return (
          <Home
            budget={budget}
            settings={store.settings}
            expenses={store.expenses}
            now={now}
            onNavigate={setScreen}
            undo={undo}
            onUndo={() => {
              if (undo) store.deleteExpense(undo.id)
              setUndo(null)
            }}
          />
        )
    }
  })()

  return <div className="app-shell">{content}</div>
}

export default App
