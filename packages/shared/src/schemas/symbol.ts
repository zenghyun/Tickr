// 종목(symbol) 도메인 스키마
//
// DB 컬럼(public.symbols)과 1:1 정합. PLAN.md B절 단일 출처.
// 표시명(display name)은 모바일/서버에서 `nameKo ?? nameEn`으로 매핑 — 헬퍼는 각 app에서.
import { z } from 'zod';
import { marketSchema, currencySchema, exchangeSchema } from '../enums';

// 검색 결과 한 행
// nameKo / nameEn 둘 다 null 가능하지만 최소 하나는 채워야 함(DB CHECK + refine).
// 예: 삼성전자 → nameKo='삼성전자', nameEn='Samsung Electronics'
//     AAPL    → nameKo=null,       nameEn='Apple Inc.'
export const symbolSearchResultSchema = z
  .object({
    symbol: z.string().min(1), // 종목코드 (예: '005930', 'AAPL')
    nameKo: z.string().min(1).nullable(), // 한글명. US 종목은 보통 null.
    nameEn: z.string().min(1).nullable(), // 영문명. KR 종목도 가능하면 채움.
    exchange: exchangeSchema, // KOSPI | KOSDAQ | NASDAQ | NYSE
    market: marketSchema, // KR | US
    currency: currencySchema, // KRW | USD
  })
  .refine((s) => s.nameKo !== null || s.nameEn !== null, {
    message: 'nameKo 또는 nameEn 중 최소 하나는 필수',
    path: ['nameKo'],
  });
export type SymbolSearchResult = z.infer<typeof symbolSearchResultSchema>;

// 종목 상세
// isActive=false 종목은 검색에 노출 안 함(SYMBOL_INACTIVE 매수 차단 — trade-rpc 규칙).
// listingDate는 KIS 마스터 미제공 시 null.
//
// refine된 스키마는 .extend 불가 → 객체 리터럴 + refine 재적용.
export const symbolDetailSchema = z
  .object({
    symbol: z.string().min(1),
    nameKo: z.string().min(1).nullable(),
    nameEn: z.string().min(1).nullable(),
    exchange: exchangeSchema,
    market: marketSchema,
    currency: currencySchema,
    isActive: z.boolean(), // 상장 여부. false=상장폐지.
    listingDate: z.string().nullable(), // 'YYYY-MM-DD' 또는 null. JSON에는 모든 키 존재 — undefined 허용 안 함.
  })
  .refine((s) => s.nameKo !== null || s.nameEn !== null, {
    message: 'nameKo 또는 nameEn 중 최소 하나는 필수',
    path: ['nameKo'],
  });
export type SymbolDetail = z.infer<typeof symbolDetailSchema>;

// 검색 쿼리 (서버 입력)
export const symbolSearchQuerySchema = z.object({
  q: z.string().min(1).max(50),
  market: marketSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SymbolSearchQuery = z.infer<typeof symbolSearchQuerySchema>;

// 표시명 헬퍼 — 한글 우선, 없으면 영문.
// (모바일/서버 양쪽에서 동일 규칙 적용 위해 shared에 둠.)
export function symbolDisplayName(s: Pick<SymbolSearchResult, 'nameKo' | 'nameEn'>): string {
  return s.nameKo ?? s.nameEn ?? '';
}
