# 📈 오늘의 증시 — 한국·미국 증시 마감 알림 앱 (iPhone)

매일 한국 증시와 미국 증시가 끝나면 주요 지수, 환율·금리·유가, **AI 시장 요약**을 iPhone 푸시 알림으로 보내 줍니다.

```
GitHub Actions (매일 예약 실행)
  ├─ Yahoo Finance에서 시세 수집
  ├─ Claude API(웹 검색)로 "오늘 시장이 왜 움직였나" 요약
  ├─ data/latest.json 저장 → 앱이 읽어서 화면에 표시
  └─ Expo Push로 iPhone에 알림 발송
```

| 알림 | 한국 시간 | 내용 |
|---|---|---|
| 🇰🇷 한국 증시 마감 | 평일 16:05 | KOSPI, KOSDAQ, 원/달러 + AI 요약 |
| 🇺🇸 미국 증시 마감 | 화~토 06:15 | S&P500, 나스닥, 다우, 필라델피아 반도체, 미 10년물 금리, WTI, 원/달러 + AI 요약 |

휴장일에는 대표 지수의 마지막 거래일이 오늘이 아니므로 자동으로 건너뜁니다.

## 폴더 구조

```
server/   시세 수집 · AI 요약 · 푸시 발송 (Node.js)
app/      iPhone 앱 (Expo / React Native)
data/     앱이 읽는 최신 시세 JSON (Actions가 자동 커밋)
.github/workflows/market-alert.yml   매일 실행 스케줄
```

---

## 1단계: 서버를 내 컴퓨터에서 테스트

Node.js 20 이상이 필요합니다.

```bash
cd server
npm install
npm run test:kr     # 가짜 시세로 테스트 (네트워크, API 키 불필요)
node src/index.js kr --dry-run --force   # 실제 시세로 테스트, 푸시는 보내지 않음
```

AI 요약까지 테스트하려면 [Claude Console](https://console.anthropic.com)에서 API 키를 발급받아 설정합니다.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node src/index.js us --dry-run --force
```

## 2단계: GitHub 저장소 만들기

1. GitHub에서 **공개(Public)** 저장소 `stock-alert`를 만들고 이 폴더를 push합니다.
   (앱이 `raw.githubusercontent.com`에서 JSON을 읽기 때문에 공개 저장소여야 합니다.)
2. 저장소 → **Settings → Secrets and variables → Actions**에 다음을 등록합니다.

| 이름 | 값 | 필수 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API 키 | AI 요약을 쓰려면 필수 |
| `EXPO_PUSH_TOKENS` | 앱에 표시되는 `ExponentPushToken[...]` (여러 개는 쉼표로 구분) | 필수 |
| `EXPO_ACCESS_TOKEN` | Expo 계정의 푸시 보안 토큰 | 선택 |

3. **Actions** 탭 → "증시 마감 알림" → **Run workflow**로 직접 실행해 볼 수 있습니다 (`force`를 `true`로 하면 주말에도 실행).

## 3단계: iPhone 앱 실행

1. `app/app.json`의 `extra.dataUrl`에서 `<GitHub아이디>`를 본인 아이디로 바꿉니다.
2. `ios.bundleIdentifier`를 고유한 값으로 바꿉니다 (예: `com.내이름.stockalert`).
3. Expo 계정을 만들고 프로젝트를 연결합니다.

```bash
cd app
npm install
npx eas-cli@latest login
npx eas-cli@latest init        # app.json에 projectId가 자동으로 추가됨
```

4. iPhone에 설치합니다. **푸시 알림을 받으려면 Apple Developer 계정(연 $99)이 필요합니다.**

```bash
npx eas-cli@latest device:create                       # 내 iPhone 등록
npx eas-cli@latest build --platform ios --profile preview
```

빌드가 끝나면 나오는 QR 코드로 iPhone에 설치하고, 앱을 열어 알림을 허용하세요.
화면 아래 **🔔 알림 설정** 카드의 토큰을 복사해서 `EXPO_PUSH_TOKENS` Secret에 넣으면 끝입니다.

> 화면만 먼저 보고 싶다면 `npx expo start` 후 iPhone의 **Expo Go** 앱으로 QR을 찍어도 됩니다.

---

## 비용

| 항목 | 비용 |
|---|---|
| GitHub Actions | 공개 저장소는 무료 |
| Expo Push / EAS 무료 플랜 | 무료 (빌드 횟수 제한 있음) |
| Claude API | 하루 2회 요약, 웹 검색 포함 대략 월 몇 달러 수준 |
| Apple Developer | 연 $99 |

## 바꿔 보기

- **종목 추가/변경**: `server/src/markets.js`에 Yahoo Finance 심볼을 추가합니다 (예: 삼성전자 `005930.KS`, 엔비디아 `NVDA`).
- **알림 시간 변경**: `.github/workflows/market-alert.yml`의 `cron` (UTC 기준, 한국시간 −9시간). cron 값을 바꾸면 워크플로 안의 시장 결정 조건(`5 7 * * 1-5`)도 함께 바꿔야 합니다.
- **AI 요약 문체**: `server/src/summarize.js`의 `SYSTEM` 프롬프트를 수정합니다.

## 주의

- Yahoo Finance API는 비공식이라 예고 없이 바뀔 수 있습니다. 개인용으로 사용하고, 안정성이 필요하면 공공데이터포털(금융위원회 주식시세정보)이나 증권사 Open API로 교체하세요.
- GitHub Actions 예약 실행은 몰리는 시간에 몇 분~수십 분 늦어질 수 있습니다.
- AI 요약은 참고용이며 투자 권유가 아닙니다.

## 다음 단계 아이디어

- 관심 종목 등록 및 등락률 알림
- 급등락(예: ±2%) 장중 알림
- 지수 차트, 주간 리포트
