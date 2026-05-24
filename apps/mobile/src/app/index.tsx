import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

// W3에서 (auth)/(tabs) 라우트 구조로 교체 예정. 현재는 라우트 루트 부팅 확인용 플레이스홀더.
const HomeRoute = () => {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-text text-title">Tickr</Text>
        <Text className="text-text-muted text-caption mt-2">베타 부팅 OK</Text>
      </View>
    </SafeAreaView>
  );
};

export default HomeRoute;
