import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { createBookingApi, getAvailabilityApi } from '../api/bookings';
import { useLabSettings } from '../hooks/useLabSettings';
import './BookingModal.css';

interface BookingModalProps {
  date: string; // ISO date string "YYYY-MM-DD"
  initialHour?: number;
  totalSeats: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ date, initialHour, totalSeats, onClose, onSuccess }: BookingModalProps) {
  const { settings } = useLabSettings();
  const workStart = settings?.work_start_time?.slice(0, 5) ?? '09:00';
  const workEnd = settings?.work_end_time?.slice(0, 5) ?? '18:00';
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultStart = initialHour !== undefined ? `${pad(initialHour)}:00` : '09:00';
  const defaultEnd = initialHour !== undefined ? `${pad(Math.min(initialHour + 1, 23))}:00` : '10:00';

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [availableSeats, setAvailableSeats] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!startTime || !endTime || startTime >= endTime) {
      setAvailableSeats(null);
      return;
    }
    const from = new Date(`${date}T${startTime}:00`).toISOString();
    const to = new Date(`${date}T${endTime}:00`).toISOString();
    getAvailabilityApi(from, to)
      .then((data) => {
        if (data.length > 0) {
          const minAvail = Math.min(...data.map((d) => d.available_seats));
          setAvailableSeats(minAvail);
        } else {
          setAvailableSeats(totalSeats);
        }
      })
      .catch(() => setAvailableSeats(null));
  }, [date, startTime, endTime, totalSeats]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startTime || !endTime || startTime >= endTime) {
      setError('Время окончания должно быть позже времени начала');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const start = new Date(`${date}T${startTime}:00`).toISOString();
      const end = new Date(`${date}T${endTime}:00`).toISOString();
      await createBookingApi(start, end);
      onSuccess();
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать бронирование');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = startTime < endTime && availableSeats !== 0 && !submitting;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`toast${showToast ? ' toast--visible' : ''}`}>Бронирование создано!</div>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Новое бронирование</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Дата</label>
            <input type="date" value={date} readOnly style={{ background: 'var(--bg)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Начало</label>
              <input
                type="time"
                value={startTime}
                min={workStart}
                max={workEnd}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Окончание</label>
              <input
                type="time"
                value={endTime}
                min={workStart}
                max={workEnd}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {availableSeats !== null && (
            <div className="availability-info">
              Свободные места:{' '}
              <strong style={{ color: availableSeats === 0 ? 'var(--danger)' : availableSeats / totalSeats > 0.5 ? 'var(--success)' : 'var(--warning)' }}>
                {availableSeats} / {totalSeats}
              </strong>
              {availableSeats === 0 && ' — Нет свободных мест'}
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {submitting ? 'Бронирую...' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
