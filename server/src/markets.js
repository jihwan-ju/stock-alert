// 알림에 들어갈 종목 정의 (Yahoo Finance 심볼 기준)
// kind: index(지수, % 표시) | fx(환율) | yield(금리, bp 표시) | commodity(원자재)

export const MARKETS = {
  kr: {
    title: '한국 증시 마감',
    emoji: '🇰🇷',
    timezone: 'Asia/Seoul',
    // 휴장일 판단 기준이 되는 대표 지수
    primary: '^KS11',
    items: [
      { symbol: '^KS11', name: 'KOSPI', kind: 'index' },
      { symbol: '^KQ11', name: 'KOSDAQ', kind: 'index' },
      { symbol: 'KRW=X', name: '원/달러', kind: 'fx' },
    ],
  },
  us: {
    title: '미국 증시 마감',
    emoji: '🇺🇸',
    timezone: 'America/New_York',
    primary: '^GSPC',
    items: [
      { symbol: '^GSPC', name: 'S&P500', kind: 'index' },
      { symbol: '^IXIC', name: '나스닥', kind: 'index' },
      { symbol: '^DJI', name: '다우', kind: 'index' },
      { symbol: '^SOX', name: '필라델피아 반도체', kind: 'index' },
      { symbol: '^TNX', name: '미 10년물 금리', kind: 'yield' },
      { symbol: 'CL=F', name: 'WTI 유가', kind: 'commodity' },
      { symbol: 'KRW=X', name: '원/달러', kind: 'fx' },
    ],
  },
};
