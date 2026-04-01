import { useEffect, useState } from 'react';
import { getLabSettingsApi } from '../api/admin';
import type { LabSettings } from '../types';

let cachedSettings: LabSettings | null = null;

export function useLabSettings() {
  const [settings, setSettings] = useState<LabSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(cachedSettings === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedSettings) return;
    setLoading(true);
    getLabSettingsApi()
      .then((data) => {
        cachedSettings = data;
        setSettings(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load lab settings'))
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading, error };
}
