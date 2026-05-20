// 시세(quote) 도메인 스키마
import { z } from 'zod';

// 단일 스냅샷
export const quoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),               // 현재가
  prevClose: z.number(),           // 전일 종가
  delta: z.number(),               // price - prevClose
  ratio: z.number(),               // (price - prevClose) / prevClose
  volume: z.number().int().nonnegative(),
  ts: z.number().int(),            // epoch ms
});
export type Quote = z.infer<typeof quoteSchema>;

// 캔들 간격
export const candleIntervalSchema = z.enum(['1m', '5m', '15m', '1h', '1d']);
export type CandleInterval = z.infer<typeof candleIntervalSchema>;

// 단일 캔들
export const candleSchema = z.object({
  time: z.number().int(),          // epoch s — TradingView 호환
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().int().nonnegative(),
});
export type Candle = z.infer<typeof candleSchema>;

// 캔들 쿼리
export const candleQuerySchema = z.object({
  interval: candleIntervalSchema.default('1d'),
  limit: z.coerce.number().int().min(1).max(500).default(120),
});
export type CandleQuery = z.infer<typeof candleQuerySchema>;
