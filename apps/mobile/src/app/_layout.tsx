import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import "../../global.css";

import { colors } from "@/shared/config";

import { AuthProvider, QueryProvider } from "./_providers";

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
        screenOptions={{
          headerShown: false,
          // Stack push 화면(search/settings/trades/symbol)의 native 헤더
          // NativeWind className은 RN navigator native UI 에 적용 불가 → style 직접 지정
          headerStyle: { backgroundColor: bg },
          headerTintColor: text,
          headerTitleStyle: { color: text },
          // 화면 전환 중 깜빡임 회피 — content 배경도 모드별 통일
          contentStyle: { backgroundColor: bg },
        }}
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
