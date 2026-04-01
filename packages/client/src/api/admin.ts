import { apiFetch } from './client';
import type { User, LabSettings, DayStat } from '../types';

export function listUsersApi(): Promise<User[]> {
  return apiFetch<User[]>('/admin/users');
}

export interface CreateUserData {
  username: string;
  password: string;
  full_name: string;
  role: 'user' | 'admin';
}

export function createUserApi(data: CreateUserData): Promise<User> {
  return apiFetch<User>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteUserApi(id: number): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}`, { method: 'DELETE' });
}

export function updateLabApi(settings: Partial<LabSettings>): Promise<LabSettings> {
  return apiFetch<LabSettings>('/admin/labs', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export function getStatsApi(from: string, to: string, period: 'day' | 'week'): Promise<DayStat[]> {
  return apiFetch<DayStat[]>(`/admin/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&period=${period}`);
}

export function getLabSettingsApi(): Promise<LabSettings> {
  return apiFetch<LabSettings>('/labs');
}
