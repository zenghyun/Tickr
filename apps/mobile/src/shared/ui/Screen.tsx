// 화면 래퍼 — SafeAreaView + 배경 토큰
import { View, useColorScheme, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { cn } from '@/shared/lib';

interface Props extends ViewProps {
  edges?: readonly Edge[];
  /**
   * 화면 가장자리 패딩 적용 여부 (기본 true)
   */
  padded?: boolean;
  className?: string;
}

export function Screen({
  edges = ['top', 'left', 'right'],
  padded = true,
  className,
  children,
  ...rest
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <SafeAreaView
      edges={edges}
      className={cn('flex-1', isDark ? 'bg-bg' : 'bg-bg-light')}
    >
      <View className={cn(padded && 'px-screen-px', 'flex-1', className)} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}
