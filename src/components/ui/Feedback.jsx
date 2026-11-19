import React from 'react';
import { Loader2, X } from 'lucide-react';
import { Icon } from './Icon.jsx';
import { Button, IconButton } from './Button.jsx';

export function Toast({ message, tone = 'neutral', onClose }) {
  if (!message) return null;
  const borderColor = tone === 'danger' ? 'var(--danger)' : tone === 'signal' ? 'var(--signal)' : 'var(--border-strong)';
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        backgroundColor: 'var(--surface-2)',
        border: `1px solid ${borderColor}`,
        color: 'var(--fg)',
      }}
    >
      <span className="mono" style={{ fontSize: '13px' }}>{message}</span>
      {onClose ? <IconButton icon={X} label="Kapat" onClick={onClose} /> : null}
    </div>
  );
}

export function InlineFeedback({ message, children, action, tone = 'neutral', role = 'status', ...rest }) {
  const content = children ?? message;
  if (!content && !action) return null;
  const isDanger = tone === 'danger' || tone === 'error';
  const color = isDanger ? 'var(--danger)' : tone === 'signal' ? 'var(--signal-text)' : 'var(--fg-muted)';
  return (
    <div
      role={role}
      {...rest}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        border: `1px solid ${isDanger ? 'var(--danger)' : 'var(--border)'}`,
        backgroundColor: 'var(--surface-1)',
        color,
        fontSize: '12px',
      }}
    >
      {content ? <div className="mono">{content}</div> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function Modal({ open, title, onClose, closeDisabled = false, closeLabel = 'Kapat', children, footer }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !closeDisabled) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        backgroundColor: 'rgba(14, 14, 14, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '16px' }}>{title}</h2>
          {onClose ? <IconButton icon={X} label={closeLabel} disabled={closeDisabled} onClick={onClose} /> : null}
        </div>
        <div style={{ padding: 'var(--space-4)', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>{children}</div>
        {footer ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Confirmation({ open, title, message, confirmLabel = 'Onayla', cancelLabel = 'İptal', onConfirm, onCancel, destructive = false }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <p style={{ fontSize: '14px', color: 'var(--fg-muted)' }}>{message}</p>
    </Modal>
  );
}

export function LoadingState({ label = 'YÜKLENİYOR...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-8)', color: 'var(--fg-muted)' }}>
      <Icon icon={Loader2} size={18} className="db-spin" />
      <span className="mono" style={{ fontSize: '12px' }}>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div style={{ padding: 'var(--space-8) var(--space-4)', border: '1px solid var(--border)', backgroundColor: 'var(--surface-1)', textAlign: 'center' }}>
      <h3 style={{ fontSize: '16px' }}>{title}</h3>
      {description ? <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginTop: 'var(--space-2)' }}>{description}</p> : null}
      {action ? <div style={{ marginTop: 'var(--space-4)' }}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = 'HATA', message, onRetry, retryLabel = 'Yeniden dene', action = null }) {
  return (
    <div role="alert" style={{ padding: 'var(--space-6) var(--space-4)', border: '1px solid var(--danger)', backgroundColor: 'var(--surface-1)' }}>
      <h3 className="mono" style={{ fontSize: '14px', color: 'var(--danger)' }}>{title}</h3>
      {message ? <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginTop: 'var(--space-2)' }}>{message}</p> : null}
      {(onRetry || action) ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
          {onRetry ? <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button> : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
