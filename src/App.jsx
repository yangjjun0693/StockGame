import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, LayoutDashboard, Newspaper, X, ChevronRight, Award, Lock, Check } from 'lucide-react';

/* ---------------------------------------------------------------- */
/*  디자인 토큰                                                       */
/* ---------------------------------------------------------------- */
const C = {
  paper: '#F6F7F9',
  surface: '#FFFFFF',
  ink: '#14171F',
  inkDim: '#6E7480',
  inkFaint: '#A2A8B4',
  line: '#E4E7EC',
  up: '#12A150',
  upBg: '#E9F8EF',
  down: '#E4463C',
  downBg: '#FDECEB',
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');`;

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

const TICK_MS = 7000;
const HISTORY_LEN = 40;
const STARTING_CASH = 10_000_000;

// 뉴스 이벤트 — 45~75초 사이 랜덤 간격으로 한 번씩, 무작위 종목에 호재/악재 발생
const NEWS_INTERVAL_MIN = 45000;
const NEWS_INTERVAL_MAX = 75000;
const NEWS_IMPACT_MIN = 0.05;
const NEWS_IMPACT_MAX = 0.14;
const NEWS_FEED_LIMIT = 30;
// 같은 섹터 종목이 동반 반응하는 비율 (주 이벤트 임팩트 대비)
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
  {
    id: 'first_buy', title: '첫 매수', desc: '아무 종목이나 처음으로 매수해보세요.',
    check: (ctx) => ctx.transactions.some((t) => t.type === 'buy'),
  },
  {
    id: 'first_profit_sell', title: '첫 익절', desc: '수익을 남기고 매도에 성공해보세요.',
    check: (ctx) => ctx.transactions.some((t) => t.type === 'sell' && t.pnl > 0),
  },
  {
    id: 'diversify5', title: '분산투자', desc: '서로 다른 5개 종목을 동시에 보유해보세요.',
    check: (ctx) => Object.keys(ctx.holdings).length >= 5,
  },
  {
    id: 'big_win', title: '대박 거래', desc: '한 번의 매도로 50만 원 이상 수익을 실현해보세요.',
    check: (ctx) => ctx.transactions.some((t) => t.type === 'sell' && t.pnl >= 500000),
  },
  {
    id: 'double_asset', title: '자산 2배', desc: '총자산을 시작 자금의 2배로 불려보세요.',
    check: (ctx) => ctx.netWorth >= STARTING_CASH * 2,
  },
  {
    id: 'news_trader', title: '정보력 승부', desc: '뉴스가 떴던 종목을 매매해보세요.',
    check: (ctx) => ctx.transactions.some((t) => ctx.newsedStockIds.has(t.stockId)),
  },
];

/* ---------------------------------------------------------------- */
/*  스파크라인 — 증권 앱에서 흔히 쓰는 그라디언트 영역차트 형식               */
/* ---------------------------------------------------------------- */
let sparkUid = 0;
function Sparkline({ history, positive, w = 64, h = 24, strokeWidth = 1.6, showBaseline = false }) {
  const gradId = useMemo(() => `spark-grad-${sparkUid++}`, []);
  if (history.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const step = w / (history.length - 1);
  const color = positive ? C.up : C.down;
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
        <line x1={0} y1={baselineY} x2={w} y2={baselineY} stroke={C.inkFaint} strokeWidth={1} strokeDasharray="3,3" />
      )}
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/*  수량 스테퍼                                                        */
/* ---------------------------------------------------------------- */
function QtyStepper({ value, onChange, max }) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(max ? Math.min(max, value + 1) : value + 1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden', height: 30 }}>
      <button onClick={dec} style={stepBtnStyle}>−</button>
      <input
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
          onChange(Number.isNaN(n) ? 1 : Math.max(1, n));
        }}
        style={{ width: 40, textAlign: 'center', border: 'none', outline: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, fontWeight: 600, color: C.ink }}
      />
      <button onClick={inc} style={stepBtnStyle}>+</button>
    </div>
  );
}

const stepBtnStyle = { width: 24, height: '100%', border: 'none', background: C.paper, color: C.inkDim, fontSize: 14, cursor: 'pointer', lineHeight: 1 };

const actionBtnStyle = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 600,
  fontSize: 12.5,
  padding: '7px 12px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

