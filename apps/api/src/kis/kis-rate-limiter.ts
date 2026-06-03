// KIS REST 전역 rate-limiter — 호출 시작 시각을 최소 간격으로 띄워 모의 2 req/s 한도 보호.
//
// 문제: 종목 상세 진입 시 getQuote + getCandles가 동시에 KIS를 호출 → 모의 서버가
//       EGW00201('초당 거래건수 초과')로 일부를 502 반환 → 차트/시세 비어 보임.
// 해결: 모든 KIS REST 호출을 본 limiter.run()으로 감싸 시작 시각을 minInterval만큼 이격.
//       (in-flight 동시성은 허용 — 시작 간격만 보장하므로 지연 최소.)
//
// 향후 W6에서 WS tick 마지막값 캐시가 생기면 REST 호출 자체가 줄어 부담이 더 낮아짐.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class KisRateLimiter {
  // 모의 2 req/s → 550ms(~1.8/s) 여유. 실전 20 req/s → 60ms.
  private readonly minIntervalMs: number;
  // 다음 호출이 시작 가능한 가장 이른 시각(epoch ms). 유휴 시 now가 앞서 자가 회복.
  private nextSlotAt = 0;

  constructor(config: ConfigService<Env, true>) {
    const useMock = config.get('KIS_USE_MOCK', { infer: true });
    // 모의 서버는 문서상 2 req/s지만 실측상 ~1 req/s로 더 빡빡 — 1100ms(<1/s)로 안전 이격.
    // 실전 20 req/s → 60ms. 잔여 충돌은 KisRestService의 EGW00201 1회 재시도로 자가복구.
    this.minIntervalMs = useMock ? 1100 : 60;
  }

  /** fn을 rate-limit 슬롯 확보 후 실행. 시작 간격만 보장(실행은 병렬 허용). */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const startAt = Math.max(now, this.nextSlotAt);
    this.nextSlotAt = startAt + this.minIntervalMs;
    const wait = startAt - now;
    if (wait > 0) await delay(wait);
    return fn();
  }
}
