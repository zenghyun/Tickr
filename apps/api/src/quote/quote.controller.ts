// 시세 엔드포인트.
// - GET /quote/:symbol                       — 현재가 단건(Quote)
// - GET /quote/:symbol/candles?interval=&limit= — 캔들 배열(Candle[], TradingView 호환)
//
// 인증: JwtSupabaseGuard로 양쪽 보호. 비인증 → 401.
// Query 검증: ZodValidationPipe + shared candleQuerySchema(interval default '1d', limit default 120).
// KIS 실패는 service에서 502 QUOTE_UNAVAILABLE로 정규화.
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  candleQuerySchema,
  type CandleQuery,
  type Candle,
  type Quote,
} from '@tickr/shared';
import { JwtSupabaseGuard } from '../auth/jwt-supabase.guard';
import { ZodValidationPipe } from '../shared/pipes/zod-validation.pipe';
import { QuoteService } from './quote.service';

@Controller('quote')
@UseGuards(JwtSupabaseGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  // symbol은 zod 검증하지 않음(symbols.controller와 동일 정책) — 유효성은 KIS 응답으로 흡수.
  @Get(':symbol')
  getQuote(@Param('symbol') symbol: string): Promise<Quote> {
    return this.quoteService.getQuote(symbol);
  }

  @Get(':symbol/candles')
  getCandles(
    @Param('symbol') symbol: string,
    @Query(new ZodValidationPipe(candleQuerySchema)) query: CandleQuery,
  ): Promise<Candle[]> {
    return this.quoteService.getCandles(symbol, query);
  }
}