/* ---------------------------------------------------------------- */
/*  환영 화면                                                          */
/* ---------------------------------------------------------------- */
function WelcomeScreen({ onStart }) {
  return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", padding: 24 }}>
      <style>{`${FONT_IMPORT}
        @keyframes floatTick { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-8px);} }
      `}</style>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
          {['📈', '💹', '📊'].map((e, i) => (
            <span key={i} style={{ fontSize: 30, display: 'inline-block', animation: `floatTick ${2.2 + i * 0.3}s ease-in-out infinite` }}>{e}</span>
          ))}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.ink, marginBottom: 8 }}>모의투자</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, letterSpacing: 2.5, color: C.inkDim, marginBottom: 22 }}>
          VIRTUAL STOCK MARKET
        </div>
        <p style={{ color: C.inkDim, fontSize: 14.5, lineHeight: 1.7, marginBottom: 30 }}>
          {fmt(STARTING_CASH)}원의 시드머니로 시작합니다.<br />
          실시간으로 움직이는 6개 종목을 사고팔며 자산을 불려보세요.
        </p>
        <button
          onClick={onStart}
          style={{ ...actionBtnStyle, background: C.ink, color: '#fff', fontSize: 15, padding: '13px 28px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          투자 시작하기 <ChevronRight size={16} />
        </button>
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center', gap: 26 }}>
          {[['📈', '마켓'], ['📊', '대시보드']].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.inkDim }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  종목 한 행 (클릭 시 상세 모달 오픈)                                    */
/* ---------------------------------------------------------------- */
function StockRow({ stock, holding, cash, onBuy, onSell, onOpenDetail }) {
  const [qty, setQty] = useState(1);
  const change = ((stock.price - stock.open) / stock.open) * 100;
  const dirUp = stock.dir !== 'down'; // 'up' 또는 'flat'(초기)이면 상승 톤
  const dirColor = stock.dir === 'down' ? C.down : stock.dir === 'up' ? C.up : C.inkFaint;
  const dirArrow = stock.dir === 'down' ? '▼' : stock.dir === 'up' ? '▲' : '–';
  const cost = stock.price * qty;
  const canBuy = cash >= cost;
  const canSell = holding && holding.qty >= qty;
  const evalValue = holding ? holding.qty * stock.price : 0;
  const pnl = holding ? evalValue - holding.qty * holding.avgPrice : 0;
  const pnlPositive = pnl >= 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 0.9fr 0.7fr 1.1fr 1.6fr',
        alignItems: 'center',
        gap: 12,
        padding: '14px 4px',
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <div onClick={() => onOpenDetail(stock.id)} style={{ cursor: 'pointer' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14.5, color: C.ink }}>{stock.name}</div>
        <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 2 }}>{stock.sector}</div>
      </div>

      <div onClick={() => onOpenDetail(stock.id)} style={{ textAlign: 'right', cursor: 'pointer' }}>
        <div key={Math.round(stock.price)} className="price-flash" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14.5, color: C.ink }}>
          {fmt(stock.price)}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 600, color: dirColor, marginTop: 2 }}>
          {dirArrow} {Math.abs(change).toFixed(2)}%
        </div>
      </div>

      <div onClick={() => onOpenDetail(stock.id)} style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
        <Sparkline history={stock.history} positive={dirUp} />
      </div>

      <div style={{ textAlign: 'right' }}>
        {holding ? (
          <>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.ink }}>{holding.qty}주 · 평단 {fmt(holding.avgPrice)}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 600, color: pnlPositive ? C.up : C.down, marginTop: 2 }}>
              {pnlPositive ? '+' : ''}{fmt(pnl)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: C.inkFaint }}>미보유</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <QtyStepper value={qty} onChange={setQty} />
        <button onClick={() => onBuy(stock.id, qty)} disabled={!canBuy} style={{ ...actionBtnStyle, background: C.ink, color: '#fff', opacity: canBuy ? 1 : 0.35 }}>매수</button>
        <button onClick={() => onSell(stock.id, qty)} disabled={!canSell} style={{ ...actionBtnStyle, background: C.surface, color: C.ink, border: `1px solid ${C.line}`, opacity: canSell ? 1 : 0.35 }}>매도</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  종목 상세 모달                                                      */
