// 단일 로고 셀.
// - source는 정적 require 결과(number). 매니페스트 미스 시 null → LogoFallback(이니셜).
// - 셀(흰/회색 배경 원형) 배경은 화면 모드 분기. 셀 자체에는 border 없음.
// - highlighted=true 시 셀 외곽에 녹색 펄스 링 표시(브리딩 애니메이션).
//   - 링은 원형 마스크 컨테이너 OUTSIDE에 absolute로 그려서 overflow-hidden을 우회.
//   - 강조 대상 심볼은 marquee.config.ts > HIGHLIGHTED_SYMBOLS.
// - 별도 컴포넌트로 분리한 이유: useState/useSharedValue가 셀별 독립이어야 하는데, MarqueeRow 내부에
//   함수 정의로 두면 매 렌더 새 컴포넌트로 인식되어 state가 깨진다(인라인 정의 함정 방지).
import { useEffect, useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/shared/lib";
import {
  LogoFallback,
  type LogoSource,
  type LogoSymbol,
} from "@/shared/lib/logo";
import { colors } from "@/shared/config";
import { MARQUEE } from "../config/marquee.config";

interface LogoCellProps {
  symbol: LogoSymbol;
  source: LogoSource | null;
  cellStyle: ViewStyle;
  isDark: boolean;
  highlighted: boolean;
}

// 모든 셀이 공유하는 정적 이미지 스타일 — 파일 상수로 한 번 만들고 재사용.
const LOGO_IMAGE_STYLE = {
  width: MARQUEE.LOGO_INNER_SIZE,
  height: MARQUEE.LOGO_INNER_SIZE,
  borderRadius: MARQUEE.ITEM_SIZE / 2,
} as const;

const HIGHLIGHT_INNER_INSET = -4;
const HIGHLIGHT_INNER_WIDTH = 4;
const HIGHLIGHT_HALO_INSET = -4;
const HIGHLIGHT_HALO_WIDTH = 3;
const HIGHLIGHT_PULSE_DURATION_MS = 900;

/**
 * 녹색 펄스 링 — 강조 심볼에만 마운트. 이중 링으로 명확한 강조 표현:
 *   1) 안쪽 솔리드 링(borderWidth 4) — opacity 0.7↔1.0 + scale 1.0↔1.10. 셀 외곽을 또렷이 감쌈.
 *   2) 바깥쪽 헤일로 링(borderWidth 6, 더 큰 inset) — opacity 0↔0.6 + scale 1.0↔1.25. 외곽으로 퍼져나가는 글로우.
 * 두 링은 단일 sharedValue로 동기화 — 호흡(ping-pong) 한 사이클 900ms.
 * 셀의 overflow-hidden을 회피하기 위해 셀 컨테이너 OUTSIDE의 wrapper에 absolute 배치.
 */
const HighlightRing = () => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: HIGHLIGHT_PULSE_DURATION_MS,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true, // reverse — ping-pong
    );
  }, [pulse]);

  // 안쪽 솔리드 링: 빠르게 차오르는 가시성. 항상 70% 이상 보임.
  const innerStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + pulse.value * 0.3,
    transform: [{ scale: 1 + pulse.value * 0.1 }],
  }));

  // 바깥쪽 헤일로: 사라졌다가 부풀어오르며 등장. 글로우 느낌.
  // 정적 inset은 작게(인접 셀 침범 X), 스케일 변화 폭은 크게 — 부풀어오르는 모션 강조.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.7,
    transform: [{ scale: 1 + pulse.value * 0.2 }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: HIGHLIGHT_HALO_INSET,
            left: HIGHLIGHT_HALO_INSET,
            right: HIGHLIGHT_HALO_INSET,
            bottom: HIGHLIGHT_HALO_INSET,
            borderRadius: 9999,
            borderWidth: HIGHLIGHT_HALO_WIDTH,
            borderColor: colors.highlight,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: HIGHLIGHT_INNER_INSET,
            left: HIGHLIGHT_INNER_INSET,
            right: HIGHLIGHT_INNER_INSET,
            bottom: HIGHLIGHT_INNER_INSET,
            borderRadius: 9999,
            borderWidth: HIGHLIGHT_INNER_WIDTH,
            borderColor: colors.highlight,
          },
          innerStyle,
        ]}
      />
    </>
  );
};

export const LogoCell = ({
  symbol,
  source,
  cellStyle,
  isDark,
  highlighted,
}: LogoCellProps) => {
  const [errored, setErrored] = useState(false);

  const showImage = source !== null && !errored;

  return (
    // 외곽 wrapper는 cellStyle만 — 마스크 없음. 링이 셀 경계 밖에서 보일 수 있게.
    <View style={cellStyle}>
      {highlighted && <HighlightRing />}
      <View
        className={cn(
          // overflow-hidden 필수 — 일부 로고 PNG가 정사각/wordmark이라 코너가 원 밖으로 튀어나오는 것을
          // 강제 클리핑. rounded-full만으로는 자식이 부모 경계를 벗어남(RN의 기본 overflow:visible).
          "h-full w-full items-center justify-center overflow-hidden rounded-full",
          // 다크: 흰 셀(어두운 배경에서 로고 가시성)
          // 라이트: 회색 셀(흰 배경에서 셀이 묻히지 않도록)
          isDark ? "bg-white" : "bg-surface-2-light",
        )}
      >
        {showImage ? (
          <Image
            source={source}
            style={LOGO_IMAGE_STYLE}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
            onError={() => setErrored(true)}
          />
        ) : (
          <LogoFallback symbol={symbol} size={MARQUEE.ITEM_SIZE} />
        )}
      </View>
    </View>
  );
};
