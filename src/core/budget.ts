import type { Expense, Income, Settings, Yen } from './types'
import { periodOf, type PeriodRange } from './period'
import { weekRange } from './week'

export interface CurrentPeriod extends PeriodRange {
  free: Yen
  income: Yen
  isEstimate: boolean
  overcommitted: boolean
  spent: Yen
  left: Yen
}

export interface CurrentWeek extends PeriodRange {
  budget: Yen
  carriedDeficit: Yen
  spent: Yen
  left: Yen
  perDay: Yen
  daysLeft: number
}

export interface CurrentBudget {
  period: CurrentPeriod
  week: CurrentWeek
}

export interface ClosedPeriod extends PeriodRange {
  free: Yen
  spent: Yen
  leftover: Yen
  savedFromLeftover: Yen
  deficit: Yen
}

interface CalculatedPeriod extends PeriodRange {
  free: Yen
  income: Yen
  isEstimate: boolean
  spent: Yen
}

interface Segment extends PeriodRange {
  allocation: Yen
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function nextPeriod(range: PeriodRange, payday: Settings['payday']): PeriodRange {
  return periodOf(range.end, payday)
}

function spentBetween(expenses: Expense[], from: Date, to: Date): Yen {
  const fromTime = from.getTime()
  const toTime = to.getTime()

  return expenses.reduce((total, expense) => {
    const at = new Date(expense.at).getTime()
    return at >= fromTime && at < toTime ? total + expense.amount : total
  }, 0)
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function incomeForPeriod(
  incomes: Income[],
  periodStart: Date,
): { income: Yen; isEstimate: boolean } {
  const startKey = dateKey(periodStart)
  const entered = incomes.find((income) => income.periodStart === startKey)

  if (entered !== undefined) {
    return { income: entered.amount, isEstimate: false }
  }

  const previous = incomes
    .filter((income) => income.periodStart < startKey)
    .sort((first, second) =>
      second.periodStart.localeCompare(first.periodStart),
    )[0]

  return {
    income: previous?.amount ?? 0,
    isEstimate: true,
  }
}

function fixedCosts(settings: Settings): Yen {
  return settings.fixedCosts.mode === 'total'
    ? settings.fixedCosts.total
    : settings.fixedCosts.items.reduce((total, item) => total + item.amount, 0)
}

function savingsForIncome(settings: Settings, income: Yen): Yen {
  return settings.savings.mode === 'amount'
    ? settings.savings.amount
    : Math.floor((income * settings.savings.percent) / 100)
}

function firstPeriod(settings: Settings): PeriodRange {
  const start = startOfDay(new Date(settings.startedAt))
  return { start, end: periodOf(start, settings.payday).end }
}

function calculatedPeriodsThrough(
  expenses: Expense[],
  incomes: Income[],
  target: Date,
  settings: Settings,
): CalculatedPeriod[] {
  const periods: CalculatedPeriod[] = []
  let range = firstPeriod(settings)

  while (range.start <= target) {
    const spent = spentBetween(expenses, range.start, range.end)

    if (periods.length === 0) {
      periods.push({
        ...range,
        free: settings.initialFree,
        income: 0,
        isEstimate: false,
        spent,
      })
    } else {
      const previous = periods[periods.length - 1]
      const deficitIn = Math.max(0, previous.spent - previous.free)
      const previousLeftover = Math.max(0, previous.free - previous.spent)
      const carryIn =
        settings.leftover === 'carryOver' ? previousLeftover : 0
      const { income, isEstimate } = incomeForPeriod(incomes, range.start)
      const base =
        income - fixedCosts(settings) - savingsForIncome(settings, income)

      periods.push({
        ...range,
        free: base + carryIn - deficitIn,
        income,
        isEstimate,
        spent,
      })
    }

    range = nextPeriod(range, settings.payday)
  }

  return periods
}

function calendarDays(from: Date, to: Date): number {
  let days = 0
  const cursor = startOfDay(from)

  while (cursor < to) {
    cursor.setDate(cursor.getDate() + 1)
    days += 1
  }

  return days
}

function segmentsForPeriod(
  period: CalculatedPeriod,
  settings: Settings,
): Segment[] {
  const ranges: PeriodRange[] = []
  let start = period.start

  while (start < period.end) {
    const weekEnd = weekRange(start, settings.weekStartsOn).end
    const end = weekEnd < period.end ? weekEnd : period.end
    ranges.push({ start, end })
    start = end
  }

  const periodDays = calendarDays(period.start, period.end)
  let allocated = 0

  return ranges.map((range, index) => {
    const allocation =
      index === ranges.length - 1
        ? period.free - allocated
        : Math.floor(
            (period.free * calendarDays(range.start, range.end)) / periodDays,
          )
    allocated += allocation
    return { ...range, allocation }
  })
}

function currentWeek(
  expenses: Expense[],
  now: Date,
  period: CalculatedPeriod,
  settings: Settings,
): CurrentWeek {
  const segments = segmentsForPeriod(period, settings)
  let carriedDeficit = 0

  for (const segment of segments) {
    const budget = segment.allocation - carriedDeficit
    const spent = spentBetween(expenses, segment.start, segment.end)

    if (now >= segment.start && now < segment.end) {
      const left = budget - spent
      const daysLeft = calendarDays(startOfDay(now), segment.end)

      return {
        start: segment.start,
        end: segment.end,
        budget,
        carriedDeficit,
        spent,
        left,
        perDay: left > 0 ? Math.floor(left / daysLeft) : 0,
        daysLeft,
      }
    }

    carriedDeficit = Math.max(0, spent - budget)
  }

  throw new Error('現在日時を含む区間がありません')
}

export function current(
  expenses: Expense[],
  incomes: Income[],
  now: Date,
  settings: Settings,
): CurrentBudget {
  const startedAt = new Date(settings.startedAt).getTime()
  const activeExpenses = expenses.filter(
    (expense) => new Date(expense.at).getTime() >= startedAt,
  )
  const periods = calculatedPeriodsThrough(
    activeExpenses,
    incomes,
    now,
    settings,
  )
  const period = periods[periods.length - 1]

  if (period === undefined) {
    throw new Error('利用開始日時以降の日付を指定してください')
  }

  const left = period.free - period.spent

  return {
    period: {
      start: period.start,
      end: period.end,
      free: period.free,
      income: period.income,
      isEstimate: period.isEstimate,
      overcommitted: period.free < 0,
      spent: period.spent,
      left,
    },
    week: currentWeek(activeExpenses, now, period, settings),
  }
}

export function closedPeriods(
  expenses: Expense[],
  incomes: Income[],
  now: Date,
  settings: Settings,
): ClosedPeriod[] {
  const startedAt = new Date(settings.startedAt).getTime()
  const activeExpenses = expenses.filter(
    (expense) => new Date(expense.at).getTime() >= startedAt,
  )

  return calculatedPeriodsThrough(activeExpenses, incomes, now, settings)
    .filter((period) => period.end <= now)
    .map((period) => {
      const leftover = Math.max(0, period.free - period.spent)
      return {
        start: period.start,
        end: period.end,
        free: period.free,
        spent: period.spent,
        leftover,
        savedFromLeftover:
          settings.leftover === 'toSavings' ? leftover : 0,
        deficit: Math.max(0, period.spent - period.free),
      }
    })
}
