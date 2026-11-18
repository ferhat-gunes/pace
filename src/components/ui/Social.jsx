import React from 'react';
import { Button } from './Button.jsx';

export function UserIdentity({ name, handle, isCurrentUser = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span
        className="mono"
        style={{
          width: '28px',
          height: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-strong)',
          backgroundColor: isCurrentUser ? 'var(--signal)' : 'var(--surface-2)',
          color: isCurrentUser ? 'var(--signal-fg)' : 'var(--fg)',
          fontSize: '12px',
          fontWeight: 700,
        }}
      >
        {(name || '?').slice(0, 2).toUpperCase()}
      </span>
      <div>
        <div style={{ fontWeight: 600, fontSize: '14px', color: isCurrentUser ? 'var(--signal-text)' : 'var(--fg)' }}>{name}</div>
        {handle ? <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{handle}</div> : null}
      </div>
    </div>
  );
}

export function GroupMemberIdentity({ name, role, isCurrentUser = false }) {
  return <UserIdentity name={name} handle={role} isCurrentUser={isCurrentUser} />;
}

export function InvitationRow({ groupName, inviter, onAccept, onDecline }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{groupName}</div>
        {inviter ? <div className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>Invited by {inviter}</div> : null}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" onClick={onAccept}>Accept</Button>
        <Button variant="secondary" onClick={onDecline}>Decline</Button>
      </div>
    </div>
  );
}

export function ActivityItem({ actor, summary, timestamp, children }) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: '14px' }}><strong>{actor}</strong> {summary}</span>
        {timestamp ? <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>{timestamp}</span> : null}
      </div>
      {children ? <div style={{ marginTop: 'var(--space-2)' }}>{children}</div> : null}
    </div>
  );
}

export function Comment({ author, body, timestamp }) {
  return (
    <div style={{ padding: 'var(--space-2) var(--space-3)', borderLeft: '2px solid var(--border-strong)', backgroundColor: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <strong>{author}</strong>
        {timestamp ? <span className="mono" style={{ color: 'var(--fg-muted)' }}>{timestamp}</span> : null}
      </div>
      <p style={{ fontSize: '13px', marginTop: 'var(--space-1)' }}>{body}</p>
    </div>
  );
}

export function Reaction({ label, count = 0, active = false, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="mono db-reaction"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '2px var(--space-2)',
        border: `1px solid ${active ? 'var(--signal)' : 'var(--border)'}`,
        backgroundColor: active ? 'var(--surface-2)' : 'var(--surface-1)',
        color: active ? 'var(--signal-text)' : 'var(--fg-muted)',
        fontSize: '12px',
      }}
    >
      <span>{label}</span>
      <span>{count}</span>
    </button>
  );
}
