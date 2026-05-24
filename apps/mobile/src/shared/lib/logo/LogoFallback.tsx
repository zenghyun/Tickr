// 로고 누락 시 표시할 원형 placeholder.
// `getLogo(symbol) === undefined` 또는 이미지 로드 실패 시 사용.
// 향후 entities/symbol 행 아이콘과 통일하기 위해 디자인 인터페이스를 단순하게 유지.
//
// 참고: rules/nativewind-tokens.md — 색상은 토큰만 (hex 금지).
import { View, useColorScheme } from 'react-native';
import { Text } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { LogoFallbackProps } from './types';

const DEFAULT_SIZE = 48;

/**
 * 심볼 문자열에서 표시용 이니셜 1글자 추출.
 * - KR 6자리 코드는 마지막 글자(예: '005930' → '0')보단 의미가 없어 'K'로 통일.
 * - US ticker는 첫 글자 대문자 (예: 'aapl' → 'A').
 */
const toInitial = (symbol: string): string => {
  if (/^\d/.test(symbol)) return 'K'; // KR 코드(숫자 시작) → 'K'
  return symbol.charAt(0).toUpperCase() || '?';
};

export const LogoFallback = ({ symbol, size = DEFAULT_SIZE, className }: LogoFallbackProps) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      // 토큰: 다크는 surface-2, 라이트는 surface-2-light. 로그인 배경은 항상 다크지만
      // 추후 행 아이콘에서 라이트 모드도 쓸 수 있도록 분기 유지.
      className={cn('items-center justify-center rounded-full', isDark ? 'bg-surface-2' : 'bg-surface-2-light', className)}
      style={{ width: size, height: size }}
    >
      <Text variant="caption" tone="muted">
        {toInitial(symbol)}
      </Text>
    </View>
  );
};
