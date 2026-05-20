// 매매(trade) 도메인 스키마
// 체결 진입은 execute_trade RPC 단일 (.claude/rules/trade-rpc.md)
import { z } from 'zod';
import { orderSideSchema, orderTypeSchema } from '../enums';

// 체결 이력
export const tradeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string(),
  side: orderSideSchema,
  orderType: orderTypeSchema,
  quantity: z.number().positive(),
  price: z.number().positive(),
  executedAt: z.string(),          // ISO
});
export type Trade = z.infer<typeof tradeSchema>;

// 체결 요청 본문 (POST /trades)
export const executeTradeBodySchema = z
  .object({
    symbol: z.string().min(1),
    side: orderSideSchema,
    quantity: z.number().positive(),
    orderType: orderTypeSchema,
    price: z.number().positive().optional(),  // LIMIT일 때 필수
  })
  .superRefine((val, ctx) => {
    if (val.orderType === 'LIMIT' && val.price === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'LIMIT 주문은 price가 필수입니다.',
        path: ['price'],
      });
    }
  });
export type ExecuteTradeBody = z.infer<typeof executeTradeBodySchema>;
