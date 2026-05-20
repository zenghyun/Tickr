// API 표준 에러 응답 (apps/api → mobile)
import { z } from 'zod';
import { tradeErrorCodeSchema } from './enums';

// 일반 에러 응답
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// 체결 에러 응답 — code 필드를 enum으로 좁힘
export const tradeErrorSchema = apiErrorSchema.extend({
  code: tradeErrorCodeSchema,
});
export type TradeError = z.infer<typeof tradeErrorSchema>;
