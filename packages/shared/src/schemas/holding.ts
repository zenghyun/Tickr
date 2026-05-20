// 보유종목(holding) 도메인 스키마
import { z } from 'zod';

export const holdingSchema = z.object({
  userId: z.string().uuid(),
  symbol: z.string(),
  quantity: z.number().nonnegative(),
  avgPrice: z.number().nonnegative(),  // 평균 매수가
  updatedAt: z.string(),
});
export type Holding = z.infer<typeof holdingSchema>;

// 평가 정보 (현재가 결합) — 서버가 응답에 같이 실어줄 수 있음
export const holdingWithValuationSchema = holdingSchema.extend({
  currentPrice: z.number().nullable(),
  marketValue: z.number().nullable(),  // currentPrice * quantity
  unrealizedPl: z.number().nullable(), // marketValue - (avgPrice * quantity)
  unrealizedPlRatio: z.number().nullable(),
});
export type HoldingWithValuation = z.infer<typeof holdingWithValuationSchema>;
