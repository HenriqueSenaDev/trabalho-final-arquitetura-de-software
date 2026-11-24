import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';

/**
 * Fluxo principal: Entrar → Linha do tempo → Nova consulta → Linha do tempo.
 * Cada item da linha do tempo abre o detalhe, onde se remarca, reagenda ou
 * cancela o aviso e exclui a consulta.
 */
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
        <Stack.Screen name="linha-do-tempo" options={{ title: 'Linha do tempo' }} />
        <Stack.Screen name="nova-consulta" options={{ title: 'Nova consulta' }} />
        <Stack.Screen name="consulta/[id]" options={{ title: 'Consulta' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
