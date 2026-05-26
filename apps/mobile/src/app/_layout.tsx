// splash 모듈은 반드시 최상단에서 side-effect import (Architect ADR-1)
// → preventAutoHideAsync()가 AuthProvider/QueryProvider 평가보다 먼저 실행되어야
//   splash 자동 hide를 차단할 수 있다.
import "@/shared/lib/splash";

import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import "../../global.css";

import { colors } from "@/shared/config";

import { AuthProvider, QueryProvider } from "./_providers";

// (auth) 그룹(login/signup) 진입 전환만 끄기 위한 route.name 판별.
// expo-router 그룹+Slot 구조에서 루트 Stack에 등록되는 이름이 환경/버전에 따라
// '(auth)' · '(auth)/login' · 'login' 등으로 달라질 수 있어 모든 표기를 흡수한다.
const isAuthRoute = (routeName: string): boolean =>
  routeName.includes("(auth)") ||
  routeName === "login" ||
  routeName === "signup";

// OS color scheme 자동 추종 — light/dark 모두 정상 동작.
// W4 #32(테마 토글)에서 system/light/dark 3택 zustand 스토어로 확장 (PLAN.md D절).
// useColorScheme은 컴포넌트 안에서만 호출 가능 → StackHost 래퍼 분리.
const StackHost = () => {
  const isDark = useColorScheme() === "dark";
  const bg = isDark ? colors.bg.DEFAULT : colors.bg.light;
  const text = isDark ? colors.text.DEFAULT : colors.text.light;

  return (
    <>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          // Stack push 화면(search/settings/trades/symbol)의 native 헤더
          // NativeWind className은 RN navigator native UI 에 적용 불가 → style 직접 지정
          headerStyle: { backgroundColor: bg },
          headerTintColor: text,
          headerTitleStyle: { color: text },
          // 화면 전환 중 깜빡임 회피 — content 배경도 모드별 통일
          contentStyle: { backgroundColor: bg },
          // 콜드 스타트 시 index → /(auth)/login Redirect가 native-stack 기본 전환
          // (iOS slide_from_right)을 타면서 로그인 화면(마키 배경 포함)이 통째로
          // 오른쪽에서 슬라이드 인. 진입 화면은 제자리에 즉시 떠야 하므로 auth 계열만
          // animation='none'. expo-router 그룹+Slot 구조상 루트 Stack의 route.name이
          // '(auth)' / '(auth)/login' / 'login' 중 무엇이 될지 표기가 갈리므로
          // 어느 쪽이든 매칭되도록 판별 (per-name Stack.Screen은 빗나갈 수 있음).
          // search/settings 등 앱 내부 push는 기본 슬라이드 유지(iOS 네이티브 느낌).
          animation: isAuthRoute(route.name) ? "none" : "default",
        })}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};

const RootLayout = () => {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <StackHost />
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
