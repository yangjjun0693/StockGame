import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { TrendingUp, LayoutDashboard, Newspaper, Users, X, ChevronRight, Sun, Moon, LogOut, Heart, MessageCircle, Send } from 'lucide-react';
import { signUp, signIn, signOut, getStoredAccount, fetchPortfolio, saveSnapshot, upsertHolding, insertTransaction } from './lib/supabase';
import { useMajorCoins, useMemeCoins } from './lib/coingecko';
import { useFinnhubStocks, useFinnhubNews } from './lib/finnhub';
import { useFxRates } from './lib/fx';
import { useCryptoNews } from './lib/cryptonews';
import { FORUM_CATEGORIES, fetchPosts, fetchLikedPostIds, createPost, deletePost, fetchComments, addComment, toggleLike, fetchRanking } from './lib/community';

// poesi의 팔레트 태그를 이식한 섹터 컬러 (실제 종목 12개 + FX 묶음)
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
  '외환': '#4A90D9',
};

const HISTORY_LEN = 40;
const STARTING_CASH = 10_000;


const USD_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => USD_FORMATTER.format(n);
// Coin prices can be tiny fractions of a cent (pump.fun tokens), where fmt()
// would just show "$0.00". Show enough significant digits to be readable.
const fmtCoinPrice = (n) => {
  if (!n) return '$0.00';
  if (n >= 0.01) return fmt(n);
  const decimals = Math.min(10, Math.max(2, Math.ceil(-Math.log10(n)) + 3));
  return `$${n.toFixed(decimals)}`;
};

function timeAgo(ts, now) {
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  return `${hr}시간 전`;
}

/* ---------------------------------------------------------------- */
/*  레버리지 / 롱-숏 포지션 계산 유틸                                        */
/* ---------------------------------------------------------------- */

// 진입 당시 가격 기준 증거금 (마진) — 레버리지 1x면 기존 현물 매수와 동일
function positionMargin(avgPrice, leverage, qty) {
  return (avgPrice * qty) / leverage;
}

// 방향(롱/숏)에 따른 평가손익
function positionPnl(side, avgPrice, price, qty) {
  return side === 'short' ? (avgPrice - price) * qty : (price - avgPrice) * qty;
}

// 포지션의 현재 평가금액(자산가치) = 증거금 + 평가손익
function positionValue(holding, price) {
  const { avgPrice, qty, leverage = 1, side = 'long' } = holding;
  return positionMargin(avgPrice, leverage, qty) + positionPnl(side, avgPrice, price, qty);
}

// holdings 맵 전체의 평가금액 합
function totalHoldingsValue(holdings, assetsById) {
  return Object.entries(holdings).reduce((sum, [id, h]) => {
    const price = assetsById[id]?.price || 0;
    return sum + positionValue(h, price);
  }, 0);
}

/* ---------------------------------------------------------------- */
/*  TradingView 고급 차트 위젯 (무료 임베드, API 키 불필요)                     */
/* ---------------------------------------------------------------- */
// 주식은 알려진 상장 거래소 접두어를 붙여줘야 TradingView가 정확히 못 찾는 경우가
// 줄어든다. 목록에 없는 티커는 접두어 없이 넘겨서 TradingView 자체 검색에 맡긴다.
const STOCK_TV_EXCHANGE = {
  NVDA: 'NASDAQ', TSLA: 'NASDAQ', MRNA: 'NASDAQ', KO: 'NYSE', DIS: 'NYSE',
  ENPH: 'NASDAQ', MSFT: 'NASDAQ', RKLB: 'NASDAQ', BA: 'NYSE', TTWO: 'NASDAQ',
  WMT: 'NYSE', FCX: 'NYSE',
};
// 실제 외환시장 고시 방향 기준 (JPY/KRW/CHF는 USD가 기준통화)
const FX_TV_SYMBOL = {
  EUR: 'FX:EURUSD', GBP: 'FX:GBPUSD', AUD: 'FX:AUDUSD',
  JPY: 'FX:USDJPY', KRW: 'FX:USDKRW', CHF: 'FX:USDCHF',
};

function tvSymbolFor(asset) {
  if (!asset) return null;
  if (asset.assetType === 'coin') return `BINANCE:${asset.symbol.toUpperCase()}USDT`;
  if (asset.assetType === 'fx') return FX_TV_SYMBOL[asset.code] || `FX:${asset.symbol?.replace('/', '')}`;
  const exch = STOCK_TV_EXCHANGE[asset.symbol];
  return exch ? `${exch}:${asset.symbol}` : asset.symbol;
}

function ChartModeToggle({ mode, onChange }) {
  const isTv = mode === 'tv';
  const segW = 46;
  return (
    <div
      className="relative inline-flex rounded-full p-1 shrink-0"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      <div
        className="absolute top-1 bottom-1 rounded-full pointer-events-none"
        style={{
          width: segW,
          left: 4,
          background: 'var(--ink)',
          opacity: 0.9,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
          transform: `translateX(${isTv ? segW : 0}px)`,
          transition: 'transform 0.32s var(--spring)',
        }}
      />
      <button
        type="button"
        onClick={() => onChange('simple')}
        className="relative z-10 font-inter font-bold text-[10px] rounded-full py-1 transition-colors duration-200"
        style={{ width: segW, color: isTv ? 'var(--ink-faint)' : 'var(--base-bg)' }}
      >
        간단
      </button>
      <button
        type="button"
        onClick={() => onChange('tv')}
        className="relative z-10 font-inter font-bold text-[10px] rounded-full py-1 transition-colors duration-200"
        style={{ width: segW, color: isTv ? 'var(--base-bg)' : 'var(--ink-faint)' }}
      >
        TV
      </button>
    </div>
  );
}

function TradingViewChart({ symbol, dark, height = 320 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !symbol) return;
    container.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: dark ? 'dark' : 'light',
      style: '1',
      locale: 'kr',
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(widgetDiv);
    container.appendChild(script);
    return () => {
      container.innerHTML = '';
    };
  }, [symbol, dark]);

  return <div ref={containerRef} className="tradingview-widget-container" style={{ height, width: '100%' }} />;
}

const LEVERAGE_SNAP_POINTS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50];
const LEVERAGE_MIN = 1;
// 자산군별 현실적인 레버리지 상한: 주식은 실제 신용거래 수준(4x), FX는 소매 외환 레버리지(20x), 코인은 무기한선물 수준(50x)
const LEVERAGE_MAX_BY_TYPE = { stock: 4, fx: 20, coin: 50 };

function leveragePct(v, max) {
  return ((v - LEVERAGE_MIN) / (max - LEVERAGE_MIN)) * 100;
}

