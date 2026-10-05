import Sparkline from '../components/Sparkline'

// Sector tag colors taken from the game's SECTOR_COLORS (App.jsx),
// 외환 uses the game's actual FX color.
const CARDS = [
  {
    key: 'stocks',
    title: '주식',
    color: '#5B6EF5',
    copy: '엔비디아, 테슬라, 코카콜라, SPY까지. 종목명은 영어로, 티커는 그 밑에 있어요.',
    path: 'M6 58 C 30 52, 44 40, 62 38 S 96 46, 118 30 S 156 14, 194 10',
  },
  {
    key: 'coins',
    title: '코인',
    color: '#F2994A',
    copy: 'BTC, ETH, SOL이 맨 위에 있고, 그 밑으로 도지, 시바, 페페 같은 밈코인 20개가 깔려 있어요.',
    image: 'https://i.imgur.com/3TOXua9.png',
    imageWidth: 1280,
    imageHeight: 853,
  },
  {
    key: 'fx',
    title: '외환',
    color: '#4A90D9',
    copy: '유로, 파운드, 엔, 원을 달러 기준으로 봐요. 환율은 하루에 한 번 바뀌어요.',
    path: 'M6 36 C 34 40, 56 44, 74 40 S 108 26, 130 34 S 168 44, 194 38',
  },
]

export default function Markets() {
  return (
    <section className="lp-markets" id="markets">
      <h2 className="lp-h2">주식, 코인, 외환 한 곳에서</h2>
      <div className="lp-markets-grid">
        {CARDS.map((card) => (
          <div
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
          </div>
        ))}
      </div>
    </section>
  )
}