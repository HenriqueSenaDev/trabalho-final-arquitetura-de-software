import { request } from './http-client';

export interface HealthRecord {
  id: string;
  kind: 'CONSULTATION' | 'EXAM' | 'VACCINE' | 'PRESCRIPTION' | 'OTHER';
  title: string;
  description: string | null;
  occurredAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  remindAt: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'DONE';
}

export function checkApiHealth(): Promise<{ status: string; database: string }> {
  return request('/health');
}

export function listHealthRecords(holderId: string): Promise<HealthRecord[]> {
  return request(`/holders/${holderId}/records`);
}

export function listReminders(holderId: string): Promise<Reminder[]> {
  return request(`/holders/${holderId}/reminders`);
}