function SidePillToggle({ side, onChange }) {
  const isShort = side === 'short';
  return (
    <div
      className="relative inline-flex rounded-full p-1 shrink-0"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.35)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
      }}
    >
      <div
        className="absolute top-1 bottom-1 rounded-full pointer-events-none"
        style={{
          width: 52,
          left: 4,
          transform: `translateX(${isShort ? 52 : 0}px)`,
          transition: 'transform 0.32s var(--spring), background 0.25s ease, box-shadow 0.25s ease',
          background: isShort
            ? 'linear-gradient(180deg, rgba(200,70,80,0.35), rgba(170,50,60,0.22))'
            : 'linear-gradient(180deg, rgba(50,150,100,0.35), rgba(30,120,75,0.22))',
          border: `1px solid ${isShort ? 'rgba(200,70,80,0.3)' : 'rgba(50,150,100,0.3)'}`,
          boxShadow: '0 1px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.35)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      <button
        type="button"
        onClick={() => onChange('long')}
        className="relative z-10 font-inter font-bold text-xs rounded-full py-1.5 transition-colors duration-200"
        style={{ width: 52, color: isShort ? 'var(--ink-faint)' : '#fff', textShadow: isShort ? 'none' : '0 1px 2px rgba(0,0,0,0.15)' }}
      >
        Long
      </button>
      <button
        type="button"
        onClick={() => onChange('short')}
        className="relative z-10 font-inter font-bold text-xs rounded-full py-1.5 transition-colors duration-200"
        style={{ width: 52, color: isShort ? '#fff' : 'var(--ink-faint)', textShadow: isShort ? '0 1px 2px rgba(0,0,0,0.15)' : 'none' }}
      >
        Short
      </button>
    </div>
  );
}

