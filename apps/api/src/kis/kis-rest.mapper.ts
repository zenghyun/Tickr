// KIS REST raw 응답 → shared 도메인 타입(Quote/Candle) 매핑.
//
// symbols.mapper 패턴 동일: unknown 입력 + zod parse로 fail-fast.
// KIS는 모든 수치를 문자열로 반환(`"72400"`) → Number 변환 후 도메인 스키마로 재검증.
// rt_cd !== '0'(실패) 또는 shape drift 시 throw — 호출측(QuoteService)이 502로 정규화.
//
// 단위 규약:
// - Quote.ts  = epoch **ms** (KIS 현재가에 체결 ts 없음 → 수신 시각 Date.now())
// - Candle.time = epoch **s** (TradingView 호환). 일봉=UTC 자정, 분봉=KST→UTC 환산.
// - 정렬: KIS는 최신→과거 순으로 반환 → 항상 오름차순(과거→최신)으로 뒤집어 반환.
import { z } from 'zod';
import {
  quoteSchema,
  candleSchema,
  type Quote,
  type Candle,
} from '@tickr/shared';

const KST_OFFSET_SEC = 9 * 60 * 60;

/** KIS 응답 공통 envelope — rt_cd만 우선 확인(실패 시 output이 비어있을 수 있음). */
const envelopeSchema = z.object({ rt_cd: z.string() }).passthrough();

function assertOk(response: unknown, context: string): void {
  const env = envelopeSchema.parse(response);
  if (env.rt_cd !== '0') {
    throw new Error(`KIS ${context} rt_cd=${env.rt_cd}`);
  }
}

// -------------------------------------------------------------------------
// 현재가 (FHKST01010100)
// -------------------------------------------------------------------------
const quoteResponseSchema = z.object({
  output: z
    .object({
      stck_prpr: z.string(), // 현재가
      stck_sdpr: z.string(), // 기준가(=전일 종가). inquire-price에 stck_prdy_clpr 없음 — 라이브 확인.
      acml_vol: z.string(), // 누적 거래량
    })
    .passthrough(),
});

export function toQuote(symbol: string, response: unknown): Quote {
  assertOk(response, 'quote');
  const { output } = quoteResponseSchema.parse(response);

  const price = Number(output.stck_prpr);
  const prevClose = Number(output.stck_sdpr);
  // delta/ratio는 KIS의 부호 코드(prdy_vrss_sign) 파싱 대신 직접 계산 — 부호 모호성 제거.
  const delta = price - prevClose;
  const ratio = prevClose !== 0 ? delta / prevClose : 0;

  return quoteSchema.parse({
    symbol,
    price,
    prevClose,
    delta,
    ratio,
    volume: toIntVolume(output.acml_vol),
    ts: Date.now(),
  });
}

// -------------------------------------------------------------------------
// 일봉 (FHKST03010100) — output2 최신순
// -------------------------------------------------------------------------
const dailyItemSchema = z.object({
  stck_bsop_date: z.string(), // YYYYMMDD (KST)
  stck_clpr: z.string(), // 종가
  stck_oprc: z.string(), // 시가
  stck_hgpr: z.string(), // 고가
  stck_lwpr: z.string(), // 저가
  acml_vol: z.string(), // 거래량
});
const dailyResponseSchema = z.object({ output2: z.array(z.unknown()) });

export function toDailyCandles(response: unknown, limit: number): Candle[] {
  assertOk(response, 'daily candles');
  const { output2 } = dailyResponseSchema.parse(response);

  const candles: Candle[] = [];
  for (const raw of output2) {
    const r = dailyItemSchema.safeParse(raw);
    // KIS는 빈 패딩 row(빈 날짜)를 섞어 보낼 수 있음 → 스킵.
    if (!r.success || r.data.stck_bsop_date.trim() === '') continue;
    candles.push(
      candleSchema.parse({
        time: dailyDateToEpochSec(r.data.stck_bsop_date),
        open: Number(r.data.stck_oprc),
        high: Number(r.data.stck_hgpr),
        low: Number(r.data.stck_lwpr),
        close: Number(r.data.stck_clpr),
        volume: toIntVolume(r.data.acml_vol),
      }),
    );
  }
  return finalize(candles, limit);
}

// -------------------------------------------------------------------------
// 분봉 (FHKST03010200) — output2 최신순. close=stck_prpr, volume=cntg_vol.
// 1회 호출당 최대 ~30건(당일) — 더 깊은 이력 페이지네이션은 후속.
// -------------------------------------------------------------------------
const minuteItemSchema = z.object({
  stck_bsop_date: z.string(), // YYYYMMDD (KST)
  stck_cntg_hour: z.string(), // HHMMSS (KST)
  stck_prpr: z.string(), // 해당 분 종가(현재가)
  stck_oprc: z.string(),
  stck_hgpr: z.string(),
  stck_lwpr: z.string(),
  cntg_vol: z.string(), // 체결 거래량
});
const minuteResponseSchema = z.object({ output2: z.array(z.unknown()) });

export function toMinuteCandles(response: unknown, limit: number): Candle[] {
  assertOk(response, 'minute candles');
  const { output2 } = minuteResponseSchema.parse(response);

  const candles: Candle[] = [];
  for (const raw of output2) {
    const r = minuteItemSchema.safeParse(raw);
    if (!r.success || r.data.stck_cntg_hour.trim() === '') continue;
    candles.push(
      candleSchema.parse({
        time: minuteToEpochSec(r.data.stck_bsop_date, r.data.stck_cntg_hour),
        open: Number(r.data.stck_oprc),
        high: Number(r.data.stck_hgpr),
        low: Number(r.data.stck_lwpr),
        close: Number(r.data.stck_prpr),
        volume: toIntVolume(r.data.cntg_vol),
      }),
    );
  }
  return finalize(candles, limit);
}

// -------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------

/** 거래량 문자열 → 음수/소수 방지된 정수(candleSchema의 int nonnegative 통과). */
function toIntVolume(raw: string): number {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** YYYYMMDD(KST 날짜) → 해당 일의 UTC 자정 epoch s. TradingView 일봉 규약. */
function dailyDateToEpochSec(yyyymmdd: string): number {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  return Math.trunc(Date.UTC(year, month - 1, day) / 1000);
}

/** YYYYMMDD + HHMMSS(KST) → epoch s. KST(UTC+9) → UTC 환산. */
function minuteToEpochSec(yyyymmdd: string, hhmmss: string): number {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6));
  const day = Number(yyyymmdd.slice(6, 8));
  const hour = Number(hhmmss.slice(0, 2));
  const min = Number(hhmmss.slice(2, 4));
  const sec = Number(hhmmss.slice(4, 6));
  // Date.UTC가 KST 값을 UTC로 해석 → 9시간 빼서 실제 UTC epoch 보정.
  return (
    Math.trunc(Date.UTC(year, month - 1, day, hour, min, sec) / 1000) -
    KST_OFFSET_SEC
  );
}

/** 오름차순 정렬 후 최신 `limit`건만 반환(time 기준). */
function finalize(candles: Candle[], limit: number): Candle[] {
  const sorted = candles.sort((a, b) => a.time - b.time);
  return sorted.length > limit ? sorted.slice(-limit) : sorted;
}
