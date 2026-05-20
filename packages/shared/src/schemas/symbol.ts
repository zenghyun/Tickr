// 종목(symbol) 도메인 스키마
import { z } from 'zod';
import { marketSchema, currencySchema } from '../enums';

// 검색 결과 한 행
export const symbolSearchResultSchema = z.object({
  symbol: z.string().min(1),       // 종목코드 (예: '005930', 'AAPL')
  name: z.string().min(1),         // 한글 또는 영문 이름
  market: marketSchema,
  currency: currencySchema,
});
export type SymbolSearchResult = z.infer<typeof symbolSearchResultSchema>;

// 종목 상세
export const symbolDetailSchema = symbolSearchResultSchema.extend({
  isActive: z.boolean(),           // 상장폐지 여부
  listingDate: z.string().nullable().optional(),  // YYYY-MM-DD
});
export type SymbolDetail = z.infer<typeof symbolDetailSchema>;

// 검색 쿼리 (서버 입력)
export const symbolSearchQuerySchema = z.object({
  q: z.string().min(1).max(50),
  market: marketSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SymbolSearchQuery = z.infer<typeof symbolSearchQuerySchema>;
