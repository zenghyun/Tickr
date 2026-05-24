# Tickr — 모의투자 앱 MVP 구현 계획

## Context

FE 개발자(React/Next 경험, RN/BE 경험 없음)가 본인 학습 + 지인 닫힌 베타용으로 만들고자 하는 **모의투자(가상 포트폴리오) 앱**.

**왜 모의투자인가** — 한국에서 실 증권사 계좌 통합(도미노/뱅크샐러드 방식)은 마이데이터 라이선스(자본금 5억+, 금융위 허가)가 필요해 개인 개발자에겐 불가능. 대신 한국투자증권(KIS) Developers OpenAPI를 사용하면 **개발자 본인 키 1개로 모든 사용자에게 실시간 시세 제공이 합법적으로 가능**하므로, 사용자별 증권 계좌 없이도 "실제 시세 기반의 가상 매매" 앱을 만들 수 있다.

**최종 목표** — 사용자가 로그인 → 종목 검색 → 실시간 차트 보기 → 시장가 가상매매 → 보유종목 평가금액이 실시간 시세에 따라 변동되는 흐름을 완전한 모바일 앱으로 제공. 1단계는 핵심 포트폴리오/체결/실시간 시세, 2단계에서 AI 분석(정보성) 추가.

## 확정된 의사결정

| 항목               | 결정                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 앱 유형            | 모의투자 (자체 가상 포트폴리오) — **시장가(MARKET) 즉시체결 + 지정가(LIMIT) 자체 매칭**. **호가창 표시 안 함**                                                                         |
| 매매 모델          | MARKET: 현재가 즉시 체결 / LIMIT: `pending_orders` 등록 → WS tick에서 가격 도달 시 자동 체결                                                                                           |
| 플랫폼 우선순위    | **앱 우선**, 향후 `apps/web` 확장 계획 (도메인 타입은 `@tickr/shared`에 통일, RN-only는 `shared/lib/` 격리)                                                                            |
| 시세 데이터        | 한국투자증권 KIS Developers OpenAPI (REST + WebSocket)                                                                                                                                 |
| 사용자별 증권 계좌 | 불필요. 개발자 KIS 키 1개로 전체 서비스                                                                                                                                                |
| 모바일             | Expo (iOS + Android)                                                                                                                                                                   |
| 백엔드             | Supabase(Auth+Postgres+RLS) + NestJS 1대                                                                                                                                               |
| AI                 | 1단계 제외 → 2단계 정보성 분석만                                                                                                                                                       |
| 배포               | TestFlight + Android Internal Track (닫힌 베타)                                                                                                                                        |
| 정보구조(IA)       | **하단 3탭(홈·시장·랭킹) + 최상위 헤더(검색🔍·설정☰)**. 거래내역=홈 하위 화면                                                                                                         |
| 디자인 레퍼런스    | **토스증권(Toss) UI** 참고 — 홈(원화/달러 2카드·내 투자 합산·국내/해외 섹션·정렬/통화 토글), 헤더(우측 검색·메뉴). 시장 컬러는 KR 표준(상승=빨강) 유지                                 |
| 환율/환전          | **정식 기능**. 무료 FX API + `fx_trades`/`execute_fx_trade()` RPC. KIS 비의존                                                                                                          |
| 로그인 배경        | 정적 번들 로고 에셋(curated 30~50 KR+US) + `react-native-reanimated` 대각선 마키. 런타임 로고 API 미사용                                                                               |
| 랭킹/리더보드      | **1단계 MVP 포함(W8)**. 수익률(%) 단일·시즌제·Top100+본인·옵트인·**보상 없음**                                                                                                         |
| 앱 잠금(App Lock)  | **6자리 PIN + 생체인증(Face ID/지문)** 로컬 앱 잠금(토스 패턴). `expo-local-authentication`(OS 위임, 생체 데이터 접근 X). 세션 영속과 별개의 보안 게이트. 신규 네이티브 = 새 빌드 필요 |
| 언어               | TypeScript 전체                                                                                                                                                                        |

## A. 아키텍처

```
┌────────── Expo App (iOS/Android) ──────────┐
│ Supabase Auth SDK │ React Query │ WS Client │
└──────┬──────────────┬─────────────┬─────────┘
       │JWT           │JWT(Bearer)  │JWT(query)
       ▼              ▼             ▼
┌──────────────┐  ┌────────────────────────────┐
│  Supabase    │◄─┤      NestJS API (Railway)  │
│  Auth        │  │  Auth Guard │ Trade Svc    │
│  Postgres    │  │  KIS REST   │ WS Hub       │
│  RLS         │  │  + token$   │ (fan-out)    │
└──────────────┘  └──────┬──────────────┬──────┘
                         │REST           │WS(1)
                         ▼               ▼
                   ┌────────────────────────────┐
                   │  KIS Developers OpenAPI    │
                   └────────────────────────────┘
```

- **실시간 시세**: KIS WS 1개 → NestJS WsHub → 다수 Expo 클라이언트에 fan-out
- **매매 체결**: Expo → NestJS → KIS 현재가 조회 → Postgres `execute_trade()` 함수로 단일 트랜잭션
- **환율/환전**: NestJS `FxRateService`가 무료 FX API를 주기 폴링·캐시 → 환전은 `execute_fx_trade()` 단일 트랜잭션으로 KRW↔USD 잔고 이체
- **정적 로고 에셋**: 로그인 배경 + 보유/시장 행 원형 아이콘은 모바일 번들 내(`apps/mobile/assets/logos/`) — 외부 호출 경로 아님

## B. 데이터 모델 (Supabase Postgres)

