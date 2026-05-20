# Tickr — 프로젝트 컨텍스트

> 이 문서는 **Tickr 고유 컨텍스트**만 다룹니다. 일반 코딩 규칙(언어, 들여쓰기, React Hook 순서, 보안 등)은 `~/.claude/CLAUDE.md`(글로벌)을 따릅니다. 충돌 시 이 문서가 우선.

## 한 줄 소개

한국투자증권(KIS) OpenAPI 기반 **모의투자(가상 포트폴리오) 모바일 앱**. 개발자(운영자) KIS 키 1개로 모든 사용자에게 실시간 시세를 fan-out하고, 매매는 자체 가상 잔고로 처리. **닫힌 베타** (TestFlight + Android Internal Track). **앱 우선이지만 향후 `apps/web` 확장 계획 있음** — 모든 설계에서 RN-only API는 격리, 도메인 타입/스키마는 `@tickr/shared`에.

## Rules 디렉터리 (최우선 참조)

파일 작성/수정 시 항상 `.claude/rules/`의 규칙을 먼저 읽고 따른다. 우선순위:
1. `.claude/rules/*.md` ← **최우선**
2. 이 `CLAUDE.md`
3. `.claude/agents/*.md`
4. 글로벌 `~/.claude/CLAUDE.md`, `~/.claude/agents/*.md`

| 규칙 | 적용 시점 |
|---|---|
| [.claude/rules/fsd-structure.md](.claude/rules/fsd-structure.md) | `apps/mobile` 코드 작성/이동 |
| [.claude/rules/react-query.md](.claude/rules/react-query.md) | 서버 상태(query/mutation) |
| [.claude/rules/monorepo-boundary.md](.claude/rules/monorepo-boundary.md) | 모노레포 import / RN-only 격리 |
| [.claude/rules/nativewind-tokens.md](.claude/rules/nativewind-tokens.md) | 모바일 UI |
| [.claude/rules/kr-finance.md](.claude/rules/kr-finance.md) | 가격/등락/주문 UI |
| [.claude/rules/trade-rpc.md](.claude/rules/trade-rpc.md) | 체결/주문 로직 |
| [.claude/rules/naming.md](.claude/rules/naming.md) | 슬라이스/파일/심볼 명명 |

## 절대 잊지 말 것 (Critical Constraints)

- **사용자별 KIS 계좌 없음.** 개발자 KIS 키 1개로 시세를 fan-out. 사용자별 키 발급 코드/UI를 추가하지 말 것.
- **매수/매도 추천 금지.** 1단계는 AI 제외. 2단계 AI 추가 시에도 "정보성 분석"만, 추천은 법적 이슈로 금지. 면책 문구 필수.
- **KIS 키는 서버 전용.** `SUPABASE_SERVICE_ROLE_KEY`, `KIS_APP_SECRET` 같은 비밀키를 `EXPO_PUBLIC_*` 에 넣지 말 것. 클라이언트 번들 노출 = 사고.
- **체결은 Postgres plpgsql `execute_trade()` 단일 트랜잭션.** NestJS에서 `@supabase/supabase-js`로 BEGIN/COMMIT 직접 못 함. 잔고/보유종목 변경은 항상 RPC 경유. 시장가/지정가 모두 동일 RPC, 지정가는 `pending_orders` 매칭 후 호출. **호가창 표시 안 함.** 자세히는 [.claude/rules/trade-rpc.md](.claude/rules/trade-rpc.md)
- **모든 사용자 테이블 RLS ENABLE.** 서버는 `service_role`로 우회하지만 RLS는 안전망이다 — 끄지 말 것.

## 모노레포 구조 (pnpm@10 + turbo)

```
tickr/
├── apps/
│   ├── mobile/        # @tickr/mobile  (Expo + expo-router, 내부 FSD v2)
│   │   ├── app/                  # expo-router 라우트 (얇은 진입점)
│   │   └── src/
│   │       ├── app/              # FSD app (전역 providers)
│   │       ├── pages/            # 라우트 단위 컴포넌트
│   │       ├── widgets/          # 복합 블록
│   │       ├── features/         # 사용자 액션 (동사)
│   │       ├── entities/         # 도메인 객체 (명사) — query/타입/표시 ui
│   │       └── shared/           # FSD shared (ui, lib, api, config) — 모바일 내부
│   └── api/           # @tickr/api     (NestJS 11)
│       └── src/{health,auth,supabase,kis,symbols,quote,trade,ws,...}
├── packages/
│   └── shared/        # @tickr/shared  (모노레포 cross-app: zod 스키마, WS 프로토콜, KIS 타입)
├── docs/
│   ├── PLAN.md            # 전체 구현 계획 (W1~W8) — 의사결정 단일 출처
│   └── SETUP-EXTERNAL.md  # KIS/Supabase/Expo 외부 키 발급 가이드
├── .claude/
│   ├── rules/             # ★ 코딩 규칙 (최우선 참조)
│   ├── agents/            # Tickr 맞춤 에이전트 override (architect, designer, …)
│   └── commands/          # 프로젝트별 스킬 (예정)
└── .env, .env.example     # 모노레포 루트 1개 (apps별로 두지 않음)
```

