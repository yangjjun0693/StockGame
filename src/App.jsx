import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { TrendingUp, LayoutDashboard, Newspaper, X, ChevronRight, Award, Lock, Check, Sun, Moon } from 'lucide-react';

/* ---------------------------------------------------------------- */
/*  종목 데이터                                                       */
/* ---------------------------------------------------------------- */
const INITIAL_STOCKS = [
  {
    id: 'nrv', name: '노바리버스', sector: '반도체', price: 84200, beta: 1.1,
    desc: '차세대 파운드리 공정을 개발하는 반도체 설계사.',
    newsPos: ['3나노 공정 수율 목표치 조기 달성', '글로벌 팹리스와 대규모 위탁생산 계약 체결', '신형 AI 가속 칩 양산 돌입'],
    newsNeg: ['공정 전환 지연으로 출하 일정 차질', '주요 고객사 물량 축소 우려', '희귀가스 수급난에 생산 차질'],
  },
  {
    id: 'blm', name: '블룸모빌리티', sector: '모빌리티', price: 31500, beta: 1.3,
    desc: '도심형 전기 이동수단 공유 플랫폼을 운영.',
    newsPos: ['이용자 수 분기 최대치 경신', '3개 신규 도시 서비스 확대 발표', '배터리 교체형 스테이션 특허 취득'],
    newsNeg: ['주요 도시 규제 강화로 운영 차질', '차량 화재 이슈로 안전성 논란', '경쟁사 저가 프로모션에 점유율 하락'],
  },
  {
    id: 'ptc', name: '피치테크', sector: '바이오', price: 12800, beta: 1.6,
    desc: '신약 후보물질 임상시험 단계의 바이오 벤처.',
    newsPos: ['임상 2상 유효성 지표 목표치 상회', '글로벌 제약사와 기술이전 협상 개시', '희귀질환 치료제 신속심사 지정'],
    newsNeg: ['임상 3상 일정 6개월 연기', '부작용 사례 보고에 주가 출렁', '경쟁 파이프라인 선두 진입 소식'],
  },
  {
    id: 'ssn', name: '순설당', sector: '식품', price: 6400, beta: 0.5,
    desc: '전국 유통망을 가진 제과·제빵 소재 기업.',
    newsPos: ['신제품 라인 편의점 완판 행진', '해외 수출 물량 두 배 증가', '원가 절감형 신공법 도입'],
    newsNeg: ['원당 국제가격 급등으로 마진 축소', '이물질 혼입 논란으로 리콜', '주요 거래처 계약 해지'],
  },
  {
    id: 'krx', name: '코어렉스', sector: '소재', price: 152000, beta: 0.9,
    desc: '2차전지용 특수 소재를 생산하는 화학사.',
    newsPos: ['완성차 업체와 장기 공급계약 체결', '차세대 소재 특허 등록 완료', '증설 공장 조기 가동 성공'],
    newsNeg: ['환경 규제 위반으로 조업 정지 명령', '원재료 가격 급등에 수익성 악화', '경쟁사 대체 소재 개발 소식'],
  },
  {
    id: 'won', name: '원웨이브', sector: '엔터', price: 22300, beta: 1.4,
    desc: '음원 유통과 아티스트 매니지먼트를 겸하는 엔터사.',
    newsPos: ['소속 아티스트 글로벌 차트 1위', '월드투어 전석 매진 행진', '신규 레이블 설립으로 라인업 확대'],
    newsNeg: ['소속 아티스트 활동 중단 발표', '경영권 분쟁설에 주가 급락', '해외 진출 프로젝트 무산'],
  },
  {
    id: 'grf', name: '그린포레스트', sector: '신재생에너지', price: 18700, beta: 1.2,
    desc: '태양광·풍력 발전 설비를 개발하는 에너지 기업.',
    newsPos: ['대규모 해상풍력 사업 우선협상자 선정', '정부 신재생에너지 보조금 확대 수혜', '해외 발전소 준공 완료'],
    newsNeg: ['보조금 정책 축소 발표', '발전 설비 결함으로 가동 중단', '인허가 지연으로 사업 표류'],
  },
  {
    id: 'dlg', name: '딥로직시스템', sector: 'AI·소프트웨어', price: 96500, beta: 1.5,
    desc: '기업용 AI 자동화 솔루션을 개발하는 소프트웨어사.',
    newsPos: ['대기업 그룹 전사 도입 계약 체결', '자체 언어모델 성능 벤치마크 1위', '해외 데이터센터 신규 구축'],
    newsNeg: ['핵심 개발 인력 대거 이탈', '보안 취약점 발견으로 신뢰도 타격', '주요 고객사 도입 계약 파기'],
  },
  {
    id: 'sky', name: '스카이포트', sector: '항공·우주', price: 61200, beta: 1.7,
    desc: '소형 위성 발사 서비스를 제공하는 우주 스타트업.',
    newsPos: ['상업 위성 발사 100회 무사고 달성', '정부 우주개발 사업 수주', '재사용 발사체 시험 성공'],
    newsNeg: ['발사체 시험 중 폭발 사고', '발사 일정 대거 연기', '주요 고객사 계약 취소'],
  },
  {
    id: 'csg', name: '캐슬게임즈', sector: '게임', price: 27800, beta: 1.3,
    desc: 'MMORPG와 e스포츠 리그를 운영하는 게임사.',
    newsPos: ['신작 출시 첫날 매출 신기록', '자사 리그 시청자 수 역대 최다', '해외 퍼블리싱 계약 체결'],
    newsNeg: ['신작 서버 오류로 환불 요구 쇄도', '핵심 개발진 경쟁사 이적', '확률형 아이템 규제 강화 발표'],
  },
  {
    id: 'rvr', name: '리버사이드리테일', sector: '유통', price: 9200, beta: 0.6,
    desc: '전국 오프라인 매장과 물류망을 갖춘 종합 유통사.',
    newsPos: ['연휴 매출 전년 대비 큰 폭 증가', '신규 물류센터 가동으로 배송 효율 개선', '자체 브랜드 상품 매출 호조'],
    newsNeg: ['온라인 경쟁 심화로 오프라인 매출 부진', '물류센터 화재로 일부 가동 중단', '최저임금 인상에 인건비 부담 증가'],
  },
  {
    id: 'cbm', name: '코발트마인', sector: '광업·원자재', price: 43900, beta: 1.0,
    desc: '2차전지 원료용 희귀금속을 채굴하는 자원개발사.',
    newsPos: ['신규 광산 매장량 예상치 상회', '국제 원자재 가격 급등 수혜', '장기 원료 공급계약 체결'],
    newsNeg: ['채굴 현장 안전사고 발생', '해당국 자원 국유화 추진 소식', '원자재 가격 급락으로 수익성 우려'],
  },
];

