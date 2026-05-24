// 로고 매니페스트 공통 타입.
// shared/lib/logo는 도메인 무지 프리미티브 — `entities/symbol` 행 아이콘과 로그인 마키 위젯 양쪽이 공유한다.
// 정적 PNG 매니페스트(apps/mobile/assets/logos)로 즉시 표시 — 네트워크 없이 첫 프레임부터 로고 노출.

/**
 * 정규화된 심볼 식별자 (Finnhub/FMP 형식).
 * - KR: 6자리 코드 + `.KS` (코스피) / `.KQ` (코스닥). 예: '005930.KS'
 * - US: 대문자 ticker. 예: 'AAPL', 'BRK.B'
 */
export type LogoSymbol = string;

/**
 * 정적 require 결과(number) 또는 원격 URL({uri}). expo-image source prop과 호환.
 * 마키는 항상 정적 require, 향후 entities/symbol 행 아이콘에서 동적 URL도 사용 가능.
 */
export type LogoSource = number | { uri: string };

export interface LogoFallbackProps {
  symbol: LogoSymbol;
  /** 정사각 px. 기본 48. */
  size?: number;
  className?: string;
}
