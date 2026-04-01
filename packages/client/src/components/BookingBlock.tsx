import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { cancelBookingApi } from '../api/bookings';
import type { Booking } from '../types';

interface BookingBlockProps {
  booking: Booking;
  isOwn: boolean;
  onCancelled: () => void;
}

export function BookingBlock({ booking, isOwn, onCancelled }: BookingBlockProps) {
  const [hovered, setHovered] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const start = format(parseISO(booking.start_time), 'HH:mm');
  const end = format(parseISO(booking.end_time), 'HH:mm');

  async function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Отменить бронирование?')) return;
    setCancelling(true);
    try {
      await cancelBookingApi(booking.id);
      onCancelled();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отменить бронирование');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isOwn ? '#dbeafe' : '#f0fdf4',
        border: `1px solid ${isOwn ? '#93c5fd' : '#86efac'}`,
        borderRadius: 4,
        padding: '2px 6px',
        fontSize: 11,
        lineHeight: 1.4,
        marginBottom: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontWeight: 600, color: isOwn ? 'var(--primary)' : 'var(--success)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {booking.user_full_name}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
        {start}–{end}
      </div>
      {isOwn && hovered && booking.status === 'active' && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            background: 'var(--danger)',
            color: 'white',
            border: 'none',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          {cancelling ? '...' : '✕'}
        </button>
      )}
    </div>
  );
}
