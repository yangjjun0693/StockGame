import { useEffect, useRef, useState } from 'react';

// CoinGecko public API — no key required (same origin the app already
// calls in pumpportal.js for the SOL/USD rate).
// /coins/markets gives price + 24h change% + market cap + a 7d sparkline
// in a single request, which is all CoinCard needs.
const MARKETS_URL = 'https://api.coingecko.com/api/v3/coins/markets';
const REFRESH_MS = 60 * 1000; // stay well under CoinGecko's free rate limit
const HISTORY_LEN = 40; // match pump.fun coins' sparkline length

// The "top tier" of the coin tab — a handful of well-known majors, pinned
// above the pump.fun firehose. Add/remove ids here to change the lineup.
const MAJOR_COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'ethereum', symbol: 'ETH' },
];

function toAsset(m, symbolOverride) {
  const price = m.current_price ?? 0;
  const pct = m.price_change_percentage_24h;
  const open = typeof pct === 'number' && pct !== -100 ? price / (1 + pct / 100) : price;
  const dir = price > open ? 'up' : price < open ? 'down' : 'flat';
  const sparkline = m.sparkline_in_7d?.price;
  const history = Array.isArray(sparkline) && sparkline.length > 0
    ? sparkline.slice(-HISTORY_LEN)
    : [price];

  return {
    id: `cg-${m.id}`,
    symbol: (symbolOverride || m.symbol || '?').toUpperCase(),
    name: m.name || symbolOverride || m.id,
    assetType: 'coin',
    tier: 'major',
    price,
    open,
    dir,
    history,
    marketCapUsd: m.market_cap || 0,
  };
}

async function fetchMajorCoins() {
  const ids = MAJOR_COINS.map((c) => c.id).join(',');
  const url = `${MARKETS_URL}?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const bySymbol = Object.fromEntries(MAJOR_COINS.map((c) => [c.id, c.symbol]));
  // Keep our curated order (BTC, SOL, ETH, ...) rather than whatever order
  // the API returns, so the "top tier" is stable regardless of price moves.
  const byId = Object.fromEntries(data.map((m) => [m.id, m]));
  return MAJOR_COINS
    .map((c) => byId[c.id] && toAsset(byId[c.id], bySymbol[c.id]))
    .filter(Boolean);
}

/**
 * Polls CoinGecko for a small, fixed set of well-known coins (BTC, SOL,
 * ETH, ...) and returns them in the same asset shape as usePumpPortalCoins,
 * so they can render top of the coin tab.
 */
export function useMajorCoins() {
  const [coins, setCoins] = useState([]);
  const prevRef = useRef([]); // keep last good data across a failed poll

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      try {
        const next = await fetchMajorCoins();
        if (stopped || next.length === 0) return;
        prevRef.current = next;
        setCoins(next);
      } catch (err) {
        console.warn('[CoinGecko] fetch failed, keeping last known prices', err);
      }
    };

    tick();
    const interval = setInterval(tick, REFRESH_MS);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return coins;
}