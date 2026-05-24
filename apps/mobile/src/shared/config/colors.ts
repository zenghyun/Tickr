// Tailwind 토큰 hex 값 mirror
// NativeWind v4는 RN native props(color, placeholderTextColor, tintColor 등)에 className을 줄 수 없으므로,
// hex 값이 필요한 RN native prop 사용 시 본 파일에서 import해 사용한다.
//
// 단일 출처는 tailwind.config.js. 색상 추가/변경 시 양쪽 동기화 필수.
// TODO(W4+): tailwind.config.js를 colors.ts에서 require하도록 단일 출처 통합 검토.
//
// lefthook `no-hardcoded-colors` 검사는 본 파일을 예외 처리(lefthook.yml exclude).

export const colors = {
  // 시장 컬러
  up: { DEFAULT: '#FF3B30', light: '#E5342B' },
  down: { DEFAULT: '#0A84FF', light: '#1769DC' },
  flat: { DEFAULT: '#8E8E93', light: '#6B6B70' },

  // 표면
  bg: { DEFAULT: '#000000', light: '#FFFFFF' },
  surface: {
    DEFAULT: '#1C1C1E',
    light: '#F2F2F7',
    '2': '#2C2C2E',
    '2-light': '#E5E5EA',
  },
  border: { DEFAULT: '#38383A', light: '#D1D1D6' },

  // 텍스트
  text: {
    DEFAULT: '#FFFFFF',
    light: '#000000',
    muted: '#8E8E93',
    'muted-light': '#6B6B70',
    disabled: '#48484A',
    'disabled-light': '#C7C7CC',
  },

  // 액션
  primary: '#0A84FF',
  danger: '#FF453A',
} as const;
