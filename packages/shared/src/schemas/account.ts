// 계좌(account) 도메인 스키마 — 모의투자 가상 잔고 (다국 통화)
// DB 컬럼명과 일치: accounts(user_id, cash_balance_krw, cash_balance_usd, updated_at)
// snake_case → camelCase 매핑은 NestJS service에서 수행.
//
// 통화별 잔고는 컬럼 분리 (cash_balance_krw / cash_balance_usd).
// 신규 통화 추가는 컬럼 추가 + 본 스키마 갱신.
// 환전은 별도 fx_trades 도메인.
import { z } from 'zod';

export const accountSchema = z.object({
  userId: z.string().uuid(),
  cashBalanceKrw: z.number().nonnegative(), // DB: cash_balance_krw
  cashBalanceUsd: z.number().nonnegative(), // DB: cash_balance_usd
  updatedAt: z.string(),                    // ISO timestamp
});
export type Account = z.infer<typeof accountSchema>;
