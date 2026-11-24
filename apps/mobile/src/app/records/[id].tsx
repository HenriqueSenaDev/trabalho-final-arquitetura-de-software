import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { effectiveReminder, ReminderPicker } from '@/components/reminder-picker';
import { Button, ErrorText, Field } from '@/components/ui';
import { colors } from '@/constants/colors';
import {
  ConsultationReminder,
  deleteHealthRecord,
  getHealthRecord,
  HealthRecord,
  RecordChanges,
  updateHealthRecord,
} from '@/lib/api';
import { formatDateTime, maskDate, maskTime, toFields, toInstant } from '@/lib/dates';
import { ApiError } from '@/lib/http-client';
import { AppSession, session } from '@/lib/session';

type Action = 'save' | 'cancel-reminder' | 'delete';

/**
 * Detalhe de um item da linha do tempo (RF2). Numa consulta, o titular
 * remarca, reagenda ou cancela o aviso (nova versão do lembrete, ADR 03) e
 * exclui o registro (RF1.1).
 */
export default function RecordScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reminder, setReminder] = useState<number | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const show = useCallback((next: HealthRecord) => {
    setRecord(next);
    const fields = toFields(next.occurredAt);
    setDate(fields.date);
    setTime(fields.time);
    setReminder(next.reminder?.status === 'SCHEDULED' ? minutesBefore(next.occurredAt, next.reminder) : null);
  }, []);

  const handleFailure = useCallback(
    (failure: unknown) => {
      if (failure instanceof ApiError && failure.status === 401) {
        session.end();
        router.replace('/');
      } else if (failure instanceof ApiError && failure.status === 404) {
        setUnavailable(true);
      } else {
        setError(failure instanceof ApiError ? failure.message : 'Falha inesperada.');
      }
    },
    [router],
  );

  const load = useCallback(async () => {
    const current = session.current();
    if (!current) {
      router.replace('/');
      return;
    }
    try {
      show(await getHealthRecord(current, id));
    } catch (failure) {
      handleFailure(failure);
    }
  }, [id, show, router, handleFailure]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(action: Action, operation: (current: AppSession) => Promise<string | void>) {
    const current = session.current();
    if (!current) {
      router.replace('/');
      return;
    }
    setBusy(action);
    setError('');
    setMessage('');
    try {
      const result = await operation(current);
      if (action === 'delete') {
        router.back();
        return;
      }
      show(await getHealthRecord(current, id));
      if (result) setMessage(result);
    } catch (failure) {
      handleFailure(failure);
    } finally {
      setBusy(null);
    }
  }

  function save() {
    const occurredAt = toInstant(date, time);
    if (!occurredAt) {
      setError('Confira a data (DD/MM/AAAA) e a hora (HH:MM).');
      return;
    }
    const minutes = effectiveReminder(occurredAt, reminder);
    const changes: RecordChanges = {
      occurredAt,
      reminder: minutes === null ? null : { minutesBefore: minutes },
    };
    void run('save', async (current) => {
      const updated = await updateHealthRecord(current, id, changes);
      return updated.reminder?.status === 'SCHEDULED'
        ? `Salvo. Aviso agendado para ${formatDateTime(updated.reminder.remindAt)}.`
        : 'Salvo. A consulta está sem aviso.';
    });
  }

  if (unavailable) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Este registro não está disponível.</Text>
        <Button title="Voltar" secondary onPress={() => router.back()} />
      </View>
    );
  }
  if (!record) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.brand} />
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }

  const consultation = record.kind === 'CONSULTATION';

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>{record.title}</Text>
        <Text style={styles.line}>{formatDateTime(record.occurredAt)}</Text>
        {record.professional && <Text style={styles.line}>{record.professional}</Text>}
        {record.location && <Text style={styles.line}>{record.location}</Text>}
        {record.description && <Text style={styles.line}>{record.description}</Text>}
        {record.followUpAt && <Text style={styles.line}>Retorno: {formatDateTime(record.followUpAt)}</Text>}
        {consultation && <Text style={[styles.line, styles.reminder]}>{describeReminder(record.reminder)}</Text>}
        <Text style={styles.created}>Registrado em {formatDateTime(record.createdAt)}</Text>
      </View>

      {consultation && (
        <>
          <Text style={styles.section}>Remarcar ou mudar o aviso</Text>
          <View style={styles.row}>
            <View style={{ flex: 3 }}>
              <Field
                label="Data"
                keyboardType="number-pad"
                maxLength={10}
                value={date}
                onChangeText={(text) => setDate(maskDate(text))}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Field
                label="Hora"
                keyboardType="number-pad"
                maxLength={5}
                value={time}
                onChangeText={(text) => setTime(maskTime(text))}
              />
            </View>
          </View>
          <ReminderPicker occurredAt={toInstant(date, time)} value={reminder} onChange={setReminder} />
        </>
      )}

      <ErrorText>{error}</ErrorText>
      {message ? <Text style={styles.success}>{message}</Text> : null}

      {consultation && <Button title="Salvar alterações" onPress={save} busy={busy === 'save'} />}
      {record.reminder?.status === 'SCHEDULED' && (
        <Button
          title="Cancelar aviso"
          secondary
          busy={busy === 'cancel-reminder'}
          onPress={() =>
            void run('cancel-reminder', async (current) => {
              await updateHealthRecord(current, id, { reminder: null });
              return 'Aviso cancelado.';
            })
          }
        />
      )}

      {confirmingDelete ? (
        <View style={styles.confirm}>
          <Text style={styles.line}>
            Excluir o registro{consultation ? ', o retorno e o aviso pendente' : ''}? Não dá para desfazer.
          </Text>
          <Button
            title="Sim, excluir"
            destructive
            busy={busy === 'delete'}
            onPress={() => void run('delete', (current) => deleteHealthRecord(current, id))}
          />
          <Button title="Manter" secondary onPress={() => setConfirmingDelete(false)} />
        </View>
      ) : (
        <Button title="Excluir registro" destructive onPress={() => setConfirmingDelete(true)} />
      )}
    </ScrollView>
  );
}

function minutesBefore(occurredAt: string, reminder: ConsultationReminder): number {
  return Math.round((new Date(occurredAt).getTime() - new Date(reminder.remindAt).getTime()) / 60_000);
}

function describeReminder(reminder: ConsultationReminder | null | undefined): string {
  if (!reminder) return 'Sem aviso';
  const version = `versão ${reminder.version}`;
  switch (reminder.status) {
    case 'SCHEDULED':
      return `Aviso em ${formatDateTime(reminder.remindAt)} · ${version}`;
    case 'DONE':
      return `Aviso enviado · ${version}`;
    case 'CANCELLED':
      return `Aviso cancelado · ${version}`;
  }
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 14 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  line: { fontSize: 15, color: colors.text },
  reminder: { marginTop: 6, fontWeight: '600', color: colors.brandDeep },
  created: { fontSize: 13, color: colors.muted, marginTop: 6 },
  section: { fontSize: 16, fontWeight: '700', color: colors.brandDeep, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  success: { color: colors.success, fontSize: 14 },
  confirm: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.card },
  muted: { color: colors.muted, fontSize: 15 },
});
