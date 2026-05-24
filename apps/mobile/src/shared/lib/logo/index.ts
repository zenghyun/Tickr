// shared/lib/logo public API.
// 정적 PNG 매니페스트와 fallback 프리미티브 — 마키 위젯·향후 entities/symbol 행 아이콘 공통 사용.
export { getLogo, LOGO_SOURCES, MARQUEE_LOGO_SET, seedOpacity } from './logo-manifest';
export { LogoFallback } from './LogoFallback';
export type { LogoFallbackProps, LogoSource, LogoSymbol } from './types';
