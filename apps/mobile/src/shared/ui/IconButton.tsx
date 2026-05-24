// 토큰 기반 IconButton — Ionicons 기반, 44pt 권장 hit area
// 도메인 무지 프리미티브. 도메인 아이콘 행위(예: 매수/매도)는 entity/feature ui에서 합성할 것.
// .claude/rules/nativewind-tokens.md — hex 직접 사용 금지 (color prop은 colors.ts mirror 사용)
import type { ComponentProps } from 'react';
import { Pressable, useColorScheme, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/shared/lib';
import { colors } from '@/shared/config';

// Ionicons 글리프 이름 타입을 그대로 노출 — 호출부에서 풍부한 자동완성
type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'default' | 'muted' | 'primary' | 'danger';

interface Props extends Omit<PressableProps, 'children'> {
  name: IconName;
  size?: number;
  /**
   * 토큰 키. 기본은 본문 텍스트 색(다크/라이트 분기).
   * 도메인 색(up/down 등)은 entity/widget 에서 합성할 것.
   */
  tone?: Tone;
  /**
   * 접근성 라벨 — 시각 장애 사용자용. 반드시 명시.
   */
  accessibilityLabel: string;
  className?: string;
}

const toneColor = (tone: Tone, isDark: boolean): string => {
  switch (tone) {
    case 'muted':
      return isDark ? colors.text.muted : colors.text['muted-light'];
    case 'primary':
      return colors.primary;
    case 'danger':
      return colors.danger;
    case 'default':
    default:
      return isDark ? colors.text.DEFAULT : colors.text.light;
  }
};

export const IconButton = ({
  name,
  size = 24,
  tone = 'default',
  accessibilityLabel,
  className,
  disabled,
  ...rest
}: Props) => {
  const isDark = useColorScheme() === 'dark';
  const color = toneColor(tone, isDark);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      className={cn(
        'w-11 h-11 items-center justify-center bg-transparent active:opacity-60',
        disabled && 'opacity-40',
        className,
      )}
      hitSlop={8}
      {...rest}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
};
