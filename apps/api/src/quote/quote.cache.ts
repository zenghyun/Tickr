// 캔들 TTL 캐시 — interval별 만료로 KIS REST 호출(모의 2 req/s) 흡수.
//
// 구현은 외부 의존 없는 in-memory Map (Railway 단일 인스턴스 베타).
// 멀티 인스턴스 스케일아웃 시 CandleCache 인터페이스만 Redis 구현체로 교체 → QuoteService 무변경.
// 캔들은 idempotent + 짧은 TTL이라 재시작 시 유실돼도 무해.
import { Injectable } from '@nestjs/common';
import type { CandleInterval, Candle } from '@tickr/shared';

/** interval별 TTL(ms). 분봉은 자주 갱신, 일봉은 길게. */
const TTL_MS: Record<CandleInterval, number> = {
  '1m': 10_000,
  '1d': 60_000,
};

interface CacheEntry {
  candles: Candle[];
  expiresAt: number;
}

@Injectable()
export class QuoteCache {
  private readonly store = new Map<string, CacheEntry>();

  /** 캐시 hit(미만료) 시 Candle[], 아니면 null. */
  getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number,
  ): Candle[] | null {
    const key = this.key(symbol, interval, limit);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key); // lazy eviction
      return null;
    }
    return entry.candles;
  }

  /** interval별 TTL로 저장. */
  setCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number,
    candles: Candle[],
  ): void {
    this.store.set(this.key(symbol, interval, limit), {
      candles,
      expiresAt: Date.now() + TTL_MS[interval],
    });
  }

  private key(symbol: string, interval: CandleInterval, limit: number): string {
    return `${symbol}:${interval}:${limit}`;
  }
}
