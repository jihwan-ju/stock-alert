// Expo Push 서비스로 iPhone에 알림을 보냅니다.
// 토큰은 앱 첫 화면에 표시되는 "ExponentPushToken[...]" 값입니다.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export function getTokens() {
  return (process.env.EXPO_PUSH_TOKENS ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function sendPush({ title, body, data }) {
  const tokens = getTokens();
  if (tokens.length === 0) {
    console.warn('EXPO_PUSH_TOKENS가 비어 있어 푸시를 보내지 않습니다.');
    return;
  }

  const messages = tokens.map((to) => ({ to, title, body, data, sound: 'default' }));
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(messages),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`푸시 발송 실패: HTTP ${res.status} ${JSON.stringify(json)}`);

  for (const [i, ticket] of (json.data ?? []).entries()) {
    if (ticket.status === 'error') {
      console.warn(`⚠️ 토큰 ${tokens[i].slice(0, 30)}… 발송 오류:`, ticket.message);
    }
  }
  console.log(`📨 푸시 ${tokens.length}건 발송 요청 완료`);
}
