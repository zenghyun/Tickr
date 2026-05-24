// 설정 라우트 — Stack 푸시 (뒤로가기 자동, 헤더 ON)
// 디렉터리 형태로 둠 — 향후 settings 하위 화면(예: settings/about) 확장 대비 (Architect ADR-5)
import { Stack } from 'expo-router';
import { SettingsPage } from '@/pages/settings';

const SettingsRoute = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: '설정' }} />
      <SettingsPage />
    </>
  );
};

export default SettingsRoute;
