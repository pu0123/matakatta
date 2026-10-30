import { useState } from 'react'
import { leftAfterExpense, type CurrentBudget } from '../core/budget'
import type { Expense } from '../core/types'
import { formatNumber, yen } from '../format'
import { noteSuggestions } from '../noteSuggestions'

interface EntryProps {
  budget: CurrentBudget
  expenses: Expense[]
  onCancel: () => void
  onRecord: (expense: Expense) => void
}

export function Entry({ budget, expenses, onCancel, onRecord }: EntryProps) {
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  const [when, setWhen] = useState<'today' | 'yesterday'>('today')
  const amount = Number(digits || 0)
  const suggestions = noteSuggestions(expenses)

  const leftAfter = leftAfterExpense(budget, amount)

  const press = (key: string) => {
    if (key === 'back') {
      setDigits((currentDigits) => currentDigits.slice(0, -1))
      return
    }
    setDigits((currentDigits) => {
      const next = `${currentDigits}${key}`.replace(/^0+(?=\d)/, '')
      return next.slice(0, 7)
    })
  }

  const record = () => {
    if (amount === 0) return
    const at = new Date()
    if (when === 'yesterday') at.setDate(at.getDate() - 1)
    onRecord({
      id: crypto.randomUUID(),
      amount,
      at: at.toISOString(),
      ...(note.trim() ? { note: note.trim() } : {}),
    })
  }

  return (
    <main className="screen entry-screen">
      <header className="entry-top">
        <button className="text-button" onClick={onCancel}>やめる</button>
        <div className="date-toggle" aria-label="記録する日">
          <button className={when === 'today' ? 'selected' : ''} onClick={() => setWhen('today')}>
            今日
          </button>
          <span aria-hidden="true">｜</span>
          <button className={when === 'yesterday' ? 'selected' : ''} onClick={() => setWhen('yesterday')}>
            昨日
          </button>
        </div>
      </header>

      <div className="entry-amount num"><small>¥</small>{formatNumber(amount)}</div>
      <div className="after-entry num">
        {leftAfter >= 0
          ? `記録すると今週あと ${yen(leftAfter)}`
          : `記録すると今週 ${yen(-leftAfter)} オーバー`}
      </div>

      <div className="memo-area">
        <label>
          <span className="sr-only">メモ</span>
          <input
            value={note}
            maxLength={30}
            placeholder="メモ（なくても可）"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {suggestions.length > 0 && (
          <div className="chips" aria-label="過去のメモ候補">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => setNote(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}
      </div>

      <div className="keypad num">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((key) => (
          <button key={key} onClick={() => press(key)}>{key}</button>
        ))}
        <button aria-label="1桁消す" onClick={() => press('back')}>←</button>
        <button className="keypad-submit" disabled={amount === 0} onClick={record}>記録する</button>
      </div>
    </main>
  )
}
