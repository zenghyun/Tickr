# Rule: 매매 체결은 `execute_trade` RPC 단일 진입

체결 로직은 **Postgres plpgsql 함수 `execute_trade()` 안에서만** 트랜잭션으로 수행한다.

## 흐름

```
[mobile] 사용자 입력
   ↓ POST /trades { symbol, side, quantity, orderType, price? }
[apps/api TradeController]
   → KisRestService.getQuote(symbol)    // MARKET일 때만 실제 사용
   → supabase.rpc('execute_trade', { ... })
   ↓ 단일 트랜잭션
[Postgres execute_trade()]
   LOCK accounts FOR UPDATE
   BUY  → cash >= amount? → cash -= amount, holdings upsert
                            new_avg = (old_avg*old_qty + price*qty) / (old_qty+qty)
   SELL → holdings.qty >= qty? → cash += amount
                                 qty == sell → DELETE holding
                                 else        → qty -= sell (avg_price 유지)
   INSERT trades (order_type, price, ...)
   RETURN updated holding + account
```

## 금지 (위반 시 무조건 리뷰 반려)

1. NestJS에서 `accounts`/`holdings`/`trades` 테이블을 **직접** insert/update/delete.
2. `BEGIN/COMMIT`을 NestJS 코드에서 흉내내기. `@supabase/supabase-js`는 트랜잭션 지원 안 함.
3. 모바일에서 `anon key`로 위 테이블 mutation. **모바일은 read-only** (RLS select만 허용).
4. 매수/매도 검증을 NestJS service에 분기 처리. 모든 검증은 plpgsql 내부.

## 시장가 / 지정가

### MARKET (시장가)
- `TradeController`가 즉시 `KisRestService.getQuote(symbol)`로 가격 조회.
- 실패 시 502 `QUOTE_UNAVAILABLE`.
- `execute_trade(..., p_price := <quote>)` 호출 → 즉시 체결 → `trades` insert (`order_type='MARKET'`).

### LIMIT (지정가)
- 즉시 체결하지 않음. `pending_orders` 테이블에 insert:
  ```
  pending_orders(id, user_id, symbol, side, quantity, limit_price,
                 created_at, status='OPEN')
  ```
- WS Hub가 tick 수신 시: `pending_orders WHERE status='OPEN' AND symbol=?`을 메모리 인덱스로 갖고 있다가,
  - BUY: `tick.price <= limit_price` 도달 시 `execute_trade(..., p_price := tick.price)` 호출 → 체결 → `pending_orders.status='FILLED'`
  - SELL: `tick.price >= limit_price`
- 사용자가 취소: `DELETE FROM pending_orders WHERE id=? AND user_id=? AND status='OPEN'` (RLS로 자기 것만)

### LIMIT 매칭 동시성

- `pending_orders` row 잠금: `FOR UPDATE SKIP LOCKED` 사용 (여러 tick이 동시에 같은 주문 체결하는 경합 방지)
- 매칭 결정은 NestJS 안에서 (메모리 인덱스 + 검사), 실행은 plpgsql 트랜잭션에서.

## RPC 시그니처 (예시)

```sql
create or replace function public.execute_trade(
  p_user_id     uuid,
  p_symbol      text,
  p_side        text,         -- 'BUY' | 'SELL'
  p_quantity    numeric,
  p_price       numeric,
  p_order_type  text,         -- 'MARKET' | 'LIMIT'
  p_pending_id  uuid default null  -- LIMIT 체결 시 원본 주문 id
) returns jsonb
language plpgsql security definer
...
```

`security definer` + `service_role` 호출. 함수 내부에서 `p_user_id`로 RLS와 동등한 검증 수행.

## 에러 코드 (apps/api → 모바일)

| 코드 | HTTP | 의미 |
|---|---|---|
| `INSUFFICIENT_CASH` | 400 | 잔고 부족 |
| `INSUFFICIENT_QTY` | 400 | 보유 수량 부족 |
| `QUOTE_UNAVAILABLE` | 502 | KIS 시세 조회 실패 (MARKET) |
| `SYMBOL_INACTIVE` | 400 | 상장폐지 종목 매수 시도 |
| `PRICE_INVALID` | 400 | LIMIT 가격이 비정상 (음수/0/극단치) |
| `ORDER_NOT_FOUND` | 404 | 취소 요청한 pending_order가 없음 |

## RLS

- `accounts`/`holdings`/`trades`/`pending_orders` 모두 RLS ENABLE.
- 모바일은 `select`만 허용. mutation은 service_role (NestJS) 경유 RPC만.

## 이유

- 잔고 일관성: 동시 매매 race를 단일 트랜잭션으로 보장.
- 검증 로직 1곳: NestJS + plpgsql 양쪽에 분산되면 결국 어긋난다.
- RLS는 모바일 키 탈취 시 마지막 방어선.

## 참고
- [docs/PLAN.md](../../docs/PLAN.md) F절·G절 — 매매/실시간 시세 fan-out
- [rules/kr-finance.md](./kr-finance.md) — MARKET/LIMIT UI 컨벤션
