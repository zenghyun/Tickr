// 검색 라우트 — Stack 푸시 (뒤로가기 자동, 헤더 ON)
// 루트 Stack screenOptions={ headerShown:false } 를 본 화면에서 override
import { Stack } from 'expo-router';
import { SearchPage } from '@/pages/search';

const SearchRoute = () => {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '검색',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <SearchPage />
    </>
  );
};

export default SearchRoute;
