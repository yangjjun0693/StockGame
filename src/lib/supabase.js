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