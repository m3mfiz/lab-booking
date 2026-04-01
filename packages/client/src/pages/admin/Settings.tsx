import { useState, useEffect } from 'react';
import { getLabSettingsApi, updateLabApi } from '../../api/admin';
import type { LabSettings } from '../../types';

export function AdminSettings() {
  const [settings, setSettings] = useState<LabSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: '',
    total_seats: 10,
    work_start_time: '09:00',
    work_end_time: '18:00',
  });

  useEffect(() => {
    getLabSettingsApi()
      .then((data) => {
        setSettings(data);
        setForm({
          name: data.name,
          total_seats: data.total_seats,
          work_start_time: data.work_start_time,
          work_end_time: data.work_end_time,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить настройки'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateLabApi(form);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Загрузка настроек...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Настройки лаборатории</h1>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Количество мест</label>
            <input
              type="number"
              min={1}
              max={200}
              value={form.total_seats}
              onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Начало работы</label>
              <input
                type="time"
                value={form.work_start_time}
                onChange={(e) => setForm({ ...form, work_start_time: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Конец работы</label>
              <input
                type="time"
                value={form.work_end_time}
                onChange={(e) => setForm({ ...form, work_end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {saved && (
            <div style={{ color: 'var(--success)', fontSize: 13, marginBottom: 10 }}>
              Настройки сохранены.
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  );
}
