import { formatDay, formatTime, yen } from '../format'
import type { InboxItem } from '../inbox'

interface InboxProps {
  items: InboxItem[]
  onBack: () => void
  onRecord: (ids: string[]) => void
  onDiscard: (id: string) => void
}

export function Inbox({ items, onBack, onRecord, onDiscard }: InboxProps) {
  return (
    <main className="screen inbox-screen">
      <header className="screen-header">
        <button className="text-button" onClick={onBack}>戻る</button>
        <div><h1>Apple Pay から届いた支払い</h1></div>
      </header>

      <div className="inbox-list">
        {items.map((item) => {
          const receivedAt = new Date(item.receivedAt)
          return (
            <article className="inbox-item" key={item.id}>
              <div className="inbox-item-details">
                <time dateTime={item.receivedAt}>
                  {formatDay(receivedAt)} {formatTime(receivedAt)}
                </time>
                <span>{item.note || '店名なし'}</span>
                <strong className="num">{yen(item.amount)}</strong>
              </div>
              <div className="inbox-item-actions">
                <button onClick={() => onDiscard(item.id)}>捨てる</button>
                <button className="dark" onClick={() => onRecord([item.id])}>
                  記録する
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {items.length > 0 && (
        <button
          className="primary-button inbox-record-all"
          onClick={() => onRecord(items.map((item) => item.id))}
        >
          全部記録する
        </button>
      )}
    </main>
  )
}
