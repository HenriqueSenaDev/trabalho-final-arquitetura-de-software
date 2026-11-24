import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';

/**
 * Fluxo principal: Entrar → Linha do tempo → Nova consulta → Linha do tempo.
 * Cada item da linha do tempo abre o detalhe, onde se remarca, reagenda ou
 * cancela o aviso e exclui o registro.
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
        <Stack.Screen name="timeline" options={{ title: 'Linha do tempo', headerBackVisible: false }} />
        <Stack.Screen name="new-consultation" options={{ title: 'Nova consulta' }} />
        <Stack.Screen name="records/[id]" options={{ title: 'Registro' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
