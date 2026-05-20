// 지정가 대기 주문(pending_order) 도메인 스키마
import { z } from 'zod';
import { orderSideSchema, pendingOrderStatusSchema } from '../enums';

export const pendingOrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string(),
  side: orderSideSchema,
  quantity: z.number().positive(),
  limitPrice: z.number().positive(),
  status: pendingOrderStatusSchema,
  createdAt: z.string(),
  filledAt: z.string().nullable().optional(),
});
export type PendingOrder = z.infer<typeof pendingOrderSchema>;
