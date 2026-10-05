import { useEffect, useState } from 'react'

const REPO_URL = 'https://github.com/yangjjun0693/StockGame'

export default function Footer() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    }
    update()
    const id = setInterval(update, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <footer className="lp-footer">
      <p className="lp-footer-mark" aria-hidden="true">
        주식게임
      </p>
      <div className="lp-footer-row">
        <div className="lp-footer-meta">
          <p className="lp-footer-disclaimer">
            시세는 Finnhub, CoinGecko, Frankfurter 등 무료 API 기준이고 투자
            조언이 아니에요.
          </p>
          {time && <p className="lp-footer-time">지금 {time}</p>}
        </div>
        <div className="lp-footer-links">
          <a
            className="lp-link-quiet"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            data-cursor=""
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
