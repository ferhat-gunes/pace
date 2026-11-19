import React from 'react';
import { StatusMarker } from './Icon.jsx';

export { StatusMarker };

export function StreakBadge({ count = 0, label = 'SERİ' }) {
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '2px var(--space-2)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-1)',
        fontSize: '12px',
        fontWeight: 700,
      }}
    >
      <span style={{ color: count > 0 ? 'var(--signal-text)' : 'var(--fg-muted)' }}>{count}</span>
      <span style={{ color: 'var(--fg-muted)', fontSize: '10px' }}>{label}</span>
    </span>
  );
}

export function StatBlock({ label, value, highlight = false }) {
  return (
    <div
      style={{
        padding: 'var(--space-3)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: '24px',
          fontWeight: 700,
          marginTop: 'var(--space-1)',
          color: highlight ? 'var(--signal-text)' : 'var(--fg)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {label ? (
        <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--fg-muted)' }}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      ) : null}
      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--signal)' }} />
      </div>
    </div>
  );
}

export function HabitRow({ title, meta, status = 'missed', streak = 0, onToggle, actions }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <button
        type="button"
        className="db-habit-row"
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left', flex: 1, padding: 'var(--space-1)' }}
      >
        <StatusMarker status={status} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{title}</div>
          {meta ? <div className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>{meta}</div> : null}
        </div>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <StreakBadge count={streak} />
        {actions}
      </div>
    </div>
  );
}

export function GroupMemberRow({ name, role, status = 'missed', isCurrentUser = false, streak = 0 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border)',
        backgroundColor: isCurrentUser ? 'var(--surface-2)' : 'var(--surface-1)',
        borderLeft: isCurrentUser ? '2px solid var(--signal)' : '2px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <StatusMarker status={status} />
        <div>
          <div style={{ fontWeight: 600, color: isCurrentUser ? 'var(--signal-text)' : 'var(--fg)' }}>{name}</div>
          {role ? <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{role}</div> : null}
        </div>
      </div>
      <StreakBadge count={streak} />
    </div>
  );
}

export function ActivityRow({ actor, action, timestamp, status = 'done' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <StatusMarker status={status} />
        <div style={{ fontSize: '14px' }}>
          <strong>{actor}</strong> {action}
        </div>
      </div>
      {timestamp ? <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{timestamp}</span> : null}
    </div>
  );
}

export function CalendarGrid({ days = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-1)' }}>
      {days.map((day, idx) => (
        <div
          key={day.date || idx}
          title={day.date}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-2)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-1)',
            gap: 'var(--space-1)',
          }}
        >
          <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{day.label || idx + 1}</span>
          <StatusMarker status={day.status || 'missed'} />
        </div>
      ))}
    </div>
  );
}

export function Table({ columns = [], rows = [] }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)' }}>
            {columns.map((col) => (
              <th key={col.key} className="mono" style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id || idx} style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '13px' }}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