/* ---------------------------------------------------------------- */
function StockDetailModal({ stock, holding, cash, onBuy, onSell, onClose }) {
  const [qty, setQty] = useState(1);
  if (!stock) return null;

  const change = ((stock.price - stock.open) / stock.open) * 100;
  const dirUp = stock.dir !== 'down';
  const dirColor = stock.dir === 'down' ? C.down : stock.dir === 'up' ? C.up : C.inkFaint;
  const dirArrow = stock.dir === 'down' ? '▼' : stock.dir === 'up' ? '▲' : '–';
  const high = Math.max(...stock.history);
  const low = Math.min(...stock.history);
  const cost = stock.price * qty;
  const canBuy = cash >= cost;
  const canSell = holding && holding.qty >= qty;
  const evalValue = holding ? holding.qty * stock.price : 0;
  const pnl = holding ? evalValue - holding.qty * holding.avgPrice : 0;
  const pnlPositive = pnl >= 0;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,23,31,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, borderRadius: 16, maxWidth: 440, width: '100%', padding: 26, boxShadow: '0 20px 60px rgba(20,23,31,0.18)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 12, color: C.inkDim, fontWeight: 600, marginBottom: 2 }}>{stock.sector}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{stock.name}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.inkFaint, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.6, margin: '10px 0 20px' }}>{stock.desc}</p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 26, color: C.ink }}>{fmt(stock.price)}원</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: dirColor }}>
            {dirArrow} {Math.abs(change).toFixed(2)}%
          </div>
        </div>

        <div style={{ margin: '14px 0', background: C.paper, borderRadius: 10, padding: '10px 12px' }}>
          <Sparkline history={stock.history} positive={dirUp} w={368} h={64} strokeWidth={2} showBaseline />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.inkFaint, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            <span>최저 {fmt(low)}</span>
            <span>최고 {fmt(high)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, padding: '12px 0', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: C.inkDim, marginBottom: 3 }}>보유 수량</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 600, color: C.ink }}>{holding ? `${holding.qty}주` : '없음'}</div>
          </div>
          {holding && (
            <>
              <div>
                <div style={{ fontSize: 11, color: C.inkDim, marginBottom: 3 }}>평단가</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 600, color: C.ink }}>{fmt(holding.avgPrice)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.inkDim, marginBottom: 3 }}>평가손익</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 600, color: pnlPositive ? C.up : C.down }}>{pnlPositive ? '+' : ''}{fmt(pnl)}</div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <QtyStepper value={qty} onChange={setQty} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onBuy(stock.id, qty)} disabled={!canBuy} style={{ ...actionBtnStyle, background: C.ink, color: '#fff', padding: '9px 18px', opacity: canBuy ? 1 : 0.35 }}>매수</button>
            <button onClick={() => onSell(stock.id, qty)} disabled={!canSell} style={{ ...actionBtnStyle, background: C.surface, color: C.ink, border: `1px solid ${C.line}`, padding: '9px 18px', opacity: canSell ? 1 : 0.35 }}>매도</button>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 10, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
          주문금액 {fmt(cost)}원
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  마켓 탭                                                            */
/* ---------------------------------------------------------------- */
function MarketTab({ stocks, holdings, cash, onBuy, onSell, onOpenDetail }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.9fr 0.7fr 1.1fr 1.6fr', gap: 12, padding: '0 4px 10px', fontSize: 11, color: C.inkFaint, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>
        <div>종목</div>
        <div style={{ textAlign: 'right' }}>현재가</div>
        <div style={{ textAlign: 'center' }}>추이</div>
        <div style={{ textAlign: 'right' }}>보유</div>
        <div style={{ textAlign: 'right' }}>주문</div>
      </div>
      <div>
        {stocks.map((s) => (
          <StockRow key={s.id} stock={s} holding={holdings[s.id]} cash={cash} onBuy={onBuy} onSell={onSell} onOpenDetail={onOpenDetail} />
        ))}
      </div>
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
  const color = positive ? C.up : C.down;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.08} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AchievementsSection({ unlockedIds }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.inkDim, marginBottom: 8 }}>도전과제</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedIds.has(a.id);
          return (
            <div
              key={a.id}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10,
                background: unlocked ? C.surface : C.paper, border: `1px solid ${C.line}`, opacity: unlocked ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: unlocked ? C.upBg : C.line, color: unlocked ? C.up : C.inkFaint,
                }}
              >
                {unlocked ? <Check size={14} /> : <Lock size={12} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{a.title}</div>
                <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2, lineHeight: 1.4 }}>{a.desc}</div>
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
      <div style={{ fontSize: 12, fontWeight: 600, color: C.inkDim, marginBottom: 8 }}>체결 내역</div>
      {transactions.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkFaint, padding: '16px 0' }}>아직 체결된 거래가 없어요.</div>
      ) : (
        <div>
          {transactions.map((t) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr 1fr 1fr 1fr', gap: 12, padding: '11px 4px', borderBottom: `1px solid ${C.line}`, alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, width: 'fit-content',
                  background: t.type === 'buy' ? C.downBg : C.upBg, color: t.type === 'buy' ? C.down : C.up,
                }}
              >
                {t.type === 'buy' ? '매수' : '매도'}
              </span>
              <span style={{ fontSize: 13, color: C.ink }}>{t.stockName}</span>
              <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.ink }}>{t.qty}주 · {fmt(t.price)}</span>
              <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: C.ink }}>{fmt(t.total)}</span>
              <span style={{ textAlign: 'right', fontSize: 11, color: C.inkFaint }}>{timeAgo(t.time, Date.now())}</span>
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
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.inkDim, marginBottom: 4 }}>총자산</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 24, color: C.ink }}>{fmt(netWorth)}원</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: C.inkDim, marginBottom: 4 }}>누적 수익</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 24, color: positive ? C.up : C.down }}>
            {positive ? '+' : ''}{fmt(totalReturn)}원 <span style={{ fontSize: 14 }}>({positive ? '+' : ''}{totalReturnPct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px 16px 8px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.inkDim, marginBottom: 6 }}>자산 추이</div>
        <NetWorthChart history={netWorthHistory} />
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.inkDim, marginBottom: 4 }}>현금</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, color: C.ink }}>{fmt(cash)}원</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: C.inkDim, marginBottom: 4 }}>보유 종목 평가액</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, color: C.ink }}>{fmt(holdingsValue)}원</div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: C.inkDim, marginBottom: 8 }}>보유 종목</div>
      {holdingsList.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkFaint, padding: '20px 0' }}>보유 중인 종목이 없어요. 마켓에서 매수해보세요.</div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          {holdingsList.map((h) => (
            <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12, padding: '12px 4px', borderBottom: `1px solid ${C.line}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{h.name}</div>
                <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2 }}>{h.sector}</div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.ink }}>{h.qty}주</div>
              <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.ink }}>{fmt(h.value)}</div>
              <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: h.pnl >= 0 ? C.up : C.down }}>
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

  // 상대시간(몇 분 전) 표시를 위해 30초마다 리렌더
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (news.length === 0) {
    return <div style={{ fontSize: 13, color: C.inkFaint, padding: '32px 0', textAlign: 'center' }}>아직 발생한 뉴스가 없어요. 잠시 기다려보세요.</div>;
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 6, lineHeight: 1.5 }}>
        어떤 종목 이야기인지는 알려주지 않아요. 마켓에서 직접 찾아보세요.
      </div>
      {news.map((n) => (
        <div key={n.id} style={{ display: 'flex', gap: 12, padding: '14px 4px', borderBottom: `1px solid ${C.line}` }}>
          <div
            style={{
              flexShrink: 0, width: 6, height: 6, borderRadius: 99, marginTop: 6,
              background: n.positive ? C.up : C.down,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 5, marginBottom: 4,
                background: n.positive ? C.upBg : C.downBg, color: n.positive ? C.up : C.down,
              }}
            >
              {n.positive ? '호재' : '악재'}
            </span>
            <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>{n.headline}</div>
          </div>
          <div style={{ flexShrink: 0, fontSize: 11, color: C.inkFaint, whiteSpace: 'nowrap' }}>{timeAgo(n.time, Date.now())}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  도전과제 달성 토스트                                                  */
/* ---------------------------------------------------------------- */
function AchievementToastStack({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 60 }}>
      {toasts.map((t) => (
        <div
          key={t.key}
          className="achievement-toast"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, background: C.ink, color: '#fff',
            padding: '11px 16px', borderRadius: 10, boxShadow: '0 12px 30px rgba(20,23,31,0.25)', minWidth: 220,
          }}
        >
          <Award size={18} color={C.gold || '#EAC13A'} />
          <div>
            <div style={{ fontSize: 10.5, opacity: 0.7, marginBottom: 1 }}>도전과제 달성</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  메인 컴포넌트                                                       */
/* ---------------------------------------------------------------- */
const TABS = [
  { id: 'market', label: '마켓', icon: TrendingUp },
  { id: 'news', label: '뉴스', icon: Newspaper },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
];

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

  // 뉴스 이벤트 — 45~75초 사이 랜덤 간격으로 무작위 종목에 호재/악재 발생 (같은 섹터 종목도 동반 반응)
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

          // 같은 섹터 종목 동반 반응
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

  // 총자산 추이 기록 (틱마다)
  useEffect(() => {
    if (!started) return;
    const holdingsValue = Object.entries(holdings).reduce((sum, [id, h]) => sum + h.qty * (stockById[id]?.price || 0), 0);
    setNetWorthHistory((prev) => [...prev, cash + holdingsValue].slice(-60));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks]);

  // 도전과제 달성 체크 — 거래/보유/자산이 바뀔 때마다 확인
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
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        @keyframes priceFlash { 0% { opacity: 0.3; } 100% { opacity: 1; } }
        .price-flash { animation: priceFlash 0.3s ease-out; }
        .tab-btn { transition: color .15s; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .achievement-toast { animation: toastIn 0.25s ease-out; }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 60px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: C.inkDim, fontWeight: 600, marginBottom: 4 }}>모의투자</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{tab === 'market' ? '마켓' : tab === 'news' ? '뉴스' : '대시보드'}</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.inkDim }}>현금</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>{fmt(cash)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.inkDim }}>총자산</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>{fmt(netWorth)}</div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: `1px solid ${C.line}` }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className="tab-btn"
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${C.ink}` : '2px solid transparent',
                  color: active ? C.ink : C.inkFaint, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 컨텐츠 */}
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
