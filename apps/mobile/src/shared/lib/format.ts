// 도메인 포매팅 — KR 증권 컨벤션 (.claude/rules/kr-finance.md)
// 가격/등락 표시는 tabular-nums와 함께 사용

import type { Currency } from '@tickr/shared';

const krwFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const krwPlainFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const usdPlainFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * 가격 포매팅. 통화 기호 + 천단위 콤마.
 * KRW: `₩72,400` (정수)
 * USD: `$185.20` (소수 2자리)
 */
export function formatPrice(value: number, currency: Currency): string {
  if (currency === 'KRW') return krwFormatter.format(value);
  return usdFormatter.format(value);
}

/**
 * 통화 기호 없이 숫자만. 입력 필드/리스트 좁은 공간용.
 */
export function formatPriceNumber(value: number, currency: Currency): string {
  if (currency === 'KRW') return krwPlainFormatter.format(value);
  return usdPlainFormatter.format(value);
}

/**
 * 등락 표시. `▲ 1,200 (+1.69%)` / `▼ 1,200 (-1.69%)` / `- 0 (0.00%)`
 * delta: price - prevClose
 * ratio: (price - prevClose) / prevClose  (소수, 0.0169 = +1.69%)
 */
export function formatChange(input: { delta: number; ratio: number; currency?: Currency }): string {
  const { delta, ratio, currency = 'KRW' } = input;
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '-';
  const absDelta = Math.abs(delta);
  const deltaStr = formatPriceNumber(absDelta, currency);
  const sign = ratio > 0 ? '+' : ratio < 0 ? '-' : '';
  const pct = (Math.abs(ratio) * 100).toFixed(2);
  return `${arrow} ${deltaStr} (${sign}${pct}%)`;
}

/**
 * 비율만 단독 표시. `+1.69%` / `-1.69%` / `0.00%`
 */
export function formatPercent(ratio: number, digits = 2): string {
  const sign = ratio > 0 ? '+' : ratio < 0 ? '-' : '';
  const value = (Math.abs(ratio) * 100).toFixed(digits);
  return `${sign}${value}%`;
}

/**
 * 등락 방향 — 색상 토큰 매핑에 사용
 */
export type ChangeDirection = 'up' | 'down' | 'flat';

export function changeDirection(delta: number): ChangeDirection {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

/**
 * 거래량 단축 표기 — `1,234,567` 또는 `1.23M`
 */
export function formatVolume(n: number, opts: { abbreviate?: boolean } = {}): string {
  if (!opts.abbreviate) return krwPlainFormatter.format(n);
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return String(n);
}

/**
 * 수량 — 정수 또는 소수 (US 분수 수량 대비)
 */
export function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return krwPlainFormatter.format(qty);
  return qty.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}
