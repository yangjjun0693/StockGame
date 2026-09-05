import { useEffect, useState } from 'react';

// cryptocurrency.cv — free crypto news aggregator (300+ sources), no API
// key, CORS-enabled, fair-use rate limit. https://cryptocurrency.cv
//
// Response shape (docs): { articles: [{ title, link, description, pubDate,
// source, timeAgo }], totalCount, fetchedAt }
const NEWS_URL = 'https://cryptocurrency.cv/api/news';
const REFRESH_MS = 3 * 60 * 1000;
const MAX_BACKOFF_MS = 20 * 60 * 1000;

async function fetchCryptoNews(limit) {
  const url = `${NEWS_URL}?limit=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'StockGame (github.com/yangjjun0693/StockGame)' } });
  if (!res.ok) throw new Error(`cryptocurrency.cv ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.articles)) throw new Error('cryptocurrency.cv: no articles in response');
  // Drop the API's own `timeAgo` string — it's fixed at fetch time and goes
  // stale between polls; NewsTab recomputes it from `pubDate` on every tick.
  return data.articles.map(({ title, link, description, pubDate, source }) => ({ title, link, description, pubDate, source }));
}

export function useCryptoNews(limit = 20) {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    let stopped = false;
    let timer = null;
    let delay = REFRESH_MS;

    const tick = async () => {
      try {
        const items = await fetchCryptoNews(limit);
        if (stopped) return;
        delay = REFRESH_MS;
        setArticles(items);
      } catch (err) {
        console.warn('[CryptoNews] poll failed', err);
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
  }, [limit]);

  return articles;
}