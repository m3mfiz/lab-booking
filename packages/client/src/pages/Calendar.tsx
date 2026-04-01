import { useState, useMemo } from 'react';
import {
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
} from 'date-fns';
import { useIsMobile } from '../hooks/useIsMobile';
import { useBookings } from '../hooks/useBookings';
import { useLabSettings } from '../hooks/useLabSettings';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { DayCards } from '../components/DayCards';
import { DayDetail } from '../components/DayDetail';

export function Calendar() {
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { settings } = useLabSettings();
  const weekEnd = addDays(weekStart, 6);

  const fromStr = format(weekStart, "yyyy-MM-dd'T'00:00:00");
  const toStr = format(weekEnd, "yyyy-MM-dd'T'23:59:59");
  const { bookings, loading: bookingsLoading, error: bookingsError, refetch } = useBookings(fromStr, toStr);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const maxWeek = addWeeks(today, 1);
  const canGoNext = weekStart < maxWeek;
  const canGoPrev = weekStart > today;

  if (isMobile) {
    return (
      <div>
        {!selectedDay ? (
          <>
            <div className="mobile-week-nav">
              <button className="btn-secondary" onClick={() => setWeekStart((w) => subWeeks(w, 1))} disabled={!canGoPrev}>
                ←
              </button>
              <h2 className="mobile-week-title">
                {format(weekStart, 'd MMM')} – {format(weekEnd, 'd MMM')}
              </h2>
              <button
                className="btn-secondary"
                onClick={() => setWeekStart((w) => addWeeks(w, 1))}
                disabled={!canGoNext}
              >
                →
              </button>
            </div>
            {bookingsLoading && <div className="loading">Загрузка...</div>}
            {bookingsError && <div className="error-msg">{bookingsError}</div>}
            {!bookingsLoading && (
              <DayCards
                days={days}
                bookings={bookings}
                settings={settings}
                onSelectDay={setSelectedDay}
              />
            )}
          </>
        ) : (
          settings && (
            <DayDetail
              day={selectedDay}
              bookings={bookings}
              settings={settings}
              onBack={() => setSelectedDay(null)}
              onRefetch={refetch}
            />
          )
        )}

      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Календарь</h1>
      </div>
      <WeeklyCalendar />
    </div>
  );
}
