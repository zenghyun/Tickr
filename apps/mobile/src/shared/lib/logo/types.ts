// 로고 매니페스트 공통 타입
// shared/lib/logo는 도메인 무지 프리미티브 — `entities/symbol` 행 아이콘과 로그인 마키 위젯 양쪽이 공유한다.

/**
 * 정규화된 심볼 식별자.
 * - KR: 6자리 종목코드 문자열 (예: '005930')
 * - US: 소문자 ticker (예: 'aapl', 'brk-b')
 */
export type LogoSymbol = string;

/**
 * `expo-image` Image source 호환 타입.
 * 정적 require 결과는 `number`, 향후 원격 fallback은 `{ uri }`.
 */
export type LogoSource = number | { uri: string };

export interface LogoFallbackProps {
  symbol: LogoSymbol;
  /** 정사각 px. 기본 48. */
  size?: number;
  className?: string;
}