| 테이블           | 핵심 컬럼                                                                                                                                                                                                                                                 | RLS                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `profiles`       | id(uuid=auth.users.id), email, nickname unique, is_beta, display_currency('KRW'\|'USD' default 'KRW'), theme_pref('system'\|'light'\|'dark' default 'system'), notif_pref jsonb, show_on_leaderboard bool default false, show_holdings bool default false | select: id = auth.uid(), update: id = auth.uid() + 컬럼 GRANT(nickname, display*currency, theme_pref, notif_pref, show*\* 만) |
| `accounts`       | user_id(PK=profiles.id), cash_balance_krw numeric(20,4), cash_balance_usd numeric(20,4), updated_at                                                                                                                                                       | select: user_id = auth.uid(), mutation: service_role 전용 (default-deny)                                                      |
| `holdings`       | id, user_id, symbol, market('KR'\|'US'), quantity, avg_price, UNIQUE(user_id, symbol)                                                                                                                                                                     | all: user_id = auth.uid()                                                                                                     |
| `trades`         | id, user_id, symbol, side('BUY'\|'SELL'), order_type('MARKET'\|'LIMIT'), quantity, price, amount, executed_at, pending_order_id(nullable)                                                                                                                 | select/insert만, update/delete 금지                                                                                           |
| `pending_orders` | id, user_id, symbol, side, quantity, limit_price, status('OPEN'\|'FILLED'\|'CANCELLED'), created_at, filled_at                                                                                                                                            | select: user_id = auth.uid(), insert/update/delete는 service_role                                                             |
| `watchlist`      | id, user_id, symbol, market, UNIQUE(user_id, symbol)                                                                                                                                                                                                      | all: user_id = auth.uid()                                                                                                     |
| `symbols`        | symbol(PK), market, name_ko, name_en, exchange, currency, is_active                                                                                                                                                                                       | select: authenticated, write: service_role                                                                                    |
| `kis_tokens`     | id=1(single row), token, expires_at                                                                                                                                                                                                                       | service_role만                                                                                                                |
| `allowed_emails` | email(PK)                                                                                                                                                                                                                                                 | service_role만 (화이트리스트)                                                                                                 |
| `fx_trades`      | id, user_id, from_ccy('KRW'\|'USD'), to_ccy, from_amount, to_amount, rate, created_at                                                                                                                                                                     | select: user_id = auth.uid(), insert: service_role (RPC만)                                                                    |
| `fx_rates`       | base, quote, rate, fetched_at (환율 캐시 — 메모리 캐시로 대체 가능)                                                                                                                                                                                       | service_role만                                                                                                                |
| `seasons`        | id text('2026-06'), starts_at, ends_at, is_active                                                                                                                                                                                                         | select: authenticated, write: service_role                                                                                    |
| `leaderboard_mv` | (materialized view) user_id, nickname, season_id, return_pct, total_value, rank — 5분 cron refresh                                                                                                                                                        | select: authenticated (옵트인 공개분만)                                                                                       |

> 랭킹용 컬럼(`accounts.season_id`/`initial_cash`) 상세는 **I절 「랭킹 / 리더보드」** 섹션 참조.

체결/잔고 변경은 모두 NestJS의 `service_role` 키로 트랜잭션 수행. RLS는 안전망.

## C. 디렉터리 구조 (pnpm workspaces + turbo 모노레포)

```
tickr/
├── pnpm-workspace.yaml, turbo.json, .env.example
├── apps/
│   ├── mobile/                          # Expo + expo-router
│   │   ├── app.json, eas.json
│   │   ├── app/
│   │   │   ├── (auth)/login.tsx          # floating 로고 배경(정적 마키)
│   │   │   ├── onboarding.tsx            # 첫 로그인 가이드(1회 노출)
│   │   │   ├── (tabs)/_layout.tsx        # 하단 3탭 셸 + 공용 헤더(검색·설정)
│   │   │   ├── (tabs)/index.tsx          # 홈 (원화/달러 카드·내 투자·국내/해외 보유)
│   │   │   ├── (tabs)/market.tsx         # 시장 (국내/해외·실시간·정렬)
│   │   │   ├── (tabs)/leaderboard.tsx    # 랭킹
│   │   │   ├── search.tsx                # 검색 (헤더 🔍 진입)
│   │   │   ├── settings/index.tsx        # 설정 (헤더 ☰ 진입)
│   │   │   ├── trades.tsx                # 거래내역 (홈에서 push)
│   │   │   └── symbol/[symbol].tsx
│   │   ├── assets/logos/                 # 정적 로고 에셋(로그인 배경·행 아이콘 공유)
│   │   └── src/                          # FSD v2 (app/pages/widgets/features/entities/shared)
│   │       ├── app/         # 전역 providers
│   │       ├── pages/       # portfolio, market, leaderboard, settings, search, symbol, onboarding
│   │       ├── widgets/     # app-header(검색·설정), login-logo-marquee, order-sheet, price-chart, holdings-list
│   │       ├── features/    # execute-trade, exchange-currency, toggle-theme, toggle-watchlist, delete-account, sign-out, search-symbols
│   │       ├── entities/    # symbol, quote, holding, trade, account, fx-rate, leaderboard, watchlist
│   │       └── shared/      # ui, lib(ws/supabase/storage), api, config
│   └── api/                             # NestJS
│       └── src/
│           ├── auth/                    # JWT Guard
│           ├── kis/                     # service, token cache, ws client
│           ├── symbols/                 # controller + cron
│           ├── quote/                   # REST 현재가/차트
│           ├── trade/                   # 체결 로직
│           ├── ws/                      # WsHub
│           └── supabase/                # service_role client
└── packages/shared/
    └── src/{schemas, ws-protocol.ts, kis-types.ts}
```

