// 로그인 화면 하단 액션 카드 — OAuth / Form 듀얼 모드 토글.
// .claude/rules/fsd-structure.md — page가 feature(login) 포함, FSD 방향 정상.
//
// 모드 전환:
//   - 'oauth' (기본) → Google/Kakao(준비 중 disabled) + "이메일로 시작하기" CTA
//   - 'form' → RHF LoginForm 인라인. 카드가 콘텐츠 height에 맞춰 위로 확장
//     (LinearTransition으로 부드러운 height 변화 — TickrTitle 아래까지 자연 확장)
//
// OAuth(Google/Kakao)는 별도 이슈로 위임:
//   - SMS OTP: #43
//   - Google/Kakao OAuth 활성화: 추후 W3 OAuth 이슈
//   현재는 시각 유지 + disabled + opacity 톤 다운으로 비활성 상태 표현.
//
// 진입 애니메이션 (콜드 스타트):
//   카드 700ms FadeInUp 지연 → OAuth 버튼 스태거(900/1050/1200ms).
//   모드 전환 후에는 LinearTransition만 활성 — 스태거 재실행 금지(딜레이 충돌).
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Pressable,
  Text as RNText,
  View,
  useColorScheme,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { LoginForm } from "@/features/login";
import { cn, router } from "@/shared/lib";

const OAUTH_BUTTON_HEIGHT = 38;
const OAUTH_LOGO_SIZE = 24;
const OAUTH_LOGO_STYLE = {
  width: OAUTH_LOGO_SIZE,
  height: OAUTH_LOGO_SIZE,
} as const;

const googleLogo: ImageSourcePropType = require("../../../../assets/oauth/google.png");

type LogoNode =
  | { kind: "image"; source: ImageSourcePropType }
  | {
      kind: "ionicon";
      name: "chatbubble" | "mail-outline";
      // 기본 검정. primary(파랑) 배경 같은 진한 배경에서는 흰색으로 override.
      color?: string;
    };

interface OAuthButtonProps {
  logo: LogoNode;
  label: string;
  containerClassName: string;
  // 기본 'text-black'. primary(파랑)/danger(빨강) 등 진한 배경에서는 'text-white' 등으로 override.
  labelClassName?: string;
  onPress: () => void;
  disabled?: boolean;
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
  return (
    <Ionicons
      name={logo.name}
      size={OAUTH_LOGO_SIZE}
      color={logo.color ?? "black"}
    />
  );
};

const OAuthButton = ({
  logo,
  label,
  containerClassName,
  labelClassName,
  onPress,
  disabled,
}: OAuthButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: Boolean(disabled) }}
    disabled={disabled}
    onPress={onPress}
    className={cn(
      "flex-row items-center rounded-lg px-4",
      containerClassName,
      disabled && "opacity-50",
    )}
    style={{ height: OAUTH_BUTTON_HEIGHT }}
  >
    <View style={OAUTH_LOGO_STYLE} className="items-center justify-center">
      <OAuthLogo logo={logo} />
    </View>
    <View className="flex-1 items-center">
      {/* 라벨 색 — 기본 검정(흰/노란 배경 가독성). 진한 배경(primary 등)은 labelClassName으로 override. */}
      <RNText
        className={cn("text-body font-medium", labelClassName ?? "text-black")}
      >
        {label}
      </RNText>
    </View>
    <View style={OAUTH_LOGO_STYLE} />
  </Pressable>
);

const noop = () => {};

export const LoginFormShell = () => {
  const isDark = useColorScheme() === "dark";
  const [mode, setMode] = useState<"oauth" | "form">("oauth");

  return (
    <Animated.View
      entering={FadeInUp.duration(700).delay(700)}
      layout={LinearTransition.duration(280)}
      className={cn(
        "rounded-xl p-card-p",
        isDark ? "bg-surface" : "bg-surface-light",
      )}
    >
      {mode === "oauth" ? (
        <Animated.View
          key="oauth"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
        >
          <Animated.View
            entering={FadeInUp.duration(500).delay(900)}
            className="mb-2"
          >
            <OAuthButton
              logo={{ kind: "image", source: googleLogo }}
              label="Google로 로그인 (준비 중)"
              containerClassName={cn(
                "border-hairline bg-white",
                isDark ? "border-border" : "border-border-light",
              )}
              onPress={noop}
              disabled
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(500).delay(1050)}
            className="mb-2"
          >
            <OAuthButton
              logo={{ kind: "ionicon", name: "chatbubble" }}
              label="카카오로 로그인 (준비 중)"
              containerClassName="bg-kakao"
              onPress={noop}
              disabled
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(1200)}>
            {/* Google/Kakao와 동일한 OAuthButton 레이아웃 (좌 아이콘 + 중앙 라벨 + 우 스페이서).
                bg-primary + 흰 텍스트/아이콘. 3버튼 높이 통일(OAUTH_BUTTON_HEIGHT=38). */}
            <OAuthButton
              logo={{ kind: "ionicon", name: "mail-outline", color: "white" }}
              label="이메일로 시작하기"
              containerClassName="bg-primary"
              labelClassName="text-white"
              onPress={() => setMode("form")}
            />
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View
          key="form"
          entering={FadeIn.duration(220).delay(80)}
          exiting={FadeOut.duration(120)}
        >
          <LoginForm
            onCancel={() => setMode("oauth")}
            onSignupPress={() => router.push("/(auth)/signup")}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};
