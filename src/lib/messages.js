import { supabase } from './supabase';

// ---------------------------------------------------------------------
// 1:1 다이렉트 메시지(DM). Same trust model as community.js / supabase.js —
// no real Supabase Auth session, so sender_id/recipient_id is whatever the
// client sends (see notes in src/lib/supabase.js). Nicknames are resolved
// through the `profiles` view, same as everywhere else.
// ---------------------------------------------------------------------

async function attachNicknames(ids) {
  if (!ids || ids.length === 0) return {};
  const { data, error } = await supabase.from('profiles').select('id, nickname, username').in('id', ids);
  if (error) throw error;
  const byId = {};
  (data || []).forEach((p) => { byId[p.id] = p.nickname || p.username; });
  return byId;
}

// 유저 검색: 새 대화를 시작할 상대를 닉네임/아이디로 찾는다.
export async function searchUsers(query, excludeUserId) {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, username')
    .or(`nickname.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(10);
  if (error) throw error;
  return (data || []).filter((u) => u.id !== excludeUserId);
}

// 대화 목록: 내가 보냈거나 받은 메시지를 모두 가져와서 상대별 최근 메시지 +
// 안읽은 개수로 묶는다. 대화 상대 수가 많지 않은 캐주얼 게임이라 이 방식으로 충분.
export async function fetchConversations(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const byPartner = new Map();
  (data || []).forEach((m) => {
    const partnerId = m.sender_id === userId ? m.recipient_id : m.sender_id;
    if (!byPartner.has(partnerId)) {
      byPartner.set(partnerId, { partnerId, lastMessage: m, unreadCount: 0 });
    }
    if (m.recipient_id === userId && !m.read_at) {
      byPartner.get(partnerId).unreadCount += 1;
    }
  });

  const convos = Array.from(byPartner.values());
  const nicknames = await attachNicknames(convos.map((c) => c.partnerId));
  convos.forEach((c) => { c.nickname = nicknames[c.partnerId] || '알수없음'; });
  convos.sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));
  return convos;
}

// 전체 안읽은 메시지 개수 (탭 배지용).
export async function fetchUnreadCount(userId) {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) throw error;
  return count || 0;
}

// 특정 상대와의 메시지 히스토리 (오래된 순).
export async function fetchThread(userId, partnerId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendMessage(senderId, recipientId, content) {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, content: trimmed })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// 상대가 보낸, 아직 안읽은 메시지를 모두 읽음 처리.
export async function markThreadRead(userId, partnerId) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('sender_id', partnerId)
    .is('read_at', null);
  if (error) throw error;
}