function LeverageSlider({ value, onChange, leftSlot, max = 50 }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const snapPoints = useMemo(() => {
    const pts = LEVERAGE_SNAP_POINTS.filter((v) => v <= max);
    if (pts[pts.length - 1] !== max) pts.push(max);
    return pts;
  }, [max]);

  useEffect(() => {
    if (!dragging) setDisplayValue(value);
  }, [value, dragging]);

  const valueFromClientX = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = LEVERAGE_MIN + pct * (max - LEVERAGE_MIN);
    // 근처 스냅 포인트로 자석처럼 달라붙는 느낌
    let snapped = raw;
    let minDist = Infinity;
    const snapWindow = Math.max(0.6, max * 0.03);
    for (const sp of snapPoints) {
      const d = Math.abs(raw - sp);
      if (d < snapWindow && d < minDist) {
        minDist = d;
        snapped = sp;
      }
    }
    return Math.round(snapped);
  };

  const update = (clientX) => {
    const v = valueFromClientX(clientX);
    setDisplayValue(v);
    onChange(v);
  };

  const handlePointerDown = (e) => {
    setDragging(true);
    trackRef.current.setPointerCapture(e.pointerId);
    update(e.clientX);
  };
  const handlePointerMove = (e) => {
    if (!dragging) return;
    update(e.clientX);
  };
  const handlePointerUp = (e) => {
    setDragging(false);
    try { trackRef.current.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const pct = leveragePct(displayValue, max);
  const snapTransition = 'left 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)';

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        {leftSlot || <span className="font-inter text-xs" style={{ color: 'var(--ink-faint)' }}>레버리지</span>}
        <span className="font-inter font-bold text-sm tabular-nums" style={{ color: 'var(--ink)' }}>{displayValue}x</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-7 flex items-center cursor-pointer select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute inset-x-0 h-1.5 rounded-full" style={{ background: 'var(--ink-faint)', opacity: 0.3 }} />
        <div
          className="absolute h-1.5 rounded-full left-0"
          style={{ width: `${pct}%`, background: 'var(--ink)', transition: dragging ? 'none' : `width 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)` }}
        />
        {snapPoints.map((sp) => (
          <div
            key={sp}
            className="absolute w-1 h-1 rounded-full -translate-x-1/2 pointer-events-none"
            style={{ left: `${leveragePct(sp, max)}%`, background: sp <= displayValue ? 'var(--base-bg)' : 'var(--ink)', opacity: sp <= displayValue ? 0.55 : 0.25 }}
          />
        ))}
        <div
          className="absolute rounded-full -translate-x-1/2 pointer-events-none"
          style={{
            left: `${pct}%`,
            width: dragging ? 22 : 16,
            height: dragging ? 22 : 16,
            background: 'var(--ink)',
            boxShadow: dragging ? '0 0 0 7px rgba(128,128,128,0.18)' : '0 1px 4px rgba(0,0,0,0.3)',
            transition: dragging ? 'width 0.15s ease, height 0.15s ease' : `${snapTransition}, width 0.15s ease, height 0.15s ease`,
          }}
        />
        {dragging && (
          <div
            className="absolute -translate-x-1/2 font-inter font-bold text-xs px-2 py-1 rounded-md pointer-events-none whitespace-nowrap"
            style={{ left: `${pct}%`, top: -34, background: 'var(--ink)', color: 'var(--base-bg)' }}
          >
            {displayValue}x
          </div>
        )}
      </div>
      <div className="flex justify-between font-inter text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>
        <span>1x</span>
        <span>{max}x</span>
      </div>
    </div>
  );
}

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
/*  로그인 화면                                                        */
/* ---------------------------------------------------------------- */
function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const account = mode === 'signup'
        ? await signUp(username, password, nickname)
        : await signIn(username, password);
      onAuthed(account);
    } catch (err) {
      setError(err.message || '문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-10">
          <p className="font-inter font-medium text-xs tracking-wide text-gray-400 mb-3">VIRTUAL STOCK MARKET</p>
          <h1 className="font-myeongjo font-extrabold text-4xl">모의투자</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            autoCapitalize="none"
            placeholder="아이디 (영문 소문자/숫자/밑줄 3~20자)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 font-inter text-sm outline-none focus:border-gray-400 transition-colors"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 font-inter text-sm outline-none focus:border-gray-400 transition-colors"
          />
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="닉네임 (선택, 비우면 아이디 사용)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 font-inter text-sm outline-none focus:border-gray-400 transition-colors"
            />
          )}
          {error && <p className="font-inter text-xs text-red-500 px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-inter font-medium text-sm text-white bg-gray-900 rounded-full px-7 py-3.5 hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {loading ? '처리 중...' : mode === 'signup' ? '가입하기' : '로그인'} <ChevronRight size={16} />
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
          className="w-full text-center font-inter text-xs text-gray-400 hover:text-gray-600 mt-5 transition-colors"
        >
          {mode === 'signup' ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 가입하기'}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  로딩 화면                                                          */
/* ---------------------------------------------------------------- */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <p className="font-inter font-medium text-xs tracking-wide text-gray-400 mb-3">VIRTUAL STOCK MARKET</p>
        <h1 className="font-myeongjo font-extrabold text-4xl mb-5">모의투자</h1>
        <p className="font-inter text-sm text-gray-400">불러오는 중...</p>
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
  const cost = positionMargin(stock.price, holding?.leverage || 1, qty);
  const canBuy = cash >= cost;
  const canSell = holding && holding.qty >= qty;
  const pnl = holding ? positionPnl(holding.side || 'long', holding.avgPrice, stock.price, holding.qty) : 0;

  return (
    <article className="stock-card" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="flex justify-between items-start gap-4 mb-2 cursor-pointer" onClick={() => onOpenDetail(stock.id)}>
        <div>
          <h2 className={`font-myeongjo font-bold text-lg ${stock.symbol && stock.symbol !== stock.name ? 'mb-0.5' : 'mb-2'}`}>{stock.name}</h2>
          {stock.symbol && stock.symbol !== stock.name && (
            <p className="font-inter font-medium text-xs text-gray-400 mb-2 tracking-wide">{stock.symbol}</p>
          )}
          <span
            className="sector-tag inline-block font-inter font-medium text-xs px-3 py-1 rounded-full"
            style={{ background: sectorColor + '22', color: sectorColor }}
          >
            {stock.sector}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div key={stock.price} className="price-flash font-inter font-bold text-lg tabular-nums">{fmtCoinPrice(stock.price)}</div>
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
              {holding.qty}주 · 평단 {fmt(holding.avgPrice)}
              {(holding.leverage || 1) > 1 || holding.side === 'short' ? ` · ${holding.side === 'short' ? 'Short' : 'Long'} ${holding.leverage || 1}x` : ''}{' '}
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
function StockDetailModal({ stock, holding, cash, dark, onBuy, onSell, onClose }) {
  const [qty, setQty] = useState(1);
  const [side, setSide] = useState(holding?.side || 'long');
  const [leverage, setLeverage] = useState(holding?.leverage || 1);
  const [amount, setAmount] = useState('50');
  const [chartMode, setChartMode] = useState('simple');
  if (!stock) return null;

  const isCoin = stock.assetType === 'coin';

  // 이미 보유 중이면 방향/레버리지는 기존 포지션에 고정 (평단 계산이 꼬이지 않도록)
  const effSide = holding ? holding.side || 'long' : side;
  const effLeverage = holding ? holding.leverage || 1 : leverage;

  const change = ((stock.price - stock.open) / stock.open) * 100;
  const dirUp = stock.dir !== 'down';
  const dirColor = stock.dir === 'down' ? 'var(--down)' : stock.dir === 'up' ? 'var(--up)' : 'var(--ink-faint)';
  const dirArrow = stock.dir === 'down' ? '▼' : stock.dir === 'up' ? '▲' : '–';
  const sectorColor = SECTOR_COLORS[stock.sector] || '#999999';
  const high = Math.max(...stock.history);
  const low = Math.min(...stock.history);
  const leverageMax = LEVERAGE_MAX_BY_TYPE[stock.assetType] || 4;

  // 코인: 증거금 커스텀 입력 기준, 그 외(주식/FX): 수량 스테퍼 기준
  const marginAmount = Math.max(0, Number(amount) || 0);
  const coinBuyQty = stock.price > 0 ? (marginAmount * effLeverage) / stock.price : 0;
  const cost = isCoin ? marginAmount : positionMargin(stock.price, effLeverage, qty);
  const canBuy = isCoin ? cash >= marginAmount && marginAmount > 0 && coinBuyQty > 0 : cash >= cost;
  const canSell = holding && holding.qty >= qty;
  const pnl = holding ? positionPnl(effSide, holding.avgPrice, stock.price, holding.qty) : 0;

  const isTv = chartMode === 'tv';

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="modal-backdrop absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`modal-box relative bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col ${isTv ? 'h-[85vh] p-4 overflow-hidden' : 'max-h-[92vh] p-7 overflow-y-auto'}`}
      >
        <button onClick={onClose} className={isTv ? 'absolute top-4 right-4 text-gray-300 hover:text-gray-600 transition-colors z-10' : 'absolute top-5 right-5 text-gray-300 hover:text-gray-600 transition-colors'}>
          <X size={18} />
        </button>

        <div
          style={{
            maxHeight: isTv ? 0 : 600,
            opacity: isTv ? 0 : 1,
            overflow: 'hidden',
            transition: `max-height 0.4s var(--ease), opacity ${isTv ? '0.15s ease' : '0.3s ease 0.1s'}`,
          }}
        >
          <p className="font-inter font-medium text-xs mb-1" style={{ color: sectorColor }}>{stock.sector}</p>
          <h2 className={`font-myeongjo font-bold text-xl ${stock.symbol && stock.symbol !== stock.name ? 'mb-0.5' : 'mb-3'}`}>{stock.name}</h2>
          {stock.symbol && stock.symbol !== stock.name && (
            <p className="font-inter font-medium text-xs text-gray-400 mb-3 tracking-wide">{stock.symbol}</p>
          )}
          <p className="font-inter text-sm text-gray-400 leading-6 mb-4">{stock.desc}</p>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-inter font-bold text-2xl tabular-nums">{fmtCoinPrice(stock.price)}</span>
            <span className="font-inter text-xs font-semibold" style={{ color: dirColor }}>
              {dirArrow} {Math.abs(change).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className={`flex justify-center ${isTv ? 'mb-3 shrink-0' : 'my-3'}`} style={{ transition: 'margin 0.4s var(--ease)' }}>
          <ChartModeToggle mode={chartMode} onChange={setChartMode} />
        </div>

        {isTv ? (
          <div
            className="rounded-xl overflow-hidden flex-1"
            style={{ background: 'var(--ink-faint)', animation: 'fadeUp 0.45s var(--ease) 0.15s both' }}
          >
            <TradingViewChart symbol={tvSymbolFor(stock)} dark={dark} height="100%" />
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <Sparkline history={stock.history} positive={dirUp} w={330} h={64} strokeWidth={2} showBaseline />
              <div className="flex justify-between text-[11px] text-gray-400 mt-2 font-inter tabular-nums">
                <span>최저 {fmt(low)}</span>
                <span>최고 {fmt(high)}</span>
              </div>
            </div>

            <div className="flex gap-6 py-3 border-t border-b border-gray-100 mb-5 font-inter">
              <div>
                <div className="text-[11px] text-gray-400 mb-1">보유 수량</div>
                <div className="text-sm font-semibold">{holding ? `${holding.qty}${isCoin ? '개' : '주'}` : '없음'}</div>
              </div>
              {holding && (
                <>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">평단가</div>
                    <div className="text-sm font-semibold tabular-nums">{fmt(holding.avgPrice)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 mb-1">방향 · 배율</div>
                    <div className="text-sm font-semibold">{effSide === 'short' ? 'Short' : 'Long'} {effLeverage}x</div>
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

            {!holding && (
              <div className="mb-4">
                <LeverageSlider value={leverage} onChange={setLeverage} max={leverageMax} leftSlot={<SidePillToggle side={side} onChange={setSide} />} />
              </div>
            )}

            {isCoin ? (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-inter text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="증거금"
                      className="font-inter font-medium text-sm w-24 border border-gray-200 rounded-full px-3 py-2 outline-none tabular-nums"
                    />
                    <button
                      onClick={() => onBuy(stock.id, coinBuyQty, { side, leverage })}
                      disabled={!canBuy}
                      className="font-inter font-medium text-sm text-white bg-gray-900 rounded-full px-5 py-2.5 disabled:opacity-30"
                    >
                      매수
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COIN_SELL_PCTS.map((pct) => {
                      const sellQty = holding ? holding.qty * (pct / 100) : 0;
                      return (
                        <button
                          key={pct}
                          onClick={() => onSell(stock.id, sellQty)}
                          disabled={!holding || sellQty <= 0}
                          className="font-inter font-medium text-xs border border-gray-200 rounded-full px-3 py-2 disabled:opacity-30"
                        >
                          {pct}% 매도
                        </button>
                      );
                    })}
                  </div>
                </div>
                {!holding && effLeverage > 1 && (
                  <div className="text-right text-[11px] text-gray-400 font-inter mt-2 tabular-nums">
                    명목 {fmt(coinBuyQty * stock.price)} ({coinBuyQty.toLocaleString('en-US', { maximumFractionDigits: 4 })}개)
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <QtyStepper value={qty} onChange={setQty} />
                  <div className="flex gap-2">
                    <button onClick={() => onBuy(stock.id, qty, { side, leverage })} disabled={!canBuy} className="font-inter font-medium text-sm text-white bg-gray-900 rounded-full px-5 py-2.5 disabled:opacity-30">매수</button>
                    <button onClick={() => onSell(stock.id, qty)} disabled={!canSell} className="font-inter font-medium text-sm border border-gray-200 rounded-full px-5 py-2.5 disabled:opacity-30">매도</button>
                  </div>
                </div>
                <div className="text-right text-[11px] text-gray-400 font-inter mt-2 tabular-nums">증거금 {fmt(cost)}{effLeverage > 1 ? ` (명목 ${fmt(stock.price * qty)})` : ''}</div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  마켓 탭 — 세로 카드 피드 (poesi feed 이식)                            */
/* ---------------------------------------------------------------- */
const MARKET_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'stock', label: '주식' },
  { id: 'coin', label: '코인' },
  { id: 'fx', label: 'FX' },
];

const SORT_OPTIONS = [
  { id: 'default', label: '기본순' },
  { id: 'mcap_desc', label: '시총 높은순' },
  { id: 'change_desc', label: '등락률 높은순' },
  { id: 'change_asc', label: '등락률 낮은순' },
  { id: 'price_desc', label: '가격 높은순' },
  { id: 'price_asc', label: '가격 낮은순' },
  { id: 'name', label: '이름순' },
];

function changePct(asset) {
  if (!asset.open) return 0;
  return ((asset.price - asset.open) / asset.open) * 100;
}

function sortAssets(list, sortKey) {
  switch (sortKey) {
    case 'mcap_desc': return [...list].sort((a, b) => (b.marketCapUsd ?? b.marketCapSol ?? 0) - (a.marketCapUsd ?? a.marketCapSol ?? 0));
    case 'change_desc': return [...list].sort((a, b) => changePct(b) - changePct(a));
    case 'change_asc': return [...list].sort((a, b) => changePct(a) - changePct(b));
    case 'price_desc': return [...list].sort((a, b) => b.price - a.price);
    case 'price_asc': return [...list].sort((a, b) => a.price - b.price);
    case 'name': return [...list].sort((a, b) => a.name.localeCompare(b.name));
    default: return list;
  }
}

function MarketTab({ stocks, coins, fx, holdings, cash, onBuy, onSell, onOpenDetail }) {
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('default');

  const assets = useMemo(() => {
    let list = [...stocks, ...coins, ...fx];
    if (filter !== 'all') list = list.filter((a) => a.assetType === filter);

    // BTC/ETH/SOL (CoinGecko "major" tier) are always pinned above meme
    // coins and stocks, regardless of the chosen sort — only their
    // relative order (and the rest's) is affected by sortKey.
    const majors = list.filter((a) => a.tier === 'major');
    const rest = list.filter((a) => a.tier !== 'major');
    return [...sortAssets(majors, sortKey), ...sortAssets(rest, sortKey)];
  }, [stocks, coins, fx, filter, sortKey]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-7">
        <div className="flex gap-1.5">
          {MARKET_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                if (f.id === 'coin' && sortKey === 'default') setSortKey('mcap_desc');
              }}
              className="font-inter font-medium text-xs px-3.5 py-1.5 rounded-full border transition-colors"
              style={filter === f.id
                ? { background: 'var(--ink)', color: 'var(--base-bg)', borderColor: 'var(--ink)' }
                : { borderColor: 'var(--ink-faint)', color: 'var(--ink-faint)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="font-inter text-xs text-gray-500 bg-transparent border border-gray-200 rounded-full px-3 py-1.5 outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      {assets.length === 0 ? (
        <div className="font-inter text-sm text-gray-300 py-10 text-center">
          {filter === 'coin' ? '실시간 코인 데이터를 불러오는 중이에요...' : '표시할 종목이 없어요.'}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {assets.map((a, i) => (
            a.assetType === 'coin'
              ? <CoinCard key={a.id} index={i} coin={a} holding={holdings[a.id]} cash={cash} onBuy={onBuy} onSell={onSell} onOpenDetail={onOpenDetail} />
              : <StockCard key={a.id} index={i} stock={a} holding={holdings[a.id]} cash={cash} onBuy={onBuy} onSell={onSell} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  코인 카드 (CoinGecko: 메이저 + 유명 밈코인 고정 라인업)                     */
/* ---------------------------------------------------------------- */
const COIN_SELL_PCTS = [25, 50, 100];

function CoinCard({ coin, index, holding, cash, onBuy, onSell, onOpenDetail }) {
  const [side, setSide] = useState(holding?.side || 'long');
  const [leverage, setLeverage] = useState(holding?.leverage || 1);
  const [amount, setAmount] = useState('50');

  // 이미 보유 중이면 방향/레버리지는 기존 포지션에 고정 (평단 계산이 꼬이지 않도록)
  const effSide = holding ? holding.side || 'long' : side;
  const effLeverage = holding ? holding.leverage || 1 : leverage;

  const change = changePct(coin);
  const dirColor = coin.dir === 'down' ? 'var(--down)' : coin.dir === 'up' ? 'var(--up)' : 'var(--ink-faint)';
  const dirArrow = coin.dir === 'down' ? '▼' : coin.dir === 'up' ? '▲' : '–';
  const marketCapUsd = coin.marketCapUsd ?? 0;

  const marginAmount = Math.max(0, Number(amount) || 0);
  const buyQty = coin.price > 0 ? (marginAmount * effLeverage) / coin.price : 0;
  const canBuy = cash >= marginAmount && marginAmount > 0 && buyQty > 0;
  const pnl = holding ? positionPnl(effSide, holding.avgPrice, coin.price, holding.qty) : 0;

  return (
    <article className="stock-card" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="flex justify-between items-start gap-4 mb-2 cursor-pointer" onClick={() => onOpenDetail?.(coin.id)}>
        <div>
          <h2 className="font-myeongjo font-bold text-lg mb-2">{coin.name}</h2>
          <span
            className="sector-tag inline-block font-inter font-medium text-xs px-3 py-1 rounded-full"
            style={{ background: '#8A6D4E22', color: '#8A6D4E' }}
          >
            ${coin.symbol}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="font-inter font-bold text-lg tabular-nums">{fmtCoinPrice(coin.price)}</div>
          <div className="font-inter text-xs font-semibold tabular-nums mt-1" style={{ color: dirColor }}>
            {dirArrow} {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      </div>

      <p className="font-inter text-xs text-gray-400 mb-4">
        시총 {marketCapUsd > 0 ? fmt(marketCapUsd) : '-'} · CoinGecko
      </p>

      <div className="mb-5 cursor-pointer" onClick={() => onOpenDetail?.(coin.id)}>
        <Sparkline history={coin.history} positive={coin.dir !== 'down'} w={320} h={44} />
      </div>

      <div className="font-inter text-xs text-gray-400 mb-4">
        {holding ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>{holding.qty.toLocaleString('en-US', { maximumFractionDigits: 0 })}개 · 평단 {fmtCoinPrice(holding.avgPrice)}</span>
            <span
              className="font-inter font-bold text-[10px] px-1.5 py-0.5 rounded-md"
              style={effSide === 'short' ? { background: 'var(--down-bg)', color: 'var(--down)' } : { background: 'var(--up-bg)', color: 'var(--up)' }}
            >
              {effSide === 'short' ? 'Short' : 'Long'} {effLeverage}x
            </span>
            <span className="font-semibold" style={{ color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
              ({pnl >= 0 ? '+' : ''}{fmt(pnl)})
            </span>
          </div>
        ) : (
          '미보유'
        )}
      </div>

      {!holding && (
        <div className="mb-4">
          <LeverageSlider value={leverage} onChange={setLeverage} leftSlot={<SidePillToggle side={side} onChange={setSide} />} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="font-inter text-sm text-gray-400">$</span>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="증거금"
            className="font-inter font-medium text-sm w-24 border border-gray-200 rounded-full px-3 py-2 outline-none tabular-nums"
          />
          <button
            onClick={() => onBuy(coin.id, buyQty, { side: effSide, leverage: effLeverage })}
            disabled={!canBuy}
            className="pill-btn pill-btn-primary font-inter font-medium text-xs text-white bg-gray-900 rounded-full px-4 py-2 disabled:opacity-30"
          >
            매수
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COIN_SELL_PCTS.map((pct) => {
            const sellQty = holding ? holding.qty * (pct / 100) : 0;
            return (
              <button
                key={pct}
                onClick={() => onSell(coin.id, sellQty)}
                disabled={!holding || sellQty <= 0}
                className="pill-btn font-inter font-medium text-xs border border-gray-200 rounded-full px-3 py-2 disabled:opacity-30"
              >
                {pct}% 매도
              </button>
            );
          })}
        </div>
      </div>
      {!holding && effLeverage > 1 && (
        <div className="text-right text-[11px] text-gray-400 font-inter mt-2 tabular-nums">
          명목 {fmt(buyQty * coin.price)} ({buyQty.toLocaleString('en-US', { maximumFractionDigits: 4 })}개)
        </div>
      )}
    </article>
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

function DashboardHoldingRow({ h, onBuy, onSell }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const canBuy = h.cash >= positionMargin(h.avgPrice, h.leverage, qty);
  const canSell = h.qty >= qty;

  return (
    <div className="py-3 border-b border-gray-50">
      <div className="grid gap-3 items-center" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto' }}>
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{h.name}</span>
            <span
              className="font-inter font-bold text-[10px] px-1.5 py-0.5 rounded-md"
              style={h.side === 'short' ? { background: 'var(--down-bg)', color: 'var(--down)' } : { background: 'var(--up-bg)', color: 'var(--up)' }}
            >
              {h.side === 'short' ? 'Short' : 'Long'} {h.leverage}x
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">{h.sector}</div>
        </div>
        <div className="text-right text-sm tabular-nums">{h.isCoin ? h.qty.toLocaleString('en-US', { maximumFractionDigits: 0 }) : h.qty}{h.isCoin ? '개' : '주'}</div>
        <div className="text-right text-sm tabular-nums">{fmt(h.value)}</div>
        <div className="text-right text-sm font-semibold tabular-nums" style={{ color: h.pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>
          {h.pnl >= 0 ? '+' : ''}{fmt(h.pnl)}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="font-inter font-medium text-xs border border-gray-200 rounded-full px-3 py-1.5 shrink-0"
        >
          거래
        </button>
      </div>

      {open && (
        <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-gray-50">
          <QtyStepper value={qty} onChange={setQty} max={h.isCoin ? undefined : h.qty} />
          <div className="flex gap-2">
            <button
              onClick={() => onBuy(h.id, qty)}
              disabled={!canBuy}
              className="font-inter font-medium text-xs text-white bg-gray-900 rounded-full px-4 py-2 disabled:opacity-30"
            >
              매수
            </button>
            <button
              onClick={() => onSell(h.id, Math.min(qty, h.qty))}
              disabled={!canSell}
              className="font-inter font-medium text-xs border border-gray-200 rounded-full px-4 py-2 disabled:opacity-30"
            >
              매도
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardTab({ cash, holdings, assetById, netWorthHistory, transactions, onBuy, onSell }) {
  const holdingsList = Object.entries(holdings)
    .map(([id, h]) => {
      const stock = assetById[id];
      if (!stock) return null; // skip unknown assets
      const side = h.side || 'long';
      const leverage = h.leverage || 1;
      const value = positionMargin(h.avgPrice, leverage, h.qty) + positionPnl(side, h.avgPrice, stock.price, h.qty);
      const pnl = positionPnl(side, h.avgPrice, stock.price, h.qty);
      return {
        id,
        name: stock.name,
        sector: stock.sector || (stock.assetType === 'coin' ? '코인' : ''),
        qty: h.qty,
        avgPrice: h.avgPrice,
        side,
        leverage,
        price: stock.price,
        value,
        pnl,
        cash,
        isCoin: stock.assetType === 'coin',
      };
    })
    .filter(Boolean);
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
          <div className="font-inter font-bold text-2xl tabular-nums">{fmt(netWorth)}</div>
        </div>
        <div>
          <p className="font-inter text-xs text-gray-400 mb-1">누적 수익</p>
          <div className="font-inter font-bold text-2xl tabular-nums" style={{ color: positive ? 'var(--up)' : 'var(--down)' }}>
            {positive ? '+' : ''}{fmt(totalReturn)} <span className="text-sm">({positive ? '+' : ''}{totalReturnPct.toFixed(2)}%)</span>
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
          <div className="font-semibold text-sm tabular-nums">{fmt(cash)}</div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">보유 종목 평가액</p>
          <div className="font-semibold text-sm tabular-nums">{fmt(holdingsValue)}</div>
        </div>
      </div>

      <p className="font-inter font-medium text-xs text-gray-400 mb-3">보유 종목</p>
      {holdingsList.length === 0 ? (
        <div className="font-inter text-sm text-gray-300 py-5 mb-6">보유 중인 종목이 없어요. 마켓에서 매수해보세요.</div>
      ) : (
        <div className="mb-8">
          {holdingsList.map((h) => (
            <DashboardHoldingRow key={h.id} h={h} onBuy={onBuy} onSell={onSell} />
          ))}
        </div>
      )}

      <TransactionsSection transactions={transactions} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  뉴스 탭                                                            */
/* ---------------------------------------------------------------- */
function NewsTab({ articles }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (articles.length === 0) {
    return <div className="font-inter text-sm text-gray-300 py-10 text-center">뉴스를 불러오는 중이에요...</div>;
  }

  return (
    <div>
      {articles.map((a) => (
        <a
          key={a.link}
          href={a.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 py-3.5 border-b border-gray-50 hover:opacity-70 transition-opacity"
        >
          <div className="flex-1 min-w-0">
            <span className="inline-block font-inter font-bold text-[10.5px] px-1.5 py-0.5 rounded-md mb-1 bg-gray-100 text-gray-500">
              {a.symbol ? `${a.symbol} · ${a.source}` : a.source}
            </span>
            <div className="font-inter text-sm font-semibold leading-relaxed">{a.title}</div>
            {a.description && (
              <div className="font-inter text-xs text-gray-400 leading-relaxed mt-1 line-clamp-2">{a.description}</div>
            )}
          </div>
          <div className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(new Date(a.pubDate).getTime(), Date.now())}</div>
        </a>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  도전과제 달성 토스트 (poesi toast 이식)                                */
/* ---------------------------------------------------------------- */
/* ---------------------------------------------------------------- */
/*  커뮤니티 탭 — 포럼 + 랭킹 (Supabase)                                   */
/* ---------------------------------------------------------------- */
const COMMUNITY_SUBTABS = [
  { id: 'forum', label: '포럼' },
  { id: 'ranking', label: '랭킹' },
];

function timeAgoAbs(iso, now) {
  return timeAgo(new Date(iso).getTime(), now);
}

function ForumComposer({ onSubmit, onCancel, submitting }) {
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({ category, title: title.trim(), content: content.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2.5">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="font-inter text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1.5 outline-none"
      >
        {FORUM_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <input
        type="text"
        required
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 font-inter text-sm outline-none focus:border-gray-400 transition-colors bg-white"
      />
      <textarea
        required
        rows={4}
        placeholder="내용을 입력하세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 font-inter text-sm outline-none focus:border-gray-400 transition-colors resize-none bg-white"
      />
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="font-inter font-medium text-xs text-gray-400 hover:text-gray-600 rounded-full px-4 py-2 transition-colors">취소</button>
        <button type="submit" disabled={submitting} className="font-inter font-medium text-xs text-white bg-gray-900 rounded-full px-4 py-2 disabled:opacity-50">
          {submitting ? '등록 중...' : '등록'}
        </button>
      </div>
    </form>
  );
}

function PostDetailModal({ post, account, onClose, onDeleted }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cs, likedIds] = await Promise.all([
          fetchComments(post.id),
          fetchLikedPostIds(account?.id, [post.id]),
        ]);
        if (cancelled) return;
        setComments(cs);
        setLiked(likedIds.has(post.id));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [post.id, account?.id]);

  const handleLike = async () => {
    if (!account) return;
    const nowLiked = await toggleLike(post.id, account.id);
    setLiked(nowLiked);
    setLikesCount((n) => n + (nowLiked ? 1 : -1));
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !account) return;
    setPosting(true);
    try {
      const c = await addComment(post.id, account.id, commentText.trim());
      setComments((prev) => [...prev, c]);
      setCommentText('');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 글을 삭제할까요?')) return;
    await deletePost(post.id);
    onDeleted(post.id);
    onClose();
  };

  const isOwner = account && account.id === post.user_id;
  const now = Date.now();

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="modal-backdrop absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="modal-box relative bg-white w-full max-w-sm rounded-2xl p-7 shadow-xl max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-300 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>

        <p className="font-inter font-medium text-xs text-gray-400 mb-1">
          {FORUM_CATEGORIES.find((c) => c.id === post.category)?.label || post.category} · {post.nickname}
        </p>
        <h2 className="font-myeongjo font-bold text-xl mb-3 pr-6">{post.title}</h2>
        <p className="font-inter text-sm text-gray-600 leading-6 mb-5 whitespace-pre-wrap">{post.content}</p>

        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={handleLike}
            disabled={!account}
            className="inline-flex items-center gap-1.5 font-inter font-medium text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40"
            style={liked ? { background: 'var(--down-bg)', color: 'var(--down)', borderColor: 'transparent' } : { borderColor: 'var(--ink-faint)', color: 'var(--ink-faint)' }}
          >
            <Heart size={13} fill={liked ? 'currentColor' : 'none'} /> {likesCount}
          </button>
          <span className="font-inter text-xs text-gray-400">댓글 {comments.length}</span>
          <span className="font-inter text-[11px] text-gray-300 ml-auto">{timeAgoAbs(post.created_at, now)}</span>
        </div>

        {isOwner && (
          <button onClick={handleDelete} className="font-inter text-[11px] text-gray-300 hover:text-red-500 transition-colors mb-4 block">글 삭제</button>
        )}

        <div className="border-t border-gray-100 pt-4">
          {loading ? (
            <p className="font-inter text-xs text-gray-300 text-center py-4">불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="font-inter text-xs text-gray-300 text-center py-4">첫 댓글을 남겨보세요.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <span className="font-inter font-semibold text-xs shrink-0">{c.nickname}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-xs text-gray-600 leading-5 whitespace-pre-wrap break-words">{c.content}</p>
                    <p className="font-inter text-[10px] text-gray-300 mt-0.5">{timeAgoAbs(c.created_at, now)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {account && (
            <form onSubmit={handleComment} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="댓글을 입력하세요"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-full border border-gray-200 font-inter text-xs outline-none focus:border-gray-400 transition-colors"
              />
              <button type="submit" disabled={posting || !commentText.trim()} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-30">
                <Send size={13} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ForumSection({ account }) {
  const [category, setCategory] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePost, setActivePost] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchPosts(category)
      .then((rows) => { if (!cancelled) setPosts(rows); })
      .catch((err) => { if (!cancelled) setError(err.message || '게시글을 불러오지 못했어요.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  const handleCreate = async (payload) => {
    if (!account) return;
    setSubmitting(true);
    try {
      const post = await createPost(account.id, payload);
      if (category === 'all' || category === payload.category) {
        setPosts((prev) => [post, ...prev]);
      }
      setComposerOpen(false);
    } catch (err) {
      setError(err.message || '등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const now = Date.now();

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div className="flex gap-1.5">
          {FORUM_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="font-inter font-medium text-xs px-3.5 py-1.5 rounded-full border transition-colors"
              style={category === c.id
                ? { background: 'var(--ink)', color: 'var(--base-bg)', borderColor: 'var(--ink)' }
                : { borderColor: 'var(--ink-faint)', color: 'var(--ink-faint)' }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setComposerOpen((v) => !v)}
          disabled={!account}
          className="font-inter font-medium text-xs text-white bg-gray-900 rounded-full px-4 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-30"
        >
          {composerOpen ? '닫기' : '글쓰기'}
        </button>
      </div>

      {composerOpen && (
        <ForumComposer onSubmit={handleCreate} onCancel={() => setComposerOpen(false)} submitting={submitting} />
      )}

      {error && <p className="font-inter text-xs text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="font-inter text-sm text-gray-300 py-10 text-center">불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="font-inter text-sm text-gray-300 py-10 text-center">아직 글이 없어요. 첫 글을 남겨보세요.</p>
      ) : (
        <div>
          {posts.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePost(p)}
              className="w-full text-left py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors -mx-1 px-1 rounded-lg"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-inter font-bold text-[10.5px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
                  {FORUM_CATEGORIES.find((c) => c.id === p.category)?.label || p.category}
                </span>
                <span className="font-inter text-[11px] text-gray-400">{p.nickname}</span>
                <span className="font-inter text-[11px] text-gray-300 ml-auto shrink-0">{timeAgoAbs(p.created_at, now)}</span>
              </div>
              <div className="font-inter font-semibold text-sm mb-1 truncate">{p.title}</div>
              <div className="font-inter text-xs text-gray-400 truncate mb-1.5">{p.content}</div>
              <div className="flex items-center gap-3 font-inter text-[11px] text-gray-400">
                <span className="inline-flex items-center gap-1"><Heart size={11} /> {p.likes_count}</span>
                <span className="inline-flex items-center gap-1"><MessageCircle size={11} /> {p.comments_count}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {activePost && (
        <PostDetailModal post={activePost} account={account} onClose={() => setActivePost(null)} onDeleted={handleDeleted} />
      )}
    </div>
  );
}

function RankingSection({ account }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchRanking()
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((err) => { if (!cancelled) setError(err.message || '랭킹을 불러오지 못했어요.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="font-inter text-sm text-gray-300 py-10 text-center">불러오는 중...</p>;
  if (error) return <p className="font-inter text-xs text-red-500 py-6 text-center">{error}</p>;
  if (rows.length === 0) return <p className="font-inter text-sm text-gray-300 py-10 text-center">아직 랭킹 데이터가 없어요.</p>;

  return (
    <div>
      <p className="font-inter text-xs text-gray-400 mb-4">총자산 기준 상위 {rows.length}명이에요.</p>
      {rows.map((r, i) => {
        const isMe = account && r.user_id === account.id;
        return (
          <div
            key={r.user_id}
            className={`grid gap-3 py-3 px-2 -mx-2 rounded-lg items-center${isMe ? ' bg-gray-50' : ' border-b border-gray-50'}`}
            style={{ gridTemplateColumns: '28px 1fr 1fr' }}
          >
            <span className="font-inter font-bold text-sm tabular-nums text-gray-400">{i + 1}</span>
            <span className="font-inter font-semibold text-sm truncate">{r.nickname}{isMe ? ' (나)' : ''}</span>
            <span className="font-inter font-semibold text-sm text-right tabular-nums">{fmt(Number(r.net_worth))}</span>
          </div>
        );
      })}
    </div>
  );
}

function CommunityTab({ account }) {
  const [sub, setSub] = useState('forum');
  return (
    <div>
      <div className="flex gap-1.5 mb-7">
        {COMMUNITY_SUBTABS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className="font-inter font-medium text-xs px-3.5 py-1.5 rounded-full border transition-colors"
            style={sub === s.id
              ? { background: 'var(--ink)', color: 'var(--base-bg)', borderColor: 'var(--ink)' }
              : { borderColor: 'var(--ink-faint)', color: 'var(--ink-faint)' }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sub === 'forum' ? <ForumSection account={account} /> : <RankingSection account={account} />}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  하단 탭바 (poesi liquid glass tabbar 이식)                           */
/* ---------------------------------------------------------------- */
const TABS = [
  { id: 'market', label: '마켓', icon: TrendingUp },
  { id: 'news', label: '뉴스', icon: Newspaper },
  { id: 'community', label: '커뮤니티', icon: Users },
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
];

function Tabbar({ tab, setTab }) {
  const btnRefs = useRef([]);
  const barRef = useRef(null);
  const [highlight, setHighlight] = useState({});

  const moveHighlight = () => {
    const idx = TABS.findIndex((t) => t.id === tab);
    const btn = btnRefs.current[idx];
    if (!btn) return;
    setHighlight({ transform: `translateX(${btn.offsetLeft}px)`, width: btn.offsetWidth });
  };

  useLayoutEffect(() => {
    moveHighlight();
    const idx = TABS.findIndex((t) => t.id === tab);
    const btn = btnRefs.current[idx];
    if (!btn) return;

    // tab-label의 max-width 트랜지션이 끝나면 최종 레이아웃 기준으로 하이라이트 재보정
    const label = btn.querySelector('.tab-label');
    let handler;
    if (label) {
      handler = () => moveHighlight();
      label.addEventListener('transitionend', handler);
    }

    return () => {
      if (label && handler) label.removeEventListener('transitionend', handler);
    };
  }, [tab]);

  useEffect(() => {
    window.addEventListener('resize', moveHighlight);
    return () => window.removeEventListener('resize', moveHighlight);
  }, [tab]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const idx = ['1', '2', '3', '4', '5'].indexOf(e.key);
      if (idx >= 0 && idx < TABS.length) {
        e.preventDefault();
        setTab(TABS[idx].id);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handlePointerMove = (e) => {
    const bar = barRef.current;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    bar.style.setProperty('--mx', `${x}%`);
    bar.style.setProperty('--my', `${y}%`);
  };

  const handlePointerLeave = () => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.setProperty('--mx', '50%');
    bar.style.setProperty('--my', '0%');
  };

  return (
    <nav className="tabbar-wrap">
      <div
        className="tabbar"
        role="tablist"
        ref={barRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
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
const TAB_TITLES = { market: '마켓', news: '뉴스', community: '커뮤니티', dashboard: '대시보드' };

export default function StockGame() {
  const [account, setAccount] = useState(() => getStoredAccount());
  const [started, setStarted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('market');
  const stocks = useFinnhubStocks();
  const fx = useFxRates();
  const majorCoins = useMajorCoins();
  const memeCoins = useMemeCoins();
  const coins = useMemo(() => [...majorCoins, ...memeCoins], [majorCoins, memeCoins]);
  const [cash, setCash] = useState(STARTING_CASH);
  const [holdings, setHoldings] = useState({});
  const [netWorthHistory, setNetWorthHistory] = useState([STARTING_CASH]);
  const [detailId, setDetailId] = useState(null);
  const cryptoNews = useCryptoNews(20);
  const stockNews = useFinnhubNews(20);
  const news = useMemo(
    () => [...cryptoNews, ...stockNews].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 30),
    [cryptoNews, stockNews]
  );
  const [transactions, setTransactions] = useState([]);
  const [dark, setDark] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('stockgame_theme') : null;
    if (saved) return saved === 'dark';
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const handleLogout = () => {
    signOut();
    setAccount(null);
    setStarted(false);
    setDataLoaded(false);
    setCash(STARTING_CASH);
    setHoldings({});
    setTransactions([]);
    setNetWorthHistory([STARTING_CASH]);
    setUnlockedIds(new Set());
  };

  // 계정이 있으면(로그인 직후 또는 새로고침 후 캐시된 계정) Supabase에서
  // 저장된 포트폴리오(현금/보유종목/거래내역)를 불러와서 바로 게임 화면으로 진입.
  // 환영 화면 없이, 로그인만 되면 자동으로 이어서 시작한다.
  useEffect(() => {
    if (!account || dataLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const portfolio = await fetchPortfolio(account.id);
        if (cancelled) return;
        const initialCash = portfolio.isNew ? STARTING_CASH : portfolio.cash;
        setCash(initialCash);
        setHoldings(portfolio.holdings);
        setTransactions(portfolio.transactions);
        setNetWorthHistory([initialCash]);
        if (portfolio.isNew) {
          saveSnapshot(account.id, STARTING_CASH, STARTING_CASH).catch(() => {});
        }
        setDataLoaded(true);
        setStarted(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || '포트폴리오를 불러오지 못했어요.');
      }
    })();
    return () => { cancelled = true; };
  }, [account, dataLoaded]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('stockgame_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transitioning');
    setDark((d) => !d);
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
  };

  const assetsById = useMemo(() => Object.fromEntries([...stocks, ...coins, ...fx].map((a) => [a.id, a])), [stocks, coins, fx]);

  useEffect(() => {
    if (!started) return;
    const holdingsValue = totalHoldingsValue(holdings, assetsById);
    setNetWorthHistory((prev) => [...prev, cash + holdingsValue].slice(-60));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks]);

  // 포지션 오픈/추가 매수. opts.side/leverage는 새 포지션을 열 때만 적용되고,
  // 이미 보유 중이면 기존 포지션의 side/leverage를 그대로 따른다(평단만 갱신).
  const handleBuy = (id, qty, opts = {}) => {
    const stock = assetsById[id];
    const existing = holdings[id];
    const side = existing ? existing.side || 'long' : opts.side || 'long';
    const requestedLeverage = existing ? existing.leverage || 1 : opts.leverage || 1;
    const leverageCap = LEVERAGE_MAX_BY_TYPE[stock.assetType] || 4;
    const leverage = Math.min(Math.max(1, requestedLeverage), leverageCap); // 자산군별 상한을 서버(핸들러)단에서도 강제
    const cost = positionMargin(stock.price, leverage, qty); // 실제 현금에서 빠지는 증거금
    const notional = stock.price * qty; // 평단 가중평균용 명목가치
    if (cash < cost) return;
    const cur = existing;
    const newQty = (cur?.qty || 0) + qty;
    const newAvg = cur ? (cur.avgPrice * cur.qty + notional) / newQty : stock.price;
    const newCash = cash - cost;
    const newHoldings = { ...holdings, [id]: { qty: newQty, avgPrice: newAvg, side, leverage } };

    setCash(newCash);
    setHoldings(newHoldings);
    setTransactions((prev) =>
      [{ id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'buy', stockId: id, stockName: stock.name, qty, price: stock.price, total: cost, pnl: null, time: Date.now(), side, leverage }, ...prev].slice(0, 50)
    );

    if (account) {
      const holdingsValue = totalHoldingsValue(newHoldings, assetsById);
      upsertHolding(account.id, id, stock.assetType, newQty, newAvg, side, leverage).catch(() => {});
      insertTransaction(account.id, { symbol: id, assetType: stock.assetType, side: 'buy', qty, price: stock.price }).catch(() => {});
      saveSnapshot(account.id, newCash, newCash + holdingsValue).catch(() => {});
    }
  };

  // 포지션 축소/청산. 롱/숏 방향에 따라 손익 부호가 달라지고,
  // 반환되는 현금은 (청산 비중만큼의 증거금 + 손익)이다.
  const handleSell = (id, qty) => {
    const stock = assetsById[id];
    const cur = holdings[id];
    if (!cur || cur.qty < qty) return;
    const side = cur.side || 'long';
    const leverage = cur.leverage || 1;
    const pnl = positionPnl(side, cur.avgPrice, stock.price, qty);
    const proceeds = positionMargin(cur.avgPrice, leverage, qty) + pnl;
    const remaining = cur.qty - qty;
    const newCash = cash + proceeds;
    const newHoldings = { ...holdings };
    if (remaining <= 0) delete newHoldings[id];
    else newHoldings[id] = { ...cur, qty: remaining };

    setCash(newCash);
    setHoldings(newHoldings);
    setTransactions((prev) =>
      [{ id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'sell', stockId: id, stockName: stock.name, qty, price: stock.price, total: proceeds, pnl, time: Date.now(), side, leverage }, ...prev].slice(0, 50)
    );

    if (account) {
      const holdingsValue = totalHoldingsValue(newHoldings, assetsById);
      upsertHolding(account.id, id, stock.assetType, remaining, cur.avgPrice, side, leverage).catch(() => {});
      insertTransaction(account.id, { symbol: id, assetType: stock.assetType, side: 'sell', qty, price: stock.price }).catch(() => {});
      saveSnapshot(account.id, newCash, newCash + holdingsValue).catch(() => {});
    }
  };

  if (!account) return <LoginScreen onAuthed={setAccount} />;
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <p className="font-inter text-sm text-red-500 mb-4">{loadError}</p>
          <button
            onClick={() => { setLoadError(''); setDataLoaded(false); }}
            className="font-inter font-medium text-sm text-white bg-gray-900 rounded-full px-7 py-3.5 hover:opacity-90 transition-opacity"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
  if (!started || !dataLoaded) return <LoadingScreen />;

  const holdingsValue = totalHoldingsValue(holdings, assetsById);
  const netWorth = cash + holdingsValue;
  const detailStock = detailId ? assetsById[detailId] : null;

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
            <button
              aria-label="로그아웃"
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* 컨텐츠 */}
        <div key={tab} className="view active">
          {tab === 'market' && (
            <MarketTab stocks={stocks} coins={coins} fx={fx} holdings={holdings} cash={cash} onBuy={handleBuy} onSell={handleSell} onOpenDetail={setDetailId} />
          )}
          {tab === 'news' && <NewsTab articles={news} />}
          {tab === 'community' && <CommunityTab account={account} />}
          {tab === 'dashboard' && (
            <DashboardTab
              cash={cash}
              holdings={holdings}
              assetById={assetsById}
              netWorthHistory={netWorthHistory}
              transactions={transactions}
              onBuy={handleBuy}
              onSell={handleSell}
            />
          )}
        </div>

        <footer className="mt-20 pt-6 border-t border-gray-100 text-center">
          <p className="font-inter font-medium text-xs text-gray-300 mb-3">모의투자 · 실제 거래가 아닙니다</p>
          <div className="flex items-center justify-center gap-3 font-inter text-xs font-medium text-gray-400">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <span className="text-gray-200">·</span>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
          </div>
          <a
            href="https://www.instagram.com/joosik_gg/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 font-inter text-xs font-bold tracking-wide text-gray-400 hover:text-gray-600 transition-colors"
          >
            INSTAGRAM
          </a>
        </footer>
      </div>

      <Tabbar tab={tab} setTab={setTab} />

      {detailStock && (
        <StockDetailModal
          stock={detailStock}
          holding={holdings[detailStock.id]}
          cash={cash}
          dark={dark}
          onBuy={handleBuy}
          onSell={handleSell}
          onClose={() => setDetailId(null)}
        />
      )}

    </div>
  );
}