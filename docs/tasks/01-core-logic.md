# 01 予算計算のコア（画面なし）

## 目的
「今週あと使える額」を出す純粋な計算部分を作る。画面・保存・React には一切触れない。

## 置き場所
- `src/core/types.ts` 型定義
- `src/core/week.ts` 週の区切り
- `src/core/budget.ts` 残額・1日あたり・繰り越し
- `src/core/review.ts` 振り返りの集計
- 各ファイルに対応する `*.test.ts`（Vitest）
- `package.json` に `"test": "vitest run"` を追加

## 型
```ts
type Yen = number; // 整数のみ。小数は扱わない
type Verdict = 'needed' | 'unneeded';
interface Expense { id: string; amount: Yen; at: string /* ISO 8601 */; verdict?: Verdict }
interface Settings { weeklyBudget: Yen; weekStartsOn: 0|1|2|3|4|5|6 /* 0=日曜, 既定は1=月曜 */; startedAt: string /* 使い始めた日 ISO */ }
```

## 仕様
- 週は端末のローカル時刻で区切る。`weekStartsOn` の 0:00 から 7日間。
- `weekRange(date, weekStartsOn)` → `{ start: Date, end: Date }`（end は次の週の開始、半開区間）。
- `spentInWeek(expenses, date, settings)` → その週の合計。
- **繰り越しは赤字だけ**：前の週に予算を超えた分だけ、今週の予算から引く。余った分は持ち越さない（余りを積むと気が緩むため）。
  赤字は連鎖する（前週の予算自体が前々週の赤字で減っていれば、その減った予算に対する超過で判定）。
  `startedAt` を含む週より前には遡らない。
- `remaining(expenses, now, settings)` → `{ budget, carriedDeficit, spent, left, perDay, daysLeft }`
  - `budget` = weeklyBudget − carriedDeficit
  - `left` = budget − spent（負になりうる）
  - `daysLeft` = 今日を含めた週末までの日数（1〜7）
  - `perDay` = left > 0 ? Math.floor(left / daysLeft) : 0
- `unneededTotal(expenses, from, to)` → verdict が 'unneeded' の合計（半開区間）。
- `pendingReview(expenses, now, settings)` → 先週以前で verdict 未設定のもの（古い順）。

## テストで必ず押さえる境界
- 週の境目ちょうど（月曜 0:00 と日曜 23:59:59）
- weekStartsOn が日曜のとき
- 赤字の繰り越しが2週連続するとき、余った週の翌週は繰り越し0
- startedAt より前の支出は繰り越し計算に入れない
- 残りがちょうど0、負のとき perDay は0
- タイムゾーンはテスト内で固定（`process.env.TZ = 'Asia/Tokyo'` を vitest の設定で）

## 守ること
- 外部ライブラリを足さない（日付計算も自前）
- コメントは日本語で、理由が必要な所にだけ短く
- 終わったら `npx vitest run` と `npx tsc -b` が通ることを確認
