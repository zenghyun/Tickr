// KIS 토큰 모듈 내부 타입 / 상수.
// KIS REST 응답 타입(`KisTokenResponse`)은 packages/shared/src/kis-types.ts에서 공유.
// 이 파일의 타입(`KisEnv`, `CachedToken`, `KisTokenRow`)은 서버 내부 구현 디테일 —
// FE/Shared 노출 금지 (monorepo-boundary 룰).

/**
 * KIS 환경 식별자.
 * - mock: 모의투자 (openapivts.koreainvestment.com:29443) — 베타 사용
 * - live: 실전     (openapi.koreainvestment.com:9443)    — 향후 사용
 */
export type KisEnv = 'mock' | 'live';

/**
 * KIS REST base URL — KIS_USE_MOCK env에서 파생.
 * env에 두 URL을 동시에 두면 드리프트가 발생하므로 코드 상수로 단일 출처화.
 */
export const KIS_BASE_URL: Readonly<Record<KisEnv, string>> = {
  mock: 'https://openapivts.koreainvestment.com:29443',
  live: 'https://openapi.koreainvestment.com:9443',
} as const;

/**
 * KIS 토큰 발급 요청 payload (KIS 공식 문서 기반).
 * POST /oauth2/tokenP, Content-Type: application/json
 */
export interface KisTokenRequestBody {
  grant_type: 'client_credentials';
  appkey: string;
  appsecret: string;
}

/**
 * 메모리 캐시 엔트리.
 * expiresAt은 KIS `expires_in`(초) 기반으로 계산 — timezone-agnostic.
 * KIS 응답의 `access_token_token_expired`(KST 문자열)는 timezone 함정 회피 위해 사용 안 함.
 */
export interface CachedToken {
  accessToken: string;
  expiresAt: Date;
  updatedAt: Date;
}

/**
 * Supabase select 결과 row 형태 (kis_tokens 테이블).
 * env가 PK이며 ('mock'|'live') CHECK 제약이 있지만, Supabase 응답 시점엔 string으로 옴.
 */
export interface KisTokenRow {
  env: string;
  access_token: string;
  expires_at: string;
  updated_at: string;
}

/**
 * 만료 임박 윈도우 (밀리초).
 * - GET_TOKEN: hot path 마지막 방어선. cron이 실패했거나 콜드 직후 만료 임박일 때만 발화.
 * - CRON:      선제 갱신 윈도우. 정상 운영에선 cron이 hot path를 항상 fresh 유지.
 */
export const TOKEN_WINDOW_MS = {
  GET_TOKEN: 60 * 1000, // 1분
  CRON: 10 * 60 * 1000, // 10분
} as const;

/**
 * KIS expires_in 방어 임계 — 60초 미만이면 비정상으로 간주 throw.
 */
export const KIS_EXPIRES_IN_MIN_SEC = 60;
