import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText } from '@/components/ui';
import { colors } from '@/constants/colors';
import { getTimeline, logout, TimelineItem, TimelineItemType, TimelinePage } from '@/lib/api';
import { formatDateTime, monthName } from '@/lib/dates';
import { ApiError } from '@/lib/http-client';
import { session } from '@/lib/session';

const TYPE_LABELS: Record<TimelineItemType, string> = {
  CONSULTATION: 'Consulta',
  FOLLOW_UP: 'Retorno',
  EXAM: 'Exame',
  VACCINE: 'Vacina',
  PRESCRIPTION: 'Receita',
  OTHER: 'Registro',
};

/**
 * Linha do tempo (RF2): relida toda vez que a tela ganha foco. Como a API lê
 * os registros vigentes (ADR 02), o que acabou de ser salvo já aparece.
 */
export default function TimelineScreen() {
  const router = useRouter();
  const [page, setPage] = useState<TimelinePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (cursor?: string) => {
      const current = session.current();
      if (!current) {
        router.replace('/');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const next = await getTimeline(current, cursor);
        setPage((previous) => (cursor && previous ? mergePages(previous, next) : next));
      } catch (failure) {
        if (failure instanceof ApiError && failure.status === 401) {
          session.end();
          router.replace('/');
          return;
        }
        setError(failure instanceof ApiError ? failure.message : 'Falha inesperada.');
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Revoga a sessão no servidor: o token deixa de valer e este aparelho para de receber avisos. */
  async function signOut() {
    const current = session.current();
    session.end();
    router.replace('/');
    if (current) {
      await logout(current).catch(() => undefined);
    }
  }

  const open = (item: TimelineItem) =>
    router.push({ pathname: '/records/[id]', params: { id: item.id } });
  const empty = page && page.upcoming.length === 0 && page.past.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.greeting}>Olá, {session.current()?.holder.fullName}</Text>
        <Pressable accessibilityRole="button" onPress={signOut} hitSlop={10}>
          <Text style={styles.signOut}>Sair</Text>
        </Pressable>
      </View>
      <Button title="Registrar consulta" onPress={() => router.push('/new-consultation')} />
      <ErrorText>{error}</ErrorText>
      {!page && loading && <ActivityIndicator color={colors.brand} />}
      {empty && <Text style={styles.empty}>Nenhum registro ainda.</Text>}

      {page && page.upcoming.length > 0 && (
        <Section title="Próximos">
          {page.upcoming.map((item) => (
            <Item key={`${item.type}-${item.id}`} item={item} onOpen={open} />
          ))}
        </Section>
      )}

      {page?.past.map((group) => (
        <Section key={group.month} title={monthName(group.month)}>
          {group.items.map((item) => (
            <Item key={`${item.type}-${item.id}`} item={item} onOpen={open} />
          ))}
        </Section>
      ))}

      {page?.cursor && (
        <Button
          title="Carregar mais"
          secondary
          busy={loading}
          onPress={() => load(page.cursor ?? undefined)}
        />
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** O retorno abre o detalhe da consulta, onde ele vive. */
function Item({ item, onOpen }: { item: TimelineItem; onOpen: (item: TimelineItem) => void }) {
  const followUp = item.type === 'FOLLOW_UP';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(item)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.tag, followUp && { color: colors.success }]}>{TYPE_LABELS[item.type]}</Text>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.date}>
        {formatDateTime(item.date)}
        {item.detail ? ` · ${item.detail}` : ''}
      </Text>
    </Pressable>
  );
}

/** Páginas seguintes continuam o passado; um mês pode atravessar duas páginas. */
function mergePages(previous: TimelinePage, next: TimelinePage): TimelinePage {
  const past = previous.past.map((group) => ({ ...group, items: [...group.items] }));
  for (const group of next.past) {
    const last = past.at(-1);
    if (last?.month === group.month) {
      last.items.push(...group.items);
    } else {
      past.push(group);
    }
  }
  return { upcoming: previous.upcoming, past, cursor: next.cursor };
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 18, fontWeight: '600', color: colors.text },
  signOut: { fontSize: 15, fontWeight: '600', color: colors.brand },
  empty: { color: colors.muted, fontSize: 15 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.brandDeep },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 2 },
  tag: { fontSize: 12, fontWeight: '700', color: colors.brand, textTransform: 'uppercase' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  date: { fontSize: 14, color: colors.muted },
});
