// 마키 위젯 상수 단일 출처.
// 디자인 수치 변경 시 본 파일만 수정 — ui 코드에 매직넘버 박지 말 것.
// 참조: Designer 가이드 (회전 -15°, 로고 48px, 속도 80s/60s 등)

export const MARQUEE = {
  /** 행 개수. 2행 반대 방향 마키 */
  ROWS: 2,
  /** 행당 로고 수 (50 / 2). MARQUEE_LOGO_SET 길이의 절반과 일치해야 함 */
  ITEMS_PER_ROW: 25,
  /** 로고 셀 정사각 폭(px) — 흰 원형 컨테이너 외곽. tailwind w-12 (4*12=48) */
  ITEM_SIZE: 48,
  /** 셀 내부 로고 이미지 폭(px). 양옆 8px 패딩 적용해 48 → 32 */
  LOGO_INNER_SIZE: 32,
  /** 로고 사이 가로 간격(px). tailwind gap-4 */
  ITEM_GAP: 16,
  /** 두 행 사이 세로 간격(px). tailwind gap-6 */
  ROW_GAP: 24,
  /** 컨테이너 회전 각도(deg). 대각선 효과 */
  ROTATION_DEG: -15,
  /** 회전 후 모서리 가리기 위한 화면 폭 배수 (cos15° 보정) */
  CONTAINER_WIDTH_RATIO: 1.6,
  /** 회전 후 위아래 빈공간 가리기 위한 화면 높이 배수 */
  CONTAINER_HEIGHT_RATIO: 1.4,
  /** 상하 fade 마스크 영역(px). expo-linear-gradient 도입 시 사용 */
  FADE_HEIGHT: 80,
  /** 행별 1주기 소요 시간(ms) — 두 행 속도 차이로 시차감 부여 */
  DURATION_MS: {
    row1: 80_000, // ltr
    row2: 60_000, // rtl
  },
} as const;

/**
 * 단일 세트(25개)의 가로 픽셀 길이. seamless loop의 translateX 거리 계산용.
 * 행은 [...items, ...items]로 2배 펼치므로 한 주기 = ROW_WIDTH 이동 시 정확히 첫 세트가 두 번째 세트 위치로 이동.
 */
export const ROW_WIDTH = MARQUEE.ITEMS_PER_ROW * (MARQUEE.ITEM_SIZE + MARQUEE.ITEM_GAP);
