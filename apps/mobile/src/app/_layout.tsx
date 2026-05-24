import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import '../../global.css';

import { colors } from '@/shared/config';

import { AuthProvider, QueryProvider } from './_providers';

// W4 #32(테마 토글) 도입 전까지 강제 다크 모드 — 시스템 외관 무시.
// 시스템/라이트/다크 3택은 zustand 테마 스토어로 추후 교체 (PLAN.md D절).
// 모듈 평가 시점 1회 호출 — 첫 프레임부터 다크 적용으로 깜빡임 회피.
colorScheme.set('dark');

const RootLayout = () => {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              // Stack push 화면(search/settings/trades/symbol)의 native 헤더 다크 적용
              // NativeWind className은 RN navigator native UI 에 적용 불가 → style 직접 지정
              // W4 #32 테마 토글 도입 시 useColorScheme 분기로 전환
              headerStyle: { backgroundColor: colors.bg.DEFAULT },
              headerTintColor: colors.text.DEFAULT,
              headerTitleStyle: { color: colors.text.DEFAULT },
              // 화면 전환 중 깜빡임 회피 — content 배경도 다크 통일
              contentStyle: { backgroundColor: colors.bg.DEFAULT },
            }}
          />
          {/* 다크 배경 위 흰색 status bar 텍스트 */}
          <StatusBar style="light" />
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
