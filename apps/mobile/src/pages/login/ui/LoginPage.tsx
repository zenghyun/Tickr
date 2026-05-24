// 로그인 페이지 — 마키 배경 + 상단 브랜드 + 하단 액션 카드 합성.
// .claude/rules/fsd-structure.md — 라우트는 본 페이지를 import만, 로직은 여기.
//
// 레이아웃:
//   ┌──────────────────────────┐
//   │ LoginLogoMarquee(absolute)│  ← pointerEvents='none', 회전 마키
//   │   SafeAreaView(전체 패딩)   │
//   │   ┌──────────────────┐   │
//   │   │ TickrTitle (상단) │   │ ← pt-20로 상단 고정
//   │   └──────────────────┘   │
//   │   ┌──────────────────┐   │
//   │   │ flex-1 (스페이서) │   │
//   │   └──────────────────┘   │
//   │   ┌──────────────────┐   │
//   │   │ LoginFormShell    │   │ ← 카드, 진입 애니메이션
//   │   └──────────────────┘   │
//   └──────────────────────────┘
//
// 마키는 pointerEvents='none'이라 카드 터치 전파에 문제 없음.
// _layout에서 colorScheme.set('dark') 강제 — 라이트 모드는 #32(테마 토글) 도입 후 자동 분기.
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginLogoMarquee } from '@/widgets/login-logo-marquee';

import { LoginFormShell } from './LoginFormShell';
import { TickrTitle } from './TickrTitle';

export const LoginPage = () => {
  return (
    <View className="flex-1">
      <LoginLogoMarquee />
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        className="flex-1 px-screen-px"
      >
        <View className="items-center pt-20">
          <TickrTitle />
        </View>
        <View className="flex-1" />
        <View className="pb-2">
          <LoginFormShell />
        </View>
      </SafeAreaView>
    </View>
  );
};
