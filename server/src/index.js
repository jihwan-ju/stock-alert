// 사용법:
//   node src/index.js kr              한국 증시 마감 → 요약 → 푸시
//   node src/index.js us              미국 증시 마감 → 요약 → 푸시
// 옵션:
//   --sample    네트워크 대신 가짜 시세 사용 (테스트용)
//   --dry-run   푸시를 보내지 않고 결과만 출력
//   --force     휴장일 판단을 무시하고 실행
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKETS } from './markets.js';
import { fetchAll, sampleQuotes, dateInTz } from './quotes.js';
import { formatQuote, pushBody } from './format.js';
import { summarize } from './summarize.js';
import { sendPush } from './push.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(here, '../../data/latest.json');

const args = process.argv.slice(2);
const key = args.find((a) => !a.startsWith('--'));
const flags = new Set(args.filter((a) => a.startsWith('--')));
const market = MARKETS[key];
if (!market) {
  console.error('사용법: node src/index.js <kr|us> [--sample] [--dry-run] [--force]');
  process.exit(1);
}

const today = dateInTz(new Date(), market.timezone);
const quotes = flags.has('--sample') ? sampleQuotes(market.items) : await fetchAll(market.items);

const primary = quotes.find((q) => q.symbol === market.primary);
if (!primary) {
  console.error('대표 지수 시세를 가져오지 못했습니다. 종료합니다.');
  process.exit(1);
}

// 대표 지수의 마지막 거래일이 오늘이 아니면 휴장일로 보고 알림을 보내지 않음
const tradeDate = dateInTz(new Date(primary.time), market.timezone);
if (tradeDate !== today && !flags.has('--force')) {
  console.log(`🛌 ${market.title}: 오늘(${today})은 휴장일입니다 (마지막 거래일 ${tradeDate}).`);
  process.exit(0);
}

console.log(`\n${market.emoji} ${market.title} (${today})`);
quotes.forEach((q) => console.log('  ' + formatQuote(q)));

let summary = null;
try {
  summary = await summarize(key, market, quotes, today);
} catch (err) {
  // AI 요약이 실패해도 시세 알림은 보냅니다
  console.warn('⚠️ AI 요약 실패:', err.message);
}
if (summary) console.log(`\n🧠 ${summary.headline}\n${summary.body}\n`);

// 앱이 읽어갈 JSON 저장 (다른 시장 데이터는 유지)
let data = {};
try {
  data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
} catch {}
data[key] = {
  title: market.title,
  date: today,
  updatedAt: new Date().toISOString(),
  quotes: quotes.map(({ symbol, name, kind, price, change, changePct }) => ({
    symbol, name, kind, price, change, changePct,
    text: formatQuote({ name, kind, price, change, changePct }),
  })),
  summary,
};
data.updatedAt = data[key].updatedAt;
await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`💾 저장: ${DATA_FILE}`);

const notification = {
  title: `${market.emoji} ${market.title}`,
  body: pushBody(quotes, summary?.headline),
  data: { market: key, date: today },
};
if (flags.has('--dry-run')) {
  console.log('🧪 dry-run: 푸시 미발송\n', notification);
} else {
  await sendPush(notification);
}