**왜 모노레포**: zod 스키마/TS 타입을 FE·BE 공유 → KIS 응답 검증과 trades DTO를 한 곳에서 관리.

## D. 핵심 기술 선택

### 모바일

- 라우팅: **expo-router v6** (Next App Router 유사 — FE 학습곡선↓)
- 서버 상태: **@tanstack/react-query v5**
- 클라이언트 상태: **zustand**
- 폼: **react-hook-form + zod**
- 차트: **TradingView Lightweight Charts** (Apache-2.0 무료, 금융 차트 표준) + `react-native-webview` 임베드. RN→WebView는 `postMessage`로 WS tick 전달, WebView→RN은 캔들 hover/탭 콜백 정도만. 보조지표(MA/RSI/MACD)는 라이브러리 내장 또는 직접 계산 후 차트 시리즈로 추가
- 스타일: **NativeWind v4 단독으로 시작** (Tailwind 문법 익숙). 컴포넌트가 부족하면 tamagui 추가
- WS: **native WebSocket** (RN 내장, socket.io는 background 이슈)
- 인증: `@supabase/supabase-js` + `expo-secure-store` 어댑터

### 디자인 / 정보구조 (토스증권 참고)

- **하단 탭 3종**: 홈·시장·랭킹. **검색🔍·설정☰은 최상위 헤더 우측 아이콘**(하단 탭 아님) — `widgets/app-header`로 공통화, expo-router `headerRight` 연결. 1단계엔 AI(✨) 미노출.
- **홈**: 원화/달러 2카드(=`cash_balance_krw`/`cash_balance_usd`, 탭→환전) → 내 투자 합산금액+손익(상승=빨강) → 정렬(평가금 높은 순 등)·현재가/평가금·$/원 토글 → **국내주식/해외주식 섹션**(각 '보기'). 보유 행=원형 로고+이름+수량+평가금+등락.
- **시장 탭**: [전체 | 관심] 세그먼트 토글. 국내/해외 구분 + 정렬(거래량/등락률). 각 종목 행에 ★(관심 토글). 검색은 헤더 🔍.
- **종목 상세**(검색·목록에서 진입): 3섹션 — ① **차트**(분봉 Select[1·5·15·30·60분]+일/주/월/년, TradingView 임베드, 실시간 현재가는 W6) ② **내 주식**(1주 평단가·보유수량·총 평가금·투자원금·평가손익 + 구매/판매 버튼→OrderSheet) ③ **종목 정보**(KIS 제공분 우선; 뉴스·애널리스트 의견 등은 post-MVP 외부 소스 — E절 데이터 가용성 표). 헤더에 ★(관심).
- **로그인 배경**: `react-native-reanimated`(설치됨) 무한 대각선 마키 — 2행 반대방향·속도차, opacity 0.4~0.7, 정적 로고 에셋(`expo-image`), 검정 배경(`bg` 토큰). RN이라 CSS/framer-motion 미사용(웹 레퍼런스는 패턴 참고만). 로고셋은 보유/시장 행 아이콘과 단일 출처 공유.
- **테마**: NativeWind 다크/라이트 토큰 양세트 이미 존재 → zustand 테마 스토어 + `shared/lib/storage`(SecureStore) 영속. 시스템/라이트/다크 3택.
- **알림(push)**: `expo-notifications` 미설치 → **post-MVP**. 설정엔 '준비중' 자리만.

### 백엔드

- 프레임워크: **NestJS** (DI/Guard가 BE 첫경험자에 친절)
- WS: **`ws` + `@nestjs/platform-ws`** (KIS WS가 raw WS이므로 프로토콜 일치)
- HTTP: **axios + axios-retry** (KIS 401 시 토큰 재발급)
- 검증: **zod + nestjs-zod** (FE와 스키마 공유)
- 캐시: **node-cache + Postgres** (Redis는 MVP에 불필요)
- 환율: **`FxRateService`** — 무료 FX API(예: exchangerate.host류) 주기 폴링 + 캐시(KIS 비의존). 환전 체결은 `execute_fx_trade()` RPC
- 스케줄: **@nestjs/schedule** cron (BullMQ 불필요)
- 트랜잭션: **Postgres plpgsql 함수 `execute_trade()`** (Supabase JS는 BEGIN/COMMIT 직접 지원 X)
- Supabase: `@supabase/supabase-js` w/ service_role

### 인프라

- Supabase 무료티어
- NestJS: **Railway** (git push 배포, WS 지속 연결 안정)
- 모바일 배포: Expo EAS Build + Submit
- 모바일 OTA: **EAS Update**(`expo-updates`) — JS 번들/에셋만 무선 갱신(스토어 재심사 없이 버그픽스/UI 수정 즉시 반영). **네이티브 변경**(새 expo-\* 네이티브 모듈, `app.json` 권한/아이콘, SDK 메이저 업)은 OTA 불가 → 새 빌드 필요, `runtimeVersion`으로 구버전 클라이언트 격리. UX는 인앱 "업데이트 준비됨" 배너(`useUpdates()` → `reloadAsync()` 즉시 적용)만 사용 — 앱 미실행 중 OS 푸시 알림은 별도 인프라(`expo-notifications`, post-MVP). 채널은 `preview`(베타)/`production` 분리. **셋업은 W8.**

## E. KIS API 통합

**등록 절차 (Day 1~2, 승인까지 1~2일):**

1. KIS Developers 가입 → 모의투자 계좌 개설(인증용)
2. OpenAPI 신청 → App Key/Secret (실전/모의 분리 발급)
3. 첫 토큰: `POST /oauth2/tokenP` → `access_token` (24h)

