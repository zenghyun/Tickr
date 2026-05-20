// Tailwind 설정 — Tickr 디자인 토큰 단일 출처
// docs: .claude/rules/nativewind-tokens.md
const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // 시장 컬러 — KR 표준 (절대 반전 금지)
        // light/dark 자동 분기는 콘텐츠 컴포넌트에서 useColorScheme로
        up: {
          DEFAULT: '#FF3B30',
          light: '#E5342B',
        },
        down: {
          DEFAULT: '#0A84FF',
          light: '#1769DC',
        },
        flat: {
          DEFAULT: '#8E8E93',
          light: '#6B6B70',
        },

        // 표면
        bg: {
          DEFAULT: '#000000',
          light: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#1C1C1E',
          light: '#F2F2F7',
          2: '#2C2C2E',
          '2-light': '#E5E5EA',
        },
        border: {
          DEFAULT: '#38383A',
          light: '#D1D1D6',
        },

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
      },
      fontFamily: {
        // 가격/등락 텍스트는 tabular-nums 필수
        // RN에서는 system mono fallback. 별도 폰트 로드는 expo-font로.
        mono: ['Menlo', 'monospace'],
      },
      fontSize: {
        // title
        'title-lg': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'title': ['20px', { lineHeight: '26px', fontWeight: '600' }],

        // body
        'body': ['16px', { lineHeight: '22px', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '18px', fontWeight: '400' }],

        // price (tabular-nums는 fontVariant로 컴포넌트에서 적용)
        'price-lg': ['32px', { lineHeight: '38px', fontWeight: '600' }],
        'price': ['16px', { lineHeight: '22px', fontWeight: '500' }],

        // mono
        'mono-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      borderRadius: {
        // 카드/시트
        xl: '12px',
        lg: '8px',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      spacing: {
        // 의미 별칭 — 기본 Tailwind 스케일과 공존
        'screen-px': '16px',  // 화면 가장자리
        'card-p': '16px',     // 카드 내부
      },
    },
  },
  plugins: [],
};
