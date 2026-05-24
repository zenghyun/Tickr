// (tabs) 셸 — 탭 3개 + 공용 AppHeader 주입
// 결정:
// - screenOptions.header 에 AppHeader 콜백 주입 (옵션 B — Architect ADR-1)
// - 헤더 액션의 router.push 는 본 레이아웃에서 콜백으로 주입 → AppHeader 는 dumb (ADR-2)
// - 다크/라이트는 useColorScheme + 삼항 (Screen/Button/Text 패턴 통일)
// - 탭 활성색은 text 토큰(흰/검) — primary(파랑)는 KR 시장컬러(down=파랑)와 충돌하여 회피 (ADR-3)
import type { ComponentProps } from 'react';
import { useColorScheme } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, type AppHeaderAction } from '@/widgets/app-header';
import { colors } from '@/shared/config';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// 탭 아이콘 매핑 — focused 여부로 outline 토글
// 시장: bar-chart (trending-up 회피 — 상승 방향성 암시 X)
const TAB_ICONS: Record<
  'index' | 'market' | 'leaderboard',
  { active: IoniconName; inactive: IoniconName }
> = {
  index: { active: 'home', inactive: 'home-outline' },
  market: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  leaderboard: { active: 'trophy', inactive: 'trophy-outline' },
};

const TabsLayout = () => {
  const isDark = useColorScheme() === 'dark';

  // 헤더 우측 액션 — 모든 탭 공통
  // typedRoutes 활성: '/search', '/settings' 리터럴이 타입 추론됨
  const headerActions: readonly AppHeaderAction[] = [
    {
      icon: 'search',
      accessibilityLabel: '검색',
      onPress: () => router.push('/search'),
    },
    {
      icon: 'menu',
      accessibilityLabel: '설정',
      onPress: () => router.push('/settings'),
    },
  ];

  return (
    <Tabs
      screenOptions={{
        // 공용 헤더 주입 — options.title 로 라우트별 타이틀 결정
        header: ({ options }) => (
          <AppHeader title={options.title ?? ''} actions={headerActions} />
        ),
        // 탭바 외관 — NativeWind className은 RN navigator native에 적용 불가 → style 직접 지정
        tabBarStyle: {
          backgroundColor: isDark ? colors.bg.DEFAULT : colors.bg.light,
          borderTopColor: isDark ? colors.border.DEFAULT : colors.border.light,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: isDark ? colors.text.DEFAULT : colors.text.light,
        tabBarInactiveTintColor: isDark
          ? colors.text.muted
          : colors.text['muted-light'],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS.index.active : TAB_ICONS.index.inactive}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: '시장',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS.market.active : TAB_ICONS.market.inactive}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: '랭킹',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={
                focused
                  ? TAB_ICONS.leaderboard.active
                  : TAB_ICONS.leaderboard.inactive
              }
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
