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
// W5 범위: KIS REST가 직접 제공하는 1분봉(당일)·일봉만 정식 지원.
// 5m/15m/1h는 1분봉 서버 resample이 필요 → 후속 이슈로 분리(차트 UI는 별도 mobile 이슈).
export const candleIntervalSchema = z.enum(['1m', '1d']);
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
