import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import '../../global.css';

import { AuthProvider, QueryProvider } from './_providers';

const RootLayout = () => {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
