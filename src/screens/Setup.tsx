import { useMemo, useState } from 'react'
import { AmountInput } from '../components/AmountInput'
import { budgetBreakdown, initialFreeFor } from '../core/budget'
import { periodOf } from '../core/period'
import type {
  FixedCosts,
  Income,
  LeftoverPolicy,
  Savings,
  Settings,
} from '../core/types'
import { dateKey, formatMonthDay, formatNumber, yen } from '../format'

interface SetupProps {
  existing: Settings | null
  incomes: Income[]
  editing?: boolean
  onCancel?: () => void
  onSave: (settings: Settings, forecast: Income) => void
}

function clamp(value: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  const safe = Number.isFinite(value) ? value : minimum
  return Math.min(Math.max(minimum, Math.floor(safe)), maximum)
}

export function Setup({
  existing,
  incomes,
  editing = false,
  onCancel,
  onSave,
}: SetupProps) {
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
      : [{ id: crypto.randomUUID(), name: '', amount: 0 }],
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
                      { id: crypto.randomUUID(), name: '', amount: 0 },
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
        {editing ? (
          <>
            <p>1か月の自由なお金（手取り − 固定費 − 貯金）</p>
            <strong className={`num ${breakdown.free < 0 ? 'minus' : ''}`}>
              <small>¥</small>
              {formatNumber(Math.abs(breakdown.free))}
            </strong>
          </>
        ) : (
          <>
            <p>次の給料日（{formatMonthDay(payPeriod.end)}）まで使えるお金</p>
            <strong className={`num ${initialFree < 0 ? 'minus' : ''}`}>
              <small>¥</small>
              {formatNumber(Math.abs(initialFree))}
            </strong>
          </>
        )}
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
