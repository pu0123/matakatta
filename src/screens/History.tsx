import { useState } from 'react'
import type { CurrentBudget } from '../core/budget'
import type { Expense } from '../core/types'
import { dateKey, formatDay, formatTime, yen } from '../format'

interface HistoryProps {
  expenses: Expense[]
  budget: CurrentBudget
  onBack: () => void
  onUpdate: (id: string, changes: Partial<Expense>) => void
  onDelete: (id: string) => void
}

interface ExpenseDay {
  key: string
  date: Date
  expenses: Expense[]
}

export function History({ expenses, budget, onBack, onUpdate, onDelete }: HistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const periodExpenses = expenses
    .filter((expense) => {
      const at = new Date(expense.at)
      return at >= budget.period.start && at < budget.period.end
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const editing = periodExpenses.find((expense) => expense.id === editingId)
  const days = periodExpenses.reduce<ExpenseDay[]>((groups, expense) => {
    const date = new Date(expense.at)
    const key = dateKey(date)
    const current = groups[groups.length - 1]
    if (current?.key === key) {
      current.expenses.push(expense)
    } else {
      groups.push({ key, date, expenses: [expense] })
    }
    return groups
  }, [])

  if (editing) {
    return (
      <main className="screen records-screen edit-record-screen">
        <header className="list-header">
          <button className="text-button" onClick={() => setEditingId(null)}>戻る</button>
          <h1>記録を直す</h1>
        </header>
        <div className="edit-amount num">{yen(editing.amount)}</div>
        <label className="edit-note-field">
          <span>メモ</span>
          <input
            value={editNote}
            maxLength={30}
            placeholder="メモ（なくても可）"
            onChange={(event) => setEditNote(event.target.value)}
          />
        </label>
        <button
          className="primary-button"
          onClick={() => {
            onUpdate(editing.id, { note: editNote.trim() || undefined })
            setEditingId(null)
          }}
        >
          保存する
        </button>
        {confirming ? (
          <div className="delete-confirm">
            <p>この記録を削除しますか</p>
            <div>
              <button onClick={() => setConfirming(false)}>やめる</button>
              <button
                className="danger"
                onClick={() => {
                  onDelete(editing.id)
                  setEditingId(null)
                }}
              >
                削除する
              </button>
            </div>
          </div>
        ) : (
          <button className="delete-button" onClick={() => setConfirming(true)}>削除</button>
        )}
      </main>
    )
  }

  return (
    <main className="screen records-screen">
      <header className="list-header">
        <button className="text-button" onClick={onBack}>戻る</button>
        <h1>記録</h1>
      </header>
      {days.length === 0 ? (
        <p className="empty-state">今の期間の記録はありません</p>
      ) : (
        <div className="record-list">
          {days.map((day) => (
            <section key={day.key}>
              <h2>{formatDay(day.date)}</h2>
              <div className="record-day-card">
                {day.expenses.map((expense) => {
                  const at = new Date(expense.at)
                  return (
                    <button
                      key={expense.id}
                      className="record-row"
                      onClick={() => {
                        setEditingId(expense.id)
                        setEditNote(expense.note ?? '')
                        setConfirming(false)
                      }}
                    >
                      <span>
                        <span className="record-time">{formatTime(at)}</span>
                        <span className={expense.note ? '' : 'muted'}>{expense.note || 'メモなし'}</span>
                        {expense.verdict === 'unneeded' && (
                          <small className="unneeded-mark">要らなかった</small>
                        )}
                      </span>
                      <strong className="num">{yen(expense.amount)}</strong>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
