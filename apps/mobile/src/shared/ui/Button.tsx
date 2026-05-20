// 토큰 기반 Button — variant: primary/up/down/ghost/danger
// 매수=up, 매도=down (.claude/rules/kr-finance.md)
import { Pressable, ActivityIndicator, useColorScheme, type PressableProps } from 'react-native';
import { cn } from '@/shared/lib';
import { Text } from './Text';

type Variant = 'primary' | 'up' | 'down' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-14 px-5',
};

const variantBg = (variant: Variant, isDark: boolean, disabled: boolean): string => {
  if (disabled) return isDark ? 'bg-surface-2' : 'bg-[#E5E5EA]';
  switch (variant) {
    case 'primary':
      return 'bg-primary';
    case 'up':
      return isDark ? 'bg-up' : 'bg-up-light';
    case 'down':
      return isDark ? 'bg-down' : 'bg-down-light';
    case 'danger':
      return 'bg-danger';
    case 'ghost':
      return 'bg-transparent';
  }
};

const variantText = (variant: Variant, isDark: boolean, disabled: boolean) => {
  if (disabled) return 'muted' as const;
  if (variant === 'ghost') return isDark ? 'default' : 'default';
  return 'default' as const;  // 모든 색상 버튼은 흰 텍스트 (배경이 진함)
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  ...rest
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center rounded-lg',
        sizeClass[size],
        variantBg(variant, isDark, isDisabled),
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? undefined : '#FFFFFF'} />
      ) : (
        <Text
          variant={size === 'lg' ? 'title' : 'body'}
          tone={variantText(variant, isDark, isDisabled)}
          // 색상 버튼은 흰 텍스트 강제
          className={variant === 'ghost' ? '' : 'text-white'}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
