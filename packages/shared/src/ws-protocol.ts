import { z } from 'zod';

// ─── Client → Server ─────────────────────────────────────
export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscribe'),
    symbols: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    symbols: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal('ping'),
  }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// ─── Server → Client ─────────────────────────────────────
export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tick'),
    symbol: z.string(),
    price: z.number(),
    ts: z.number(),
  }),
  z.object({
    type: z.literal('pong'),
  }),
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
  }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;
