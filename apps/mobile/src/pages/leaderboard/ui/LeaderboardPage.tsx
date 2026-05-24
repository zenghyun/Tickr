// 랭킹 페이지 placeholder
// 향후: 베타 참가자 수익률 랭킹 위젯 (#39)
import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';

export const LeaderboardPage = () => {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="body" tone="muted">
          랭킹
        </Text>
        <Text variant="caption" tone="muted" className="mt-2">
          베타 참가자 수익률 랭킹이 들어올 자리
        </Text>
      </View>
    </Screen>
  );
};
