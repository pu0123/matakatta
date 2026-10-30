import { useMemo, useState } from 'react'
import { pendingReview } from '../core/review'
import type { Expense, Settings } from '../core/types'
import { formatDay, formatNumber, formatTime, yen } from '../format'

interface ReviewProps {
  expenses: Expense[]
  settings: Settings
  onVerdict: (id: string, verdict: 'needed' | 'unneeded') => void
  onClose: () => void
}

export function Review({ expenses, settings, onVerdict, onClose }: ReviewProps) {
  const now = useMemo(() => new Date(), [])
  const pending = pendingReview(expenses, now, settings)
  const [total] = useState(pending.length)
  const [unneeded, setUnneeded] = useState({ total: 0, count: 0 })
  const item = pending[0]

  if (!item) {
    return (
      <main className="screen review-screen review-complete">
        <div>
          <h1>振り返りは終わりです</h1>
          <p>なくてもよかったお金（今回）</p>
          <strong className="num">{yen(unneeded.total)}</strong>
          <p>{unneeded.count}件</p>
        </div>
        <button className="primary-button" onClick={onClose}>ホームへ戻る</button>
      </main>
    )
  }

  const decide = (verdict: 'needed' | 'unneeded') => {
    if (verdict === 'unneeded') {
      setUnneeded((summary) => ({
        total: summary.total + item.amount,
        count: summary.count + 1,
      }))
    }
    onVerdict(item.id, verdict)
  }

  return (
    <main className="screen review-screen">
      <header>
        <h1>振り返り</h1>
        <p>{total}件中 {total - pending.length + 1}件目</p>
      </header>

      <section className="review-card">
        <div className="review-when">{formatDay(new Date(item.at))} {formatTime(new Date(item.at))}</div>
        <div className={item.note ? 'review-note' : 'review-note muted'}>{item.note || 'メモなし'}</div>
        <strong className="num"><small>¥</small>{formatNumber(item.amount)}</strong>
        {!item.note && <p>何に使ったか思い出せなくても大丈夫</p>}
      </section>

      <div className="review-choices">
        <button onClick={() => decide('needed')}>要った</button>
        <button className="dark" onClick={() => decide('unneeded')}>要らなかった</button>
      </div>
      <button className="later-button" onClick={onClose}>あとで</button>

      <div className="review-tally">
        <span>なくてもよかったお金（今回）</span>
        <strong className="num">{yen(unneeded.total)}</strong>
      </div>
    </main>
  )
}
