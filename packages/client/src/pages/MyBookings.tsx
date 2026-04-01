import { format, parseISO } from 'date-fns';
import { useMyBookings } from '../hooks/useMyBookings';
import { cancelBookingApi } from '../api/bookings';
import { useState } from 'react';

export function MyBookings() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [page, setPage] = useState(1);
  const { bookings, totalPages, loading, error, refetch } = useMyBookings(tab, page);
  const [cancelling, setCancelling] = useState<number | null>(null);

  function handleTabChange(newTab: 'upcoming' | 'past') {
    setTab(newTab);
    setPage(1);
  }

  async function handleCancel(id: number) {
    if (!confirm('Отменить бронирование?')) return;
    setCancelling(id);
    try {
      await cancelBookingApi(id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отменить бронирование');
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Мои записи</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab${tab === 'upcoming' ? ' tab--active' : ''}`}
          onClick={() => handleTabChange('upcoming')}
        >
          Предстоящие
        </button>
        <button
          className={`tab${tab === 'past' ? ' tab--active' : ''}`}
          onClick={() => handleTabChange('past')}
        >
          Прошедшие
        </button>
      </div>

      {loading && <div className="loading">Загрузка записей...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <div className="card">
          {bookings.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              {tab === 'upcoming' ? 'Нет предстоящих записей.' : 'Нет прошедших записей.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Начало</th>
                  <th>Конец</th>
                  <th>Статус</th>
                  {tab === 'upcoming' && <th></th>}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{format(parseISO(b.start_time), 'dd.MM.yyyy')}</td>
                    <td>{format(parseISO(b.start_time), 'HH:mm')}</td>
                    <td>{format(parseISO(b.end_time), 'HH:mm')}</td>
                    <td>
                      <span className={`badge badge-${b.status}`}>{b.status === 'active' ? 'активна' : 'отменена'}</span>
                    </td>
                    {tab === 'upcoming' && (
                      <td>
                        {b.status === 'active' && (
                          <button
                            className="btn-danger"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            disabled={cancelling === b.id}
                            onClick={() => handleCancel(b.id)}
                          >
                            {cancelling === b.id ? 'Отмена...' : 'Отменить'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
              <button
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: 13 }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Назад
              </button>
              <span style={{ lineHeight: '28px', fontSize: 13, color: 'var(--text-muted)' }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: 13 }}
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Вперёд →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
