// KIS 실시간 WS 프레임 파서 — 순수 함수(네트워크/상태 의존 없음).
//
// KIS WS는 두 종류 프레임을 보낸다:
//  1) 데이터 프레임(체결가): `암호화플래그|tr_id|건수|body` — body는 `^` 구분, 건수만큼 반복.
//     예: `0|H0STCNT0|001|005930^123929^57700^...`
//  2) 제어 프레임(JSON): 구독 ACK(rt_cd) / PINGPONG heartbeat.
//
// 책임: raw 문자열 → 분류(data/system/pingpong) + tick 파싱. emit/소켓은 KisWsClient.
// 인덱스 상수는 이 파일에 단일 출처화 — 회귀는 kis-ws.parser.spec.ts가 차단.
import type { KisWsRawTick } from '@tickr/shared';
import { KIS_WS_PINGPONG, KIS_WS_TR } from './kis-ws.types';

/** 데이터 프레임 필드 인덱스 — tr_id별 symbol/price 위치(KIS 공식 필드 순서). */
const FIELD_IDX: Readonly<Record<string, { symbol: number; price: number }>> = {
  // 국내 체결가 H0STCNT0: [0]MKSC_SHRN_ISCD [1]STCK_CNTG_HOUR [2]STCK_PRPR ...
  [KIS_WS_TR.domestic]: { symbol: 0, price: 2 },
  // 해외 체결가 HDFSCNT0: [0]RSYM [1]SYMB [2]ZDIV ... [11]LAST(현재가)
  [KIS_WS_TR.overseas]: { symbol: 1, price: 11 },
};

const PLAINTEXT_FLAG = '0'; // '1'=암호화(체결통보 등 — 구독 안 함)

export type KisFrame =
  | { kind: 'pingpong'; raw: string }
  | { kind: 'system'; trId: string | null; body: unknown }
  | { kind: 'data'; trId: string; count: number; payload: string };

/**
 * raw 프레임 1차 분류.
 * - `{`로 시작 → JSON 제어 프레임(PINGPONG / 구독 ACK)
 * - 그 외 → `|` 구분 데이터 프레임
 * 형식 불일치는 throw 없이 system으로 흘림(연결 죽이지 않음).
 */
export function parseKisFrame(raw: string): KisFrame {
  const trimmed = raw.trim();

  if (trimmed.startsWith('{')) {
    let body: unknown = null;
    let trId: string | null = null;
    try {
      body = JSON.parse(trimmed);
      trId = extractJsonTrId(body);
    } catch {
      // 깨진 JSON — system으로 분류(무시 대상)
    }
    if (trId === KIS_WS_PINGPONG) return { kind: 'pingpong', raw };
    return { kind: 'system', trId, body };
  }

  const [flag, trId, countStr, payload] = trimmed.split('|');
  if (flag !== PLAINTEXT_FLAG || !trId || payload === undefined) {
    // 암호화 프레임이거나 형식 불일치 — 파싱 대상 아님
    return { kind: 'system', trId: trId ?? null, body: raw };
  }
  const count = Number.parseInt(countStr ?? '1', 10);
  return {
    kind: 'data',
    trId,
    count: Number.isFinite(count) && count > 0 ? count : 1,
    payload,
  };
}

/**
 * 데이터 프레임 → tick 배열. tr_id로 국내/해외 인덱스 분기.
 * 다건(count>1)은 균등 stride로 레코드 분할. 미지 tr_id/비정상 price는 제외.
 */
export function parseTicks(
  frame: Extract<KisFrame, { kind: 'data' }>,
): KisWsRawTick[] {
  const idx = FIELD_IDX[frame.trId];
  if (!idx) return [];

  const fields = frame.payload.split('^');
  const stride = Math.floor(fields.length / frame.count);
  if (stride <= 0) return [];

  const ts = Date.now(); // KIS HHMMSS는 epoch 환산이 불안정 — 수신 시각 사용(REST mapper 규약과 동일)
  const ticks: KisWsRawTick[] = [];
  for (let i = 0; i < frame.count; i++) {
    const base = i * stride;
    const symbol = fields[base + idx.symbol];
    const price = Number.parseFloat(fields[base + idx.price] ?? '');
    if (!symbol || !Number.isFinite(price) || price <= 0) continue;
    ticks.push({ symbol, price, ts });
  }
  return ticks;
}

/** JSON 제어 프레임에서 tr_id 추출 (header.tr_id). 없으면 null. */
function extractJsonTrId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const header = (body as { header?: unknown }).header;
  if (typeof header !== 'object' || header === null) return null;
  const trId = (header as { tr_id?: unknown }).tr_id;
  return typeof trId === 'string' ? trId : null;
}
