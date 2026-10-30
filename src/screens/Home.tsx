import type { CurrentBudget } from '../core/budget'
import { pendingReview } from '../core/review'
import type { Expense, Settings } from '../core/types'
import { formatMonthDay, formatNumber, formatWeek, yen } from '../format'
import type { Screen } from './types'

interface HomeProps {
  budget: CurrentBudget
  settings: Settings
  expenses: Expense[]
  now: Date
  onNavigate: (screen: Screen) => void
  undo: Expense | null
  onUndo: () => void
  inboxCount: number
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function Home({ budget, settings, expenses, now, onNavigate, undo, onUndo, inboxCount }: HomeProps) {
  const reviews = pendingReview(expenses, now, settings)
  const firstPeriod =
    budget.period.start.getTime() === startOfDay(new Date(settings.startedAt)).getTime()
  const progress =
    budget.week.budget <= 0
      ? 100
      : Math.min(100, Math.max(0, (budget.week.spent / budget.week.budget) * 100))
  const missingEstimatedIncome = budget.period.isEstimate && budget.period.income === 0

  return (
    <main className="screen home-screen">
      <div className="home-top">
        <div className="week-label">{formatWeek(budget.week.start, budget.week.end)}</div>
        <nav aria-label="補助メニュー">
          <button onClick={() => onNavigate('records')}>記録</button>
          <button onClick={() => onNavigate('settings')}>設定</button>
        </nav>
      </div>

      <section className="hero-balance">
        <p>今週あと使えるのは</p>
        {budget.week.left >= 0 ? (
          <strong className="big-amount num">
            <small>¥</small>
            {formatNumber(budget.week.left)}
          </strong>
        ) : (
          <>
            <strong className="big-amount over num">
              {yen(Math.abs(budget.week.left))} オーバー
            </strong>
            <div className="over-note">来週の分から引かれます</div>
          </>
        )}
        <div className="per-day">
          1日あたり <b className="num">{yen(budget.week.perDay)}</b>（あと
          {budget.week.daysLeft}日）
        </div>
      </section>

      <div
        className="progress"
        role="progressbar"
        aria-label="今週の予算の進み具合"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-label">
        <span>使った {yen(budget.week.spent)}</span>
        <span>今週分 {yen(Math.max(0, budget.week.budget))}</span>
      </div>

      <div className="period-line">
        <span>給料日（{formatMonthDay(budget.period.end)}）まで</span>
        <span>あと <b className="num">{yen(budget.period.left)}</b></span>
      </div>

      <div className="notices">
        {inboxCount > 0 && (
          <button onClick={() => onNavigate('inbox')}>
            Apple Pay から <span className="num">{inboxCount}件</span> 届いています
          </button>
        )}
        {budget.period.isEstimate && !firstPeriod && (
          <button onClick={() => onNavigate('payday')}>給料日の額を入れてください</button>
        )}
        {budget.period.overcommitted && !missingEstimatedIncome && (
          <button onClick={() => onNavigate('settings')}>
            固定費と貯金が手取りを上回っています
          </button>
        )}
        {reviews.length > 0 && (
          <button onClick={() => onNavigate('review')}>
            振り返りが <span className="num">{reviews.length}件</span> 残っています
          </button>
        )}
      </div>

      <div className="home-actions">
        {undo && (
          <div className="toast" role="status">
            <span>{yen(undo.amount)} を記録しました</span>
            <button onClick={onUndo}>取り消す</button>
          </div>
        )}
        <button className="primary-button spend-button" onClick={() => onNavigate('entry')}>
          使った
        </button>
      </div>
    </main>
  )
}
