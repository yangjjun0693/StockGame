import { useEffect, useRef, useState } from 'react';

// PumpPortal free Data API — no key required.
// Docs (community): wss://pumpportal.fun/api/data
//   {"method":"subscribeNewToken"}                    -> firehose of new token creations
//   {"method":"subscribeTokenTrade","keys":[mint,...]} -> trades for specific mints
//   {"method":"unsubscribeTokenTrade","keys":[mint,...]}
// Both create and trade events carry vSolInBondingCurve / vTokensInBondingCurve,
// from which spot price in SOL = vSolInBondingCurve / vTokensInBondingCurve
// (standard pump.fun constant-product bonding curve).
const WS_URL = 'wss://pumpportal.fun/api/data';

// The platform-wide firehose is huge, so we only actively track a bounded
// window of the most recently created/active tokens rather than everything.
const MAX_TRACKED = 60;
const INACTIVE_PRUNE_MS = 5 * 60 * 1000; // drop a token if silent this long
const PRUNE_CHECK_MS = 60 * 1000;
const FLUSH_INTERVAL_MS = 1000; // batch WS messages into React state ~1x/sec
const SOL_PRICE_REFRESH_MS = 60 * 1000;
const HISTORY_LEN = 40;
const FALLBACK_SOL_USD = 150;

function bondingCurvePriceSol(vSol, vTokens) {
  if (!vTokens) return 0;
  return vSol / vTokens;
}

async function fetchSolUsd() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    const rate = data?.solana?.usd;
    return typeof rate === 'number' ? rate : null;
  } catch {
    return null;
  }
}

/**
 * Live-tracks a bounded set of pump.fun coins via PumpPortal's WS feed and
 * returns them as an array of assets in the shared { id, symbol, name,
 * price, assetType: 'coin', ... } shape used elsewhere in the app.
 */
export function usePumpPortalCoins() {
  const [coins, setCoins] = useState([]);
  const stateRef = useRef(new Map()); // mint -> coin object
  const dirtyRef = useRef(false);
  const solUsdRef = useRef(FALLBACK_SOL_USD);

  useEffect(() => {
    let stopped = false;
    let ws = null;
    let reconnectDelay = 1000;
    let reconnectTimer = null;

    const send = (obj) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    };
    const subscribeTrade = (mint) => send({ method: 'subscribeTokenTrade', keys: [mint] });
    const unsubscribeTrade = (mint) => send({ method: 'unsubscribeTokenTrade', keys: [mint] });

    const upsertFromEvent = (data, isCreate) => {
      const mint = data.mint;
      if (!mint) return;
      const priceSol = bondingCurvePriceSol(data.vSolInBondingCurve, data.vTokensInBondingCurve);
      const priceUsd = priceSol * solUsdRef.current;
      const existing = stateRef.current.get(mint);

      if (isCreate) {
        if (existing || stateRef.current.size >= MAX_TRACKED) return;
        stateRef.current.set(mint, {
          id: mint,
          mint,
          symbol: (data.symbol || '?').toUpperCase(),
          name: data.name || data.symbol || `${mint.slice(0, 6)}...`,
          assetType: 'coin',
          tier: 'pump',
          price: priceUsd,
          priceSol,
          open: priceUsd,
          dir: 'flat',
          history: [priceUsd],
          marketCapSol: data.marketCapSol || 0,
          marketCapUsd: (data.marketCapSol || 0) * solUsdRef.current,
          createdAt: Date.now(),
          lastTradeAt: Date.now(),
        });
        dirtyRef.current = true;
        subscribeTrade(mint);
        return;
      }

      if (!existing) return;
      const dir = priceUsd > existing.price ? 'up' : priceUsd < existing.price ? 'down' : existing.dir;
      const history = [...existing.history, priceUsd].slice(-HISTORY_LEN);
      stateRef.current.set(mint, {
        ...existing,
        price: priceUsd,
        priceSol,
        dir,
        history,
        marketCapSol: data.marketCapSol ?? existing.marketCapSol,
        marketCapUsd: (data.marketCapSol ?? existing.marketCapSol ?? 0) * solUsdRef.current,
        lastTradeAt: Date.now(),
      });
      dirtyRef.current = true;
    };

    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(WS_URL);

      ws.addEventListener('open', () => {
        reconnectDelay = 1000;
        console.log('[PumpPortal] connected');
        send({ method: 'subscribeNewToken' });
        for (const mint of stateRef.current.keys()) subscribeTrade(mint);
      });

      ws.addEventListener('message', (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.txType === 'create') {
          console.log('[PumpPortal] new token', data.symbol, data.mint, 'tracked:', stateRef.current.size, '/', MAX_TRACKED);
          upsertFromEvent(data, true);
        } else if (data.txType === 'buy' || data.txType === 'sell') {
          upsertFromEvent(data, false);
        }
      });

      ws.addEventListener('close', (e) => {
        console.warn('[PumpPortal] disconnected, code:', e.code, 'reason:', e.reason, '— reconnecting in', reconnectDelay, 'ms');
        if (stopped) return;
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      });

      ws.addEventListener('error', (e) => {
        console.error('[PumpPortal] ws error', e);
        ws?.close();
      });
    };

    const refreshSolPrice = async () => {
      const rate = await fetchSolUsd();
      if (rate) solUsdRef.current = rate;
    };
    refreshSolPrice();
    const solInterval = setInterval(refreshSolPrice, SOL_PRICE_REFRESH_MS);

    const flushInterval = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setCoins(Array.from(stateRef.current.values()));
    }, FLUSH_INTERVAL_MS);

    const pruneInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [mint, c] of stateRef.current) {
        if (now - c.lastTradeAt > INACTIVE_PRUNE_MS) {
          stateRef.current.delete(mint);
          unsubscribeTrade(mint);
          changed = true;
        }
      }
      if (changed) dirtyRef.current = true;
    }, PRUNE_CHECK_MS);

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearInterval(solInterval);
      clearInterval(flushInterval);
      clearInterval(pruneInterval);
      ws?.close();
    };
  }, []);

  return coins;
}