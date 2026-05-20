// 도메인 enum — DB 컬럼/API 페이로드 모두 이 값을 사용
import { z } from 'zod';

// 주문 방향
export const orderSideSchema = z.enum(['BUY', 'SELL']);
export type OrderSide = z.infer<typeof orderSideSchema>;

// 주문 유형
export const orderTypeSchema = z.enum(['MARKET', 'LIMIT']);
export type OrderType = z.infer<typeof orderTypeSchema>;

// 지정가 주문 상태
export const pendingOrderStatusSchema = z.enum(['OPEN', 'FILLED', 'CANCELLED']);
export type PendingOrderStatus = z.infer<typeof pendingOrderStatusSchema>;

// 시장
export const marketSchema = z.enum(['KR', 'US']);
export type Market = z.infer<typeof marketSchema>;

// 통화
export const currencySchema = z.enum(['KRW', 'USD']);
export type Currency = z.infer<typeof currencySchema>;

// 체결 에러 코드 (trade-rpc 규칙과 일치)
export const tradeErrorCodeSchema = z.enum([
  'INSUFFICIENT_CASH',
  'INSUFFICIENT_QTY',
  'QUOTE_UNAVAILABLE',
  'SYMBOL_INACTIVE',
  'PRICE_INVALID',
  'ORDER_NOT_FOUND',
]);
export type TradeErrorCode = z.infer<typeof tradeErrorCodeSchema>;
