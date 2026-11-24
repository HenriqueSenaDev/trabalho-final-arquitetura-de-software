import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText, Field } from '@/components/ui';
import { colors } from '@/constants/colors';
import { checkApiHealth, login, registerHolder } from '@/lib/api';
import { ApiError } from '@/lib/http-client';
import { session } from '@/lib/session';

type ApiStatus =
  | { state: 'loading' }
  | { state: 'online' }
  | { state: 'offline'; message: string };

type Mode = 'login' | 'register';

/** Passo 1 do fluxo: o titular entra (ou cria a conta) e a API abre a sessão do aparelho. */
export default function HomeScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<ApiStatus>({ state: 'loading' });
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkApiHealth()
      .then(() => setStatus({ state: 'online' }))
      .catch((failure: unknown) =>
        setStatus({
          state: 'offline',
          message: failure instanceof ApiError ? failure.message : 'Falha inesperada.',
        }),
      );
  }, []);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        await registerHolder({ fullName, email: email.trim(), password });
      }
      session.start(await login(email.trim(), password));
      router.replace('/timeline');
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Falha inesperada.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

      {mode === 'register' && <Field label="Nome completo" value={fullName} onChangeText={setFullName} />}
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorText>{error}</ErrorText>
      <Button title={mode === 'login' ? 'Entrar' : 'Criar conta'} onPress={submit} busy={busy} />
      <Pressable
        accessibilityRole="button"
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        hitSlop={10}
      >
        <Text style={styles.link}>
          {mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    marginTop: 4,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
  },
  link: { color: colors.brand, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
