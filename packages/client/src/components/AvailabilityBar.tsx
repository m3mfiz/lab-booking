interface AvailabilityBarProps {
  available: number;
  total: number;
}

export function AvailabilityBar({ available, total }: AvailabilityBarProps) {
  const occupied = total - available;
  const pct = total > 0 ? (occupied / total) * 100 : 0;

  const barColor =
    available === 0
      ? 'var(--danger)'
      : available / total > 0.5
      ? 'var(--success)'
      : 'var(--warning)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div
        style={{
          height: 6,
          background: '#e2e8f0',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            transition: 'width 0.2s',
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
        {available}/{total} свободно
      </span>
    </div>
  );
}
