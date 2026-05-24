// 로그인 화면 배경 마키 컨테이너.
// - 회전(-15°) 적용된 컨테이너 안에 4행 MarqueeRow.
// - 100개 정적 PNG 매니페스트 사용 — 네트워크 미사용, prefetch 불필요, 첫 프레임부터 즉시 표시.
// - 100개 심볼 → 인덱스 % 4로 4행 분할(KR/US 자연 혼재).
// - useReducedMotion 활성 시 정지 그리드(애니메이션만 중단).
// - pointerEvents='none' — 상단 로그인 폼이 터치 받도록.
// - 접근성: 장식 요소이므로 스크린리더 무시.
// - 다크/라이트 분기: 배경(`bg-bg` 토큰), 셀 색은 LogoCell이 isDark prop으로 처리.
import { useMemo } from 'react';
import { Dimensions, useColorScheme, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { MARQUEE_LOGO_SET, type LogoSymbol } from '@/shared/lib/logo';
import { MARQUEE, ROW_SPECS, ROW_WIDTH } from '../config/marquee.config';
import { MarqueeRow } from './MarqueeRow';

interface LoginLogoMarqueeProps {
  className?: string;
}

/**
 * 심볼을 rowCount 행으로 분배. 인덱스 % rowCount 방식 — KR/US가 한 행에 몰리지 않게
 * 자연스럽게 섞임 (KR 30은 인덱스 0~29, US 70은 30~99).
 */
const splitToRows = (
  symbols: readonly LogoSymbol[],
  rowCount: number,
): readonly (readonly LogoSymbol[])[] => {
  const rows: LogoSymbol[][] = Array.from({ length: rowCount }, () => []);
  symbols.forEach((s, i) => {
    const row = rows[i % rowCount];
    if (row !== undefined) row.push(s);
  });
  return rows;
};

export const LoginLogoMarquee = ({ className }: LoginLogoMarqueeProps) => {
  // 마운트 1회만 분할 + ROW_SPECS와 미리 조합 — 리렌더 시 동일 시퀀스/스타일 보장.
  const rowItems = useMemo(() => {
    const splits = splitToRows(MARQUEE_LOGO_SET, ROW_SPECS.length);
    return ROW_SPECS.map((spec, i) => ({ spec, symbols: splits[i] ?? [] }));
  }, []);

  const reducedMotion = useReducedMotion();
  const paused = reducedMotion === true;
  const isDark = useColorScheme() === 'dark';

  // 화면 크기에 맞춘 컨테이너 폭/높이 — 회전 후 모서리 빈공간 가림
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const containerWidth = screenWidth * MARQUEE.CONTAINER_WIDTH_RATIO;
  const containerHeight = screenHeight * MARQUEE.CONTAINER_HEIGHT_RATIO;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`absolute inset-0 overflow-hidden ${isDark ? 'bg-bg' : 'bg-bg-light'} ${className ?? ''}`}
    >
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          // 화면 중앙 정렬 — 회전 후 양옆 끝이 화면 밖으로 나가도록
          marginLeft: -(containerWidth - screenWidth) / 2,
          marginTop: -(containerHeight - screenHeight) / 2,
          transform: [{ rotate: `${MARQUEE.ROTATION_DEG}deg` }],
          gap: MARQUEE.ROW_GAP,
          justifyContent: 'center',
        }}
      >
        {rowItems.map(({ spec, symbols }) => (
          <MarqueeRow
            key={spec.key}
            symbols={symbols}
            rowWidth={ROW_WIDTH}
            durationMs={spec.durationMs}
            direction={spec.direction}
            paused={paused}
            isDark={isDark}
          />
        ))}
      </View>
    </View>
  );
};
