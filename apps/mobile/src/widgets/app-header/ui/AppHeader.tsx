// 공용 헤더 — (tabs) 그룹의 screenOptions.header 에 주입
// search/settings 푸시 화면은 Stack 기본 헤더(뒤로가기) 사용 → AppHeader 미주입
// 다크/라이트는 useColorScheme + 삼항 명시 분기 (.claude/rules/nativewind-tokens.md)
import { View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { AppHeaderProps, AppHeaderIcon } from '../model/types';

// AppHeaderIcon → Ionicons 글리프 이름
const iconNameOf: Record<AppHeaderIcon, 'search' | 'menu'> = {
  search: 'search',
  menu: 'menu',
};

export const AppHeader = ({ title, actions = [] }: AppHeaderProps) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className={cn(isDark ? 'bg-bg' : 'bg-bg-light')}
    >
      <View
        className={cn(
          'h-14 flex-row items-center justify-between px-4',
          'border-b',
          isDark ? 'border-border' : 'border-border-light',
        )}
      >
        {/* 좌측 타이틀 */}
        <Text variant="title-lg" numberOfLines={1} className="flex-shrink">
          {title}
        </Text>

        {/* 우측 액션들 */}
        <View className="flex-row items-center">
          {actions.map((action) => (
            <IconButton
              key={action.icon}
              name={iconNameOf[action.icon]}
              accessibilityLabel={action.accessibilityLabel}
              onPress={action.onPress}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};
