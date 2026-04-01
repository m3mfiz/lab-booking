import { apiFetch } from './client';
import type { Booking, HourAvailability } from '../types';

export function listBookingsApi(from: string, to: string): Promise<Booking[]> {
  return apiFetch<Booking[]>(`/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export interface PaginatedBookings {
  items: Booking[];
  page: number;
  totalPages: number;
  total: number;
}

export function getMyBookingsApi(filter?: 'upcoming' | 'past', page = 1): Promise<PaginatedBookings> {
  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return apiFetch<PaginatedBookings>(`/bookings/my${qs ? `?${qs}` : ''}`);
}

export function createBookingApi(start_time: string, end_time: string): Promise<Booking> {
  return apiFetch<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify({ start_time, end_time }),
  });
}

export function cancelBookingApi(id: number): Promise<void> {
  return apiFetch<void>(`/bookings/${id}/cancel`, { method: 'PATCH' });
}

export function getAvailabilityApi(from: string, to: string): Promise<HourAvailability[]> {
  return apiFetch<HourAvailability[]>(`/bookings/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}
