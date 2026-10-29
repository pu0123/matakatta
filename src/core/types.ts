export type Yen = number

export type Verdict = 'needed' | 'unneeded'

export interface Expense {
  id: string
  amount: Yen
  at: string
  verdict?: Verdict
}

export interface Settings {
  weeklyBudget: Yen
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  startedAt: string
}
