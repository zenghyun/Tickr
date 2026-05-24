// 검색 페이지 placeholder — Stack 푸시 화면 (뒤로가기 자동)
// 실제 종목 검색(#13)에서 features/search-symbols 추가 시 본 컴포넌트가 호스트
import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';

export const SearchPage = () => {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="body" tone="muted">
          검색
        </Text>
        <Text variant="caption" tone="muted" className="mt-2">
          종목 검색 UI가 들어올 자리
        </Text>
      </View>
    </Screen>
  );
};
