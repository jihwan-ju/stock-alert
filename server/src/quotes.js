// Yahoo Finance 차트 API로 종가와 전일 대비 등락을 가져옵니다.
// (비공식 API: API 키 없이 쓸 수 있지만, 개인용으로만 쓰는 것을 권장합니다.)

const UA = 'Mozilla/5.0 (compatible; stock-alert/1.0)';

/** 'YYYY-MM-DD' in the given IANA timezone */
export function dateInTz(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function fetchQuote(item) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    item.symbol,
  )}?range=5d&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${item.symbol}: HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`${item.symbol}: 응답에 데이터가 없습니다`);

  const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
    (v) => typeof v === 'number',
  );
  const price = result.meta.regularMarketPrice ?? closes.at(-1);
  // 마지막 봉이 오늘이면 그 직전 봉이 전일 종가
  const prevClose = closes.length >= 2 ? closes.at(-2) : result.meta.chartPreviousClose;

  return toQuote(item, price, prevClose, result.meta.regularMarketTime * 1000);
}

export function toQuote(item, price, prevClose, timeMs) {
  const change = price - prevClose;
  return {
    ...item,
    price,
    prevClose,
    change,
    changePct: prevClose ? (change / prevClose) * 100 : 0,
    time: new Date(timeMs).toISOString(),
  };
}

export async function fetchAll(items) {
  const settled = await Promise.allSettled(items.map(fetchQuote));
  const quotes = [];
  for (const [i, s] of settled.entries()) {
    if (s.status === 'fulfilled') quotes.push(s.value);
    else console.warn(`⚠️ ${items[i].name} 시세 조회 실패:`, s.reason.message);
  }
  return quotes;
}

/** 네트워크 없이 테스트할 때 쓰는 가짜 데이터 */
export function sampleQuotes(items) {
  const now = Date.now();
  const base = {
    '^KS11': 2650, '^KQ11': 850, 'KRW=X': 1385, '^GSPC': 5900, '^IXIC': 19200,
    '^DJI': 43000, '^SOX': 5100, '^TNX': 4.25, 'CL=F': 71.5,
  };
  return items.map((item) => {
    const prev = base[item.symbol] ?? 100;
    const price = prev * (1 + (Math.random() - 0.5) * 0.03);
    return toQuote(item, price, prev, now);
  });
}
