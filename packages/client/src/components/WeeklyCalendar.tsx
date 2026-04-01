import { useState, useMemo } from 'react';
import {
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
  isToday,
  parseISO,
  getHours,
  getMinutes,
  isSameDay,
} from 'date-fns';
import { useBookings } from '../hooks/useBookings';
import { useLabSettings } from '../hooks/useLabSettings';
import { useAuth } from '../context/AuthContext';
import { BookingBlock } from './BookingBlock';
import { BookingModal } from './BookingModal';
import './WeeklyCalendar.css';

export function WeeklyCalendar() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [modal, setModal] = useState<{ date: string; hour: number } | null>(null);

  const { settings } = useLabSettings();

  const weekEnd = addDays(weekStart, 6);

  const fromStr = format(weekStart, "yyyy-MM-dd'T'00:00:00");
  const toStr = format(weekEnd, "yyyy-MM-dd'T'23:59:59");

  const { bookings, refetch } = useBookings(fromStr, toStr);

  const workStart = settings ? parseInt(settings.work_start_time.split(':')[0], 10) : 9;
  const workEndHour = settings ? parseInt(settings.work_end_time.split(':')[0], 10) : 18;
  const workEndMin = settings ? parseInt(settings.work_end_time.split(':')[1], 10) || 0 : 0;
  const workEnd = workEndMin > 0 ? Math.min(workEndHour + 1, 24) : workEndHour;
  const totalSeats = settings?.total_seats ?? 10;

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = workStart; h < workEnd; h++) arr.push(h);
    return arr;
  }, [workStart, workEnd]);

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Build a map: "YYYY-MM-DD_HH" -> bookings[]
  const cellBookings = useMemo(() => {
    const map = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      if (booking.status !== 'active') continue;
      const start = parseISO(booking.start_time);
      const end = parseISO(booking.end_time);
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');
      const startH = getHours(start);
      const rawEndH = getHours(end) + (getMinutes(end) > 0 ? 1 : 0);
      const crossesMidnight = endDate !== startDate;

      // Hours on the start day
      const endHStart = crossesMidnight ? 24 : rawEndH;
      for (let h = startH; h < endHStart; h++) {
        const key = `${startDate}_${String(h).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(booking);
      }

      // Hours on the next day (cross-midnight)
      if (crossesMidnight) {
        for (let h = 0; h < rawEndH; h++) {
          const key = `${endDate}_${String(h).padStart(2, '0')}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(booking);
        }
      }
    }
    return map;
  }, [bookings]);

  function getCellClass(day: Date, hour: number): string {
    const key = `${format(day, 'yyyy-MM-dd')}_${String(hour).padStart(2, '0')}`;
    const cellBks = cellBookings.get(key) ?? [];
    const occupied = cellBks.length;
    if (occupied === 0) return 'available';
    if (occupied >= totalSeats) return 'full';
    return 'partial';
  }

  function handleCellClick(day: Date, hour: number) {
    const cellClass = getCellClass(day, hour);
    if (cellClass === 'full') return;
    setModal({ date: format(day, 'yyyy-MM-dd'), hour });
  }

  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const maxWeek = addWeeks(today, 1);
  const canGoNext = weekStart < maxWeek;

  return (
    <div className="calendar-container">
      <div className="calendar-nav">
        <div className="calendar-nav-buttons">
          <button className="btn-secondary" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
            &lt; Назад
          </button>
          <button className="btn-secondary" onClick={() => setWeekStart(today)}>
            Сегодня
          </button>
          <button className="btn-secondary" onClick={() => setWeekStart((w) => addWeeks(w, 1))} disabled={!canGoNext}>
            Вперёд &gt;
          </button>
        </div>
        <h2>
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </h2>
      </div>

      <div className="calendar-scroll">
        <div className="calendar-grid">
          {/* Header row */}
          <div className="calendar-header-cell" style={{ background: 'var(--bg)' }} />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`calendar-header-cell${isToday(day) ? ' today' : ''}`}
            >
              <div className="day-name">{format(day, 'EEE')}</div>
              <div className="day-date">{format(day, 'd')}</div>
            </div>
          ))}

          {/* Hour rows */}
          {hours.map((hour) => (
            <>
              <div key={`label-${hour}`} className="time-label">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map((day) => {
                const key = `${format(day, 'yyyy-MM-dd')}_${String(hour).padStart(2, '0')}`;
                const cellBks = cellBookings.get(key) ?? [];
                const cellClass = getCellClass(day, hour);
                const occupied = cellBks.length;
                const available = Math.max(0, totalSeats - occupied);

                return (
                  <div
                    key={key}
                    className={`calendar-cell ${cellClass}`}
                    onClick={() => handleCellClick(day, hour)}
                    title={cellClass === 'full' ? 'Нет свободных мест' : `Нажмите для бронирования — ${available} мест свободно`}
                  >
                    {cellBks.map((b) => (
                      <BookingBlock
                        key={b.id}
                        booking={b}
                        isOwn={b.user_id === user?.id}
                        onCancelled={refetch}
                      />
                    ))}
                    <span className="cell-seats">{available}/{totalSeats}</span>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {modal && settings && (
        <BookingModal
          date={modal.date}
          initialHour={modal.hour}
          totalSeats={totalSeats}
          onClose={() => setModal(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
