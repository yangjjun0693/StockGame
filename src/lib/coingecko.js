import { useEffect, useRef, useState } from 'react';

// Price source for the coin tab's "major" tier (BTC/ETH/SOL), pinned above
// the pump.fun firehose.
//
// CoinGecko's free public API is the primary source, but calling it
// directly from the browser is flaky in practice: when it's rate-limited
// it returns a response with no CORS header at all, which shows up in the
// browser as a generic "blocked by CORS policy" error rather than a 429 —
// so it looks broken even though nothing is actually misconfigured. To
// keep the majors reliably populated, we fall back to CryptoCompare (a
// different free, key-less, CORS-enabled API) whenever CoinGecko fails.
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/coins/markets';
const CRYPTOCOMPARE_URL = 'https://min-api.cryptocompare.com/data/pricemultifull';
const REFRESH_MS = 60 * 1000; // baseline poll interval, backs off on failure
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const HISTORY_LEN = 40; // match pump.fun coins' sparkline length

// The "top tier" of the coin tab. Add/remove entries here to change the
// lineup; `cc` is the CryptoCompare symbol used by the fallback path.
const MAJOR_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', cc: 'BTC' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', cc: 'SOL' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', cc: 'ETH' },
];

// Fetch raw {id, symbol, name, price, open, marketCapUsd} for each major
// coin from CoinGecko, falling back to CryptoCompare on any failure
// (network error, non-2xx, or CORS rejection surfacing as a fetch throw).
async function fetchMajorPrices() {
  try {
    const ids = MAJOR_COINS.map((c) => c.id).join(',');
    const url = `${COINGECKO_URL}?vs_currency=usd&ids=${ids}&order=market_cap_desc&price_change_percentage=24h`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    const byId = Object.fromEntries(data.map((m) => [m.id, m]));
    const out = MAJOR_COINS.map((c) => {
      const m = byId[c.id];
      if (!m) return null;
      const price = m.current_price ?? 0;
      const pct = m.price_change_percentage_24h;
      const open = typeof pct === 'number' && pct !== -100 ? price / (1 + pct / 100) : price;
      return { id: c.id, symbol: c.symbol, name: m.name || c.name, price, open, marketCapUsd: m.market_cap || 0 };
    }).filter(Boolean);
    if (out.length === 0) throw new Error('CoinGecko returned no matching coins');
    return out;
  } catch (err) {
    console.warn('[CoinGecko] primary fetch failed, falling back to CryptoCompare', err);
    const fsyms = MAJOR_COINS.map((c) => c.cc).join(',');
    const url = `${CRYPTOCOMPARE_URL}?fsyms=${fsyms}&tsyms=USD`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
    const data = await res.json();
    const raw = data?.RAW || {};
    const out = MAJOR_COINS.map((c) => {
      const r = raw[c.cc]?.USD;
      if (!r) return null;
      const price = r.PRICE;
      const open = r.OPEN24HOUR || price;
      return { id: c.id, symbol: c.symbol, name: c.name, price, open, marketCapUsd: r.MKTCAP || 0 };
    }).filter(Boolean);
    if (out.length === 0) throw new Error('CryptoCompare returned no matching coins');
    return out;
  }
}

/**
 * Polls for a small, fixed set of well-known coins (BTC, SOL, ETH, ...)
 * and returns them in the same asset shape as usePumpPortalCoins, so they
 * can render pinned to the top of the coin tab. Builds its own rolling
 * price history across polls (rather than trusting either API's sparkline
 * format), so switching between CoinGecko and the CryptoCompare fallback
 * mid-session doesn't break the chart.
 */
export function useMajorCoins() {
  const [coins, setCoins] = useState([]);
  const historyRef = useRef({}); // id -> price[]

  useEffect(() => {
    let stopped = false;
    let timer = null;
    let delay = REFRESH_MS;

    const tick = async () => {
      try {
        const raw = await fetchMajorPrices();
        if (stopped) return;
        delay = REFRESH_MS; // reset backoff after a success

        const next = raw.map((c) => {
          const prevHistory = historyRef.current[c.id] || [];
          const lastPrice = prevHistory[prevHistory.length - 1];
          const history = [...prevHistory, c.price].slice(-HISTORY_LEN);
          historyRef.current[c.id] = history;
          const dir = typeof lastPrice === 'number'
            ? (c.price > lastPrice ? 'up' : c.price < lastPrice ? 'down' : 'flat')
            : (c.price > c.open ? 'up' : c.price < c.open ? 'down' : 'flat');

          return {
            id: `cg-${c.id}`,
            symbol: c.symbol,
            name: c.name,
            assetType: 'coin',
            tier: 'major',
            price: c.price,
            open: c.open,
            dir,
            history,
            marketCapUsd: c.marketCapUsd,
          };
        });
        setCoins(next);
      } catch (err) {
        console.warn('[CoinGecko] fetch failed (CoinGecko + CryptoCompare both unreachable), keeping last known prices', err);
        delay = Math.min(delay * 2, MAX_BACKOFF_MS); // back off on repeated failure
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

  return coins;
}