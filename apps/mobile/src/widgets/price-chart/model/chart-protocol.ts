// RN ↔ WebView 차트 메시지 프로토콜 (widget 내부 전용 — cross-app 아님 → @tickr/shared 아님).
import type { Candle } from '@tickr/shared';

// WebView 내 LWC에 주입할 색상(토큰 hex). NativeWind는 WebView 안에서 동작 안 함.
export interface ChartTheme {
  background: string;
  text: string;
  grid: string;
  up: string;
  down: string;
}

// RN → WebView
export type HostToChart =
  | { type: 'setData'; candles: Candle[] }
  | { type: 'setTheme'; theme: ChartTheme };

// WebView → RN (LWC init 완료 신호만)
export type ChartToHost = { type: 'ready' };
