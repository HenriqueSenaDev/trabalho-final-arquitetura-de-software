import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { request } from './http-client';
import { AppSession } from './session';

export type HealthRecordKind = 'CONSULTATION' | 'EXAM' | 'VACCINE' | 'PRESCRIPTION' | 'OTHER';

export interface ConsultationReminder {
  remindAt: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'DONE';
  version: number;
}

export interface HealthRecord {
  id: string;
  kind: HealthRecordKind;
  title: string;
  description: string | null;
  occurredAt: string;
  professional: string | null;
  location: string | null;
  followUpAt: string | null;
  createdAt: string;
  reminder?: ConsultationReminder | null;
}

export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  remindAt: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'DONE';
  version: number;
}

export type TimelineItemType = HealthRecordKind | 'FOLLOW_UP';

export interface TimelineItem {
  type: TimelineItemType;
  id: string;
  date: string;
  title: string;
  detail: string | null;
}

export interface TimelinePage {
  upcoming: TimelineItem[];
  past: { month: string; items: TimelineItem[] }[];
  cursor: string | null;
}

export interface NewConsultation {
  /** Gerado no aparelho: repetir o envio não duplica a consulta. */
  id: string;
  occurredAt: string;
  title: string;
  professional?: string;
  location?: string;
  followUpAt?: string;
  reminder?: { minutesBefore: number };
}

/** Campo ausente fica como está; `reminder: null` cancela o aviso. */
export interface RecordChanges {
  occurredAt?: string;
  reminder?: { minutesBefore: number } | null;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const json = (method: string, body: unknown, token?: string): RequestInit => ({
  method,
  body: JSON.stringify(body),
  headers: token ? auth(token) : undefined,
});

/**
 * Na prova de conceito o token de entrega identifica esta execução do app.
 * Com expo-notifications ele passa a ser o push token do aparelho, sem
 * mudança na API.
 */
const deliveryToken = `dev-${Platform.OS}-${Constants.sessionId}`;

export function checkApiHealth(): Promise<{ status: string; database: string }> {
  return request('/health');
}

export function registerHolder(input: { fullName: string; email: string; password: string }) {
  return request<{ id: string }>('/holders', json('POST', input));
}

export function login(email: string, password: string): Promise<AppSession> {
  return request('/sessions', json('POST', { email, password, device: Platform.OS, deliveryToken }));
}

/** Revoga a sessão no servidor: o token deixa de valer e o aparelho para de receber avisos. */
export function logout(current: AppSession): Promise<void> {
  return request(`/sessions/${current.sessionId}`, { method: 'DELETE', headers: auth(current.token) });
}

export function getTimeline(current: AppSession, cursor?: string): Promise<TimelinePage> {
  const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (cursor) params.set('cursor', cursor);
  return request(`/holders/${current.holder.id}/timeline?${params.toString()}`, {
    headers: auth(current.token),
  });
}

export function createConsultation(current: AppSession, input: NewConsultation): Promise<HealthRecord> {
  return request(
    `/holders/${current.holder.id}/records`,
    json('POST', { kind: 'CONSULTATION', ...input }, current.token),
  );
}

export function getHealthRecord(current: AppSession, recordId: string): Promise<HealthRecord> {
  return request(`/holders/${current.holder.id}/records/${recordId}`, { headers: auth(current.token) });
}

export function updateHealthRecord(
  current: AppSession,
  recordId: string,
  changes: RecordChanges,
): Promise<HealthRecord> {
  return request(`/holders/${current.holder.id}/records/${recordId}`, json('PATCH', changes, current.token));
}

export function deleteHealthRecord(current: AppSession, recordId: string): Promise<void> {
  return request(`/holders/${current.holder.id}/records/${recordId}`, {
    method: 'DELETE',
    headers: auth(current.token),
  });
}

export function listHealthRecords(current: AppSession): Promise<HealthRecord[]> {
  return request(`/holders/${current.holder.id}/records`, { headers: auth(current.token) });
}

export function listReminders(current: AppSession): Promise<Reminder[]> {
  return request(`/holders/${current.holder.id}/reminders`, { headers: auth(current.token) });
}
