import { useMemo, useState } from 'react'
import { AmountInput } from '../components/AmountInput'
import {
  budgetBreakdown,
  closedPeriods,
  type CurrentBudget,
} from '../core/budget'
import type { Expense, Income, Settings } from '../core/types'
import { dateKey, dayBefore, formatNumber, yen } from '../format'

interface PaydayProps {
  settings: Settings
  expenses: Expense[]
  incomes: Income[]
  budget: CurrentBudget
  onSave: (income: Income) => void
  onCancel: () => void
}

export function Payday({
  settings,
  expenses,
  incomes,
  budget,
  onSave,
  onCancel,
}: PaydayProps) {
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
          <small>¥</small>{formatNumber(Math.abs(breakdown.free))}
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
