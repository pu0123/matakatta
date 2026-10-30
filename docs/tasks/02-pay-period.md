# 02 給料日区切りへの作り直し

## なぜ
01 は「毎週の予算を自分で決める」前提だった。バイトなど収入が月ごとに変わる人には合わない。
人が決めるのは **収入・固定費・貯金** の3つだけにし、**自由に使えるお金はその答えとして出す**。
区切りは暦の月ではなく **給料日から次の給料日まで**（以下「期間」）。

ホームの表示は引き続き「今週あといくら」。期間の自由なお金を日割りし、週ごとに配る。

## 変更範囲
- `src/core/types.ts` を下の型に置き換える（`weeklyBudget` は廃止）
- `src/core/period.ts` を新設（期間の区切り）
- `src/core/budget.ts` を作り直す（期間 → 週の配分 → 残額）
- `src/core/review.ts` は `pendingReview` の引数変更に合わせるだけ
- `week.ts` はそのまま使う
- テストは仕様に合わせて書き直す。01 の境界テスト（週の境目・日曜始まり・赤字の連鎖）は形を変えて残す

## 型
```ts
type Yen = number // 整数のみ
type Verdict = 'needed' | 'unneeded'
interface Expense { id: string; amount: Yen; at: string; verdict?: Verdict }

type Savings =
  | { mode: 'amount'; amount: Yen }      // 毎期この額
  | { mode: 'percent'; percent: number } // 収入の n%（0〜100、円未満切り捨て）

type FixedCosts =
  | { mode: 'total'; total: Yen }
  | { mode: 'items'; items: { id: string; name: string; amount: Yen }[] }

type LeftoverPolicy = 'toSavings' | 'carryOver'

interface Income { periodStart: string /* 'YYYY-MM-DD' その期間の開始日 */; amount: Yen }

interface Settings {
  payday: number                 // 1〜31
  weekStartsOn: 0|1|2|3|4|5|6    // 既定 1
  savings: Savings
  fixedCosts: FixedCosts
  leftover: LeftoverPolicy
  startedAt: string              // ISO。使い始めた日時
  initialFree: Yen               // 使い始めた日から最初の給料日までに使えるお金（初期設定で本人が入れる）
}
```

## 期間（period.ts）
- `payDate(year, month, payday)`：その月の給料日。月末より大きい payday は月末に丸める（31日払いの2月は28/29日）。
- `periodOf(date, payday)` → `{ start: Date, end: Date }` 半開区間。start は date 以前で最も近い給料日の 0:00。
- **最初の期間だけ特別**：`startedAt` の日の 0:00 から、次の給料日まで。自由なお金は `initialFree` をそのまま使う
  （途中から使い始めた人に、その期間の収入を聞いても意味がないため）。
- `startedAt` がちょうど給料日なら、最初の期間は通常の期間と同じ区切りになるが、自由なお金は `initialFree`。

## 期間の自由なお金
通常の期間 p について：
```
income_p   = その期間の Income。無ければ直近の過去の Income を見込みとして使う（isEstimate = true）。過去にも無ければ 0
fixed      = total か items の合計
savings_p  = amount そのまま / percent なら floor(income_p * percent / 100)
base_p     = income_p − fixed − savings_p
free_p     = base_p + carryIn_p − deficitIn_p
```
- `deficitIn_p`：前の期間で使いすぎた分 `max(0, spent − free)`。方針によらず必ず引く。
- `carryIn_p`：前の期間の余り `max(0, free − spent)`。`leftover === 'carryOver'` のときだけ足す。
  `toSavings` のときは足さず、その額を「貯金に回した額」として記録する（下の closedPeriods）。
- `free_p` は負になりうる（固定費＋貯金が収入を上回る）。そのまま返し、`overcommitted: true` を立てる。

## 週への配分
期間を週の区切り（week.ts）で切った断片を「区間」と呼ぶ。給料日をまたぐ週は2つの区間に分かれる。
- 区間 s の配分 `a_s = floor(free_p * 区間の日数 / 期間の日数)`。端数は **期間の最後の区間** に足して、合計が free_p と一致するようにする。
- 区間の予算 `b_s = a_s − 同じ期間内の直前の区間からの赤字`。赤字 = `max(0, spent_s − b_s)`。連鎖する。
  期間の最初の区間は前の期間からの赤字を持ち込まない（free_p の deficitIn で既に引いているため。二重に引かない）。
- 区間の余りは次の区間へ持ち越さない（01 と同じ方針）。余りは期間の終わりにまとめて扱う。
- free_p が負のとき、各区間の配分も負になってよい。perDay は 0。

## 公開する関数（budget.ts）
```ts
current(expenses, incomes, now, settings) → {
  period: { start, end, free, income, isEstimate, overcommitted, spent, left /* free − spent */ },
  week:   { start, end /* 区間 */, budget, carriedDeficit, spent, left, perDay, daysLeft },
}
closedPeriods(expenses, incomes, now, settings) → Array<{
  start, end, free, spent,
  leftover: Yen        // max(0, free − spent)
  savedFromLeftover: Yen // toSavings なら leftover、carryOver なら 0
  deficit: Yen          // max(0, spent − free)
}>  // 終わった期間だけ、古い順
```
- `daysLeft` は今日を含めた **区間の** 残り日数。`perDay = left > 0 ? floor(left / daysLeft) : 0`。
- `startedAt` より前の支出はどこにも数えない。

## review.ts
- `pendingReview(expenses, now, settings)`：今の **週の開始** より前で未判定のもの（古い順）。週の区切りで振り返るので、期間ではなく週で判定する。
- `unneededTotal` はそのまま。

## テストで必ず押さえる境界
- 31日払いで2月（閏年と平年）、30日の月
- 給料日をまたぐ週が2区間に分かれ、日数で正しく配分される
- 配分の合計が free_p と一致する（端数の寄せ先）
- 最初の期間は initialFree を使い、収入を見ない
- 収入が未入力の期間は直近の収入を見込みに使い、isEstimate が立つ。過去にも無ければ 0
- 貯金の percent で端数切り捨て
- toSavings と carryOver で次の期間の free が変わる。toSavings は savedFromLeftover に出る
- 期間をまたいだ赤字は次の期間の free から1回だけ引かれる（二重に引かない）
- 区間内の赤字の連鎖と、余った区間の次は持ち越し0
- 固定費＋貯金 > 収入 で overcommitted、perDay 0
- タイムゾーンは Asia/Tokyo 固定（既存の vitest 設定のまま）

## 守ること
- 外部ライブラリを足さない
- 画面（App.tsx など）には触れない
- コメントは日本語で、理由が必要な所にだけ短く
- 終わったら `npx vitest run`・`npx tsc -b`・`npm run lint` が通ること
- 最後に、実装した内容と、仕様で判断に迷った点を短く報告する
