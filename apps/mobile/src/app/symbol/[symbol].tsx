// 종목 상세 라우트 — Stack 푸시(뒤로가기 자동, 헤더 ON). 로직 없음(얇은 진입점).
import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolDetailPage } from '@/pages/symbol-detail';

const SymbolDetailRoute = () => {
  // expo-router는 동적 segment가 undefined일 수 있으므로 optional 타입으로.
  // 부재 분기는 SymbolDetailPage가 EmptyState로 흡수.
  const { symbol } = useLocalSearchParams<{ symbol?: string }>();

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
