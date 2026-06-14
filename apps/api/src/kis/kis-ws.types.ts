// KisWsClient 내부 타입/상수 — 서버(apps/api) 전용.
// WS tr_id·tr_key 포맷·백오프 정책은 KIS 실시간 프로토콜 디테일로, FE/Shared 노출 금지
// (monorepo-boundary 룰). tick의 외부 형태(KisWsRawTick)만 @tickr/shared 공유.
import type { KisWsRawTick, Market } from '@tickr/shared';

/**
 * KIS 실시간 체결가 tr_id — 모의/실전 공통.
 * 국내 H0STCNT0 / 해외 HDFSCNT0. (REST의 kis-rest.service TR_ID와 별개 — WS 전용 코드)
 */
export const KIS_WS_TR = {
  domestic: 'H0STCNT0',
  overseas: 'HDFSCNT0',
} as const;

/** 구독 등록/해지 — KIS header.tr_type ('1'=등록, '2'=해지). */
export const KIS_WS_TR_TYPE = {
  register: '1',
  unregister: '2',
} as const;

/** KIS가 보내는 heartbeat tr_id — 수신 시 받은 프레임 그대로 echo. */
export const KIS_WS_PINGPONG = 'PINGPONG';

/**
 * 재연결 지수 백오프 정책 (docs/PLAN.md G절 단일 출처).
 * 1s → 2s → 4s → … → 30s(cap). open 성공 시 attempt 리셋.
 */
export const KIS_WS_BACKOFF = {
  baseMs: 1_000,
  maxMs: 30_000,
  factor: 2,
  jitterRatio: 0.2, // ±20% — 재연결 폭주(thundering herd) 시 KIS 측 보호
} as const;

/**
 * 연결 상태머신.
 * idle → connecting → open → (error/close) → reconnecting → connecting …
 * disconnect()/onModuleDestroy 시 idle.
 */
export type KisWsConnState = 'idle' | 'connecting' | 'open' | 'reconnecting';

/** 구독 단위 — 해외 tr_key 생성을 위해 시장 메타가 필요(KisRestService.KisMarketMeta와 동형). */
export interface KisWsSubscription {
  symbol: string;
  market: Market; // 'KR' | 'US'
  exchange?: string | null; // US: 'NASDAQ' | 'NYSE' | ... — tr_key EXCD 파생
}

/** KisWsClient가 emit하는 이벤트 맵 (typed EventEmitter). */
export interface KisWsClientEvents {
  tick: (tick: KisWsRawTick) => void;
  state: (state: KisWsConnState) => void;
}

// 거래소명 → KIS 해외 EXCD 코드. REST(kis-rest.service)와 동일 매핑(WS도 공통).
const EXCD: Readonly<Record<string, string>> = {
  NASDAQ: 'NAS',
  NYSE: 'NYS',
  AMEX: 'AMS',
};

/**
 * 다음 재연결 대기(ms) — 지수 백오프 + ±jitter, maxMs cap.
 * attempt는 0부터(첫 재시도). Math.random은 테스트에서 spy로 고정 가능.
 */
export function nextBackoffMs(attempt: number): number {
  const { baseMs, maxMs, factor, jitterRatio } = KIS_WS_BACKOFF;
  const raw = Math.min(maxMs, baseMs * factor ** attempt);
  const jitter = raw * jitterRatio * (Math.random() * 2 - 1); // ±jitterRatio
  return Math.max(0, Math.round(raw + jitter));
}

/**
 * 구독 메시지의 tr_id — 시장별 KIS 실시간 체결가 코드.
 */
export function toWsTrId(market: Market): string {
  return market === 'US' ? KIS_WS_TR.overseas : KIS_WS_TR.domestic;
}

/**
 * 구독 메시지의 tr_key.
 * - 국내: 종목코드 그대로 ('005930')
 * - 해외: 'D' + EXCD(3) + 심볼 (NASDAQ AAPL → 'DNASAAPL')
 */
export function toWsTrKey(sub: KisWsSubscription): string {
  if (sub.market !== 'US') return sub.symbol;
  const excd = (sub.exchange && EXCD[sub.exchange]) ?? 'NAS';
  return `D${excd}${sub.symbol}`;
}
