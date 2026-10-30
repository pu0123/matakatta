# 06 Apple Pay の受け箱（ホーム画面のアプリでも受け取れるように）

## なぜ
iPhone ではホーム画面に追加したアプリと Safari で保存場所が別。ショートカットから URL を開くと必ず Safari で開くため、
05 の方式ではホーム画面のアプリに記録が届かない。
そこで、支払いを **ネット上の受け箱に預け、アプリを開いたときに取りに行く** 形にする。
ショートカットは裏で送るだけなので、支払いのたびに画面が開くこともなくなる。

## 方針（README の「サーバーを持たない」を最小限だけ曲げる）
- サーバーに置くのは **受け取り待ちの支払い（金額・店名・時刻）だけ**。予算・手取り・記録はこれまで通り端末の中だけ
- アプリが受け取ったら消す。受け取られなくても **14日で消す**
- 受け箱の鍵（トークン）は端末で作る推測できない乱数。サーバーには **トークンの SHA-256 だけ** を保存する
- 無料枠（Cloudflare Pages Functions + D1）で動かす。外部サービス・有料機能は使わない

## 置き場所
- `migrations/0001_inbox.sql` テーブル定義
- `functions/api/inbox/[token].ts` Pages Functions（POST / GET / DELETE）
- `shared/parseAmount.ts` 金額の読み取り。今の `src/shortcutParams.ts` の金額部分をここへ移し、アプリと functions の両方から使う
- `shared/inbox.ts` 入力の検証などの純粋関数（functions から使う。テストを置く）
- `src/inbox.ts` アプリ側の受け取り処理
- `src/screens/Inbox.tsx` 受け取り画面
- `src/screens/ShortcutGuide.tsx` 手順画面を書き直す
- D1 の binding 名は `INBOX`（`wrangler.toml` は作成済み。触らない）
- Cloudflare の型パッケージは足さない。必要な型（D1Database など）は `functions/types.ts` に最小限だけ自前で書く
- `tsconfig` / `eslint` / `vitest` の対象に `functions/` と `shared/` を含める

## テーブル
```sql
CREATE TABLE inbox_items (
  id TEXT PRIMARY KEY,          -- crypto.randomUUID()
  token_hash TEXT NOT NULL,     -- トークンの SHA-256（16進）
  amount INTEGER NOT NULL,
  note TEXT,                    -- 店名。30文字まで
  received_at TEXT NOT NULL     -- ISO 8601（サーバーで受けた時刻）
);
CREATE INDEX inbox_items_token ON inbox_items (token_hash, received_at);
```

## API `/api/inbox/<token>`
- トークンは `^[A-Za-z0-9_-]{32,64}$`。合わなければ 404（存在を匂わせない）
- どのリクエストでも最初に「14日より古い行」を消す（そのトークン分だけでよい）
- レスポンスはすべて JSON、`Cache-Control: no-store`

### POST（ショートカットから）
- 金額と店名は次のどれで来ても受ける（ショートカットの設定次第で形が変わるため）
  1. JSON 本文 `{ "amount": ..., "note": ... }`（amount は数値でも文字列でもよい）
  2. フォーム本文 `amount=...&note=...`
  3. URL のクエリ `?amount=...&note=...`
- 本文は 2KB まで。超えたら 413
- 金額は `shared/parseAmount.ts` で読む。読めなければ 400 `{ "error": "amount" }`
- 店名は前後の空白を除き30文字に切る
- そのトークンの待ちが **100件** 以上なら 429（いたずら・暴走対策）
- 成功は 201 `{ "ok": true }`

### GET（アプリから）
- そのトークンの待ちを古い順に返す `{ items: [{ id, amount, note, receivedAt }] }`

### DELETE（アプリから、保存し終えた分を消す）
- 本文 `{ "ids": [...] }` で指定した分だけ消す（そのトークンのものに限る）。`ids` が無ければ全部消す（連携をやめるとき）
- 成功は 200 `{ "ok": true }`

GET で返しただけでは消さない。アプリが端末に保存してから DELETE する（途中で通信が切れても失わないため）。

## アプリ側
### 設定
- `Settings` に `inboxToken?: string` を足す（32バイトの乱数を base64url。`crypto.getRandomValues`）

### 受け取り（`src/inbox.ts`）
- 起動時と、画面が前面に戻ったとき（`visibilitychange` で visible）に、トークンがあれば GET
- 失敗（オフライン等）は黙って無視する。ホームにエラーは出さない
- 届いた分は端末側に「受け取り待ち」として一時保存しておき（`localStorage` の同じキー内に `inbox` 配列を足す）、
  サーバーへは **端末に保存できた id だけ** DELETE する。同じ id が二度入らないようにする

### ホーム
- 受け取り待ちがあれば、お知らせ欄の **一番上** に「Apple Pay から N件 届いています」→ 受け取り画面

### 受け取り画面（`Inbox.tsx`）
- 見出し「Apple Pay から届いた支払い」
- 1件ずつ並べる：日時（receivedAt）、店名（無ければ「店名なし」）、金額
- 各行に「記録する」「捨てる」。下に「全部記録する」
- 記録するときの `at` は receivedAt、`note` は店名
- 全部片付いたらホームへ戻る

### 手順画面（`ShortcutGuide.tsx` を書き直す）
- トークンが無ければ「連携を始める」ボタンだけ出す。押すとトークンを作って保存
- トークンがあれば、手順と貼り付け用 URL（コピーボタン付き）`{location.origin}/api/inbox/{token}` を出す
- 手順（文言はこのまま）
  1. 「ショートカット」アプリを開き、下の「オートメーション」→ 右上の「＋」
  2. 「取引」を選び、使っているカードを選ぶ。「すぐに実行」にする
  3. 「新規の空のオートメーション」→ アクション「URL の内容を取得」を追加し、下の URL を貼る
  4. 「表示を増やす」から、方法を「POST」、本文を「JSON」にする
  5. 「新規フィールドを追加」→「テキスト」で、キー `amount` に変数「金額」、キー `note` に変数「加盟店」を入れる
- 「テスト送信」ボタン：自分の受け箱へ `{ amount: 1, note: "テスト" }` を POST し、成功したら「届きました。ホームに戻ると受け取れます」と出す
- 注意書き
  - 「iPhone の Apple Pay で払ったときだけ動きます。PayPay などのコード決済や、カードを差して払った分は届きません」
  - 「この URL を知っている人は、あなたの受け箱に支払いを送れます。人に見せないでください」
  - 「届いた支払いは受け取ると消えます。受け取らなくても14日で消えます」
- 一番下に「連携をやめる」：確認を1回挟み、DELETE（全部）してからトークンを消す

### 05 の URL 方式
- `?amount=` で入力画面を開く処理は残す（Safari で使う人向け）。手順画面からは説明を外す

## テスト
- `shared/parseAmount.test.ts`（05 のテストを移す）
- `shared/inbox.test.ts`：トークン形式、本文の3形式からの取り出し、店名の切り詰め、2KB 超え
- アプリ側：受け取った id の重複排除と、DELETE する id の選び方を純粋関数にしてテスト

## 守ること
- 外部ライブラリを足さない（開発用も含む）
- 上に無い変更はしない
- `npx vitest run`・`npx tsc -b`・`npm run lint`・`npm run build` が通ること
- 最後に、実装した内容と判断に迷った点を短く報告する