// poesi의 팔레트 태그를 이식한 섹터 컬러
const SECTOR_COLORS = {
  '반도체': '#5B6EF5',
  '모빌리티': '#F2994A',
  '바이오': '#2FAE6B',
  '식품': '#D9A441',
  '소재': '#8A6D4E',
  '엔터': '#E0559C',
  '신재생에너지': '#2BADA0',
  'AI·소프트웨어': '#8259E8',
  '항공·우주': '#3E7FC2',
  '게임': '#D9556B',
  '유통': '#B08968',
  '광업·원자재': '#9C8AA5',
};

const TICK_MS = 7000;
const HISTORY_LEN = 40;
const STARTING_CASH = 10_000_000;

const NEWS_INTERVAL_MIN = 45000;
const NEWS_INTERVAL_MAX = 75000;
const NEWS_IMPACT_MIN = 0.05;
const NEWS_IMPACT_MAX = 0.14;
const NEWS_FEED_LIMIT = 30;
const SECTOR_CORRELATION_MIN = 0.25;
const SECTOR_CORRELATION_MAX = 0.45;

const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
const clampPrice = (p) => Math.max(100, p);

function timeAgo(ts, now) {
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  return `${hr}시간 전`;
}

function nextPrice(price, beta = 1) {
  const drift = (Math.random() - 0.5) * 0.024 * beta;
  const jump = Math.random() > 0.97 ? (Math.random() - 0.5) * 0.08 * beta : 0;
  return clampPrice(price * (1 + drift + jump));
}

/* ---------------------------------------------------------------- */
/*  도전과제                                                           */
/* ---------------------------------------------------------------- */
const ACHIEVEMENTS = [
  { id: 'first_buy', title: '첫 매수', desc: '아무 종목이나 처음으로 매수해보세요.', check: (ctx) => ctx.transactions.some((t) => t.type === 'buy') },
  { id: 'first_profit_sell', title: '첫 익절', desc: '수익을 남기고 매도에 성공해보세요.', check: (ctx) => ctx.transactions.some((t) => t.type === 'sell' && t.pnl > 0) },
  { id: 'diversify5', title: '분산투자', desc: '서로 다른 5개 종목을 동시에 보유해보세요.', check: (ctx) => Object.keys(ctx.holdings).length >= 5 },
  { id: 'big_win', title: '대박 거래', desc: '한 번의 매도로 50만 원 이상 수익을 실현해보세요.', check: (ctx) => ctx.transactions.some((t) => t.type === 'sell' && t.pnl >= 500000) },
  { id: 'double_asset', title: '자산 2배', desc: '총자산을 시작 자금의 2배로 불려보세요.', check: (ctx) => ctx.netWorth >= STARTING_CASH * 2 },
  { id: 'news_trader', title: '정보력 승부', desc: '뉴스가 떴던 종목을 매매해보세요.', check: (ctx) => ctx.transactions.some((t) => ctx.newsedStockIds.has(t.stockId)) },
];

