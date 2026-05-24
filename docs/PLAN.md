# Tickr — 모의투자 앱 MVP 구현 계획

## Context

FE 개발자(React/Next 경험, RN/BE 경험 없음)가 본인 학습 + 지인 닫힌 베타용으로 만들고자 하는 **모의투자(가상 포트폴리오) 앱**.

**왜 모의투자인가** — 한국에서 실 증권사 계좌 통합(도미노/뱅크샐러드 방식)은 마이데이터 라이선스(자본금 5억+, 금융위 허가)가 필요해 개인 개발자에겐 불가능. 대신 한국투자증권(KIS) Developers OpenAPI를 사용하면 **개발자 본인 키 1개로 모든 사용자에게 실시간 시세 제공이 합법적으로 가능**하므로, 사용자별 증권 계좌 없이도 "실제 시세 기반의 가상 매매" 앱을 만들 수 있다.

**최종 목표** — 사용자가 로그인 → 종목 검색 → 실시간 차트 보기 → 시장가 가상매매 → 보유종목 평가금액이 실시간 시세에 따라 변동되는 흐름을 완전한 모바일 앱으로 제공. 1단계는 핵심 포트폴리오/체결/실시간 시세, 2단계에서 AI 분석(정보성) 추가.

## 확정된 의사결정

| 항목 | 결정 |
|---|---|
| 앱 유형 | 모의투자 (자체 가상 포트폴리오) — **시장가(MARKET) 즉시체결 + 지정가(LIMIT) 자체 매칭**. **호가창 표시 안 함** |
| 매매 모델 | MARKET: 현재가 즉시 체결 / LIMIT: `pending_orders` 등록 → WS tick에서 가격 도달 시 자동 체결 |
| 플랫폼 우선순위 | **앱 우선**, 향후 `apps/web` 확장 계획 (도메인 타입은 `@tickr/shared`에 통일, RN-only는 `shared/lib/` 격리) |
| 시세 데이터 | 한국투자증권 KIS Developers OpenAPI (REST + WebSocket) |
| 사용자별 증권 계좌 | 불필요. 개발자 KIS 키 1개로 전체 서비스 |
| 모바일 | Expo (iOS + Android) |
| 백엔드 | Supabase(Auth+Postgres+RLS) + NestJS 1대 |
| AI | 1단계 제외 → 2단계 정보성 분석만 |
| 배포 | TestFlight + Android Internal Track (닫힌 베타) |
| 언어 | TypeScript 전체 |

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

## B. 데이터 모델 (Supabase Postgres)

| 테이블 | 핵심 컬럼 | RLS |
|---|---|---|
| `profiles` | id(uuid=auth.users.id), email, nickname | select/update: id = auth.uid() |
| `accounts` | id, user_id, currency('KRW'\|'USD'), cash_balance numeric(20,4) | all: user_id = auth.uid() |
| `holdings` | id, user_id, symbol, market('KR'\|'US'), quantity, avg_price, UNIQUE(user_id, symbol) | all: user_id = auth.uid() |
| `trades` | id, user_id, symbol, side('BUY'\|'SELL'), order_type('MARKET'\|'LIMIT'), quantity, price, amount, executed_at, pending_order_id(nullable) | select/insert만, update/delete 금지 |
| `pending_orders` | id, user_id, symbol, side, quantity, limit_price, status('OPEN'\|'FILLED'\|'CANCELLED'), created_at, filled_at | select: user_id = auth.uid(), insert/update/delete는 service_role |
| `watchlist` | id, user_id, symbol, market, UNIQUE(user_id, symbol) | all: user_id = auth.uid() |
| `symbols` | symbol(PK), market, name_ko, name_en, exchange, currency, is_active | select: authenticated, write: service_role |
| `kis_tokens` | id=1(single row), token, expires_at | service_role만 |
| `allowed_emails` | email(PK) | service_role만 (화이트리스트) |

체결/잔고 변경은 모두 NestJS의 `service_role` 키로 트랜잭션 수행. RLS는 안전망.

## C. 디렉터리 구조 (pnpm workspaces + turbo 모노레포)