- **워크스페이스 이름**: `@tickr/mobile`, `@tickr/api`, `@tickr/shared`
- **`@tickr/shared` ≠ FSD `shared`**: 전자는 모노레포 cross-app, 후자는 `apps/mobile` 내부 최하위 레이어. 자세히는 [.claude/rules/monorepo-boundary.md](.claude/rules/monorepo-boundary.md).
- **packages/shared는 빌드 필요**: `pnpm --filter @tickr/shared build` 또는 루트에서 `pnpm build` (turbo가 의존성 순서로 빌드).
- 새 코드 추가 위치 판단:
  - FE·BE가 같이 쓰는 타입/스키마/프로토콜 → `packages/shared/src/`
  - 서버 비즈니스 로직 → `apps/api/src/{도메인}/`
  - 모바일 도메인 객체(query/타입/표시) → `apps/mobile/src/entities/{도메인}/`
  - 모바일 사용자 액션(mutation/form) → `apps/mobile/src/features/{액션}/`
  - 모바일 페이지 컴포넌트 → `apps/mobile/src/pages/{화면}/`
  - 모바일 도메인 무지 프리미티브 → `apps/mobile/src/shared/ui/`

## 스택 (글로벌 규칙과 다른 부분)

| 영역 | Tickr 결정 | 비고 |
|---|---|---|
| 모바일 파일 구조 | **FSD v2** (app/pages/widgets/features/entities/shared) | shadcn 가정의 `src/features/*` 평면 구조 적용 X. 자세히는 [rules/fsd-structure.md](.claude/rules/fsd-structure.md) |
| 모바일 UI | **NativeWind v4 단독**. shadcn/ui 사용 안 함 (Radix DOM 의존, RN에서 동작 X) | 향후 web에 한해 shadcn 검토 가능. RN+Web 공용 라이브러리 필요 시 `gluestack-ui v2` / `tamagui` 후보 |
| 모바일 라우팅 | **expo-router v6** (라우트는 얇게, 로직은 `src/pages/`) | Next App Router 유사 |
| 모바일 상태 | **@tanstack/react-query v5** (`queryOptions` 팩토리 패턴 필수) + **zustand**(꼭 필요할 때) | mobx 사용 안 함. 패턴은 [rules/react-query.md](.claude/rules/react-query.md) |
| 모바일 폼 | **react-hook-form + zod** (`@tickr/shared` 스키마 재사용) | |
| 모바일 차트 | **TradingView Lightweight Charts** (Apache-2.0) + `react-native-webview` | `widgets/price-chart`에 격리(RN-only) |
| 모바일 WS | **native WebSocket** (RN 내장) | `socket.io` 사용 안 함 — 백그라운드 이슈. `shared/lib/ws/`에 격리 |
| 모바일 인증 | `@supabase/supabase-js` + `expo-secure-store` 어댑터 | RN-only API는 `shared/lib/`에 격리 |
| 백엔드 | **NestJS 11** + `ws` + axios + `nestjs-zod` + `@nestjs/schedule` | DI/Guard 학습 곡선 ↓ |
| DB/Auth | **Supabase** (Postgres + RLS + Auth) | service_role은 서버에서만, 체결은 `execute_trade()` RPC 단일 진입 |
| 배포 | **Railway** (NestJS, WS 지속 연결), **Expo EAS** (모바일) | web 확장 시 Vercel/Netlify 검토 |
| 향후 확장 | `apps/web` 추가 가능성 — 도메인 타입은 `@tickr/shared`로 통일, RN-only는 `shared/lib/` 격리해 platform 분기 용이하게 | |

## 환경 컨벤션

### 포트
- **API 기본 포트는 4000** (3000은 다른 프로젝트 Halo Console이 IPv6로 점유 중).
- `.env`의 `API_PORT`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL` 모두 4000 기준 — 한 군데만 바꾸면 깨진다.
- **헬스체크/디버깅 시 `http://127.0.0.1:4000/health`** 사용. `localhost`는 IPv6 우선 선택될 수 있어 `::1`로 가서 false-negative.

