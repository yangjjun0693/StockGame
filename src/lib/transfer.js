import { supabase } from './supabase';

// ---------------------------------------------------------------------
// 유저 간 현금 송금. 실제 한도/잔액 체크는 DB의 send_transfer() RPC 안에서
// 처리한다(같은 IP로 접속한 계정끼리는 500달러, 그 외엔 5000달러 한도) —
// 클라이언트에서 넣는 금액은 그냥 숫자일 뿐이라 서버 쪽에서 최종 검증됨.
// ---------------------------------------------------------------------

export async function sendTransfer(senderId, recipientId, amount, senderCash) {
  const { data, error } = await supabase.rpc('send_transfer', {
    p_sender_id: senderId,
    p_recipient_id: recipientId,
    p_amount: amount,
    p_sender_cash: senderCash,
  });
  if (error) throw error;
  return data;
}

// 특정 상대와 주고받은 송금 내역 (메시지 스레드에 같이 얹어서 보여주기 위함)
export async function fetchTransfersForThread(userId, partnerId) {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}