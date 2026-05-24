// 단일 마키 행의 reanimated 애니메이션을 캡슐화한 훅.
// ui 컴포넌트는 reanimated 의존을 직접 갖지 않고 본 훅을 통해서만 사용 — 추후 fallback 구현 교체 용이.
//
// ADR-1: `withRepeat(withTiming(-rowWidth, linear), -1, false)` 단일 worklet. useFrameCallback 사용 안 함.
// ADR-2: 배열 2배 펼침 + 반주기 거리=rowWidth → seamless loop (점프 비가시).
// ADR-4: paused=true 시 sharedValue=시작값 고정, withRepeat 미호출.
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface UseMarqueeRowArgs {
  /** 단일 세트의 가로 픽셀 길이. translateX가 이 거리만큼 이동 후 자연 wraparound */
  rowWidth: number;
  /** 1주기 소요 시간(ms) */
  durationMs: number;
  /** ltr: 왼쪽→오른쪽 흐름(시작 -rowWidth → 끝 0). rtl: 그 반대 */
  direction: 'ltr' | 'rtl';
  /** useReducedMotion true 또는 외부 정지 신호 */
  paused: boolean;
}

export const useMarqueeRow = ({ rowWidth, durationMs, direction, paused }: UseMarqueeRowArgs) => {
  // 방향 결정: ltr은 -rowWidth → 0 (왼쪽에서 등장해 오른쪽으로 흐름)
  //          rtl은 0 → -rowWidth (오른쪽에서 등장해 왼쪽으로 흐름)
  const from = direction === 'ltr' ? -rowWidth : 0;
  const to = direction === 'ltr' ? 0 : -rowWidth;

  const translateX = useSharedValue(from);

  useEffect(() => {
    if (paused) {
      cancelAnimation(translateX);
      translateX.value = from;
      return;
    }

    translateX.value = from;
    translateX.value = withRepeat(
      withTiming(to, { duration: durationMs, easing: Easing.linear }),
      -1,    // 무한 반복
      false, // reverse=false → 끝 도달 시 처음으로 점프 (배열 2배 펼침 덕에 비가시)
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, [paused, durationMs, from, to, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { animatedStyle };
};
