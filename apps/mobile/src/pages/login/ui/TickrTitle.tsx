// 로그인 화면 상단 브랜드 워드마크 + 서브타이틀.
// FadeInDown — 위에서 살짝 내려오며 페이드인(800ms, 200ms 지연).
// display 토큰(56/800) — title-lg(28/700)보다 큰 브랜드 hero 전용 typography.
// 서브타이틀은 body(16/400) — caption(13)보다 한 단계 위로 시각 weight 부여.
// 마키 배경 위에 얹히므로 흰/검 대비 텍스트로 가독성 확보.
// .claude/rules/nativewind-tokens.md — fontSize는 토큰만 사용.
import { useColorScheme } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { cn } from "@/shared/lib";
import { Text } from "@/shared/ui";

export const TickrTitle = () => {
  const isDark = useColorScheme() === "dark";

  return (
    <Animated.View
      entering={FadeInDown.duration(800).delay(200)}
      className="items-center"
    >
      <Text
        variant="display"
        className={cn("tracking-widest", isDark ? "text-white" : "text-black")}
      >
        Tickr
      </Text>
      <Text variant="title" tone="muted" className="mt-3">
        모의투자로 만나는 시장
      </Text>
    </Animated.View>
  );
};
