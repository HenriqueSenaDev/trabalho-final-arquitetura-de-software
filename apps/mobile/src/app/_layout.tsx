import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.brandDeep },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'PersonalHealth' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
