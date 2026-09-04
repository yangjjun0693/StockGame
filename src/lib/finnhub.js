import { useEffect, useRef, useState } from 'react';

// Real stock prices via Finnhub's free REST tier.
//
// Free tier is 60 req/min and doesn't reliably support a WebSocket trade
// stream for low-liquidity symbols, so this polls /quote per symbol instead
// — same "poll + rolling history + backoff" shape as coingecko.js's
// major-coin hook, just generalized over a symbol list. 12 symbols on a
// 20s cadence is ~36 req/min, safely under the cap.
//
// NOTE: Finnhub's forex endpoints (OANDA:* symbols) return 403 on the free
// tier — FX is now sourced from Frankfurter instead, see lib/fx.js.
const FINNHUB_API_KEY = 'dadd2d9r01qtj63osrkgdadd2d9r01qtj63osrl0';
const FINNHUB_QUOTE_URL = 'https://finnhub.io/api/v1/quote';
const REFRESH_MS = 30 * 1000;
const MAX_BACKOFF_MS = 3 * 60 * 1000;
const HISTORY_LEN = 40; // match the local-sim sparkline length it replaces

// 12 real tickers, one per existing sector bucket so SECTOR_COLORS /
// sector filter chips in App.jsx keep working unchanged. `name` is the
// English company name; `symbol` (the ticker) renders under it in the card.
export const CURATED_STOCKS = [
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', sector: '반도체', desc: 'GPU와 AI 가속기를 설계하는 반도체 기업.' },
  { id: 'tsla', symbol: 'TSLA', name: 'Tesla', sector: '모빌리티', desc: '전기차와 에너지 저장 시스템을 만드는 모빌리티 기업.' },
  { id: 'mrna', symbol: 'MRNA', name: 'Moderna', sector: '바이오', desc: 'mRNA 기반 백신·치료제를 개발하는 바이오 기업.' },
  { id: 'ko', symbol: 'KO', name: 'Coca-Cola', sector: '식품', desc: '전세계 음료 브랜드를 보유한 식품·음료 기업.' },
  { id: 'dis', symbol: 'DIS', name: 'Disney', sector: '엔터', desc: '영화·스트리밍·테마파크를 운영하는 엔터테인먼트 기업.' },
  { id: 'enph', symbol: 'ENPH', name: 'Enphase Energy', sector: '신재생에너지', desc: 'ㄷㅅ' },
  { id: 'msft', symbol: 'MSFT', name: 'Microsoft', sector: 'AI·소프트웨어', desc: '윈도우' },
  { id: 'spcx', symbol: 'SPCX', name: 'SpaceX', sector: '항공·우주', desc: '화성 ㄱㄱ' },
  { id: 'rklb', symbol: 'RKLB', name: 'Rocket Lab', sector: '항공·우주', desc: '로케트 발싸' },
  { id: 'ba', symbol: 'BA', name: 'Boeing', sector: '항공·우주', desc: '떴다 떴다 비행기' },
  { id: 'ttwo', symbol: 'TTWO', name: 'Take-Two Interactive', sector: '게임', desc: 'Rockstar Games, 2K, Zynga 등 개지리는 게임 회사들 다 얘네꺼' },
  { id: 'wmt', symbol: 'WMT', name: 'Walmart', sector: '유통', desc: '월마트.' },
  { id: 'fcx', symbol: 'FCX', name: 'Freeport-McMoRan', sector: '광업·원자재', desc: '금 + 구리.' },
];

async function fetchQuote(symbol) {
  const url = `${FINNHUB_QUOTE_URL}?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${res.status} (${symbol})`);
  const data = await res.json();
  // Finnhub returns a 200 with an all-zero payload for a bad/unsupported
  // symbol or an exhausted key, rather than a 4xx — treat that as a failure.
  if (!data || (data.c === 0 && data.pc === 0)) throw new Error(`Finnhub: empty quote for ${symbol}`);
  return data; // { c: current, d: change, dp: percent, h, l, o: open, pc: prevClose, t }
}

/**
 * Polls Finnhub /quote for the curated stock list and returns assets in
 * the app's common shape ({ id, symbol, name, sector, desc, assetType,
 * price, open, dir, history }), building rolling price history across
 * polls same as the coin hooks. A symbol that fails one round keeps its
 * last known price/history rather than disappearing from the list.
 */
export function useFinnhubStocks() {
  const [assets, setAssets] = useState([]);
  const historyRef = useRef({}); // id -> price[]

  useEffect(() => {
    let stopped = false;
    let timer = null;
    let delay = REFRESH_MS;

    const tick = async () => {
      try {
        const results = await Promise.allSettled(CURATED_STOCKS.map((item) => fetchQuote(item.symbol)));
        if (stopped) return;

        let anySuccess = false;
        const next = CURATED_STOCKS
          .map((item, i) => {
            const r = results[i];
            const prevHistory = historyRef.current[item.id] || [];

            if (r.status !== 'fulfilled') {
              const lastPrice = prevHistory[prevHistory.length - 1];
              if (lastPrice == null) return null; // never had data — drop until it does
              return { ...item, assetType: 'stock', price: lastPrice, open: prevHistory[0] ?? lastPrice, dir: 'flat', history: prevHistory };
            }

            anySuccess = true;
            const q = r.value;
            const price = q.c;
            const open = q.o || q.pc || price;
            const lastPrice = prevHistory[prevHistory.length - 1];
            const history = [...prevHistory, price].slice(-HISTORY_LEN);
            historyRef.current[item.id] = history;
            const dir = typeof lastPrice === 'number'
              ? (price > lastPrice ? 'up' : price < lastPrice ? 'down' : 'flat')
              : (price > open ? 'up' : price < open ? 'down' : 'flat');
            return { ...item, assetType: 'stock', price, open, dir, history };
          })
          .filter(Boolean);

        setAssets(next);
        delay = anySuccess ? REFRESH_MS : Math.min(delay * 2, MAX_BACKOFF_MS);
      } catch (err) {
        console.warn('[Finnhub] stock poll failed', err);
        delay = Math.min(delay * 2, MAX_BACKOFF_MS);
      } finally {
        if (!stopped) timer = setTimeout(tick, delay);
      }
    };

    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  return assets;
}