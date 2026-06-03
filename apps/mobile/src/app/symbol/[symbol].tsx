// 종목 상세 라우트 — Stack 푸시(뒤로가기 자동, 헤더 ON). 로직 없음(얇은 진입점).
import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolDetailPage } from '@/pages/symbol-detail';

const SymbolDetailRoute = () => {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: symbol ?? '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <SymbolDetailPage symbol={symbol} />
    </>
  );
};

export default SymbolDetailRoute;
