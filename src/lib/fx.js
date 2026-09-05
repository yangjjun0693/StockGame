import { useEffect, useRef, useState } from 'react';

// FX pairs, one request covers every pair at once.
//
// Trade-off vs. the plan's original "Finnhub FX" idea: Finnhub's forex
// endpoints return 403 on the free tier, so this uses two free, keyless
// currency APIs instead:
//   - Frankfurter (api.frankfurter.dev) — ECB reference rates, primary.
//     Its older .app domain doesn't reliably send an
//     Access-Control-Allow-Origin header from the browser, so this uses
//     the newer .dev domain instead.
//   - open.er-api.com — fallback if Frankfurter is unreachable.
// Both only update once a day rather than tick-by-tick (ECB fixing /
// daily snapshot), so don't expect intraday movement between updates —
// fine for a rough FX reference, not for scalping.
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest';
const OPEN_ER_API_URL = 'https://open.er-api.com/v6/latest/USD';
const REFRESH_MS = 5 * 60 * 1000; // just needs to catch the once-daily update
const MAX_BACKOFF_MS = 30 * 60 * 1000;
const HISTORY_LEN = 40;

// `invert: true` means the raw rate is "<code> per 1 USD" and needs
// flipping to get the market convention's <code>/USD quote (e.g. EUR/USD
// is quoted as USD per 1 EUR, the opposite direction).
export const CURATED_FX = [
  { id: 'eurusd', code: 'EUR', name: 'EUR/USD', symbol: 'EUR/USD', sector: '외환', invert: true },
  { id: 'gbpusd', code: 'GBP', name: 'GBP/USD', symbol: 'GBP/USD', sector: '외환', invert: true },
  { id: 'audusd', code: 'AUD', name: 'AUD/USD', symbol: 'AUD/USD', sector: '외환', invert: true },
  { id: 'jpyusd', code: 'JPY', name: 'JPY/USD', symbol: 'USD/JPY', sector: '외환', invert: true },
  { id: 'krwusd', code: 'KRW', name: 'KRW/USD', symbol: 'USD/KRW', sector: '외환', invert: true },
  { id: 'chfusd', code: 'CHF', name: 'CHF/USD', symbol: 'USD/CHF', sector: '외환', invert: true },
];

async function fetchRates() {
  const symbols = CURATED_FX.map((f) => f.code).join(',');
  try {
    const url = `${FRANKFURTER_URL}?base=USD&symbols=${symbols}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = await res.json();
    if (!data?.rates) throw new Error('Frankfurter: no rates in response');
    return data.rates; // { EUR: 0.92, JPY: 149.3, ... } — units of <code> per 1 USD
  } catch (err) {
    console.warn('[Frankfurter] primary fetch failed, falling back to open.er-api.com', err);
    const res = await fetch(OPEN_ER_API_URL);
    if (!res.ok) throw new Error(`open.er-api.com ${res.status}`);
    const data = await res.json();
    if (!data?.rates) throw new Error('open.er-api.com: no rates in response');
    return data.rates;
  }
}

export function useFxRates() {
  const [fx, setFx] = useState([]);
  const historyRef = useRef({}); // id -> price[]

  useEffect(() => {
    let stopped = false;
    let timer = null;
    let delay = REFRESH_MS;

    const tick = async () => {
      try {
        const rates = await fetchRates();
        if (stopped) return;
        delay = REFRESH_MS;

        const next = CURATED_FX
          .map((item) => {
            const raw = rates[item.code];
            if (typeof raw !== 'number' || raw <= 0) return null;
            const price = item.invert ? 1 / raw : raw;
            const prevHistory = historyRef.current[item.id] || [];
            const lastPrice = prevHistory[prevHistory.length - 1];
            const history = [...prevHistory, price].slice(-HISTORY_LEN);
            historyRef.current[item.id] = history;
            const dir = typeof lastPrice === 'number'
              ? (price > lastPrice ? 'up' : price < lastPrice ? 'down' : 'flat')
              : 'flat';
            return { ...item, assetType: 'fx', price, open: history[0] ?? price, dir, history };
          })
          .filter(Boolean);

        setFx(next);
      } catch (err) {
        console.warn('[FX] poll failed (Frankfurter + open.er-api.com both unreachable)', err);
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

  return fx;
}