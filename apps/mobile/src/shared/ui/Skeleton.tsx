// 로딩 플레이스홀더 — 토큰 기반 펄스 애니메이션
import { useEffect, useRef } from 'react';
import { Animated, useColorScheme } from 'react-native';
import { cn } from '@/shared/lib';

interface Props {
  className?: string;
}

export function Skeleton({ className }: Props) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className={cn(
        'rounded-lg',
        isDark ? 'bg-surface-2' : 'bg-surface-2-light',
        className,
      )}
    />
  );
}
