// 홈 페이지 placeholder — 본 이슈는 셸 작업
// 실제 포트폴리오 위젯(Holdings/Summary)은 W4+에서 widgets/* 로 추가 예정
import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';

export const HomePage = () => {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="body" tone="muted">
          홈
        </Text>
        <Text variant="caption" tone="muted" className="mt-2">
          포트폴리오·보유종목 위젯이 들어올 자리
        </Text>
      </View>
    </Screen>
  );
};
