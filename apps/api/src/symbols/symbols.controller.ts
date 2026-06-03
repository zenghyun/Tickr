// 종목 검색·상세 엔드포인트.
// - GET /symbols/search?q=&market?&limit?  — 인증된 사용자, 부분 매치 검색
// - GET /symbols/:symbol                   — 단건 상세 (404 if none)
//
// 인증: JwtSupabaseGuard로 양쪽 라우트 보호. 비인증 → 401.
// Query 검증: ZodValidationPipe + shared symbolSearchQuerySchema.
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  symbolSearchQuerySchema,
  type SymbolDetail,
  type SymbolSearchQuery,
  type SymbolSearchResult,
} from '@tickr/shared';
import { JwtSupabaseGuard } from '../auth/jwt-supabase.guard';
import { ZodValidationPipe } from '../shared/pipes/zod-validation.pipe';
import { SymbolsService } from './symbols.service';

@Controller('symbols')
@UseGuards(JwtSupabaseGuard)
export class SymbolsController {
  constructor(private readonly symbolsService: SymbolsService) {}

  @Get('search')
  search(
    @Query(new ZodValidationPipe(symbolSearchQuerySchema))
    query: SymbolSearchQuery,
  ): Promise<SymbolSearchResult[]> {
    return this.symbolsService.search(query);
  }

  // symbol 파라미터 자체는 zod 검증하지 않음(KR 6자리/US 알파벳·점/특수문자 다양).
  // 존재 여부는 service에서 404로 처리.
  @Get(':symbol')
  detail(@Param('symbol') symbol: string): Promise<SymbolDetail> {
    return this.symbolsService.detail(symbol);
  }
}
