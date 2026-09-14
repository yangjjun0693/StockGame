import { createClient } from '@supabase/supabase-js';

// Hardcoded on purpose: this is the publishable/anon key, which is safe to
// ship in client bundles (it's protected by RLS, not secrecy). Keeping it
// here avoids needing env vars wired through the Cloudflare Pages build.
const supabaseUrl = 'https://wyebymtpsydujeztbwvx.supabase.co';
const supabaseAnonKey = 'sb_publishable_v123a9hC3TjkhbeZKhQs3w_rnHZgu_9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------
// Custom username/password auth, NOT Supabase Auth. There's no auth.users
// row and no JWT session for these accounts — signup/login go through the
// `signup_account` / `login_account` Postgres RPC functions, which hash
// and check passwords server-side (pgcrypto) so the client never sees a
// password hash. Because there's no real session token, downstream tables
// (holdings/transactions/portfolio_snapshots) trust whatever account id
// the client sends — fine for a casual practice-trading game, but note
// this is not tamper-proof the way Supabase Auth + RLS would be.
// ---------------------------------------------------------------------

const ACCOUNT_STORAGE_KEY = 'stockgame_account';

export async function signUp(username, password, nickname) {
  const { data, error } = await supabase.rpc('signup_account', {
    p_username: username,
    p_password: password,
    p_nickname: nickname || null,
  });
  if (error) throw error;
  const account = data[0];
  setStoredAccount(account);
  return account;
}

export async function signIn(username, password) {
  const { data, error } = await supabase.rpc('login_account', {
    p_username: username,
    p_password: password,
  });
  if (error) throw error;
  const account = data[0];
  setStoredAccount(account);
  return account;
}

export function signOut() {
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

export function getStoredAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredAccount(account) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

// ---------------------------------------------------------------------
// Portfolio persistence (holdings / transactions / portfolio_snapshots).
// Mirrors whatever the client sends since there's no real auth session —
// see the note above about accounts/RLS.
// ---------------------------------------------------------------------

// 랭킹용: 여러 유저의 holdings를 한 번에 가져와서 { user_id: { asset_id: {...} } } 형태로 묶어준다.
// 랭킹은 저장된 net_worth 컬럼을 그대로 믿지 않고 이걸로 매번 라이브 재계산한다 —
// 그 컬럼은 매매할 때만 갱신되므로, 가격이 움직이거나(특히 레버리지 포지션) 과거 계산식이
// 바뀐 적이 있으면 실제 자산과 어긋난 값이 그대로 남아있을 수 있기 때문.
export async function fetchHoldingsForUsers(userIds) {
  if (!userIds || userIds.length === 0) return {};
  const { data, error } = await supabase
    .from('holdings')
    .select('user_id, asset_id, qty, avg_price, side, leverage')
    .in('user_id', userIds);
  if (error) throw error;
  const byUser = {};
  (data || []).forEach((r) => {
    if (!byUser[r.user_id]) byUser[r.user_id] = {};
    byUser[r.user_id][r.asset_id] = { qty: Number(r.qty), avgPrice: Number(r.avg_price), side: r.side || 'long', leverage: Number(r.leverage) || 1 };
  });
  return byUser;
}

export async function fetchPortfolio(userId) {
  const [{ data: snap, error: snapErr }, { data: holdingsRows, error: hErr }, { data: txRows, error: tErr }] = await Promise.all([
    supabase.from('portfolio_snapshots').select('cash, net_worth').eq('user_id', userId).maybeSingle(),
    supabase.from('holdings').select('asset_id, asset_type, qty, avg_price, side, leverage').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);
  if (snapErr) throw snapErr;
  if (hErr) throw hErr;
  if (tErr) throw tErr;

  const holdings = {};
  (holdingsRows || []).forEach((r) => {
    // side/leverage 컬럼이 아직 없는 기존 DB에서도 안전하게 동작하도록 기본값 처리
    holdings[r.asset_id] = { qty: Number(r.qty), avgPrice: Number(r.avg_price), side: r.side || 'long', leverage: Number(r.leverage) || 1 };
  });

  const transactions = (txRows || []).map((r) => ({
    id: r.id,
    type: r.side,
    stockId: r.symbol,
    stockName: r.symbol,
    assetType: r.asset_type,
    qty: Number(r.qty),
    price: Number(r.price),
    total: Number(r.qty) * Number(r.price),
    pnl: r.pnl === null ? null : Number(r.pnl),
    time: new Date(r.created_at).getTime(),
  }));

  return {
    isNew: !snap,
    cash: snap ? Number(snap.cash) : null,
    holdings,
    transactions,
  };
}

export async function saveSnapshot(userId, cash, netWorth) {
  const { error } = await supabase
    .from('portfolio_snapshots')
    .upsert({ user_id: userId, cash, net_worth: netWorth, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
  // 히스토리는 별도 append-only 테이블에 쌓아서 "가입 시점부터 지금까지" 그래프를 그릴 수 있게 함
  const { error: histErr } = await supabase.from('networth_history').insert({ user_id: userId, cash, net_worth: netWorth });
  if (histErr) throw histErr;
}

export async function fetchNetWorthHistory(userId) {
  const { data, error } = await supabase
    .from('networth_history')
    .select('net_worth, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => Number(r.net_worth));
}

export async function upsertHolding(userId, assetId, assetType, qty, avgPrice, side = 'long', leverage = 1) {
  if (qty <= 0) {
    const { error } = await supabase.from('holdings').delete().eq('user_id', userId).eq('asset_id', assetId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('holdings')
    .upsert(
      { user_id: userId, asset_id: assetId, asset_type: assetType, qty, avg_price: avgPrice, side, leverage, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,asset_id' }
    );
  if (error) throw error;
}

export async function insertTransaction(userId, { symbol, assetType, side, qty, price, pnl = null }) {
  const { error } = await supabase.from('transactions').insert({ user_id: userId, symbol, asset_type: assetType, side, qty, price, pnl });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Achievements. Only *which* achievements are unlocked (+ when) lives in
// the DB — the definitions themselves (title/desc/reward/check logic)
// live in src/lib/achievements.js so adding a new one needs no migration.
// ---------------------------------------------------------------------

export async function fetchUnlockedAchievements(userId) {
  const { data, error } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.achievement_id));
}

export async function unlockAchievement(userId, achievementId) {
  // onConflict + ignoreDuplicates so a race between two checks (or a
  // retry) never throws on the unique (user_id, achievement_id) index.
  const { error } = await supabase
    .from('user_achievements')
    .upsert({ user_id: userId, achievement_id: achievementId }, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
  if (error) throw error;
}