// 회원가입 페이지 — 마키 배경(흐림) + 카드형 SignupForm.
// .claude/rules/fsd-structure.md — page가 widget(login-logo-marquee) + feature(signup) 포함.
//
// 디자인 결정:
//   - 마키 opacity 0.3 적용 (Designer 가이드) — 폼 가독성 확보.
//     LoginLogoMarquee의 className prop으로 'opacity-30' 주입 (style prop 미지원 — 위젯 수정 회피).
//   - 헤더는 카드 내부 텍스트로 — TickrTitle 같은 브랜드 hero는 로그인 화면 전용 유지.
//   - ScrollView로 키보드 회피 (필드 3개 + 키보드 + 면책 문구로 콘텐츠가 화면 초과 가능).
//   - 면책 문구는 SignupForm 내부에 포함됨.
//
// 라우팅: onCancel/onLoginPress 모두 router.back() — (auth)/login에서 push로 진입한 흐름.
import { ScrollView, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignupForm } from "@/features/signup";
import { cn, router } from "@/shared/lib";
import { Text } from "@/shared/ui";
import { LoginLogoMarquee } from "@/widgets/login-logo-marquee";

export const SignupPage = () => {
  const isDark = useColorScheme() === "dark";

  const goBack = () => router.back();

  return (
    <View className="flex-1">
      <LoginLogoMarquee className="opacity-30" />
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        className="flex-1 px-screen-px"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className={cn(
              "rounded-xl p-card-p",
              isDark ? "bg-surface" : "bg-surface-light",
            )}
          >
            <View className="mb-3">
              <Text variant="title">계정 만들기</Text>
              <Text variant="caption" tone="muted" className="mt-1">
                Tickr는 교육·학습 목적의 모의투자 앱입니다.
              </Text>
            </View>
            <SignupForm onCancel={goBack} onLoginPress={goBack} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};