**토큰 캐싱**: 메모리 우선 → 만료 10분 전 갱신, Postgres `kis_tokens`에 백업 (재시작 대비).

**종목 마스터 동기화**: `@Cron('0 6 * * 1-5')` 평일 06:00 → upsert `symbols` (MVP는 주요 ~3000개).

**시장 목록(시장 탭)**: KIS 거래량/등락률 순위 API로 국내/해외 상위 N개 스냅샷 확보(REST, 캐시). 기본 정렬=거래량, 필터=국내/해외·등락률. 실시간 틱은 WS 41 구독 한계로 **가시 영역 상위 ~30~40개만** 구독, 나머지는 스냅샷/주기 갱신.

**종목 상세 — 정보 데이터 가용성** (KIS 제공 여부에 따라 섹션 노출/숨김):

| 항목                         | 소스          | 비고                              |
| ---------------------------- | ------------- | --------------------------------- |
| 시세(현재가·OHLC·거래량)     | ✅ KIS        | 기본                              |
| PER/PBR/EPS/BPS              | ✅ KIS        | 국내주식 기본/재무비율 API        |
| 투자자동향(기관·외국인·개인) | ✅ KIS        | 종목별 투자자매매동향 API         |
| 투자지표·재무비율            | ✅ KIS        | 재무비율 API                      |
| 재무제표(대차/손익)          | 🟡 KIS 일부   | 국내 위주, 해외 제한 — 확인 필요  |
| 실적(분기/추정 컨센서스)     | 🟡 부분       | 확정 실적 일부, 추정은 외부       |
| 뉴스                         | ❌ KIS 미제공 | **post-MVP 외부 소스**(네이버 등) |
| 애널리스트 투자의견/목표가   | ❌ KIS 미제공 | **post-MVP 외부 소스**            |

방침(확정): **KIS 제공분으로 시작, 미제공 항목은 섹션 숨김/'준비중'**. 뉴스·애널리스트 의견은 외부 API로 **후속(post-MVP) 통합**(2단계 AI 분석과 함께 검토).

**WS 동적 구독** (KIS WS 동시 41개 제한):

```
SubscriberMap: Map<symbol, Set<clientId>>

클라이언트 진입 → server.subscribe(symbol, clientId)
  if map[symbol] empty → KIS WS subscribe
  map[symbol].add(clientId)

클라이언트 이탈 → server.unsubscribe(symbol, clientId)
  map[symbol].delete(clientId)
  if map[symbol] empty → KIS WS unsubscribe
```

**클라이언트↔서버 WS 프로토콜** (`packages/shared/src/ws-protocol.ts`):

```ts
// C→S: { type:'subscribe', symbols:['005930'] } | { type:'unsubscribe', ... } | { type:'ping' }
// S→C: { type:'tick', symbol, price, ts } | { type:'pong' } | { type:'error', code }
```

연결 시 JWT는 `?token=...` 쿼리로 전달 → Gateway에서 검증.

## F. 매매 체결 로직 (MARKET / LIMIT)

### F-1. MARKET (시장가) — 즉시 체결

```
POST /trades { symbol, side, quantity, orderType: 'MARKET' }
  1. JWT → user_id
  2. price = await kis.getQuote(symbol)             // 실패 502 QUOTE_UNAVAILABLE
  3. supabase.rpc('execute_trade', {
       p_user_id, p_symbol, p_side, p_quantity,
       p_price: <quote>, p_order_type: 'MARKET',
       p_pending_id: null
     })
       plpgsql 내부 단일 트랜잭션:
         LOCK accounts FOR UPDATE
         BUY:  cash >= amount? → cash -= amount
               holdings upsert:
                 new_qty = old_qty + qty
                 new_avg = (old_avg*old_qty + price*qty) / new_qty
         SELL: holdings.qty >= qty? → cash += amount
               qty == sell_qty 이면 holding 삭제, 아니면 qty 감소(avg_price 유지)
         INSERT trades (order_type='MARKET', pending_order_id=null)
         RETURN updated holding + account
  4. 응답
```

### F-2. LIMIT (지정가) — 자체 매칭

```
POST /trades { symbol, side, quantity, orderType: 'LIMIT', limitPrice }
  1. JWT → user_id
  2. limitPrice 검증 (양수, 1주 최소금액 등) → 실패 400 PRICE_INVALID
  3. (BUY 한정) cash >= quantity * limitPrice 사전 검증 → 부족 시 400
     (SELL 한정) holdings.qty >= quantity 사전 검증 → 부족 시 400
     ※ 잠금/원장 변경은 안 함. UX 빠른 실패용 prevalidation.
  4. INSERT pending_orders (status='OPEN')
  5. LimitMatcherService에 메모리 등록 (symbol별 인덱스)
  6. 응답: { pendingOrderId }

[비동기 매칭]
KisWsClient tick → hub.broadcast
                → LimitMatcherService.match(symbol, tickPrice):
                    BUY  open 주문 중 limitPrice >= tickPrice
                    SELL open 주문 중 limitPrice <= tickPrice
                    FOR UPDATE SKIP LOCKED 후 execute_trade(
                      ..., p_price: tickPrice, p_order_type: 'LIMIT',
                      p_pending_id: <pending.id>
                    )
                    → pending_orders.status='FILLED', filled_at=now()
                    → 클라이언트 WS로 'order-filled' 푸시(선택)
```

### F-3. LIMIT 취소

```
DELETE /pending-orders/:id
  RPC 또는 직접 UPDATE pending_orders SET status='CANCELLED'
  WHERE id=? AND user_id=? AND status='OPEN'
  → 매처 메모리 인덱스에서 제거
```

