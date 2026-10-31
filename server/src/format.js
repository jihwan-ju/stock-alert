const num = (v, digits = 2) =>
  v.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const signed = (v, digits = 2) => `${v > 0 ? '+' : ''}${num(v, digits)}`;

export function arrow(changePct) {
  if (changePct > 0.05) return '▲';
  if (changePct < -0.05) return '▼';
  return '–';
}

/** 'KOSPI 2,650.12 (+0.81%)' 형태의 한 줄 */
export function formatQuote(q) {
  switch (q.kind) {
    case 'fx':
      return `${q.name} ${num(q.price, 1)}원 (${signed(q.change, 1)})`;
    case 'yield':
      // 금리는 % 대신 bp(0.01%p) 변화로 표시
      return `${q.name} ${num(q.price, 2)}% (${signed(q.change * 100, 0)}bp)`;
    case 'commodity':
      return `${q.name} $${num(q.price, 2)} (${signed(q.changePct)}%)`;
    default:
      return `${q.name} ${num(q.price, 2)} (${signed(q.changePct)}%)`;
  }
}

/** 푸시 알림 본문: 지수 위주로 짧게 */
export function pushBody(quotes, headline) {
  const line = quotes
    .filter((q) => q.kind === 'index')
    .slice(0, 3)
    .map((q) => `${q.name} ${arrow(q.changePct)}${signed(q.changePct)}%`)
    .join(' · ');
  return headline ? `${line}\n${headline}` : line;
}
