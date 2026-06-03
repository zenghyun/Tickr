// DB row(snake_case) → shared 도메인 타입(camelCase) 매핑.
//
// supabase.rpc()/.from().select()의 반환은 unknown 계열이라 안전한 사용을 위해
// 매퍼가 unknown 입력 + zod parse로 검증 — `as` 단언 / `any` 없이 통과.
// 응답 검증은 DB 컬럼 추가/타입 변경 시 fail-fast.
import { z } from 'zod';
import {
  symbolSearchResultSchema,
  symbolDetailSchema,
  type SymbolSearchResult,
  type SymbolDetail,
} from '@tickr/shared';

// search_symbols RPC 반환 row 형태 (snake_case) — 매퍼 내부 전용.
const searchRowSchema = z.object({
  symbol: z.string(),
  name_ko: z.string().nullable(),
  name_en: z.string().nullable(),
  exchange: z.string(),
  market: z.string(),
  currency: z.string(),
});

// detail용 row — symbols 테이블 select와 1:1.
const detailRowSchema = searchRowSchema.extend({
  is_active: z.boolean(),
  listing_date: z.string().nullable(),
});

export const toSearchResult = (row: unknown): SymbolSearchResult => {
  const r = searchRowSchema.parse(row);
  return symbolSearchResultSchema.parse({
    symbol: r.symbol,
    nameKo: r.name_ko,
    nameEn: r.name_en,
    exchange: r.exchange,
    market: r.market,
    currency: r.currency,
  });
};

export const toDetail = (row: unknown): SymbolDetail => {
  const r = detailRowSchema.parse(row);
  return symbolDetailSchema.parse({
    symbol: r.symbol,
    nameKo: r.name_ko,
    nameEn: r.name_en,
    exchange: r.exchange,
    market: r.market,
    currency: r.currency,
    isActive: r.is_active,
    listingDate: r.listing_date,
  });
};
