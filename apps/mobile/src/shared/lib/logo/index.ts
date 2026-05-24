// shared/lib/logo public API
// 로고 매니페스트와 fallback 프리미티브 — 마키 위젯·entities/symbol 행 아이콘이 공유한다.
export { LOGO_SOURCES, MARQUEE_LOGO_SET, getLogo, seedOpacity } from './logo-manifest';
export { LogoFallback } from './LogoFallback';
export type { LogoSymbol, LogoSource, LogoFallbackProps } from './types';
