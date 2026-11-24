import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { effectiveReminder, ReminderPicker } from '@/components/reminder-picker';
import { Button, ErrorText, Field } from '@/components/ui';
import { createConsultation } from '@/lib/api';
import { maskDate, maskTime, newId, toInstant } from '@/lib/dates';
import { ApiError } from '@/lib/http-client';
import { session } from '@/lib/session';

/**
 * Passo 2 do fluxo: o titular registra a consulta. As regras (retorno
 * posterior, aviso no futuro) são da API; a tela só evita oferecer um aviso
 * que a API recusaria e mostra o que ela responder.
 */
export default function NewConsultationScreen() {
  const router = useRouter();
  // Um id por formulário: tocar em "Salvar" de novo depois de uma falha de
  // conexão não duplica a consulta nem o aviso.
  const [id] = useState(newId);
  const [specialty, setSpecialty] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [professional, setProfessional] = useState('');
  const [location, setLocation] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [reminder, setReminder] = useState<number | null>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const occurredAt = toInstant(date, time);

  async function save() {
    const current = session.current();
    if (!current) {
      router.replace('/');
      return;
    }
    // Sem hora própria, o retorno usa a hora da consulta.
    const followUpAt = followUpDate ? toInstant(followUpDate, followUpTime || time) : undefined;
    if (!occurredAt || followUpAt === null) {
      setError('Confira as datas (DD/MM/AAAA) e as horas (HH:MM).');
      return;
    }

    const minutes = effectiveReminder(occurredAt, reminder);
    setBusy(true);
    setError('');
    try {
      await createConsultation(current, {
        id,
        title: specialty,
        occurredAt,
        professional: professional || undefined,
        location: location || undefined,
        followUpAt,
        reminder: minutes === null ? undefined : { minutesBefore: minutes },
      });
      // Só volta depois da confirmação do servidor.
      router.back();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        session.end();
        router.replace('/');
        return;
      }
      setError(failure instanceof ApiError ? failure.message : 'Falha inesperada.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Field label="Especialidade" value={specialty} onChangeText={setSpecialty} />
      <View style={styles.row}>
        <View style={{ flex: 3 }}>
          <Field
            label="Data"
            placeholder="05/12/2026"
            keyboardType="number-pad"
            maxLength={10}
            value={date}
            onChangeText={(text) => setDate(maskDate(text))}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Field
            label="Hora"
            placeholder="14:30"
            keyboardType="number-pad"
            maxLength={5}
            value={time}
            onChangeText={(text) => setTime(maskTime(text))}
          />
        </View>
      </View>
      <Field label="Profissional (opcional)" value={professional} onChangeText={setProfessional} />
      <Field label="Local (opcional)" value={location} onChangeText={setLocation} />
      <View style={styles.row}>
        <View style={{ flex: 3 }}>
          <Field
            label="Retorno (opcional)"
            placeholder="10/01/2027"
            keyboardType="number-pad"
            maxLength={10}
            value={followUpDate}
            onChangeText={(text) => setFollowUpDate(maskDate(text))}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Field
            label="Hora do retorno"
            placeholder={time || '14:30'}
            keyboardType="number-pad"
            maxLength={5}
            value={followUpTime}
            onChangeText={(text) => setFollowUpTime(maskTime(text))}
          />
        </View>
      </View>

      <ReminderPicker occurredAt={occurredAt} value={reminder} onChange={setReminder} />

      <ErrorText>{error}</ErrorText>
      <Button title="Salvar" onPress={save} busy={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
});
