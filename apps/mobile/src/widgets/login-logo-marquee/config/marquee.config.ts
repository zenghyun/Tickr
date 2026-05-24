// 마키 위젯 상수 단일 출처.
// 디자인 수치 변경 시 본 파일만 수정 — ui 코드에 매직넘버 박지 말 것.
// 4행 × 25개 = 100개. 행마다 방향·속도 차이로 자연스러운 시각 분산.

export const MARQUEE = {
  /** 행 개수. ROW_SPECS 길이와 일치해야 함 */
  ROWS: 4,
  /** 행당 로고 수 (MARQUEE_LOGO_SET 길이 / ROWS). 100/4=25 */
  ITEMS_PER_ROW: 25,
  /** 로고 셀 정사각 폭(px) — 흰 원형 컨테이너 외곽. tailwind w-14 (4*14=56) */
  ITEM_SIZE: 56,
  /**
   * 셀 내부 로고 이미지 폭(px). 셀의 71% (40/56). 정사각 이미지의 대각선/2 = 40*1.414/2 ≈ 28.3 < 28(반경)
   * 으로 거의 일치 — `overflow-hidden`이 추가 클리핑을 보장해 사각 PNG의 코너가 원 밖으로 튀어나오는
   * 현상을 막는다. wordmark/사각 박스형 PNG(예: AMEX, Morgan Stanley) 대응.
   */
  LOGO_INNER_SIZE: 40,
  /** 로고 사이 가로 간격(px). tailwind gap-4 */
  ITEM_GAP: 16,
  /** 두 행 사이 세로 간격(px). tailwind gap-6 */
  ROW_GAP: 24,
  /** 컨테이너 회전 각도(deg). 대각선 효과 */
  ROTATION_DEG: -15,
  /** 회전 후 모서리 가리기 위한 화면 폭 배수 (cos15° 보정) */
  CONTAINER_WIDTH_RATIO: 1.6,
  /** 4행 표시 + 회전 후 위아래 빈공간 가리기 위한 화면 높이 배수 */
  CONTAINER_HEIGHT_RATIO: 1.6,
  /** 상하 fade 마스크 영역(px). expo-linear-gradient 도입 시 사용 */
  FADE_HEIGHT: 80,
} as const;

/**
 * 단일 세트(25개)의 가로 픽셀 길이. seamless loop의 translateX 거리 계산용.
 * 행은 [...items, ...items]로 2배 펼치므로 한 주기 = ROW_WIDTH 이동 시 정확히 첫 세트가 두 번째 세트 위치로 이동.
 */
export const ROW_WIDTH = MARQUEE.ITEMS_PER_ROW * (MARQUEE.ITEM_SIZE + MARQUEE.ITEM_GAP);

/**
 * 행별 스펙. React key는 본 식별자 사용 (인덱스 사용 금지 규칙).
 * direction/duration을 행마다 다르게 두어 시각적 분산.
 */
export const ROW_SPECS = [
  { key: 'row-1', direction: 'ltr', durationMs: 80_000 },
  { key: 'row-2', direction: 'rtl', durationMs: 60_000 },
  { key: 'row-3', direction: 'ltr', durationMs: 90_000 },
  { key: 'row-4', direction: 'rtl', durationMs: 70_000 },
] as const satisfies readonly {
  key: string;
  direction: 'ltr' | 'rtl';
  durationMs: number;
}[];

/**
 * 강조(녹색 펄스 링) 표시할 심볼 — 시장 대장주 위주.
 * 너무 많이 켜면 시각 노이즈가 되므로 6개 이내로 제한.
 * 변경 시 LOGO_SOURCES에 해당 심볼이 존재하는지 확인 — 미존재 시 LogoFallback에는 링이 표시되지만 이미지는 빈칸.
 */
export const HIGHLIGHTED_SYMBOLS: ReadonlySet<string> = new Set<string>([
  '005930.KS', // 삼성전자
  '000660.KS', // SK하이닉스
  'NVDA',      // 엔비디아
  'GOOGL',     // 알파벳
  'AAPL',      // 애플
  'TSLA',      // 테슬라
]);
