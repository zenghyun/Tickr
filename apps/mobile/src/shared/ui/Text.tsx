// 토큰 기반 Text 래퍼 — variant로 typography 토큰 직접 지정
// 직접 fontSize/fontWeight 박지 말 것 (.claude/rules/nativewind-tokens.md)
import { Text as RNText, type TextProps as RNTextProps, useColorScheme } from 'react-native';
import { cn } from '@/shared/lib';

type Variant = 'display' | 'title-lg' | 'title' | 'body' | 'caption' | 'price-lg' | 'price' | 'mono-sm';
type Tone = 'default' | 'muted' | 'disabled' | 'up' | 'down' | 'flat' | 'primary' | 'danger';

interface Props extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  /**
   * 가격/등락 텍스트에 tabular-nums 폰트 variant 적용
   */
  tabular?: boolean;
  className?: string;
}

// variant → tailwind class 매핑
const variantClass: Record<Variant, string> = {
  display: 'text-display',
  'title-lg': 'text-title-lg',
  title: 'text-title',
  body: 'text-body',
  caption: 'text-caption',
  'price-lg': 'text-price-lg',
  price: 'text-price',
  'mono-sm': 'text-mono-sm font-mono',
};

// tone → 다크/라이트 모드 색상 매핑
const toneClass = (tone: Tone, isDark: boolean): string => {
  switch (tone) {
    case 'muted':
      return isDark ? 'text-text-muted' : 'text-text-muted-light';
    case 'disabled':
      return isDark ? 'text-text-disabled' : 'text-text-disabled-light';
    case 'up':
      return isDark ? 'text-up' : 'text-up-light';
    case 'down':
      return isDark ? 'text-down' : 'text-down-light';
    case 'flat':
      return isDark ? 'text-flat' : 'text-flat-light';
    case 'primary':
      return 'text-primary';
    case 'danger':
      return 'text-danger';
    default:
      return isDark ? 'text-text' : 'text-text-light';
  }
};

export const Text = ({
  variant = 'body',
  tone = 'default',
  tabular = false,
  className,
  style,
  ...rest
}: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <RNText
      className={cn(variantClass[variant], toneClass(tone, isDark), className)}
      style={[tabular ? { fontVariant: ['tabular-nums'] } : null, style]}
      {...rest}
    />
  );
};