### env 변수 분리
- `.env`는 **모노레포 루트 1개**. apps별로 두지 않음.
- `apps/api`는 루트 `.env`를 직접 읽음(NestJS `ConfigModule`).
- `apps/mobile`은 **`EXPO_PUBLIC_` 접두사가 붙은 변수만** 클라이언트 번들에 노출됨. 비밀키 절대 금지.
- 키 목록은 `.env.example` 참조 — 새 키 추가 시 반드시 example도 업데이트.

### KIS 환경 분리
- `KIS_USE_MOCK=true` → `https://openapivts.koreainvestment.com:29443` (모의)
- `KIS_USE_MOCK=false` → `https://openapi.koreainvestment.com:9443` (실전)
- 베타 기간은 **모의 서버** 사용. App Key/Secret도 모의/실전 분리 발급.
- **모의 REST 한도: 2 req/s**, 실전 20 req/s. 활성 심볼은 WS tick 마지막값 캐시로 REST 호출 스킵.

## 자주 쓰는 커맨드

```bash
# 개발 (루트에서)
pnpm dev              # mobile + api 동시 실행
pnpm dev:mobile       # Expo만
pnpm dev:api          # NestJS만 (포트 4000)

# 검증
pnpm typecheck        # 전체 워크스페이스 타입체크
pnpm lint             # 전체 린트
curl http://127.0.0.1:4000/health   # API 헬스 (127.0.0.1 사용)

# packages/shared 변경 시
pnpm --filter @tickr/shared build   # 또는 dev 모드로 watch
```

## 작업 방식

1. **`.claude/rules/`가 코딩 규칙 단일 출처.** 파일 작성 전 관련 rule 먼저 읽기.
2. **PLAN.md가 기능/결정 단일 출처.** 새 결정/스코프 변경 → PLAN.md 먼저 업데이트하고 코드 진행.
3. **로드맵은 W1~W8 주차 단위.** 현재 어디인지 git log + PLAN.md "I. 단계별 로드맵" 표 대조.
4. **외부 의존(KIS/Supabase) 셋업은 PLAN과 병렬로.** KIS 승인 1~2일 소요 — 코드 작업이 막혔다고 기다리지 말 것.
5. **한 세션에 1~2 작업 단위만.** 다음 큰 단계로 자동 진행 금지 — 사용자 확인 후 진행.
6. **기능 구현은 harness 파이프라인.** `/harness plan {ticket}` → PM/Designer/Architect → Gate → Developer/Tester → Reviewer/QA → DevOps.

## 핵심 파일 (생성 예정 포함)

| 경로 | 역할 |
|---|---|
| `docs/PLAN.md` | 전체 구현 계획 (단일 출처) |
| `.claude/rules/*.md` | 코딩 규칙 (FSD/queryOptions/토큰/체결 RPC 등) |
| `packages/shared/src/ws-protocol.ts` | C↔S WebSocket 메시지 타입 단일 출처 |
| `apps/api/src/trade/trade.service.ts` | 체결 진입점 (`POST /trades`) — MARKET 즉시 체결 |
| `apps/api/src/trade/limit-matcher.service.ts` | LIMIT 매칭 (tick 수신 시 가격 도달 검사) |
| `apps/api/src/kis/kis-ws.client.ts` | KIS WS 단일 연결 (재연결/재구독 책임) |
| `apps/api/src/ws/ws.gateway.ts` | fan-out Hub (`SubscriberMap`) |
| `apps/mobile/src/shared/lib/ws/useTickStream.ts` | 클라이언트 구독 hook |
| `apps/mobile/src/entities/{e}/api/{e}.queries.ts` | entity별 queryOptions 팩토리 |
| `apps/mobile/tailwind.config.js` | NativeWind 디자인 토큰 (단일 출처) |
| `supabase/migrations/0001_init.sql` | 테이블(`accounts/holdings/trades/pending_orders/...`) + RLS + `execute_trade()` 함수 |

## Git / PR

- 현재 메인 브랜치는 `master`.
- 주차 단위 브랜치 예: `feat/w1-setup`, `feat/w2-claude-workflow`, …
- 커밋 메시지는 한국어. 트레일러는 글로벌 `<commit_protocol>` 참조 (Constraint/Rejected/Confidence/Scope-risk 등).
- **`git push`는 사용자 명시 요청 시에만.** 임의 push 금지 (글로벌 규칙).

## 법적/컴플라이언스 메모

- 매수/매도 **추천** 기능 일체 금지. 정보성 표시(현재가, 거래량, 기술적 지표 계산값)만 허용.
- 베타 참가자에게 "교육·학습 목적, 실제 투자 아님" 사전 고지.
- 시세 데이터 외부 공개(블로그/공개 데모)는 KIS 약관 재검토 후 결정 — 베타까지는 비공개.
- 개인정보처리방침은 TestFlight 심사 전에 Notion 공개 페이지로 1장 작성 필요 (W8 산출물).
