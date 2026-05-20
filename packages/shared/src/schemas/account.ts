// 계좌(account) 도메인 스키마 — 모의투자 가상 잔고
import { z } from 'zod';
import { currencySchema } from '../enums';

export const accountSchema = z.object({
  userId: z.string().uuid(),
  cash: z.number().nonnegative(),  // 현금 잔고
  currency: currencySchema,        // 베타는 KRW 단일
  updatedAt: z.string(),           // ISO timestamp
});
export type Account = z.infer<typeof accountSchema>;
