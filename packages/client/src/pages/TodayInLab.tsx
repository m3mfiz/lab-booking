import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TodayBooking {
  id: number;
  user_full_name: string;
  start_time: string;
  end_time: string;
}

export function TodayInLab() {
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    apiFetch('/bookings/today')
      .then((data) => setBookings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const current: TodayBooking[] = [];
  const upcoming: TodayBooking[] = [];
  const past: TodayBooking[] = [];

  for (const b of bookings) {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    if (end <= now) {
      past.push(b);
    } else if (start <= now) {
      current.push(b);
    } else {
      upcoming.push(b);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Сегодня в классе</h1>
        <span className="today-date">{format(now, 'd MMMM, EEEE', { locale: ru })}</span>
      </div>

      {bookings.length === 0 && (
        <div className="empty-state">На сегодня нет бронирований</div>
      )}

      {current.length > 0 && (
        <section className="today-section">
          <h2 className="today-section__title today-section__title--now">Сейчас в классе</h2>
          <div className="today-cards">
            {current.map((b) => (
              <BookingCard key={b.id} booking={b} highlight />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="today-section">
          <h2 className="today-section__title">Ожидаются</h2>
          <div className="today-cards">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="today-section">
          <h2 className="today-section__title today-section__title--past">Уже были</h2>
          <div className="today-cards today-cards--past">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({ booking, highlight }: { booking: TodayBooking; highlight?: boolean }) {
  const start = format(new Date(booking.start_time), 'HH:mm');
  const end = format(new Date(booking.end_time), 'HH:mm');

  return (
    <div className={`today-card${highlight ? ' today-card--now' : ''}`}>
      <span className="today-card__name">{booking.user_full_name}</span>
      <span className="today-card__time">{start} — {end}</span>
    </div>
  );
}
