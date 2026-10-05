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
          <div className="lp-footer-legal">
            <p>
              시세는 Finnhub, CoinGecko, Frankfurter API 기준으로 실제 거래소와 다를 수 있어요.
              투자 권유나 금융 상품의 매수, 매도 추천이 아니에요. 모든 정보는 오직 참고 목적으로만
              제공됩니다. 해당 정보는 시장 상황에 따라 정확성이나 완결성을 보장할 수 없으며, 과거의
              수익률이 미래의 수익을 보장하지 않아요. 최종적인 투자 결정과 그에 따른 책임은 전적으로
              투자자 본인에게 있으며, 본인(사이트 제작자)은 투자 결과로 인한 어떠한 책임도 지지 않아요.
            </p>
            <p>
              이 사이트와 게임의 모든 자산은 모의투자용 가상 자금이에요. 실제 금전적 가치가 없고,
              현금으로 바꾸거나 출금할 수 없어요. 게임 속 수익과 손실은 실제 투자 결과를 의미하지 않아요.
            </p>
            <p>
              시세와 뉴스는 외부 무료 서비스에서 가져와요. 지연되거나 누락되거나 틀릴 수 있고,
              환율은 하루에 한 번 갱신돼요.
            </p>
            <p>
              롱, 숏, 레버리지, 청산 규칙은 게임용으로 단순화했어요. 실제 증권사나 거래소의 증거금,
              수수료, 세금, 체결 방식과 달라요. 실제 투자에서 레버리지와 공매도는 투자 원금 이상의
              손실로 이어질 수 있어요.
            </p>
            <p>
              언급된 기업, 종목, 코인, 통화의 이름과 티커, 로고는 각 소유자의 것이며, 이 사이트는
              어느 곳과도 제휴하거나 보증받지 않았어요. 시세와 뉴스 데이터의 권리는 각 제공처에 있어요.
            </p>
            <p>
              커뮤니티에 올린 글과 메시지의 책임은 작성한 사용자에게 있어요. 이 서비스는 개인이 운영하는
              프로젝트라 예고 없이 바뀌거나 중단될 수 있어요.
            </p>
          </div>
          <p className="lp-footer-copy">© 2026 joosikgame</p>
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