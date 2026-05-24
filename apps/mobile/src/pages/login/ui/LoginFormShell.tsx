// 로그인 화면 하단 액션 카드 — 셸(shell) 상태.
// 실제 OAuth/이메일 인증 로직은 #7(로그인·회원가입)에서 구현 — 본 컴포넌트는 시각 구성과 진입 애니메이션만.
// 모든 버튼은 임시로 (tabs)로 즉시 진입시켜 다음 화면 검증을 가능하게 함.
//
// 진입 시퀀스:
//   1) 카드 본체 — 700ms 지연 후 아래에서 위로 페이드인
//   2) 내부 CTA — 150ms 간격 스태거(900/1050/1200ms)로 순차 등장
//
// OAuth 버튼 레이아웃 (한국 SNS 로그인 일반 컨벤션):
//   ┌──────────────────────────────────┐
//   │ [로고]      Xxx으로 로그인      [ ] │   ← 로고 좌측, 라벨 중앙, 우측 동일폭 스페이서
//   └──────────────────────────────────┘
//   - Google: 공식 G 로고(다운로드 PNG) + 흰 배경 + 검은 라벨
//   - Kakao: Ionicons chatbubble(말풍선 심볼) + 카카오 옐로우 배경 + 검은 라벨
//     (KakaoTalk 워드마크 PNG 외부 다운로드 실패 → 표준 ionicon chatbubble로 시각 매칭)
//   - 라벨 색은 두 버튼 모두 검정 고정 — 흰/노란 배경에서 가독성, 다크/라이트 모드 무관.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  Pressable,
  Text as RNText,
  View,
  useColorScheme,
  type ImageSourcePropType,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { cn, router } from "@/shared/lib";
import { Button } from "@/shared/ui";

// 56px = shared Button size='lg'(h-14)와 동일 → Google/Kakao/이메일 3버튼 높이 통일.
const OAUTH_BUTTON_HEIGHT = 38;
const OAUTH_LOGO_SIZE = 24;
const OAUTH_LOGO_STYLE = {
  width: OAUTH_LOGO_SIZE,
  height: OAUTH_LOGO_SIZE,
} as const;

const googleLogo: ImageSourcePropType = require("../../../../assets/oauth/google.png");

type LogoNode =
  | { kind: "image"; source: ImageSourcePropType }
  | { kind: "ionicon"; name: "chatbubble" };

interface OAuthButtonProps {
  logo: LogoNode;
  label: string;
  containerClassName: string;
  onPress: () => void;
}

const OAuthLogo = ({ logo }: { logo: LogoNode }) => {
  if (logo.kind === "image") {
    return (
      <Image
        source={logo.source}
        style={OAUTH_LOGO_STYLE}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        accessible={false}
      />
    );
  }
  return <Ionicons name={logo.name} size={OAUTH_LOGO_SIZE} color="black" />;
};

const OAuthButton = ({
  logo,
  label,
  containerClassName,
  onPress,
}: OAuthButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    className={cn("flex-row items-center rounded-lg px-4", containerClassName)}
    style={{ height: OAUTH_BUTTON_HEIGHT }}
  >
    <View style={OAUTH_LOGO_STYLE} className="items-center justify-center">
      <OAuthLogo logo={logo} />
    </View>
    <View className="flex-1 items-center">
      {/* 라벨 색 검정 고정 — 디자인 컴포넌트(Text)의 mode-aware tone 회피.
          RN Text + NativeWind className 직접 사용. */}
      <RNText className="text-body font-medium text-black">{label}</RNText>
    </View>
    {/* 라벨을 화면 중앙에 보이도록 우측에 로고 너비만큼 스페이서 */}
    <View style={OAUTH_LOGO_STYLE} />
  </Pressable>
);

export const LoginFormShell = () => {
  const isDark = useColorScheme() === "dark";

  // #7에서 실제 OAuth/이메일 진입으로 교체. 현재는 셸 검증을 위한 임시 라우팅.
  const enterAsGuest = () => router.replace("/(tabs)");

  return (
    <Animated.View
      entering={FadeInUp.duration(700).delay(700)}
      className={cn(
        "rounded-xl p-card-p",
        isDark ? "bg-surface" : "bg-surface-light"
      )}
    >
      <Animated.View
        entering={FadeInUp.duration(500).delay(900)}
        className="mb-2"
      >
        <OAuthButton
          logo={{ kind: "image", source: googleLogo }}
          label="Google로 로그인"
          containerClassName={cn(
            "border-hairline bg-white",
            isDark ? "border-border" : "border-border-light"
          )}
          onPress={enterAsGuest}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(500).delay(1050)}
        className="mb-2"
      >
        <OAuthButton
          logo={{ kind: "ionicon", name: "chatbubble" }}
          label="카카오로 로그인"
          containerClassName="bg-kakao"
          onPress={enterAsGuest}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(1200)}>
        <Button
          label="이메일로 시작하기"
          variant="primary"
          size="md"
          fullWidth
          onPress={enterAsGuest}
        />
      </Animated.View>
    </Animated.View>
  );
};
