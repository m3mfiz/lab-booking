import { apiFetch } from './client';
import type { User } from '../types';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export function loginApi(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function refreshApi(refresh_token: string): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  });
}

export function getMeApi(): Promise<User> {
  return apiFetch<User>('/auth/me');
}

export function changePasswordApi(current_password: string, new_password: string): Promise<void> {
  return apiFetch<void>('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function logoutApi(refresh_token: string): Promise<void> {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  });
}