/* ---------------------------------------------------------------- */
/*  스파크라인                                                         */
/* ---------------------------------------------------------------- */
let sparkUid = 0;
function Sparkline({ history, positive, w = 64, h = 24, strokeWidth = 1.6, showBaseline = false }) {
  const gradId = useMemo(() => `spark-grad-${sparkUid++}`, []);
  if (history.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const step = w / (history.length - 1);
  const color = positive ? 'var(--up)' : 'var(--down)';
  const coords = history.map((v, i) => [i * step, h - ((v - min) / range) * h]);
  const linePoints = coords.map((p) => p.join(',')).join(' ');
  const areaPoints = `0,${h} ${linePoints} ${w},${h}`;
  const baselineY = h - ((history[0] - min) / range) * h;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {showBaseline && (
        <line x1={0} y1={baselineY} x2={w} y2={baselineY} stroke="var(--ink-faint)" strokeWidth={1} strokeDasharray="3,3" />
      )}
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/*  수량 스테퍼 (poesi pill 스타일)                                      */
/* ---------------------------------------------------------------- */
function QtyStepper({ value, onChange, max }) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(max ? Math.min(max, value + 1) : value + 1);
  return (
    <div className="flex items-center border border-gray-200 rounded-full overflow-hidden h-8 shrink-0">
      <button onClick={dec} className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">−</button>
      <input
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
          onChange(Number.isNaN(n) ? 1 : Math.max(1, n));
        }}
        className="w-9 text-center border-none outline-none bg-transparent font-inter text-xs font-semibold"
      />
      <button onClick={inc} className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">+</button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  환영 화면                                                          */
/* ---------------------------------------------------------------- */
function WelcomeScreen({ onStart }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <p className="font-inter font-medium text-xs tracking-wide text-gray-400 mb-3">VIRTUAL STOCK MARKET</p>
        <h1 className="font-myeongjo font-extrabold text-4xl mb-5">모의투자</h1>
        <p className="font-inter text-sm text-gray-500 leading-7 mb-10">
          {fmt(STARTING_CASH)}원의 시드머니로 시작해서<br />
          실시간으로 움직이는 12개 종목을 사고팔며 자산을 불려보세요.
        </p>
        <button
          onClick={onStart}
          className="font-inter font-medium text-sm text-white bg-gray-900 rounded-full px-7 py-3.5 hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
        >
          투자 시작하기 <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  종목 카드 (poem-card 이식)                                          */
/* ---------------------------------------------------------------- */
function StockCard({ stock, index, holding, cash, onBuy, onSell, onOpenDetail }) {
  const [qty, setQty] = useState(1);
  const change = ((stock.price - stock.open) / stock.open) * 100;
  const dirColor = stock.dir === 'down' ? 'var(--down)' : stock.dir === 'up' ? 'var(--up)' : 'var(--ink-faint)';
  const dirArrow = stock.dir === 'down' ? '▼' : stock.dir === 'up' ? '▲' : '–';
  const sectorColor = SECTOR_COLORS[stock.sector] || '#999999';
  const cost = stock.price * qty;
  const canBuy = cash >= cost;
  const canSell = holding && holding.qty >= qty;
  const evalValue = holding ? holding.qty * stock.price : 0;
  const pnl = holding ? evalValue - holding.qty * holding.avgPrice : 0;

  return (
    <article className="stock-card" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="flex justify-between items-start gap-4 mb-2 cursor-pointer" onClick={() => onOpenDetail(stock.id)}>
        <div>
          <h2 className="font-myeongjo font-bold text-lg mb-2">{stock.name}</h2>
          <span
            className="sector-tag inline-block font-inter font-medium text-xs px-3 py-1 rounded-full"
            style={{ background: sectorColor + '22', color: sectorColor }}
          >
            {stock.sector}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div key={Math.round(stock.price)} className="price-flash font-inter font-bold text-lg tabular-nums">{fmt(stock.price)}</div>
          <div className="font-inter text-xs font-semibold tabular-nums mt-1" style={{ color: dirColor }}>
            {dirArrow} {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      </div>

      <p className="font-inter text-sm text-gray-400 leading-6 mb-4">{stock.desc}</p>

      <div className="mb-5 cursor-pointer" onClick={() => onOpenDetail(stock.id)}>
        <Sparkline history={stock.history} positive={stock.dir !== 'down'} w={320} h={44} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-inter text-xs text-gray-400">
          {holding ? (
            <>
              {holding.qty}주 · 평단 {fmt(holding.avgPrice)}{' '}
              <span className="font-semibold" style={{ color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
                ({pnl >= 0 ? '+' : ''}{fmt(pnl)})
              </span>
            </>
          ) : (
            '미보유'
          )}
        </div>
        <div className="flex items-center gap-2">
          <QtyStepper value={qty} onChange={setQty} />
          <button
            onClick={() => onBuy(stock.id, qty)}
            disabled={!canBuy}
            className="pill-btn pill-btn-primary font-inter font-medium text-xs text-white bg-gray-900 rounded-full px-4 py-2 disabled:opacity-30"
          >
            매수
          </button>
          <button
            onClick={() => onSell(stock.id, qty)}
            disabled={!canSell}
            className="pill-btn font-inter font-medium text-xs border border-gray-200 rounded-full px-4 py-2 disabled:opacity-30"
          >
            매도
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------- */
/*  종목 상세 모달 (auth-modal 이식)                                     */
/* ---------------------------------------------------------------- */
function StockDetailModal({ stock, holding, cash, onBuy, onSell, onClose }) {
  const [qty, setQty] = useState(1);
  if (!stock) return null;

  const change = ((stock.price - stock.open) / stock.open) * 100;
  const dirUp = stock.dir !== 'down';
  const dirColor = stock.dir === 'down' ? 'var(--down)' : stock.dir === 'up' ? 'var(--up)' : 'var(--ink-faint)';
  const dirArrow = stock.dir === 'down' ? '▼' : stock.dir === 'up' ? '▲' : '–';
  const sectorColor = SECTOR_COLORS[stock.sector] || '#999999';
  const high = Math.max(...stock.history);
  const low = Math.min(...stock.history);
  const cost = stock.price * qty;
  const canBuy = cash >= cost;
  const canSell = holding && holding.qty >= qty;
  const evalValue = holding ? holding.qty * stock.price : 0;
  const pnl = holding ? evalValue - holding.qty * holding.avgPrice : 0;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="modal-backdrop absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="modal-box relative bg-white w-full max-w-sm rounded-2xl p-7 shadow-xl">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>

        <p className="font-inter font-medium text-xs mb-1" style={{ color: sectorColor }}>{stock.sector}</p>
        <h2 className="font-myeongjo font-bold text-xl mb-3">{stock.name}</h2>
        <p className="font-inter text-sm text-gray-400 leading-6 mb-4">{stock.desc}</p>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-inter font-bold text-2xl tabular-nums">{fmt(stock.price)}원</span>
          <span className="font-inter text-xs font-semibold" style={{ color: dirColor }}>
            {dirArrow} {Math.abs(change).toFixed(2)}%
          </span>
        </div>

        <div className="my-4 bg-gray-50 rounded-xl p-3">
          <Sparkline history={stock.history} positive={dirUp} w={330} h={64} strokeWidth={2} showBaseline />
          <div className="flex justify-between text-[11px] text-gray-400 mt-2 font-inter tabular-nums">
            <span>최저 {fmt(low)}</span>
            <span>최고 {fmt(high)}</span>
          </div>
        </div>

        <div className="flex gap-6 py-3 border-t border-b border-gray-100 mb-5 font-inter">
          <div>
            <div className="text-[11px] text-gray-400 mb-1">보유 수량</div>
            <div className="text-sm font-semibold">{holding ? `${holding.qty}주` : '없음'}</div>
          </div>
          {holding && (
            <>
              <div>
                <div className="text-[11px] text-gray-400 mb-1">평단가</div>
                <div className="text-sm font-semibold tabular-nums">{fmt(holding.avgPrice)}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400 mb-1">평가손익</div>
                <div className="text-sm font-semibold tabular-nums" style={{ color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {pnl >= 0 ? '+' : ''}{fmt(pnl)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <QtyStepper value={qty} onChange={setQty} />
          <div className="flex gap-2">
            <button onClick={() => onBuy(stock.id, qty)} disabled={!canBuy} className="font-inter font-medium text-sm text-white bg-gray-900 rounded-full px-5 py-2.5 disabled:opacity-30">매수</button>
            <button onClick={() => onSell(stock.id, qty)} disabled={!canSell} className="font-inter font-medium text-sm border border-gray-200 rounded-full px-5 py-2.5 disabled:opacity-30">매도</button>
          </div>
        </div>
        <div className="text-right text-[11px] text-gray-400 font-inter mt-2 tabular-nums">주문금액 {fmt(cost)}원</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  마켓 탭 — 세로 카드 피드 (poesi feed 이식)                            */
/* ---------------------------------------------------------------- */
function MarketTab({ stocks, holdings, cash, onBuy, onSell, onOpenDetail }) {
  return (
    <div className="flex flex-col gap-10">
      {stocks.map((s, i) => (
        <StockCard key={s.id} index={i} stock={s} holding={holdings[s.id]} cash={cash} onBuy={onBuy} onSell={onSell} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  대시보드 탭                                                         */
/* ---------------------------------------------------------------- */
function NetWorthChart({ history }) {
  const w = 640;
  const h = 160;
  if (history.length < 2) return <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} />;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const step = w / (history.length - 1);
  const positive = history[history.length - 1] >= history[0];
  const points = history.map((v, i) => [i * step, h - ((v - min) / range) * h]);
  const linePoints = points.map((p) => p.join(',')).join(' ');
  const areaPoints = `0,${h} ${linePoints} ${w},${h}`;
  const color = positive ? 'var(--up)' : 'var(--down)';

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.08} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AchievementsSection({ unlockedIds }) {
  return (
    <div className="mb-10">
      <p className="font-inter font-medium text-xs text-gray-400 mb-3">도전과제</p>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedIds.has(a.id);
          return (
            <div
              key={a.id}
              className={`flex gap-2.5 items-start p-3.5 rounded-xl border ${unlocked ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}
            >
              <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${unlocked ? '' : 'bg-gray-100'}`} style={unlocked ? { background: 'var(--up-bg)', color: 'var(--up)' } : { color: 'var(--ink-faint)' }}>
                {unlocked ? <Check size={13} /> : <Lock size={11} />}
              </div>
              <div className="min-w-0">
                <div className="font-inter font-bold text-xs">{a.title}</div>
                <div className="font-inter text-[11px] text-gray-400 mt-0.5 leading-snug">{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransactionsSection({ transactions }) {
  return (
    <div>
      <p className="font-inter font-medium text-xs text-gray-400 mb-3">체결 내역</p>
      {transactions.length === 0 ? (
        <div className="font-inter text-sm text-gray-300 py-4">아직 체결된 거래가 없어요.</div>
      ) : (
        <div>
          {transactions.map((t) => (
            <div key={t.id} className="grid gap-3 py-2.5 border-b border-gray-50 items-center font-inter" style={{ gridTemplateColumns: '0.7fr 1.3fr 1fr 1fr 1fr' }}>
              <span
                className="font-inter font-bold text-[10.5px] px-1.5 py-0.5 rounded-md w-fit"
                style={t.type === 'buy' ? { background: 'var(--down-bg)', color: 'var(--down)' } : { background: 'var(--up-bg)', color: 'var(--up)' }}
              >
                {t.type === 'buy' ? '매수' : '매도'}
              </span>
              <span className="text-sm">{t.stockName}</span>
              <span className="text-right text-xs tabular-nums">{t.qty}주 · {fmt(t.price)}</span>
              <span className="text-right text-xs tabular-nums">{fmt(t.total)}</span>
              <span className="text-right text-[11px] text-gray-400">{timeAgo(t.time, Date.now())}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardTab({ cash, holdings, stockById, netWorthHistory, unlockedIds, transactions }) {
  const holdingsList = Object.entries(holdings).map(([id, h]) => {
    const stock = stockById[id];
    const value = h.qty * stock.price;
    const pnl = value - h.qty * h.avgPrice;
    return { id, name: stock.name, sector: stock.sector, qty: h.qty, avgPrice: h.avgPrice, price: stock.price, value, pnl };
  });
  const holdingsValue = holdingsList.reduce((s, h) => s + h.value, 0);
  const netWorth = cash + holdingsValue;
  const totalReturn = netWorth - STARTING_CASH;
  const totalReturnPct = (totalReturn / STARTING_CASH) * 100;
  const positive = totalReturn >= 0;

  return (
    <div>
      <div className="flex gap-8 flex-wrap mb-6">
        <div>
          <p className="font-inter text-xs text-gray-400 mb-1">총자산</p>
          <div className="font-inter font-bold text-2xl tabular-nums">{fmt(netWorth)}원</div>
        </div>
        <div>
          <p className="font-inter text-xs text-gray-400 mb-1">누적 수익</p>
          <div className="font-inter font-bold text-2xl tabular-nums" style={{ color: positive ? 'var(--up)' : 'var(--down)' }}>
            {positive ? '+' : ''}{fmt(totalReturn)}원 <span className="text-sm">({positive ? '+' : ''}{totalReturnPct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl px-4 pt-4 pb-2 mb-7">
        <p className="font-inter font-medium text-xs text-gray-400 mb-1.5">자산 추이</p>
        <NetWorthChart history={netWorthHistory} />
      </div>

      <div className="flex gap-8 mb-4 font-inter">
        <div>
          <p className="text-xs text-gray-400 mb-1">현금</p>
          <div className="font-semibold text-sm tabular-nums">{fmt(cash)}원</div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">보유 종목 평가액</p>
          <div className="font-semibold text-sm tabular-nums">{fmt(holdingsValue)}원</div>
        </div>
      </div>

      <p className="font-inter font-medium text-xs text-gray-400 mb-3">보유 종목</p>
      {holdingsList.length === 0 ? (
        <div className="font-inter text-sm text-gray-300 py-5 mb-6">보유 중인 종목이 없어요. 마켓에서 매수해보세요.</div>
      ) : (
        <div className="mb-8">
          {holdingsList.map((h) => (
            <div key={h.id} className="grid gap-3 py-3 border-b border-gray-50" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}>
              <div>
                <div className="font-semibold text-sm">{h.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{h.sector}</div>
              </div>
              <div className="text-right text-sm tabular-nums">{h.qty}주</div>
              <div className="text-right text-sm tabular-nums">{fmt(h.value)}</div>
              <div className="text-right text-sm font-semibold tabular-nums" style={{ color: h.pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
                {h.pnl >= 0 ? '+' : ''}{fmt(h.pnl)}
              </div>
            </div>
          ))}
        </div>
      )}

      <AchievementsSection unlockedIds={unlockedIds} />
      <TransactionsSection transactions={transactions} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  뉴스 탭                                                            */
/* ---------------------------------------------------------------- */
function NewsTab({ news }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (news.length === 0) {
    return <div className="font-inter text-sm text-gray-300 py-10 text-center">아직 발생한 뉴스가 없어요. 잠시 기다려보세요.</div>;
  }

  return (
    <div>
      <p className="font-inter text-xs text-gray-400 mb-4 leading-relaxed">어떤 종목 이야기인지는 알려주지 않아요. 마켓에서 직접 찾아보세요.</p>
      {news.map((n) => (
        <div key={n.id} className="flex gap-3 py-3.5 border-b border-gray-50">
          <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: n.positive ? 'var(--up)' : 'var(--down)' }} />
          <div className="flex-1 min-w-0">
            <span
              className="inline-block font-inter font-bold text-[10.5px] px-1.5 py-0.5 rounded-md mb-1"
              style={n.positive ? { background: 'var(--up-bg)', color: 'var(--up)' } : { background: 'var(--down-bg)', color: 'var(--down)' }}
            >
              {n.positive ? '호재' : '악재'}
            </span>
            <div className="font-inter text-sm leading-relaxed">{n.headline}</div>
          </div>
          <div className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(n.time, Date.now())}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  도전과제 달성 토스트 (poesi toast 이식)                                */
/* ---------------------------------------------------------------- */
function AchievementToastStack({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.key}
          className="achievement-toast pointer-events-auto flex items-center gap-2 bg-gray-900 text-white font-inter text-sm font-medium px-5 py-3 rounded-full shadow-lg whitespace-nowrap"
        >
          <Award size={15} />
          도전과제 달성 · {t.title}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  하단 탭바 (poesi liquid glass tabbar 이식)                           */
/* ---------------------------------------------------------------- */
const TABS = [
  { id: 'market', label: '마켓', icon: TrendingUp },
  { id: 'news', label: '뉴스', icon: Newspaper },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
];

function Tabbar({ tab, setTab }) {
  const btnRefs = useRef([]);
  const [highlight, setHighlight] = useState({});

  useLayoutEffect(() => {
    const idx = TABS.findIndex((t) => t.id === tab);
    const btn = btnRefs.current[idx];
    if (!btn) return;
    setHighlight({ transform: `translateX(${btn.offsetLeft}px)`, width: btn.offsetWidth });
  }, [tab]);

  return (
    <nav className="tabbar-wrap">
      <div className="tabbar" role="tablist">
        <div className="tabbar-highlight" style={highlight} />
        {TABS.map((t, i) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => (btnRefs.current[i] = el)}
              className="tab"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
            >
              <Icon size={20} />
              <span className="tab-label">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- */
/*  메인 컴포넌트                                                       */
/* ---------------------------------------------------------------- */
const TAB_TITLES = { market: '마켓', news: '뉴스', dashboard: '대시보드' };

export default function StockGame() {
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState('market');
  const [stocks, setStocks] = useState(() => INITIAL_STOCKS.map((s) => ({ ...s, open: s.price, history: [s.price], dir: 'flat' })));
  const [cash, setCash] = useState(STARTING_CASH);
  const [holdings, setHoldings] = useState({});
  const [netWorthHistory, setNetWorthHistory] = useState([STARTING_CASH]);
  const [detailId, setDetailId] = useState(null);
  const [news, setNews] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(() => new Set());
  const [toasts, setToasts] = useState([]);
  const [dark, setDark] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('stockgame_theme') : null;
    if (saved) return saved === 'dark';
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('stockgame_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transitioning');
    setDark((d) => !d);
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
  };

  const stockById = useMemo(() => Object.fromEntries(stocks.map((s) => [s.id, s])), [stocks]);
  const newsedStockIds = useMemo(() => {
    const set = new Set();
    news.forEach((n) => {
      set.add(n.stockId);
      (n.affected || []).forEach((a) => set.add(a.stockId));
    });
    return set;
  }, [news]);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => {
      setStocks((prev) =>
        prev.map((s) => {
          const price = nextPrice(s.price, s.beta);
          const dir = price > s.price ? 'up' : price < s.price ? 'down' : s.dir;
          const history = [...s.history, price].slice(-HISTORY_LEN);
          return { ...s, price, dir, history };
        })
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let timeoutId;
    const scheduleNext = () => {
      const delay = NEWS_INTERVAL_MIN + Math.random() * (NEWS_INTERVAL_MAX - NEWS_INTERVAL_MIN);
      timeoutId = setTimeout(() => {
        setStocks((prev) => {
          const idx = Math.floor(Math.random() * prev.length);
          const stock = prev[idx];
          const positive = Math.random() < 0.5;
          const headlines = positive ? stock.newsPos : stock.newsNeg;
          const headline = headlines[Math.floor(Math.random() * headlines.length)];
          const rawImpact = NEWS_IMPACT_MIN + Math.random() * (NEWS_IMPACT_MAX - NEWS_IMPACT_MIN);
          const impactPct = Math.min(0.25, rawImpact * stock.beta);
          const price = clampPrice(stock.price * (1 + (positive ? impactPct : -impactPct)));
          const dir = price > stock.price ? 'up' : price < stock.price ? 'down' : stock.dir;
          const history = [...stock.history, price].slice(-HISTORY_LEN);

          const updated = [...prev];
          updated[idx] = { ...stock, price, dir, history };

          const affected = [];
          updated.forEach((s, i) => {
            if (i === idx || s.sector !== stock.sector) return;
            const corrImpact = impactPct * (SECTOR_CORRELATION_MIN + Math.random() * (SECTOR_CORRELATION_MAX - SECTOR_CORRELATION_MIN));
            const corrPrice = clampPrice(s.price * (1 + (positive ? corrImpact : -corrImpact)));
            const corrDir = corrPrice > s.price ? 'up' : corrPrice < s.price ? 'down' : s.dir;
            const corrHistory = [...s.history, corrPrice].slice(-HISTORY_LEN);
            updated[i] = { ...s, price: corrPrice, dir: corrDir, history: corrHistory };
            affected.push({ stockId: s.id, stockName: s.name, impactPct: corrImpact });
          });

          setNews((prevNews) =>
            [{ id: `${stock.id}-${Date.now()}`, stockId: stock.id, stockName: stock.name, headline, positive, impactPct, affected, time: Date.now() }, ...prevNews].slice(0, NEWS_FEED_LIMIT)
          );
          return updated;
        });
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const holdingsValue = Object.entries(holdings).reduce((sum, [id, h]) => sum + h.qty * (stockById[id]?.price || 0), 0);
    setNetWorthHistory((prev) => [...prev, cash + holdingsValue].slice(-60));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks]);

  useEffect(() => {
    if (!started) return;
    const holdingsValue = Object.entries(holdings).reduce((sum, [id, h]) => sum + h.qty * (stockById[id]?.price || 0), 0);
    const ctx = { transactions, holdings, netWorth: cash + holdingsValue, newsedStockIds };
    const newlyUnlocked = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id) && a.check(ctx));
    if (newlyUnlocked.length === 0) return;
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      newlyUnlocked.forEach((a) => next.add(a.id));
      return next;
    });
    const newToasts = newlyUnlocked.map((a) => ({ key: `${a.id}-${Date.now()}`, title: a.title }));
    setToasts((prev) => [...prev, ...newToasts]);
    newToasts.forEach((t) => {
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.key !== t.key)), 4000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, holdings, cash, stocks, newsedStockIds, started]);

  const handleBuy = (id, qty) => {
    const stock = stockById[id];
    const cost = stock.price * qty;
    if (cash < cost) return;
    setCash((c) => c - cost);
    setHoldings((prev) => {
      const cur = prev[id];
      const newQty = (cur?.qty || 0) + qty;
      const newAvg = cur ? (cur.avgPrice * cur.qty + cost) / newQty : stock.price;
      return { ...prev, [id]: { qty: newQty, avgPrice: newAvg } };
    });
    setTransactions((prev) =>
      [{ id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'buy', stockId: id, stockName: stock.name, qty, price: stock.price, total: cost, pnl: null, time: Date.now() }, ...prev].slice(0, 50)
    );
  };

  const handleSell = (id, qty) => {
    const stock = stockById[id];
    const cur = holdings[id];
    if (!cur || cur.qty < qty) return;
    const proceeds = stock.price * qty;
    const pnl = (stock.price - cur.avgPrice) * qty;
    setCash((c) => c + proceeds);
    setHoldings((prev) => {
      const remaining = cur.qty - qty;
      const next = { ...prev };
      if (remaining <= 0) delete next[id];
      else next[id] = { ...cur, qty: remaining };
      return next;
    });
    setTransactions((prev) =>
      [{ id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'sell', stockId: id, stockName: stock.name, qty, price: stock.price, total: proceeds, pnl, time: Date.now() }, ...prev].slice(0, 50)
    );
  };

  if (!started) return <WelcomeScreen onStart={() => setStarted(true)} />;

  const holdingsValue = Object.entries(holdings).reduce((sum, [id, h]) => sum + h.qty * (stockById[id]?.price || 0), 0);
  const netWorth = cash + holdingsValue;
  const detailStock = detailId ? stockById[detailId] : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-xl mx-auto px-6 py-16">
        {/* 헤더 */}
        <header className="flex justify-between items-start mb-14 gap-4 flex-wrap">
          <div>
            <p className="font-inter font-medium text-xs text-gray-400 mb-1">모의투자</p>
            <h1 className="font-myeongjo font-bold text-2xl">{TAB_TITLES[tab]}</h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="font-inter text-[11px] text-gray-400">현금</p>
              <div className="font-inter font-semibold text-sm tabular-nums">{fmt(cash)}</div>
            </div>
            <div className="text-right">
              <p className="font-inter text-[11px] text-gray-400">총자산</p>
              <div className="font-inter font-semibold text-sm tabular-nums">{fmt(netWorth)}</div>
            </div>
            <button
              id="theme-toggle"
              aria-label="다크모드 전환"
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 transition-colors"
            >
              {dark ? <Sun key="sun" id="theme-icon" className="spin" size={18} /> : <Moon key="moon" id="theme-icon" className="spin" size={18} />}
            </button>
          </div>
        </header>

        {/* 컨텐츠 */}
        <div key={tab} className="view active">
          {tab === 'market' && (
            <MarketTab stocks={stocks} holdings={holdings} cash={cash} onBuy={handleBuy} onSell={handleSell} onOpenDetail={setDetailId} />
          )}
          {tab === 'news' && <NewsTab news={news} />}
          {tab === 'dashboard' && (
            <DashboardTab
              cash={cash}
              holdings={holdings}
              stockById={stockById}
              netWorthHistory={netWorthHistory}
              unlockedIds={unlockedIds}
              transactions={transactions}
            />
          )}
        </div>

        <footer className="mt-20 pt-6 border-t border-gray-100 text-center">
          <p className="font-inter font-medium text-xs text-gray-300">모의투자 · 실제 거래가 아닙니다</p>
        </footer>
      </div>

      <Tabbar tab={tab} setTab={setTab} />

      {detailStock && (
        <StockDetailModal
          stock={detailStock}
          holding={holdings[detailStock.id]}
          cash={cash}
          onBuy={handleBuy}
          onSell={handleSell}
          onClose={() => setDetailId(null)}
        />
      )}

      <AchievementToastStack toasts={toasts} />
    </div>
  );
}