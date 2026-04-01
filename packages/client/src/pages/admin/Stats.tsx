import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { getStatsApi } from '../../api/admin';
import type { DayStat } from '../../types';

export function AdminStats() {
  const today = new Date();
  const [from, setFrom] = useState(format(subDays(today, 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(today, 'yyyy-MM-dd'));
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [stats, setStats] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await getStatsApi(from, to, period);
      setStats(data);
      setFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }

  const maxBookings = stats.length > 0 ? Math.max(...stats.map((s) => s.total_bookings)) : 1;

  return (
    <div>
      <div className="page-header">
        <h1>Статистика</h1>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <form onSubmit={handleFetch} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>С</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>По</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Период</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as 'day' | 'week')}>
              <option value="day">День</option>
              <option value="week">Неделя</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginBottom: 14 }}>
            {loading ? 'Загрузка...' : 'Показать'}
          </button>
        </form>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {fetched && !loading && (
        <>
          {stats.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              Нет данных за выбранный период.
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: 14 }}>Бронирования за период</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.map((s) => (
                    <div key={s.period} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 100, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {s.period}
                      </span>
                      <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(s.total_bookings / maxBookings) * 100}%`,
                            background: 'var(--primary)',
                            borderRadius: 4,
                            transition: 'width 0.3s',
                            minWidth: s.total_bookings > 0 ? 4 : 0,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text)', width: 30, textAlign: 'right', flexShrink: 0 }}>
                        {s.total_bookings}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="card">
                <table>
                  <thead>
                    <tr>
                      <th>Период</th>
                      <th>Всего записей</th>
                      <th>Всего часов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.period}>
                        <td>{s.period}</td>
                        <td>{s.total_bookings}</td>
                        <td>{typeof s.total_hours === 'number' ? s.total_hours.toFixed(1) : s.total_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
