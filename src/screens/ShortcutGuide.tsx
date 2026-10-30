import { useRef, useState } from 'react'
import {
  clearRemoteInbox,
  createInboxToken,
  sendInboxTest,
} from '../inbox'

interface ShortcutGuideProps {
  token?: string
  onBack: () => void
  onTokenChange: (token?: string) => void
}

export function ShortcutGuide({ token, onBack, onTokenChange }: ShortcutGuideProps) {
  const urlInput = useRef<HTMLInputElement>(null)
  const [testMessage, setTestMessage] = useState('')
  const shortcutUrl = token ? `${location.origin}/api/inbox/${token}` : ''

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortcutUrl)
    } catch {
      urlInput.current?.focus()
      urlInput.current?.select()
    }
  }

  const test = async () => {
    setTestMessage('')
    if (token && (await sendInboxTest(token))) {
      setTestMessage('届きました。ホームに戻ると受け取れます')
    }
  }

  const stop = async () => {
    if (!token || !window.confirm('Apple Pay との連携をやめますか？')) return
    if (await clearRemoteInbox(token)) onTokenChange(undefined)
  }

  return (
    <main className="screen shortcut-guide-screen">
      <header className="screen-header">
        <button className="text-button" onClick={onBack}>戻る</button>
        <div>
          <h1>Apple Pay と連携する</h1>
        </div>
      </header>

      {!token ? (
        <>
          <p className="shortcut-lead">
            Apple Pay で払うと、金額と店名がこのアプリに届くようになります。届いた支払いは、アプリを開いたときに記録するか捨てるかを選べます。
          </p>
          <button
            className="primary-button shortcut-start-button"
            onClick={() => onTokenChange(createInboxToken())}
          >
            連携を始める
          </button>
        </>
      ) : (
        <>
          <ol className="shortcut-steps">
            <li>「ショートカット」アプリを開き、下の「オートメーション」→ 右上の「＋」</li>
            <li>「取引」を選び、使っているカードを選ぶ。「すぐに実行」にする</li>
            <li>「新規の空のオートメーション」→ アクション「URL の内容を取得」を追加し、下の URL を貼る</li>
            <li>「表示を増やす」から、方法を「POST」、本文を「JSON」にする</li>
            <li>「新規フィールドを追加」→「テキスト」で、キー <code>amount</code> に変数「金額」、キー <code>note</code> に変数「加盟店」を入れる</li>
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

          <button className="primary-button shortcut-test-button" onClick={test}>
            テスト送信
          </button>
          {testMessage && <p className="shortcut-test-message" role="status">{testMessage}</p>}

          <div className="shortcut-notes">
            <p>iPhone の Apple Pay で払ったときだけ動きます。PayPay などのコード決済や、カードを差して払った分は届きません</p>
            <p>この URL を知っている人は、あなたの受け箱に支払いを送れます。人に見せないでください</p>
            <p>届いた支払いは受け取ると消えます。受け取らなくても14日で消えます</p>
          </div>

          <button className="delete-button shortcut-stop-button" onClick={stop}>
            連携をやめる
          </button>
        </>
      )}
    </main>
  )
}
