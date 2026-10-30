import { useEffect, useMemo, useState } from 'react'
import {
  budgetBreakdown,
  closedPeriods,
  current,
  initialFreeFor,
  leftAfterExpense,
  type CurrentBudget,
} from './core/budget'
import { periodOf } from './core/period'
import { pendingReview, unneededSummary } from './core/review'
import type {
  Expense,
  FixedCosts,
  Income,
  LeftoverPolicy,
  Savings,
  Settings,
} from './core/types'
import { weekRange } from './core/week'
import { noteSuggestions } from './noteSuggestions'
import { useStore } from './useStore'
import './styles.css'

type Screen = 'home' | 'entry' | 'review' | 'payday' | 'records' | 'settings'

const yenFormatter = new Intl.NumberFormat('ja-JP')
const weekdays = ['日', '月', '火', '水', '木', '金', '土']

function yen(value: number): string {
  return `${value < 0 ? '−' : ''}¥${yenFormatter.format(Math.abs(value))}`
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function dayBefore(date: Date): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - 1)
  return result
}

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDay(date: Date): string {
  return `${formatMonthDay(date)}（${weekdays[date.getDay()]}）`
}

function formatWeek(start: Date, end: Date): string {
  return `${formatDay(start)}〜 ${formatDay(dayBefore(end))}`
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function makeId(): string {
  return crypto.randomUUID()
}

function clamp(value: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  const safe = Number.isFinite(value) ? value : minimum
  return Math.min(Math.max(minimum, Math.floor(safe)), maximum)
}

function AmountInput({
  value,
  onChange,
  label,
  max,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  max?: number
}) {
  return (
    <label className="amount-input">
      <span aria-hidden="true">¥</span>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === 0 ? '' : value}
        onChange={(event) =>
          onChange(clamp(Number(event.target.value.replace(/\D/g, '')), 0, max))
        }
      />
    </label>
  )
}

interface SettingsFormProps {
  existing: Settings | null
  incomes: Income[]
  editing?: boolean
  onCancel?: () => void
  onSave: (settings: Settings, forecast: Income) => void
}