### F-4. 에러 코드

| code                  | HTTP | 의미                         |
| --------------------- | ---- | ---------------------------- |
| `INSUFFICIENT_CASH`   | 400  | 잔고 부족                    |
| `INSUFFICIENT_QTY`    | 400  | 보유 수량 부족               |
| `QUOTE_UNAVAILABLE`   | 502  | MARKET 시세 조회 실패        |
| `PRICE_INVALID`       | 400  | LIMIT 가격 비정상            |
| `SYMBOL_INACTIVE`     | 400  | 상장폐지 종목 매수 시도      |
| `ORDER_NOT_FOUND`     | 404  | 취소 대상 pending_order 없음 |
| `FX_RATE_UNAVAILABLE` | 502  | 환전 시 환율 조회 실패       |

장 마감 검증은 MVP 제외(24/7 매칭). 향후 KR 정규장 외 LIMIT 큐잉은 W7+ 검토.

### F-5. 환전 (FX) — KRW↔USD 잔고 이체

```
POST /fx-trades { fromCcy, toCcy, amount }
  1. JWT → user_id
  2. rate = FxRateService.getRate(fromCcy, toCcy)   // 실패 502 FX_RATE_UNAVAILABLE
  3. supabase.rpc('execute_fx_trade', { p_user_id, p_from_ccy, p_to_ccy, p_amount, p_rate })
       plpgsql 단일 트랜잭션:
         LOCK accounts FOR UPDATE
         from 잔고 >= amount? → from -= amount, to += 환산액(amount × rate)
         INSERT fx_trades
         RETURN updated account
  4. 응답
```

에러: `INSUFFICIENT_CASH`(잔고 부족), `FX_RATE_UNAVAILABLE`(환율 조회 실패). NestJS에서 `accounts` 직접 mutation 금지 — trade-rpc.md 원칙 동일(RPC 단일 진입).

## G. 실시간 시세 fan-out + LIMIT 매칭

```
KisWsClient (single connection)
  └─ on('tick') → hub.broadcast(symbol, tick)
                → LimitMatcherService.match(symbol, tick.price)

WsHub
  clients: Map<clientId, WebSocket>
  subs:    Map<symbol, Set<clientId>>
  broadcast(symbol, tick):
    for cid of subs[symbol]: clients[cid].send({type:'tick', ...})

LimitMatcherService
  openOrders: Map<symbol, MinHeap<BuyOrder>+MaxHeap<SellOrder>>
  match(symbol, tickPrice):
    while top BUY.limitPrice >= tickPrice → 체결(execute_trade)
    while top SELL.limitPrice <= tickPrice → 체결(execute_trade)
    FOR UPDATE SKIP LOCKED 로 동시성 보호
```

**복구**: KIS WS 끊김 → 지수 백오프(1s→30s) → 재연결 후 `subs` 전체 재구독.
**LimitMatcher 부팅**: NestJS 기동 시 `pending_orders WHERE status='OPEN'` 일괄 로드해 메모리 인덱스 재구성.
클라이언트 끊김 → 재연결 시 현재 화면 심볼 set 재전송. 30초 ping/pong.
**시장 탭 가시 종목**도 동일 `subs` 경로로 구독/해제(41 cap 내 LRU·우선순위). 화면 밖 종목은 구독 해제.

## H. 인증/보안

- 모든 비즈니스 엔드포인트: `@UseGuards(SupabaseJwtGuard)` (`jose`로 `SUPABASE_JWT_SECRET` 검증)
- 모든 사용자 테이블 RLS ENABLE
- KIS 키: Railway secrets만, 클라이언트 번들 절대 금지
- 닫힌 베타: profiles INSERT trigger에서 `auth.email()`이 `allowed_emails`에 없으면 raise
- **앱 잠금(App Lock)**: 세션은 이미 SecureStore(Keychain/Keystore)에 영속(`persistSession: true`) → 재로그인 불필요. 그 위에 **6자리 PIN + 생체인증(iOS Face ID / Android 지문·얼굴)** 로컬 잠금을 얹는다(토스 패턴). `expo-local-authentication`으로 **OS에 본인확인 위임** — 생체 데이터(지문/얼굴 templates)는 Secure Enclave/TEE에 격리돼 앱이 절대 접근 못 하고, **성공/실패 결과(yes/no)만** 수신 → 저장된 세션 잠금 해제. PIN은 생체 미지원/실패 시 폴백(**서버 전송 X, 로컬 검증**), 분실 시 정식 재로그인(이메일·비번)으로 복구. ⚠️ `expo-local-authentication` 신규 설치 = **네이티브 모듈 추가 → OTA 불가, 새 EAS Build 필요**(iOS `NSFaceIDUsageDescription` config plugin). 잠금 on/off·생체 사용은 설정에서 토글(W4). 생체 등록 변경(새 지문 추가) 감지 후 강제 재인증은 post-MVP.
- **계정 삭제**: `DELETE /account` — service_role로 auth user 삭제 + 연관 테이블 cascade. **Apple App Store 필수 요건** → W8 TestFlight 전 반드시 포함
- 로그인 배경 로고: 상표권 — 닫힌 베타 장식 사용 한정. 공개 배포 전 재검토(K절)

## I. 단계별 로드맵

### 1단계 MVP (총 8주)

