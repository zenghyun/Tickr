// 시세 비즈니스 계층 — 캐시·dedup 정책 + KIS 실패의 502 정규화.
//
// getQuote:   single-flight dedup만(캐시 X). 시세 신선도 우선 — 동일 심볼 동시 요청만
//             KIS 1회로 병합. 향후 W6에서 WS tick 마지막값 캐시를 주입하면 REST 스킵.
// getCandles: interval별 TTL 캐시 + miss 시 dedup. KIS 모의 2 req/s 한도 흡수.
// 실패:       KIS 호출/매핑 throw → 502 QUOTE_UNAVAILABLE(tradeErrorCodeSchema 코드)로 정규화.
//
// 참고: .claude/rules/trade-rpc.md(QUOTE_UNAVAILABLE 출처·MARKET이 getQuote 소비),
//       kis-token.service.ts(single-flight inflight Map 패턴).
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { z } from 'zod';
import type { CandleQuery, Candle, Market, Quote } from '@tickr/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { KisRestService, type KisMarketMeta } from '../kis/kis-rest.service';
import { QuoteCache } from './quote.cache';

// symbols 테이블 조회 row(시장 라우팅용) — never 추론 우회 + 안전 파싱.
const metaRowSchema = z.object({
  market: z.string().nullable(),
  exchange: z.string().nullable(),
});

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  private readonly quoteInflight = new Map<string, Promise<Quote>>();
  private readonly candleInflight = new Map<string, Promise<Candle[]>>();
  // 심볼→시장 메타는 거의 불변 → 프로세스 수명 캐시(매 시세 조회마다 DB 왕복 회피).
  private readonly metaCache = new Map<string, KisMarketMeta>();

  constructor(
    private readonly kisRest: KisRestService,
    private readonly cache: QuoteCache,
    private readonly supabase: SupabaseService,
  ) {}

  async getQuote(symbol: string): Promise<Quote> {
    try {
      const meta = await this.resolveMeta(symbol);
      return await this.dedup(this.quoteInflight, symbol, () =>
        this.kisRest.getQuote(symbol, meta),
      );
    } catch (err) {
      throw this.unavailable('quote', symbol, err);
    }
  }

  async getCandles(symbol: string, query: CandleQuery): Promise<Candle[]> {
    const { interval, limit } = query;

    const cached = this.cache.getCandles(symbol, interval, limit);
    if (cached) return cached;

    const key = `${symbol}:${interval}:${limit}`;
    try {
      const meta = await this.resolveMeta(symbol);
      return await this.dedup(this.candleInflight, key, async () => {
        // 선행 inflight가 방금 캐시를 채웠을 수 있음 → 재확인 후에만 KIS 호출.
        const fresh = this.cache.getCandles(symbol, interval, limit);
        if (fresh) return fresh;

        const candles = await this.kisRest.getCandles(
          symbol,
          interval,
          limit,
          meta,
        );
        this.cache.setCandles(symbol, interval, limit, candles);
        return candles;
      });
    } catch (err) {
      throw this.unavailable('candles', symbol, err);
    }
  }

  // -------------------------------------------------------------------------
  // private
  // -------------------------------------------------------------------------

  /** 심볼의 시장(KR/US)·거래소를 symbols 테이블에서 조회(캐시). 미존재/오류 시 KR로 폴백. */
  private async resolveMeta(symbol: string): Promise<KisMarketMeta> {
    const cached = this.metaCache.get(symbol);
    if (cached) return cached;

    const { data } = await this.supabase
      .getClient()
      .from('symbols')
      .select('market, exchange')
      .eq('symbol', symbol)
      .maybeSingle();

    // supabase-js가 Database generic 미지정 시 row를 never로 추론 → zod로 안전 파싱(symbols.service와 동일 패턴).
    const row = metaRowSchema.safeParse(data);
    const market: Market =
      row.success && row.data.market === 'US' ? 'US' : 'KR';
    const meta: KisMarketMeta = {
      market,
      exchange: row.success ? row.data.exchange : null,
    };
    this.metaCache.set(symbol, meta);
    return meta;
  }

  /** single-flight: 같은 key 동시 호출 시 fn은 1회만 실행되고 결과 공유. */
  private dedup<T>(
    map: Map<string, Promise<T>>,
    key: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const existing = map.get(key);
    if (existing) return existing;

    const promise = fn().finally(() => map.delete(key));
    map.set(key, promise);
    return promise;
  }

  /** KIS 실패 → 502 QUOTE_UNAVAILABLE. 비밀 노출 방지 위해 안전 요약만 로깅. */
  private unavailable(
    kind: 'quote' | 'candles',
    symbol: string,
    err: unknown,
  ): BadGatewayException {
    this.logger.warn(
      `${kind} unavailable: symbol=${symbol} ${this.describe(err)}`,
    );
    return new BadGatewayException({
      message: `quote unavailable for ${symbol}`,
      code: 'QUOTE_UNAVAILABLE',
    });
  }

  /** axios 응답 헤더(appsecret 포함 가능)는 로깅하지 않음 — status/code/message만. */
  private describe(err: unknown): string {
    if (err instanceof AxiosError) {
      return `status=${err.response?.status ?? 'n/a'} code=${err.code ?? 'n/a'}`;
    }
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
