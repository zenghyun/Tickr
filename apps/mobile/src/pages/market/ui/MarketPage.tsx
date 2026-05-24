// 시장 페이지 placeholder
// 향후: 종목 카테고리·관심 종목 위젯 (#31)
import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';

export const MarketPage = () => {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="body" tone="muted">
          시장
        </Text>
        <Text variant="caption" tone="muted" className="mt-2">
          시세·카테고리 위젯이 들어올 자리
        </Text>
      </View>
    </Screen>
  );
};
