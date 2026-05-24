import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import '../../global.css';

import { QueryProvider } from './_providers';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </QueryProvider>
    </SafeAreaProvider>
  );
}
