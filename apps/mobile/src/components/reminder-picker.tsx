import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

export const REMINDER_OPTIONS = [
  { label: 'Sem aviso', minutes: null },
  { label: '1 hora antes', minutes: 60 },
  { label: '1 dia antes', minutes: 24 * 60 },
] as const;

/** Uma antecedência só vale se o aviso ainda cair no futuro (a API recusa o resto). */
export function isReminderValid(
  occurredAt: string | null,
  minutes: number | null,
  now = Date.now(),
): boolean {
  if (minutes === null) return true;
  if (!occurredAt) return false;
  return new Date(occurredAt).getTime() - minutes * 60_000 > now;
}

/** O que de fato vai para a API: uma escolha que deixou de valer vira "Sem aviso". */
export function effectiveReminder(
  occurredAt: string | null,
  minutes: number | null,
  now = Date.now(),
): number | null {
  return isReminderValid(occurredAt, minutes, now) ? minutes : null;
}

/**
 * Escolha do aviso. Consulta passada fica sem aviso, e opções que cairiam no
 * passado aparecem desabilitadas, em vez de o titular só descobrir pelo erro.
 */
export function ReminderPicker({
  occurredAt,
  value,
  onChange,
}: {
  occurredAt: string | null;
  value: number | null;
  onChange: (minutes: number | null) => void;
}) {
  // Instante de referência fixado ao abrir a tela; ao salvar, vale o relógio daquele momento.
  const [now] = useState(Date.now);
  const effective = effectiveReminder(occurredAt, value, now);
  const past = occurredAt !== null && new Date(occurredAt).getTime() <= now;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>Aviso</Text>
      <View style={styles.row}>
        {REMINDER_OPTIONS.map((option) => {
          const available = isReminderValid(occurredAt, option.minutes, now);
          const selected = effective === option.minutes;
          return (
            <Pressable
              key={option.label}
              disabled={!available}
              accessibilityState={{ disabled: !available, selected }}
              onPress={() => onChange(option.minutes)}
              style={[styles.option, selected && styles.selected, !available && styles.unavailable]}
            >
              <Text style={[styles.optionText, selected && { color: '#FFFFFF' }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {past && <Text style={styles.hint}>Consulta passada: fica registrada sem aviso.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  selected: { backgroundColor: colors.brand },
  unavailable: { opacity: 0.35 },
  optionText: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  hint: { fontSize: 13, color: colors.muted },
});
