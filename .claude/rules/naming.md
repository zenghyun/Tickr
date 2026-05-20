# Rule: 명명 규칙

## 케이스

| 종류 | 규칙 | 예 |
|---|---|---|
| 변수/함수 | camelCase | `executeTrade`, `currentPrice` |
| 컴포넌트 | PascalCase | `OrderSheet`, `PriceText` |
| 타입/인터페이스 | PascalCase | `TradeBody`, `OrderType` |
| 상수 | UPPER_SNAKE | `MAX_PENDING_ORDERS` |
| 파일(컴포넌트) | PascalCase.tsx | `OrderSheet.tsx` |
| 파일(그 외) | kebab-case.ts | `symbol.queries.ts`, `execute-trade.mutation.ts` |
| 슬라이스 폴더 | kebab-case | `execute-trade`, `symbol-detail` |
| FSD entity | 단수형 | `entities/symbol`, `entities/trade` (X: `symbols`) |
| FSD feature | 동사-목적어 | `execute-trade`, `search-symbols`, `toggle-watchlist` |

## entity vs feature 구분

| 구분 | 기준 | 예 |
|---|---|---|
| entity | **명사** — 데이터 표시·읽기 | `symbol`, `quote`, `holding`, `trade`, `account`, `user` |
| feature | **동사** — 사용자 액션·상태 변경 | `execute-trade`, `search-symbols`, `toggle-watchlist`, `cancel-pending-order` |

판별법: "이게 사용자가 *하는* 행위인가?" → feature. "이게 *보여주는* 것인가?" → entity.

## API 엔드포인트

- 리소스 복수형: `/symbols`, `/trades`, `/holdings`
- 조회: `GET /symbols/search?q=`, `GET /quote/:symbol/candles?interval=`
- 액션: `POST /trades`, `DELETE /pending-orders/:id`

## react-query 키

- 첫 segment = entity 이름 (FSD 슬라이스와 일치)
- `['symbols', 'search', q]`, `['quote', 'detail', symbol]`, `['holdings', 'all']`
- 항상 `as const`

## DB

- 테이블: 복수형 snake_case (`accounts`, `holdings`, `trades`, `pending_orders`, `kis_tokens`)
- 컬럼: snake_case (`user_id`, `executed_at`, `avg_price`)
- 함수: snake_case (`execute_trade`, `match_limit_order`)
- enum: UPPER_SNAKE 문자열 또는 Postgres ENUM 타입

## env 변수

- 서버 전용: 대문자 + 언더스코어, 접두사 없음 (`SUPABASE_SERVICE_ROLE_KEY`, `KIS_APP_KEY`)
- Expo public: `EXPO_PUBLIC_` 접두 필수 (`EXPO_PUBLIC_API_URL`)
- 비밀키에 `EXPO_PUBLIC_` 절대 금지.

## 금지

- 한국어 식별자 (변수/함수/파일명에 한글). 주석은 한국어 OK.
- `data1`, `temp`, `tmp` 같은 무의미 이름.
- 약어 남발 (`usrSrv`, `acntSvc`). 풀어 쓰자(`userService`, `accountService`).
- entity 슬라이스 복수형 (`entities/symbols` X → `entities/symbol`).
