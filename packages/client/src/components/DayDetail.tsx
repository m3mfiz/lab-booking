import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  format,
  addDays,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';
import { createBookingApi } from '../api/bookings';
import { useAuth } from '../context/AuthContext';
import type { Booking, LabSettings } from '../types';
import './DayDetail.css';

interface DayDetailProps {
  day: Date;
  bookings: Booking[];
  settings: LabSettings;
  onBack: () => void;
  onRefetch: () => void;
}

export function DayDetail({ day, bookings, settings, onBack, onRefetch }: DayDetailProps) {
  const { user } = useAuth();
  const [anchorHour, setAnchorHour] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakingHour, setShakingHour] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const submittingRef = useRef(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  const workStart = parseInt(settings.work_start_time.split(':')[0], 10);
  const workEndHour = parseInt(settings.work_end_time.split(':')[0], 10);
  const workEndMin = parseInt(settings.work_end_time.split(':')[1], 10) || 0;
  const workEnd = workEndMin > 0 ? workEndHour + 1 : workEndHour;

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = workStart; h < Math.min(workEnd, 24); h++) arr.push(h);
    return arr;
  }, [workStart, workEnd]);

  const dayStr = format(day, 'yyyy-MM-dd');

  // Build map: hour -> bookings[]
  const hourBookings = useMemo(() => {
    const map = new Map<number, Booking[]>();
    for (const b of bookings) {
      if (b.status !== 'active') continue;
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
          if (!map.has(h)) map.set(h, []);
          map.get(h)!.push(b);
        }
      } else if (crossesMidnight && endDate === dayStr) {
        for (let h = 0; h < rawEndH; h++) {
          if (!map.has(h)) map.set(h, []);
          map.get(h)!.push(b);
        }
      }
    }
    return map;
  }, [bookings, dayStr]);

  // Set of hours where current user has a booking
  const myHours = useMemo(() => {
    const set = new Set<number>();
    if (!user) return set;
    for (const b of bookings) {
      if (b.status !== 'active' || b.user_id !== user.id) continue;
      const start = parseISO(b.start_time);
      const end = parseISO(b.end_time);
      const startDate = format(start, 'yyyy-MM-dd');
      if (startDate !== dayStr) continue;
      const startH = getHours(start);
      const rawEndH = getHours(end) + (getMinutes(end) > 0 ? 1 : 0);
      for (let h = startH; h < rawEndH; h++) set.add(h);
    }
    return set;
  }, [bookings, dayStr, user]);

  // Set of full hours
  const fullHours = useMemo(() => {
    const set = new Set<number>();
    for (const hour of hours) {
      const count = hourBookings.get(hour)?.length ?? 0;
      if (count >= settings.total_seats) set.add(hour);
    }
    return set;
  }, [hours, hourBookings, settings.total_seats]);

  // Selected hours range
  const selectedHours = useMemo(() => {
    if (anchorHour === null) return new Set<number>();
    const end = rangeEnd ?? anchorHour;
    const lo = Math.min(anchorHour, end);
    const hi = Math.max(anchorHour, end);
    const set = new Set<number>();
    for (let h = lo; h <= hi; h++) set.add(h);
    return set;
  }, [anchorHour, rangeEnd]);

  const hasSelection = selectedHours.size > 0;

  // Check if range has a full hour inside
  const rangeHasFullHour = useCallback((from: number, to: number) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    for (let h = lo; h <= hi; h++) {
      if (fullHours.has(h)) return true;
    }
    return false;
  }, [fullHours]);

  function handleTileTap(hour: number) {
    if (fullHours.has(hour)) return;
    setError(null);

    if (anchorHour === null) {
      setAnchorHour(hour);
      setRangeEnd(null);
    } else if (anchorHour === hour && rangeEnd === null) {
      setAnchorHour(null);
      setRangeEnd(null);
    } else {
      if (rangeHasFullHour(anchorHour, hour)) {
        setShakingHour(hour);
        shakeTimer.current = setTimeout(() => setShakingHour(null), 350);
        return;
      }
      setRangeEnd(hour);
    }
  }

  function handleSelectedTap(hour: number) {
    setError(null);
    if (hour === anchorHour && rangeEnd === null) {
      // Tap sole anchor — deselect all
      setAnchorHour(null);
    } else if (rangeEnd !== null) {
      // Tap inside range — keep anchor, clear range end so user can pick a new one
      setRangeEnd(null);
    }
  }

  async function handleBook() {
    if (!hasSelection || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const sortedHours = [...selectedHours].sort((a, b) => a - b);
    const startHour = sortedHours[0];
    const endHour = sortedHours[sortedHours.length - 1] + 1;

    // Use proper Date objects to preserve local timezone in ISO output
    const startDt = new Date(day);
    startDt.setHours(startHour, 0, 0, 0);
    const startTime = startDt.toISOString();

    const endDt = new Date(day);
    endDt.setHours(endHour, 0, 0, 0);
    const endTime = endDt.toISOString();

    setError(null);
    try {
      await createBookingApi(startTime, endTime);
      setAnchorHour(null);
      setRangeEnd(null);
      onRefetch();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка бронирования');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // Format selection label
  const selectionLabel = useMemo(() => {
    if (!hasSelection) return '';
    const sorted = [...selectedHours].sort((a, b) => a - b);
    const fromH = sorted[0];
    const toH = (sorted[sorted.length - 1] + 1) % 24;
    const from = String(fromH).padStart(2, '0') + ':00';
    const to = String(toH).padStart(2, '0') + ':00';
    return `Забронировать ${from} – ${to}`;
  }, [selectedHours, hasSelection]);

  return (
    <div className="day-detail">
      <div className={`toast${showToast ? ' toast--visible' : ''}`}>Бронирование создано!</div>
      <div className="day-detail__header">
        <button className="btn-secondary day-detail__back" onClick={onBack}>
          ← Назад
        </button>
        <h2>{format(day, 'EEEE, d MMMM')}</h2>
      </div>

      <div className="day-detail__grid">
        {hours.map((hour) => {
          const isFull = fullHours.has(hour);
          const isSelected = selectedHours.has(hour);
          const isMine = myHours.has(hour);
          const isShaking = shakingHour === hour;

          const classes = [
            'slot-tile',
            isSelected && 'slot-tile--selected',
            isFull && 'slot-tile--full',
            isMine && !isSelected && !isFull && 'slot-tile--mine',
            isShaking && 'slot-tile--shake',
          ].filter(Boolean).join(' ');

          const label = `${String(hour).padStart(2, '0')}:00 — ${
            isFull ? 'недоступно' : isMine ? 'ваше бронирование' : isSelected ? 'выбрано' : 'свободно'
          }`;

          return (
            <button
              key={hour}
              className={classes}
              disabled={isFull}
              aria-pressed={isSelected}
              aria-label={label}
              onClick={() => isSelected ? handleSelectedTap(hour) : handleTileTap(hour)}
            >
              {String(hour).padStart(2, '0')}:00
            </button>
          );
        })}
      </div>

      {error && <div className="day-detail__error">{error}</div>}

      <div className={`day-detail__book-bar${hasSelection ? ' day-detail__book-bar--visible' : ''}`}>
        <button
          className="day-detail__book-btn"
          onClick={handleBook}
          disabled={submitting || !hasSelection}
          aria-label={selectionLabel}
        >
          {submitting ? 'Бронирую...' : selectionLabel}
        </button>
      </div>
    </div>
  );
}
