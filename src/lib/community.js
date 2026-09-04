import { supabase } from './supabase';

// ---------------------------------------------------------------------
// Community: forum (posts/comments/likes) + net-worth ranking.
// Same trust model as supabase.js — no real Supabase Auth session, so
// user_id is whatever the client sends (see notes there). Nicknames are
// resolved through the `profiles` view (id, nickname, username) since
// `accounts` itself is locked down by RLS (holds password_hash).
// ---------------------------------------------------------------------

async function attachProfiles(rows, userIdKey = 'user_id') {
  const ids = [...new Set(rows.map((r) => r[userIdKey]).filter(Boolean))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, nickname: null }));
  const { data, error } = await supabase.from('profiles').select('id, nickname, username').in('id', ids);
  if (error) throw error;
  const byId = {};
  (data || []).forEach((p) => { byId[p.id] = p.nickname || p.username; });
  return rows.map((r) => ({ ...r, nickname: byId[r[userIdKey]] || '알수없음' }));
}

export const FORUM_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'general', label: '자유' },
  { id: 'strategy', label: '전략' },
  { id: 'news', label: '정보' },
];

export async function fetchPosts(category = 'all', limit = 50) {
  let q = supabase.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(limit);
  if (category !== 'all') q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return attachProfiles(data || []);
}

export async function fetchLikedPostIds(userId, postIds) {
  if (!userId || postIds.length === 0) return new Set();
  const { data, error } = await supabase.from('forum_likes').select('post_id').eq('user_id', userId).in('post_id', postIds);
  if (error) throw error;
  return new Set((data || []).map((r) => r.post_id));
}

export async function createPost(userId, { category, title, content }) {
  const { data, error } = await supabase
    .from('forum_posts')
    .insert({ user_id: userId, category, title, content })
    .select('*')
    .single();
  if (error) throw error;
  const [withProfile] = await attachProfiles([data]);
  return withProfile;
}

export async function deletePost(postId) {
  const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function fetchComments(postId) {
  const { data, error } = await supabase.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
  if (error) throw error;
  return attachProfiles(data || []);
}

export async function addComment(postId, userId, content) {
  const { data, error } = await supabase.rpc('insert_forum_comment', { p_post_id: postId, p_user_id: userId, p_content: content });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const [withProfile] = await attachProfiles([row]);
  return withProfile;
}

export async function toggleLike(postId, userId) {
  const { data, error } = await supabase.rpc('toggle_forum_like', { p_post_id: postId, p_user_id: userId });
  if (error) throw error;
  return data; // true = now liked, false = now unliked
}

export async function fetchRanking(limit = 50) {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('user_id, cash, net_worth, updated_at')
    .order('net_worth', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachProfiles(data || []);
}