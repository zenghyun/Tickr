// 로그인 화면 배경 마키 컨테이너.
// - 검정 배경(bg 토큰) 전체 채움.
// - 회전(-15°) 적용된 컨테이너 안에 2행 MarqueeRow.
// - useReducedMotion 활성 시 정지 그리드(애니메이션만 중단, 레이아웃 유지).
// - pointerEvents='none' — 상단 로그인 폼이 터치 받도록.
// - 접근성: 장식 요소이므로 스크린리더 무시.
import { useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { MARQUEE_LOGO_SET, type LogoSymbol } from '@/shared/lib/logo';
import { MARQUEE, ROW_WIDTH } from '../config/marquee.config';
import { MarqueeRow } from './MarqueeRow';

interface LoginLogoMarqueeProps {
  className?: string;
}

interface SplitRows {
  row1: readonly LogoSymbol[];
  row2: readonly LogoSymbol[];
}

/**
 * 50개 심볼을 2행으로 분할. 행간 시각 분산을 위해 짝수 인덱스/홀수 인덱스로 나눔 —
 * 같은 카테고리(KR/US)가 한 행에 몰리지 않게 자연스럽게 섞임 (KR 14는 인덱스 0~13, US 36은 14~49).
 */
const splitToRows = (symbols: readonly LogoSymbol[]): SplitRows => {
  const evens: LogoSymbol[] = [];
  const odds: LogoSymbol[] = [];
  symbols.forEach((s, i) => {
    if (i % 2 === 0) evens.push(s);
    else odds.push(s);
  });
  return { row1: evens, row2: odds };
};

export const LoginLogoMarquee = ({ className }: LoginLogoMarqueeProps) => {
  // 마운트 1회만 분할 — 리렌더 시에도 동일 시퀀스(애니메이션 점프 방지)
  const { row1, row2 } = useMemo(() => splitToRows(MARQUEE_LOGO_SET), []);

  const reducedMotion = useReducedMotion();
  const paused = reducedMotion === true;

  // 화면 크기에 맞춘 컨테이너 폭/높이 — 회전 후 모서리 빈공간 가림
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const containerWidth = screenWidth * MARQUEE.CONTAINER_WIDTH_RATIO;
  const containerHeight = screenHeight * MARQUEE.CONTAINER_HEIGHT_RATIO;

  return (
    <View
      pointerEvents="none"
      // iOS VoiceOver / Android TalkBack 모두 무시 — 장식 요소
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // 검정 배경(bg 토큰)으로 전체 채움. absolute로 children보다 뒤에 깔림.
      className={`absolute inset-0 overflow-hidden bg-bg ${className ?? ''}`}
    >
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          // 화면 중앙 정렬 — 회전 후 양옆 끝이 화면 밖으로 나가도록
          marginLeft: -(containerWidth - screenWidth) / 2,
          marginTop: -(containerHeight - screenHeight) / 2,
          transform: [{ rotate: `${MARQUEE.ROTATION_DEG}deg` }],
          // 두 행 사이 간격 — gap-6(=24px)
          gap: MARQUEE.ROW_GAP,
          // 두 행을 세로로 가운데 정렬
          justifyContent: 'center',
        }}
      >
        <MarqueeRow
          symbols={row1}
          rowWidth={ROW_WIDTH}
          durationMs={MARQUEE.DURATION_MS.row1}
          direction="ltr"
          paused={paused}
        />
        <MarqueeRow
          symbols={row2}
          rowWidth={ROW_WIDTH}
          durationMs={MARQUEE.DURATION_MS.row2}
          direction="rtl"
          paused={paused}
        />
      </View>
    </View>
  );
};
