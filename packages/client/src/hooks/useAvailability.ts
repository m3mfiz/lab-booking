import { useEffect, useState, useCallback } from 'react';
import { getAvailabilityApi } from '../api/bookings';
import type { HourAvailability } from '../types';

export function useAvailability(from: string, to: string) {
  const [availability, setAvailability] = useState<HourAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAvailabilityApi(from, to);
      setAvailability(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return { availability, loading, error, refetch: fetchAvailability };
}
