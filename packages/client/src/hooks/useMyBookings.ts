import { useEffect, useState, useCallback } from 'react';
import { getMyBookingsApi } from '../api/bookings';
import type { Booking } from '../types';

export function useMyBookings(filter?: 'upcoming' | 'past', page = 1) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyBookingsApi(filter, page);
      setBookings(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, totalPages, loading, error, refetch: fetchBookings };
}
