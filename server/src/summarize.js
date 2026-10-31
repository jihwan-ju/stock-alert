// Claude로 "오늘 시장이 왜 이렇게 움직였는지" 짧은 해설을 만듭니다.
// 웹 검색 도구로 당일 뉴스를 찾아 원인을 설명합니다.
import Anthropic from '@anthropic-ai/sdk';
import { formatQuote } from './format.js';

const MODEL = 'claude-opus-5-5';

const SYSTEM = `당신은 개인 투자자에게 매일 증시 마감 브리핑을 보내는 한국어 시장 해설가입니다.
제공된 시세는 정확한 값이므로 그대로 사용하고, 웹 검색으로 오늘 시장을 움직인 주요 원인(뉴스, 경제지표, 업종/대형주 동향)을 확인하세요.
투자 권유나 매수·매도 추천은 하지 마세요.

출력 형식(이 형식만 출력):
1행: 35자 이내의 한 줄 요약 (예: "반도체 강세에 코스피 2,650 회복")
빈 줄
3~4문장의 해설. 쉬운 말로, 숫자는 꼭 필요한 것만.`;

export async function summarize(marketKey, market, quotes, date) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY가 없어 AI 요약을 건너뜁니다.');
    return null;
  }
  const client = new Anthropic();

  const messages = [
    {
      role: 'user',
      content: `${date} ${market.title} 데이터입니다.\n${quotes
        .map((q) => `- ${formatQuote(q)}`)
        .join('\n')}\n\n오늘 장 마감 브리핑을 작성해 주세요.`,
    },
  ];

  let response;
  // 웹 검색이 길어지면 pause_turn으로 끊길 수 있어 몇 번 이어서 요청합니다.
  for (let i = 0; i < 4; i++) {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: 'medium' },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
      // 안전 필터에 걸리면 서버가 다른 모델로 자동 재시도
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages,
    });
    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }

  if (response.stop_reason === 'refusal') {
    console.warn('AI 요약이 거절되었습니다:', response.stop_details?.category);
    return null;
  }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) return null;

  const [headline, ...rest] = text.split('\n');
  return {
    headline: headline.replace(/^[#*\s"]+|[*"\s]+$/g, ''),
    body: rest.join('\n').trim(),
    model: MODEL,
  };
}
