import { useRef } from 'react'

interface ShortcutGuideProps {
  onBack: () => void
}

export function ShortcutGuide({ onBack }: ShortcutGuideProps) {
  const urlInput = useRef<HTMLInputElement>(null)
  const shortcutUrl = `${location.origin}${import.meta.env.BASE_URL}?amount=金額&note=加盟店&via=shortcut`
  const testUrl = `${location.origin}${import.meta.env.BASE_URL}?amount=780&note=テスト&via=shortcut`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortcutUrl)
    } catch {
      urlInput.current?.focus()
      urlInput.current?.select()
    }
  }

  return (
    <main className="screen shortcut-guide-screen">
      <header className="screen-header">
        <button className="text-button" onClick={onBack}>戻る</button>
        <div>
          <h1>Apple Pay と連携する</h1>
        </div>
      </header>

      <ol className="shortcut-steps">
        <li>「ショートカット」アプリを開き、下の「オートメーション」→ 右上の「＋」</li>
        <li>「取引」を選び、使っているカードを選ぶ。「すぐに実行」にする</li>
        <li>「新規の空のオートメーション」→ アクション「URL」を追加し、下の URL を貼る</li>
        <li>URL の中の <code>金額</code> と <code>加盟店</code> の部分を、それぞれ変数「金額」「加盟店」に置き換える</li>
        <li>アクション「URL を開く」を追加する</li>
      </ol>

      <div className="shortcut-url-row">
        <label>
          <span className="sr-only">貼り付け用の URL</span>
          <input
            ref={urlInput}
            readOnly
            value={shortcutUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
        <button className="small-button" onClick={copyUrl}>コピー</button>
      </div>

      <button className="primary-button shortcut-test-button" onClick={() => location.assign(testUrl)}>
        試しに開く
      </button>

      <div className="shortcut-notes">
        <p>iPhone の Apple Pay で払ったときだけ動きます。PayPay などのコード決済や、カードを差して払った分は記録されません</p>
        <p>ショートカットから開くと Safari で開きます。ホーム画面に追加したアプリとは記録が別になるため、連携を使う場合は Safari で使ってください</p>
      </div>
    </main>
  )
}