| 주     | 산출물                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **W1** | pnpm/turbo 모노레포 + Expo·NestJS 빈 부팅 + `packages/shared` 셋업                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **W2** | **Claude Code 워크플로(harness 파이프라인) 셋업** — 프로젝트 `CLAUDE.md`, `.claude/agents/`(PM·Designer·Architect·Tester·Reviewer·QA·DevOps Tickr 맞춤 override — **Figma 의존성 제거**, RN/NestJS/모노레포 컨텍스트 주입), `.claude/commands/create-pr.md`·`issue-update.md`(gh CLI/GitHub Issue 기반으로 Jira·Bitbucket 대체), NativeWind 디자인 토큰 정의(상승=빨강/하락=파랑 KR 컨벤션), `.github/`(ISSUE/PR 템플릿·라벨·마일스톤), lefthook pre-commit(typecheck/lint/rules grep). **외부 키 셋업(W3 진입 차단)**: Supabase 베타 전용 프로젝트(`tickr-beta`, Seoul, Free) 생성 + 루트 `.env`에 `EXPO_PUBLIC_*`/`SUPABASE_*` 채움 + `.env.example` 정합화(이슈 #2). **기능 구현은 harness 파이프라인으로 진행**(PM→Designer→Architect→Tester→Reviewer→QA→DevOps).                                          |
| **W3** | Supabase Auth (**이메일/비번 + Google + Kakao OAuth** 3종 — 이메일/비번은 베타 테스터 운영자 발급 및 자체 가입 폼 양쪽 모두 사용) + profiles trigger(`handle_new_user`: KRW 1억/USD 0 seed, coalesce 체인이 OAuth/이메일 경로 모두 흡수) + accounts 다국 통화 컬럼(`cash_balance_krw` + `cash_balance_usd`) + display_currency(profiles) + mobile (auth) flow(이메일/비번 폼 RHF+zod + OAuth 버튼 2개) + NestJS JWT Guard + **하단 3탭 셸 + 공용 헤더(검색·설정 아이콘)** + **로그인 온보딩 floating 로고 배경(정적 마키)** + 로그아웃 + `profiles.theme_pref` 컬럼 + **첫 로그인 온보딩 가이드**(가이드 carousel, 1회 노출 — 로컬 플래그 또는 `profiles.onboarded`) + **앱 잠금**(6자리 PIN + 생체인증 Face ID/지문, `expo-local-authentication` — 네이티브 추가라 새 EAS Build 필요. 잠금 토글 UI는 W4 설정) |
| **W4** | KIS 토큰 캐시 + `/symbols/search` + 마스터 cron + **검색 화면(헤더 🔍 진입)** + **시장 탭 v1**(국내/해외 목록, KIS 순위 스냅샷, 정렬, **[전체\|관심] 세그먼트**) + **관심목록 ★ 토글**(종목 행/상세 공통, `watchlist` 테이블) + **설정 페이지 셸 + 테마 토글(헤더 ☰ 진입)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **W5** | `/quote/:symbol` REST + `/quote/:symbol/candles?interval=1m\|5m\|15m\|D\|W\|M\|Y` + **종목 상세 3섹션**(① 차트: 분봉 Select+일/주/월/년·TradingView 임베드 ② 내 주식: 1주 평단·보유수량·총평가금·투자원금 + 구매/판매 버튼→OrderSheet(W7) ③ 종목 정보: KIS 제공분 시세/PER·PBR/투자자동향/재무비율) + **종목 상세 ★ 관심 토글**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **W6** | NestJS WsGateway + WsHub + KisWsClient + 종목 상세 실시간 갱신 + 동적 구독 + **시장 탭 실시간 틱 반영(bounded ≤41)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **W7** | `execute_trade` plpgsql(MARKET/LIMIT 통합, currency 분기로 KRW/USD 잔고 컬럼 차감/증가) + `pending_orders` 테이블 + `POST /trades`(MARKET/LIMIT 분기) + `DELETE /pending-orders/:id` + LimitMatcherService(WS tick 매칭) + 매수/매도 시트(시장가/지정가 토글) + 보유종목/거래내역/대기주문 + **환전(`FxRateService` + `fx_rates` 캐시 + `execute_fx_trade` RPC + `POST /fx-trades` + 환전 시트/홈 진입)**. seed는 W3에서 완료(KRW 1억/USD 0).                                                                                                                                                                                                                                                                                                                                                                  |
| **W8** | 합산 평가금액(실시간) + 국내/해외 분리 뷰 + **랭킹 탭**(`seasons`+`leaderboard_mv`+`GET /leaderboard`+LeaderboardPage) + **설정 완성**(테마 영속 + **계정 삭제** + 알림 자리) + 에러/빈상태 + EAS Build + **EAS Update(OTA) 셋업 + 인앱 업데이트 배너**(`expo-updates`·`useUpdates()`→`reloadAsync()`) + TestFlight/Internal Track 업로드 + 화이트리스트                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### 랭킹 / 리더보드 (W8 — 1단계 MVP 포함)

> 당초 W9 후보였으나 **W8로 승격**(3번째 탭 확정). 매매(W7) 완료 후 구현. 아래 설계 원칙은 그대로 적용.

**목표**: 사용자 간 가벼운 경쟁/비교로 retention 강화. 닫힌 베타 안에서만 동작.

**원칙 (반드시 같이 갈 것)**:

- **랭킹 기준은 수익률(%) 단일**. 평가금액 총액은 표시만(정렬 기준 X).
  - 이유: "올인·몰빵" 위험 추구 행동을 줄이고, 추후 시드 충전 정책에도 흔들리지 않음.
- **시즌제(3개월 단위) 리셋**: 분기별 (4분기) 1일 KST 00:00에 새 `accounts` row 생성, 과거 시즌은 archive. 신규 가입자 위축 방지.
- **옵트인 공개**: `profiles.show_on_leaderboard boolean default false`. 닉네임 별도 입력, 본명 노출 X.
- **상금/보상 없음 명시** + 면책 문구 강화: "교육·학습 목적이며 실제 투자가 아닙니다. 상금이나 실제 보상은 일체 없습니다."
  - 이유: 한국 법상 "투자 수익 경쟁 + 보상" 형태는 유사수신/도박성 판정 위험. 보상이 없고 닫힌 베타면 안전.
- **Top 100 + 본인 등수**만 표시. 전체 리스트 X(쿼리 비용·심리 부담 ↑).
- **보유 종목 공개는 별도 토글** (`profiles.show_holdings`) — 더 민감한 정보.

**데이터 모델 변경**:

```sql
profiles
  + nickname            text unique
  + show_on_leaderboard boolean default false
  + show_holdings       boolean default false

accounts
  + season_id           text                 -- '2026-06' 같은 월 키
  + initial_cash        numeric(20,4)        -- 수익률 계산용 시드 스냅샷

seasons                                       -- 시즌 메타
  id text primary key                         -- '2026-06'
  starts_at timestamptz, ends_at timestamptz
  is_active boolean

leaderboard_mv (materialized view)
  account_id, user_id, nickname, season_id,
  return_pct, total_value, rank
  -- 5분 cron refresh
```

**계산식**:

```
total_value = cash_balance + Σ (holdings.quantity × current_price)
return_pct  = (total_value - initial_cash) / initial_cash × 100
```

`current_price`는 WS tick 마지막값 캐시(`symbols_cache` 또는 메모리). 매 tick마다 view refresh X — 5분 단위 cron으로 충분.

**엔드포인트 (예시)**:

- `GET /leaderboard?season=2026-06` → Top 100 + 본인 등수
- `GET /leaderboard/me` → 본인 시즌별 history
- `PATCH /profiles/me` → `nickname`, `show_on_leaderboard`, `show_holdings` 토글
- `POST /seasons/rollover` (cron 전용) → 매월 1일 새 `accounts` row 생성

**UI**:

- `pages/leaderboard/LeaderboardPage` — Top 100 리스트(닉네임 + 수익률 + 순위)
- 본인 카드: "현재 234등 / 1,021명 중, 수익률 +12.3%"
- 종목 공개 옵트인 사용자: 상세 진입 시 보유종목 비공개(공개 사용자는 익명화된 비중만 표시)
- 면책 배너 상시 표시: "상금/보상 없음 · 교육 목적"

**위험요소**:
| 위험 | 대응 |
|---|---|
| 위험 추구 행동 유도 | 수익률(%) 단일 기준 + 시즌제 + 보상 없음 명시 |
| 신규 가입자 위축 | 월 단위 시즌 리셋, "신규 시즌까지 N일" 카운트다운 |
| 법적/규제 리스크 | 닫힌 베타 + 보상 X + 면책 문구 + 본인 확인 절차 X(가입은 화이트리스트로 충분) |
| 프라이버시 | 본명 X, 옵트인 디폴트 false, 보유종목 별도 토글 |
| 시즌 롤오버 정합성 | cron 실패 대비: 매월 1일 첫 tick 처리 시 active season 검증 후 누락분 생성 |

**개발 분량 추정**: 약 1~1.5주 (W8 후반 — W8 과적재 리스크는 K절 참조).

### 2단계 (AI 분석)

- `POST /ai/analyze/:symbol` (OpenAI/Anthropic API 프록시)
- 입력: 최근 일/분봉 + 뉴스(네이버 뉴스 또는 KIS 뉴스)
- 출력: 기술적 지표 해석, 뉴스 요약, **면책 문구 필수**
- `rate_limits` 테이블로 일일 호출 한도

## J. 검증/테스트

**E2E 시나리오 (1단계 완료 정의)**:

1. 신규 가입 → 가상현금 1억 KRW seed 확인
2. 005930 검색 → 상세 진입 → 캔들 + 실시간 현재가 1초 내 갱신
3. **시장가** 10주 매수 → 보유종목 표시, avg_price = 체결가, cash 감소
4. 동일 종목 추가 시장가 10주 매수 → 평단가 가중평균 정확 재계산
5. 시장가 5주 매도 → 잔량 15주, cash 증가, 거래내역 BUY×2/SELL×1
6. **지정가** 매수: 현재가보다 낮은 가격에 10주 지정가 등록 → `pending_orders` OPEN 확인
7. 지정가 매수 자동 체결: 시세가 지정가 도달 → 자동 체결 + `trades` 추가 + `pending_orders.status='FILLED'`
8. 지정가 취소: OPEN 상태 주문 취소 → `status='CANCELLED'`, 매처 메모리에서 제거

**단위 테스트 (Jest)**:

- `trade.service.spec.ts`: 평단가 재계산 4케이스 (초기/추가매수/일부매도/전량매도)
- `limit-matcher.service.spec.ts`: LIMIT 매칭 4케이스 (BUY 가격 하락 도달 / SELL 가격 상승 도달 / 부분 매칭 / 동시 다수 주문 SKIP LOCKED)
- `kis-token.cache.spec.ts`: 만료 10분 전 갱신
- DB 함수: Supabase local + service_role 키로 트랜잭션 시나리오

## K. 위험요소 & 미해결

| 위험                                 | 대응                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| KIS WS 동시 41개 제한                | ~10명까지 안전. 50명 임계 — LRU 우선 해제                                                                                        |
| KIS REST 한도 (모의 2/s, 실전 20/s)  | 활성 심볼은 WS tick 마지막값 캐시 → REST 스킵                                                                                    |
| RN 백그라운드 WS 끊김(iOS 30s)       | `AppState` active 복귀 시 재연결 + 재구독                                                                                        |
| 상장/폐지/티커 변경                  | 일일 sync에서 `is_active=false`, 보유분 표시만 허용 매수 차단                                                                    |
| LIMIT 매칭 동시성                    | `FOR UPDATE SKIP LOCKED` + symbol별 메모리 인덱스. 부팅 시 OPEN 재로드                                                           |
| LIMIT 매칭 누락 (NestJS 다운)        | OPEN 주문은 DB가 정답 — 재기동 시 메모리 인덱스 재구성. tick 못 받은 동안 도달한 가격은 다음 tick에서 즉시 체결 검증             |
| LIMIT 무한 적체 (취소되지 않은 OPEN) | MVP는 만료 없음. W8+ 일일 만료 cron 검토(예: 30일 후 자동 취소)                                                                  |
| 개인정보처리방침                     | Notion 공개 페이지 1장 (TestFlight 심사용 필수)                                                                                  |
| 시세 데이터 라이선스                 | 베타 참가자 사전 고지, 외부 공개 시 재검토                                                                                       |
| 향후 web 확장 시 platform 분기       | RN-only 코드를 `apps/mobile/src/shared/lib/`에만 두고, entity/feature/widget 비즈니스 코드는 platform-agnostic 유지              |
| 로고 상표권/라이선스                 | 닫힌 베타 장식 사용 한정. 공개 데모/배포 전 재검토                                                                               |
| 무료 FX API 신뢰성/요율              | 캐시 TTL + 폴백 환율(최근값) + 장애 시 환전 일시 비활성                                                                          |
| 시장 리스트 실시간 cap               | KIS 41 구독/모의 2 req/s — 가시 영역만 실시간, 나머지 스냅샷. UX 기대치 관리                                                     |
| W8 과적재                            | 랭킹+설정+계정삭제+EAS+TestFlight 동시 → 분할 또는 일부 폴리시 후순위 가능                                                       |
| OTA 네이티브 경계 오인               | EAS Update는 JS/에셋만 — 네이티브 변경을 OTA로 내보내면 구버전 크래시. `runtimeVersion` 정책 준수, 네이티브 변경 시 새 빌드 강제 |
| 푸시 알림 인프라                     | Expo push token + 서버 발송 미착수(post-MVP). 설정엔 자리만                                                                      |

## Critical Files

- `/Users/mz01-zenghyun/Documents/Tickr/.claude/rules/*.md` — 코딩 규칙 (FSD, queryOptions, 토큰, 체결 RPC 등)
- `/Users/mz01-zenghyun/Documents/Tickr/packages/shared/src/ws-protocol.ts` — WS 프로토콜 단일 출처
- `/Users/mz01-zenghyun/Documents/Tickr/apps/api/src/trade/trade.service.ts` — 체결 진입점 (MARKET 즉시 체결, LIMIT 등록)
- `/Users/mz01-zenghyun/Documents/Tickr/apps/api/src/trade/limit-matcher.service.ts` — LIMIT 매칭(tick 수신 시)
- `/Users/mz01-zenghyun/Documents/Tickr/apps/api/src/kis/kis-ws.client.ts` — KIS WS 단일 연결
- `/Users/mz01-zenghyun/Documents/Tickr/apps/api/src/ws/ws.gateway.ts` — fan-out Hub
- `/Users/mz01-zenghyun/Documents/Tickr/apps/mobile/src/shared/lib/ws/useTickStream.ts` — 클라이언트 구독 hook (FSD shared)
- `/Users/mz01-zenghyun/Documents/Tickr/apps/mobile/tailwind.config.js` — NativeWind 디자인 토큰
- `/Users/mz01-zenghyun/Documents/Tickr/supabase/migrations/0001_init.sql` — 테이블(`accounts/holdings/trades/pending_orders/...`) + RLS + `execute_trade()` 함수
- `apps/mobile/app/(tabs)/_layout.tsx` — 하단 3탭 셸 + 공용 헤더(검색·설정 아이콘)
- `apps/mobile/src/widgets/app-header/` — 헤더 우측 검색🔍·설정☰ 진입
- `apps/mobile/src/widgets/login-logo-marquee/` — 로그인 floating 로고 배경(reanimated, RN-only 격리)
- `apps/mobile/assets/logos/` — 정적 로고 에셋(로그인 배경·보유/시장 행 아이콘 공유 단일 출처)
- `apps/mobile/src/features/exchange-currency/` — 환전 mutation + 시트
- `apps/api/src/fx/` — `FxRateService` + `execute_fx_trade` RPC 경유(`POST /fx-trades`)
- `apps/mobile/src/pages/{market,leaderboard,settings,search,symbol,onboarding}/` — 시장·랭킹·설정·검색·종목상세·온보딩 페이지
- `apps/mobile/src/features/toggle-watchlist/` — ★ 관심 추가/해제(`watchlist` 테이블)
- `apps/mobile/src/widgets/{price-chart,order-sheet}/` — 종목 상세 차트·매수/매도 시트

## 첫날 시작 순서 (Quick Start)

1. **KIS Developer 신청 먼저** (승인 1~2일, 병렬로 진행)
2. `pnpm create turbo@latest tickr` → `apps/mobile`, `apps/api`, `packages/shared` 구성
3. `pnpm create expo apps/mobile` (with-router 템플릿) + `nest new apps/api`
4. Supabase 프로젝트 생성 → SQL Editor에서 B절 테이블 + RLS + `execute_trade()` 함수 적용
5. `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_JWT_SECRET`, `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL`
6. mobile에서 `supabase.auth.getSession()` 확인, api `GET /health` 호출 → W1 종료
