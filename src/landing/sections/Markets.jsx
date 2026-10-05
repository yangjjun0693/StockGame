import TiltCard from '../components/TiltCard'
import Sparkline from '../components/Sparkline'

// Sector tag colors taken from the game's SECTOR_COLORS (App.jsx),
// 외환 uses the game's actual FX color.
const CARDS = [
  {
    key: 'stocks',
    title: '주식',
    color: '#5B6EF5',
    copy: 'NVDA, TSLA, KO, DIS, SPY. 종목 이름은 영어로, 티커는 그 아래에.',
    path: 'M6 58 C 30 52, 44 40, 62 38 S 96 46, 118 30 S 156 14, 194 10',
  },
  {
    key: 'coins',
    title: '코인',
    color: '#F2994A',
    copy: 'BTC, ETH, SOL, 그리고 DOGE, SHIB, PEPE 같은 밈코인 20종.',
    image: 'https://i.imgur.com/13yGAZn.png',
    imageWidth: 1280,
    imageHeight: 853,
  },
  {
    key: 'fx',
    title: '외환',
    color: '#4A90D9',
    copy: 'EUR, GBP, JPY, KRW를 달러 기준으로. 하루 한 번 갱신돼요.',
    path: 'M6 36 C 34 40, 56 44, 74 40 S 108 26, 130 34 S 168 44, 194 38',
  },
]

export default function Markets() {
  return (
    <section className="lp-markets" id="markets">
      <h2 className="lp-h2" style={{ fontFamily: 'Inter' }}>One Screen, Three Markets</h2>
      <div className="lp-markets-grid">
        {CARDS.map((card) => (
          <TiltCard
            key={card.key}
            className={`lp-market-card lp-market-card--${card.key}`}
          >
            <div className="lp-market-card-inner">
              <span
                className="lp-sector-tag"
                style={{ background: `${card.color}18`, color: card.color }}
              >
                {card.title}
              </span>
              <h3 className="lp-market-title">{card.title}</h3>
              <p className="lp-market-copy">{card.copy}</p>
              <div className="lp-market-spark">
                {card.image ? (
                  <img
                    className="lp-market-img"
                    src={card.image}
                    width={card.imageWidth}
                    height={card.imageHeight}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                  />
                ) : (
                  <Sparkline d={card.path} stroke={card.color} />
                )}
              </div>
            </div>
          </TiltCard>
        ))}
      </div>
    </section>
  )
}
