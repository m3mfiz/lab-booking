import { useMemo } from 'react';
import {
  format,
  isToday,
  isBefore,
  startOfDay,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';
import type { Booking, LabSettings } from '../types';
import './DayCards.css';

interface DayCardsProps {
  days: Date[];
  bookings: Booking[];
  settings: LabSettings | null;
  onSelectDay: (day: Date) => void;
}

export type DayStatus = 'free' | 'partial' | 'full' | 'disabled';

export function getDayStatus(
  day: Date,
  bookings: Booking[],
  settings: LabSettings | null
): DayStatus {
  if (!settings) return 'disabled';

  const now = new Date();
  if (isBefore(startOfDay(day), startOfDay(now)) && !isToday(day)) {
    return 'disabled';
  }

  const workStart = parseInt(settings.work_start_time.split(':')[0], 10);
  const workEndHour = parseInt(settings.work_end_time.split(':')[0], 10);
  const workEndMin = parseInt(settings.work_end_time.split(':')[1], 10) || 0;
  const workEnd = workEndMin > 0 ? Math.min(workEndHour + 1, 24) : workEndHour;

  // Count occupied seat-hours for this day
  const dayStr = format(day, 'yyyy-MM-dd');
  const dayBookings = bookings.filter((b) => {
    if (b.status !== 'active') return false;
    const bStartDate = format(parseISO(b.start_time), 'yyyy-MM-dd');
    const bEndDate = format(parseISO(b.end_time), 'yyyy-MM-dd');
    // Include if booking starts on this day OR ends on this day (cross-midnight)
    return bStartDate === dayStr || (bEndDate !== bStartDate && bEndDate === dayStr);
  });

  if (dayBookings.length === 0) return 'free';

  // Count max occupied seats in any single hour
  const hourOccupancy = new Map<number, number>();
  for (const b of dayBookings) {
    const start = parseISO(b.start_time);
    const end = parseISO(b.end_time);
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const startH = getHours(start);
    const rawEndH = getHours(end) + (getMinutes(end) > 0 ? 1 : 0);
    const crossesMidnight = endDate !== startDate;

    if (startDate === dayStr) {
      const endH = crossesMidnight ? 24 : rawEndH;
      for (let h = startH; h < endH; h++) {
        hourOccupancy.set(h, (hourOccupancy.get(h) ?? 0) + 1);
      }
    } else if (crossesMidnight && endDate === dayStr) {
      for (let h = 0; h < rawEndH; h++) {
        hourOccupancy.set(h, (hourOccupancy.get(h) ?? 0) + 1);
      }
    }
  }

  // Check if ALL working hours are fully booked
  let allFull = true;
  for (let h = workStart; h < workEnd; h++) {
    if ((hourOccupancy.get(h) ?? 0) < settings.total_seats) {
      allFull = false;
      break;
    }
  }
  if (allFull) return 'full';
  return 'partial';
}

const statusLabels: Record<DayStatus, string> = {
  free: 'Свободно',
  partial: 'Есть записи',
  full: 'Занято',
  disabled: 'Недоступно',
};

export function DayCards({ days, bookings, settings, onSelectDay }: DayCardsProps) {
  const dayStatuses = useMemo(() => {
    return days.map((day) => ({
      day,
      status: getDayStatus(day, bookings, settings),
    }));
  }, [days, bookings, settings]);

  return (
    <div className="day-cards">
      {dayStatuses.map(({ day, status }) => {
        const isDisabled = status === 'disabled' || status === 'full';
        return (
          <button
            key={day.toISOString()}
            className={`day-card day-card--${status}${isToday(day) ? ' day-card--today' : ''}`}
            onClick={() => !isDisabled && onSelectDay(day)}
            disabled={isDisabled}
          >
            <div className="day-card__name">{format(day, 'EEE')}</div>
            <div className="day-card__date">{format(day, 'd')}</div>
            <div className="day-card__month">{format(day, 'MMM')}</div>
            <div className="day-card__status">{statusLabels[status]}</div>
          </button>
        );
      })}
    </div>
  );
}
