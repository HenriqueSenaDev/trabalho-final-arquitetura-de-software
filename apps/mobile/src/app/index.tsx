import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { checkApiHealth } from '@/lib/api';
import { ApiError } from '@/lib/http-client';

type ApiStatus =
  | { state: 'loading' }
  | { state: 'online' }
  | { state: 'offline'; message: string };

export default function HomeScreen() {
  const [status, setStatus] = useState<ApiStatus>({ state: 'loading' });

  useEffect(() => {
    checkApiHealth()
      .then(() => setStatus({ state: 'online' }))
      .catch((error: unknown) =>
        setStatus({
          state: 'offline',
          message: error instanceof ApiError ? error.message : 'Falha inesperada.',
        }),
      );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PersonalHealth</Text>
      <Text style={styles.subtitle}>Seu histórico de saúde em um só lugar.</Text>

      <View style={styles.card}>
        {status.state === 'loading' && <ActivityIndicator color={colors.brand} />}
        {status.state === 'online' && (
          <Text style={[styles.status, { color: colors.success }]}>API de Saúde online</Text>
        )}
        {status.state === 'offline' && (
          <Text style={[styles.status, { color: colors.danger }]}>{status.message}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
  },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
  },
});
