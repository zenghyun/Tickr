// 종목 검색/상세 비즈니스 로직.
//
// search: PostgREST `/rest/v1/rpc/search_symbols`를 fetch로 직접 호출.
//   (supabase-js의 `.rpc()` 타입 시그니처가 Database generic으로도 안정적 추론
//    되지 않아 raw HTTP로 우회. 응답은 매퍼의 zod로 fail-fast 검증.)
// detail: SupabaseClient의 `.from('symbols').select()` — Database typed.
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  SymbolDetail,
  SymbolSearchQuery,
  SymbolSearchResult,
} from '@tickr/shared';
import type { Env } from '../config/env.validation';
import { SupabaseService } from '../supabase/supabase.service';
import { toDetail, toSearchResult } from './symbols.mapper';

@Injectable()
export class SymbolsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async search(query: SymbolSearchQuery): Promise<SymbolSearchResult[]> {
    const { q, market, limit } = query;

    const url = this.config.get('SUPABASE_URL', { infer: true });
    const key = this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });

    const response = await fetch(`${url}/rest/v1/rpc/search_symbols`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_q: q,
        p_market: market ?? null,
        p_limit: limit,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException({
        message: 'symbol search failed',
        code: 'SYMBOL_SEARCH_FAILED',
        cause: `${response.status} ${body}`,
      });
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      // 정상 응답은 [] 또는 row[]. 비정상이면 빈 결과로 흘려보냄 (이미 200).
      return [];
    }

    // 매퍼가 row 자체를 zod로 parse — DB 컬럼 drift 시 fail-fast.
    return data.map(toSearchResult);
  }

  async detail(symbol: string): Promise<SymbolDetail> {
    const { data, error } = await this.supabase
      .getClient()
      .from('symbols')
      .select(
        'symbol, name_ko, name_en, exchange, market, currency, is_active, listing_date',
      )
      .eq('symbol', symbol)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException({
        message: 'symbol detail failed',
        code: 'SYMBOL_DETAIL_FAILED',
        cause: error.message,
      });
    }

    if (!data) {
      throw new NotFoundException({
        message: `symbol not found: ${symbol}`,
        code: 'SYMBOL_NOT_FOUND',
      });
    }

    // detail은 is_active와 무관하게 200 — 보유 종목 표시(W7) 호환.
    return toDetail(data);
  }
}
