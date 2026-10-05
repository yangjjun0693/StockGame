const TILES = [
  {
    key: 'long-short',
    title: '롱도 숏도',
    copy: '오를 것 같으면 롱, 내릴 것 같으면 숏. 주식, 코인, 보유 종목 어디서든 포지션을 잡아요.',
  },
  {
    key: 'news',
    title: '뉴스를 보고 결정',
    copy: '시세 옆에서 바로 기사를 읽어요. 주식은 Finnhub, 코인은 크립토 뉴스 기준이에요.',
  },
  {
    key: 'ranking',
    title: '랭킹에서 만나요',
    copy: '커뮤니티 탭에서 순위를 확인하고, 글을 쓰고, DM도 보내요.',
  },
  {
    key: 'market-order',
    title: '매수는 늘 시장가',
    copy: '지정가 없이 지금 가격에 바로 체결돼요. 복잡한 건 빼뒀어요.',
  },
  {
    key: 'themes',
    title: '라이트와 다크',
    copy: '게임 안에서도 테마를 바꿔 쓸 수 있어요.',
  },
]

export default function Features() {
  return (
    <section className="lp-features">
      <div className="lp-features-grid">
        {TILES.map((tile, i) => (
          <article
            key={tile.key}
            className={`lp-tile lp-tile--${tile.key} lp-tile--pos${i}`}
          >
            <h3 className="lp-tile-title">{tile.title}</h3>
            <p className="lp-tile-copy">{tile.copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