```
tickr/
├── pnpm-workspace.yaml, turbo.json, .env.example
├── apps/
│   ├── mobile/                          # Expo + expo-router
│   │   ├── app.json, eas.json
│   │   ├── app/
│   │   │   ├── (auth)/login.tsx
│   │   │   ├── (tabs)/index.tsx         # 포트폴리오
│   │   │   ├── (tabs)/search.tsx
│   │   │   ├── (tabs)/history.tsx
│   │   │   └── symbol/[symbol].tsx
│   │   └── src/
│   │       ├── api/        # axios + react-query hooks
│   │       ├── ws/         # useTickStream
│   │       ├── stores/     # zustand
│   │       ├── components/ # Chart, OrderSheet, HoldingRow
│   │       └── lib/supabase.ts
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
- 라우팅: **expo-router v3** (Next App Router 유사 — FE 학습곡선↓)
- 서버 상태: **@tanstack/react-query v5**
- 클라이언트 상태: **zustand**
- 폼: **react-hook-form + zod**
- 차트: **TradingView Lightweight Charts** (Apache-2.0 무료, 금융 차트 표준) + `react-native-webview` 임베드. RN→WebView는 `postMessage`로 WS tick 전달, WebView→RN은 캔들 hover/탭 콜백 정도만. 보조지표(MA/RSI/MACD)는 라이브러리 내장 또는 직접 계산 후 차트 시리즈로 추가
- 스타일: **NativeWind v4 단독으로 시작** (Tailwind 문법 익숙). 컴포넌트가 부족하면 tamagui 추가
- WS: **native WebSocket** (RN 내장, socket.io는 background 이슈)
- 인증: `@supabase/supabase-js` + `expo-secure-store` 어댑터

### 백엔드
- 프레임워크: **NestJS** (DI/Guard가 BE 첫경험자에 친절)
- WS: **`ws` + `@nestjs/platform-ws`** (KIS WS가 raw WS이므로 프로토콜 일치)
- HTTP: **axios + axios-retry** (KIS 401 시 토큰 재발급)
- 검증: **zod + nestjs-zod** (FE와 스키마 공유)
- 캐시: **node-cache + Postgres** (Redis는 MVP에 불필요)
- 스케줄: **@nestjs/schedule** cron (BullMQ 불필요)
- 트랜잭션: **Postgres plpgsql 함수 `execute_trade()`** (Supabase JS는 BEGIN/COMMIT 직접 지원 X)
- Supabase: `@supabase/supabase-js` w/ service_role

### 인프라
- Supabase 무료티어
- NestJS: **Railway** (git push 배포, WS 지속 연결 안정)
- 모바일 배포: Expo EAS Build + Submit

## E. KIS API 통합

**등록 절차 (Day 1~2, 승인까지 1~2일):**
1. KIS Developers 가입 → 모의투자 계좌 개설(인증용)
2. OpenAPI 신청 → App Key/Secret (실전/모의 분리 발급)
3. 첫 토큰: `POST /oauth2/tokenP` → `access_token` (24h)

**토큰 캐싱**: 메모리 우선 → 만료 10분 전 갱신, Postgres `kis_tokens`에 백업 (재시작 대비).

**종목 마스터 동기화**: `@Cron('0 6 * * 1-5')` 평일 06:00 → upsert `symbols` (MVP는 주요 ~3000개).

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

| code | HTTP | 의미 |
|---|---|---|
| `INSUFFICIENT_CASH` | 400 | 잔고 부족 |
| `INSUFFICIENT_QTY` | 400 | 보유 수량 부족 |
| `QUOTE_UNAVAILABLE` | 502 | MARKET 시세 조회 실패 |
| `PRICE_INVALID` | 400 | LIMIT 가격 비정상 |
| `SYMBOL_INACTIVE` | 400 | 상장폐지 종목 매수 시도 |
| `ORDER_NOT_FOUND` | 404 | 취소 대상 pending_order 없음 |

장 마감 검증은 MVP 제외(24/7 매칭). 향후 KR 정규장 외 LIMIT 큐잉은 W7+ 검토.

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

## H. 인증/보안

- 모든 비즈니스 엔드포인트: `@UseGuards(SupabaseJwtGuard)` (`jose`로 `SUPABASE_JWT_SECRET` 검증)
- 모든 사용자 테이블 RLS ENABLE
- KIS 키: Railway secrets만, 클라이언트 번들 절대 금지
- 닫힌 베타: profiles INSERT trigger에서 `auth.email()`이 `allowed_emails`에 없으면 raise

## I. 단계별 로드맵

### 1단계 MVP (총 8주)

| 주 | 산출물 |
|---|---|
| **W1** | pnpm/turbo 모노레포 + Expo·NestJS 빈 부팅 + `packages/shared` 셋업 |
| **W2** | **Claude Code 워크플로(harness 파이프라인) 셋업** — 프로젝트 `CLAUDE.md`, `.claude/agents/`(PM·Designer·Architect·Tester·Reviewer·QA·DevOps Tickr 맞춤 override — **Figma 의존성 제거**, RN/NestJS/모노레포 컨텍스트 주입), `.claude/commands/create-pr.md`·`issue-update.md`(gh CLI/GitHub Issue 기반으로 Jira·Bitbucket 대체), NativeWind 디자인 토큰 정의(상승=빨강/하락=파랑 KR 컨벤션), `.github/`(ISSUE/PR 템플릿·라벨·마일스톤), lefthook pre-commit(typecheck/lint/rules grep). **외부 키 셋업(W3 진입 차단)**: Supabase 베타 전용 프로젝트(`tickr-beta`, Seoul, Free) 생성 + 루트 `.env`에 `EXPO_PUBLIC_*`/`SUPABASE_*` 채움 + `.env.example` 정합화(이슈 #2). **기능 구현은 harness 파이프라인으로 진행**(PM→Designer→Architect→Tester→Reviewer→QA→DevOps). |
| **W3** | Supabase Auth (이메일 + Google) + profiles trigger + mobile (auth) flow + NestJS JWT Guard |
| **W4** | KIS 토큰 캐시 + `/symbols/search` + 마스터 cron + 검색 화면 |
| **W5** | `/quote/:symbol` REST + `/quote/:symbol/candles?interval=D\|1m` + 종목 상세 + TradingView Lightweight Charts 캔들(WebView 임베드) |
| **W6** | NestJS WsGateway + WsHub + KisWsClient + 종목 상세 실시간 갱신 + 동적 구독 |
| **W7** | accounts seed(KRW 1억/USD 100k) + `execute_trade` plpgsql(MARKET/LIMIT 통합) + `pending_orders` 테이블 + `POST /trades`(MARKET/LIMIT 분기) + `DELETE /pending-orders/:id` + LimitMatcherService(WS tick 매칭) + 매수/매도 시트(시장가/지정가 토글) + 보유종목/거래내역/대기주문 |
| **W8** | 합산 평가금액(실시간) + 국내/해외 분리 뷰 + 에러/빈상태 + EAS Build + TestFlight/Internal Track 업로드 + 화이트리스트 |

### W9 후보 (랭킹 / 리더보드) — 1단계 베타 안정화 후 추가

**목표**: 사용자 간 가벼운 경쟁/비교로 retention 강화. 닫힌 베타 안에서만 동작.

**원칙 (반드시 같이 갈 것)**:
- **랭킹 기준은 수익률(%) 단일**. 평가금액 총액은 표시만(정렬 기준 X).
  - 이유: "올인·몰빵" 위험 추구 행동을 줄이고, 추후 시드 충전 정책에도 흔들리지 않음.
- **시즌제(월 단위) 리셋**: 매월 1일 KST 00:00에 새 `accounts` row 생성, 과거 시즌은 archive. 신규 가입자 위축 방지.
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

**개발 분량 추정**: 약 1~1.5주(W9 단독).

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

| 위험 | 대응 |
|---|---|
| KIS WS 동시 41개 제한 | ~10명까지 안전. 50명 임계 — LRU 우선 해제 |
| KIS REST 한도 (모의 2/s, 실전 20/s) | 활성 심볼은 WS tick 마지막값 캐시 → REST 스킵 |
| RN 백그라운드 WS 끊김(iOS 30s) | `AppState` active 복귀 시 재연결 + 재구독 |
| 상장/폐지/티커 변경 | 일일 sync에서 `is_active=false`, 보유분 표시만 허용 매수 차단 |
| LIMIT 매칭 동시성 | `FOR UPDATE SKIP LOCKED` + symbol별 메모리 인덱스. 부팅 시 OPEN 재로드 |
| LIMIT 매칭 누락 (NestJS 다운) | OPEN 주문은 DB가 정답 — 재기동 시 메모리 인덱스 재구성. tick 못 받은 동안 도달한 가격은 다음 tick에서 즉시 체결 검증 |
| LIMIT 무한 적체 (취소되지 않은 OPEN) | MVP는 만료 없음. W8+ 일일 만료 cron 검토(예: 30일 후 자동 취소) |
| 개인정보처리방침 | Notion 공개 페이지 1장 (TestFlight 심사용 필수) |
| 시세 데이터 라이선스 | 베타 참가자 사전 고지, 외부 공개 시 재검토 |
| 향후 web 확장 시 platform 분기 | RN-only 코드를 `apps/mobile/src/shared/lib/`에만 두고, entity/feature/widget 비즈니스 코드는 platform-agnostic 유지 |

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

## 첫날 시작 순서 (Quick Start)

1. **KIS Developer 신청 먼저** (승인 1~2일, 병렬로 진행)
2. `pnpm create turbo@latest tickr` → `apps/mobile`, `apps/api`, `packages/shared` 구성
3. `pnpm create expo apps/mobile` (with-router 템플릿) + `nest new apps/api`
4. Supabase 프로젝트 생성 → SQL Editor에서 B절 테이블 + RLS + `execute_trade()` 함수 적용
5. `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_JWT_SECRET`, `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL`
6. mobile에서 `supabase.auth.getSession()` 확인, api `GET /health` 호출 → W1 종료
