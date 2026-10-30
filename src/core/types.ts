export type Yen = number

export type Verdict = 'needed' | 'unneeded'

export interface Expense {
  id: string
  amount: Yen
  at: string
  note?: string
  verdict?: Verdict
}

export type Savings =
  | { mode: 'amount'; amount: Yen }
  | { mode: 'percent'; percent: number }

export type FixedCosts =
  | { mode: 'total'; total: Yen }
  | {
      mode: 'items'
      items: { id: string; name: string; amount: Yen }[]
    }

export type LeftoverPolicy = 'toSavings' | 'carryOver'

export interface Income {
  periodStart: string
  amount: Yen
}

export interface Settings {
  payday: number
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  savings: Savings
  fixedCosts: FixedCosts
  leftover: LeftoverPolicy
  startedAt: string
  initialFree: Yen
}