function SettingsForm({
  existing,
  incomes,
  editing = false,
  onCancel,
  onSave,
}: SettingsFormProps) {
  const now = useMemo(() => new Date(), [])
  const latestIncome = [...incomes].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart),
  )[0]
  const [payday, setPayday] = useState(existing?.payday ?? 25)
  const [income, setIncome] = useState(latestIncome?.amount ?? 0)
  const [fixedMode, setFixedMode] = useState<FixedCosts['mode']>(
    existing?.fixedCosts.mode ?? 'total',
  )
  const [fixedTotal, setFixedTotal] = useState(
    existing?.fixedCosts.mode === 'total' ? existing.fixedCosts.total : 0,
  )
  const [fixedItems, setFixedItems] = useState(
    existing?.fixedCosts.mode === 'items' && existing.fixedCosts.items.length > 0
      ? existing.fixedCosts.items
      : [{ id: makeId(), name: '', amount: 0 }],
  )
  const [savingsMode, setSavingsMode] = useState<Savings['mode']>(
    existing?.savings.mode ?? 'amount',
  )
  const [savingsAmount, setSavingsAmount] = useState(
    existing?.savings.mode === 'amount' ? existing.savings.amount : 0,
  )
  const [savingsPercent, setSavingsPercent] = useState(
    existing?.savings.mode === 'percent' ? existing.savings.percent : 10,
  )
  const [leftover, setLeftover] = useState<LeftoverPolicy>(
    existing?.leftover ?? 'toSavings',
  )
  const [adjusting, setAdjusting] = useState(false)
  const [adjustedFree, setAdjustedFree] = useState(existing?.initialFree ?? 0)

  const fixedCosts: FixedCosts =
    fixedMode === 'total'
      ? { mode: 'total', total: fixedTotal }
      : { mode: 'items', items: fixedItems }
  const savings: Savings =
    savingsMode === 'amount'
      ? { mode: 'amount', amount: savingsAmount }
      : { mode: 'percent', percent: savingsPercent }
  const breakdown = budgetBreakdown({ fixedCosts, savings }, income)
  const payPeriod = periodOf(now, payday)
  const calculatedInitial = initialFreeFor(
    { payday, fixedCosts, savings },
    income,
    now,
  )
  const initialFree = editing
    ? existing?.initialFree ?? 0
    : adjusting
      ? adjustedFree
      : calculatedInitial

  const submit = () => {
    const settings: Settings = {
      payday,
      weekStartsOn: 1,
      savings,
      fixedCosts,
      leftover,
      startedAt: existing?.startedAt ?? now.toISOString(),
      initialFree,
    }
    const forecastStart = periodOf(now, payday).end
    onSave(settings, { periodStart: dateKey(forecastStart), amount: income })
  }

  const updateFixedItem = (
    id: string,
    changes: Partial<(typeof fixedItems)[number]>,
  ) => {
    setFixedItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    )
  }

  return (
    <main className="screen form-screen">
      <header className="screen-header">
        {editing && (
          <button className="text-button" onClick={onCancel}>
            戻る
          </button>
        )}
        <div>
          <h1>{editing ? '設定' : '最初に3つだけ'}</h1>
          <p>あとで変えられます。だいたいで大丈夫です。</p>
        </div>
      </header>

      <div className="form-rows">
        <label className="form-row">
          <span>給料日</span>
          <select
            aria-label="給料日"
            value={payday}
            onChange={(event) => setPayday(Number(event.target.value))}
          >
            {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                毎月{day}日
              </option>
            ))}
            <option value={31}>月末</option>
          </select>
        </label>

        <div className="form-row">
          <span className="row-label">
            手取り<small>先月の額でOK</small>
          </span>
          <AmountInput value={income} onChange={setIncome} label="手取り" />
        </div>

        <div className="form-row stacked-row">
          <div className="row-heading">
            <span className="row-label">
              固定費<small>家賃・スマホ・サブスクなど</small>
            </span>
            <div className="segmented" aria-label="固定費の入力方法">
              <button
                className={fixedMode === 'total' ? 'selected' : ''}
                onClick={() => setFixedMode('total')}
              >
                合計
              </button>
              <button
                className={fixedMode === 'items' ? 'selected' : ''}
                onClick={() => setFixedMode('items')}
              >
                内訳
              </button>
            </div>
          </div>
          {fixedMode === 'total' ? (
            <AmountInput
              value={fixedTotal}
              onChange={setFixedTotal}
              label="固定費の合計"
            />
          ) : (
            <div className="item-list">
              {fixedItems.map((item) => (
                <div className="item-inputs" key={item.id}>
                  <label>
                    <span className="sr-only">固定費の名前</span>
                    <input
                      value={item.name}
                      maxLength={20}
                      placeholder="名前"
                      onChange={(event) =>
                        updateFixedItem(item.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <AmountInput
                    value={item.amount}
                    onChange={(amount) => updateFixedItem(item.id, { amount })}
                    label={`${item.name || '固定費'}の金額`}
                  />
                  <button
                    className="remove-button"
                    aria-label="この内訳を削除"
                    disabled={fixedItems.length === 1}
                    onClick={() =>
                      setFixedItems((items) =>
                        items.filter((candidate) => candidate.id !== item.id),
                      )
                    }
                  >
                    −
                  </button>
                </div>
              ))}
              <div className="item-list-footer">
                <button
                  className="small-button"
                  onClick={() =>
                    setFixedItems((items) => [
                      ...items,
                      { id: makeId(), name: '', amount: 0 },
                    ])
                  }
                >
                  内訳を足す
                </button>
                <span className="num">合計 {yen(breakdown.fixedCosts)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="form-row stacked-row">
          <div className="row-heading">
            <span className="row-label">
              貯金<small>給料が入ったら先に分ける</small>
            </span>
            <div className="segmented" aria-label="貯金の入力方法">
              <button
                className={savingsMode === 'amount' ? 'selected' : ''}
                onClick={() => setSavingsMode('amount')}
              >
                金額
              </button>
              <button
                className={savingsMode === 'percent' ? 'selected' : ''}
                onClick={() => setSavingsMode('percent')}
              >
                割合
              </button>
            </div>
          </div>
          {savingsMode === 'amount' ? (
            <AmountInput
              value={savingsAmount}
              onChange={setSavingsAmount}
              label="貯金額"
            />
          ) : (
            <label className="percent-input">
              <input
                aria-label="貯金の割合"
                inputMode="numeric"
                value={savingsPercent}
                onChange={(event) =>
                  setSavingsPercent(clamp(Number(event.target.value), 0, 100))
                }
              />
              <span>%</span>
            </label>
          )}
        </div>

        <div className="form-row">
          <span>余ったら</span>
          <div className="segmented large" aria-label="余ったお金の扱い">
            <button
              className={leftover === 'toSavings' ? 'selected' : ''}
              onClick={() => setLeftover('toSavings')}
            >
              貯金へ
            </button>
            <button
              className={leftover === 'carryOver' ? 'selected' : ''}
              onClick={() => setLeftover('carryOver')}
            >
              次の月へ
            </button>
          </div>
        </div>
      </div>

      <section className="result-block">
        <p>次の給料日（{formatMonthDay(payPeriod.end)}）まで使えるお金</p>
        <strong className={`num ${initialFree < 0 ? 'minus' : ''}`}>
          <small>¥</small>
          {yenFormatter.format(Math.abs(initialFree))}
        </strong>
        {!editing && (
          adjusting ? (
            <div className="adjust-field">
              <AmountInput
                value={adjustedFree}
                onChange={setAdjustedFree}
                label="今の残り"
              />
              <button className="small-button" onClick={() => setAdjusting(false)}>
                自動計算に戻す
              </button>
            </div>
          ) : (
            <button
              className="inline-button"
              onClick={() => {
                setAdjustedFree(Math.max(0, calculatedInitial))
                setAdjusting(true)
              }}
            >
              今の残りに合わせる
            </button>
          )
        )}
      </section>

      <button className="primary-button" onClick={submit}>
        {editing ? '保存する' : 'はじめる'}
      </button>
    </main>
  )
}

interface HomeProps {
  budget: CurrentBudget
  settings: Settings
  expenses: Expense[]
  now: Date
  onNavigate: (screen: Screen) => void
  undo: Expense | null
  onUndo: () => void
}

function Home({ budget, settings, expenses, now, onNavigate, undo, onUndo }: HomeProps) {
  const reviews = pendingReview(expenses, now, settings)
  const firstPeriod =
    budget.period.start.getTime() === startOfDay(new Date(settings.startedAt)).getTime()
  const progress =
    budget.week.budget <= 0
      ? 100
      : Math.min(100, Math.max(0, (budget.week.spent / budget.week.budget) * 100))

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
            {yenFormatter.format(budget.week.left)}
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
        <span>今週分 {yen(budget.week.budget)}</span>
      </div>

      <div className="period-line">
        <span>給料日（{formatMonthDay(budget.period.end)}）まで</span>
        <span>あと <b className="num">{yen(budget.period.left)}</b></span>
      </div>

      <div className="notices">
        {budget.period.isEstimate && !firstPeriod && (
          <button onClick={() => onNavigate('payday')}>給料日の額を入れてください</button>
        )}
        {budget.period.overcommitted && (
          <button onClick={() => onNavigate('settings')}>
            固定費と貯金が手取りを上回っています
          </button>
        )}
        {reviews.length > 0 && (
          <button onClick={() => onNavigate('review')}>
            先週の振り返りが <span className="num">{reviews.length}件</span> 残っています
          </button>
        )}
      </div>

      <button className="primary-button spend-button" onClick={() => onNavigate('entry')}>
        使った
      </button>

      {undo && (
        <div className="toast" role="status">
          <span>{yen(undo.amount)} を記録しました</span>
          <button onClick={onUndo}>取り消す</button>
        </div>
      )}
    </main>
  )
}

function Entry({
  budget,
  expenses,
  onCancel,
  onRecord,
}: {
  budget: CurrentBudget
  expenses: Expense[]
  onCancel: () => void
  onRecord: (expense: Expense) => void
}) {
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  const [when, setWhen] = useState<'today' | 'yesterday'>('today')
  const amount = Number(digits || 0)
  const suggestions = noteSuggestions(expenses)

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
      id: makeId(),
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

      <div className="entry-amount num"><small>¥</small>{yenFormatter.format(amount)}</div>
      <div className="after-entry num">記録すると今週あと {yen(leftAfterExpense(budget, amount))}</div>

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

function Review({
  expenses,
  settings,
  onVerdict,
  onClose,
}: {
  expenses: Expense[]
  settings: Settings
  onVerdict: (id: string, verdict: 'needed' | 'unneeded') => void
  onClose: () => void
}) {
  const now = useMemo(() => new Date(), [])
  const pending = pendingReview(expenses, now, settings)
  const [total] = useState(pending.length)
  const item = pending[0]
  const currentWeek = weekRange(now, settings.weekStartsOn)
  const previousWeekStart = new Date(currentWeek.start)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const summary = unneededSummary(
    expenses,
    previousWeekStart,
    currentWeek.start,
  )

  if (!item) {
    return (
      <main className="screen review-screen review-complete">
        <div>
          <h1>先週の振り返りは終わりです</h1>
          <p>要らなかったお金</p>
          <strong className="num">{yen(summary.total)}</strong>
          <p>{summary.count}件</p>
        </div>
        <button className="primary-button" onClick={onClose}>ホームへ戻る</button>
      </main>
    )
  }

  const decide = (verdict: 'needed' | 'unneeded') => {
    onVerdict(item.id, verdict)
  }

  return (
    <main className="screen review-screen">
      <header>
        <h1>先週の振り返り</h1>
        <p>{total}件中 {total - pending.length + 1}件目</p>
      </header>

      <section className="review-card">
        <div className="review-when">{formatDay(new Date(item.at))} {formatTime(new Date(item.at))}</div>
        <div className={item.note ? 'review-note' : 'review-note muted'}>{item.note || 'メモなし'}</div>
        <strong className="num"><small>¥</small>{yenFormatter.format(item.amount)}</strong>
        <p>何に使ったか思い出せなくても大丈夫</p>
      </section>

      <div className="review-choices">
        <button onClick={() => decide('needed')}>要った</button>
        <button className="dark" onClick={() => decide('unneeded')}>要らなかった</button>
      </div>
      <button className="later-button" onClick={onClose}>あとで</button>

      <div className="review-tally">
        <span>先週なくてもよかったお金</span>
        <strong className="num">{yen(summary.total)}</strong>
      </div>
    </main>
  )
}

function Payday({
  settings,
  expenses,
  incomes,
  budget,
  onSave,
  onCancel,
}: {
  settings: Settings
  expenses: Expense[]
  incomes: Income[]
  budget: CurrentBudget
  onSave: (income: Income) => void
  onCancel: () => void
}) {
  const now = useMemo(() => new Date(), [])
  const [amount, setAmount] = useState(budget.period.income)
  const periods = closedPeriods(expenses, incomes, now, settings)
  const closed = periods[periods.length - 1]
  const breakdown = budgetBreakdown(settings, amount)

  return (
    <main className="screen form-screen payday-screen">
      <header className="screen-header">
        <button className="text-button" onClick={onCancel}>戻る</button>
        <div>
          <h1>給料日です</h1>
          <p>振り込まれた額を入れてください。月に1回だけです。</p>
        </div>
      </header>

      {closed && (
        <section className="closed-period">
          <div>
            <span>
              {closed.start.getMonth() + 1}/{closed.start.getDate()}〜
              {dayBefore(closed.end).getMonth() + 1}/{dayBefore(closed.end).getDate()} の自由なお金
            </span>
            <span className="num">{yen(closed.free)}</span>
          </div>
          <div><span>使った</span><span className="num">{yen(closed.spent)}</span></div>
          <div>
            <span>{closed.deficit > 0 ? '超過' : '余り'}</span>
            {closed.deficit > 0 ? (
              <strong className="num minus">{yen(closed.deficit)} オーバー → 今期から引かれます</strong>
            ) : (
              <strong className={`num ${settings.leftover === 'toSavings' ? 'ok' : ''}`}>
                {yen(closed.leftover)} → {settings.leftover === 'toSavings' ? '貯金へ' : '次の期間へ'}
              </strong>
            )}
          </div>
        </section>
      )}

      <section className="income-field">
        <p>今期の手取り</p>
        <AmountInput value={amount} onChange={setAmount} label="今期の手取り" />
      </section>

      <section className="result-block payday-result">
        <p>次の給料日までの自由なお金</p>
        <strong className={`num ${breakdown.free < 0 ? 'minus' : ''}`}>
          <small>¥</small>{yenFormatter.format(Math.abs(breakdown.free))}
        </strong>
        <div>固定費 {yen(breakdown.fixedCosts)}・貯金 {yen(breakdown.savings)} を引いた額</div>
      </section>

      <button
        className="primary-button"
        onClick={() => onSave({ periodStart: dateKey(budget.period.start), amount })}
      >
        これで始める
      </button>
    </main>
  )
}

function Records({
  expenses,
  budget,
  onBack,
  onUpdate,
  onDelete,
}: {
  expenses: Expense[]
  budget: CurrentBudget
  onBack: () => void
  onUpdate: (id: string, changes: Partial<Expense>) => void
  onDelete: (id: string) => void
}) {
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

  let previousDay = ''
  return (
    <main className="screen records-screen">
      <header className="list-header">
        <button className="text-button" onClick={onBack}>戻る</button>
        <h1>記録</h1>
      </header>
      {periodExpenses.length === 0 ? (
        <p className="empty-state">今の期間の記録はありません</p>
      ) : (
        <div className="record-list">
          {periodExpenses.map((expense) => {
            const at = new Date(expense.at)
            const key = dateKey(at)
            const showDay = key !== previousDay
            previousDay = key
            return (
              <div key={expense.id}>
                {showDay && <h2>{formatDay(at)}</h2>}
                <button
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
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

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
        <SettingsForm
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
          <Records
            expenses={store.expenses}
            budget={budget}
            onBack={() => setScreen('home')}
            onUpdate={store.updateExpense}
            onDelete={store.deleteExpense}
          />
        )
      case 'settings':
        return (
          <SettingsForm
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
