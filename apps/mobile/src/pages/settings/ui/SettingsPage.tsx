// 설정 페이지 placeholder — Stack 푸시 화면 (뒤로가기 자동)
// 실제 설정 항목(#40)에서 features/* 추가 시 본 컴포넌트가 호스트
import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';

export const SettingsPage = () => {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="body" tone="muted">
          설정
        </Text>
        <Text variant="caption" tone="muted" className="mt-2">
          계정·테마·로그아웃 항목이 들어올 자리
        </Text>
      </View>
    </Screen>
  );
};
