import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Icon } from './Icon.jsx';
import { IconButton } from './Button.jsx';

export function Header({ title, subtitle, actions, className = '' }) {
  return (
    <header
      className={`db-header ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-major) solid var(--border)',
        backgroundColor: 'var(--bg)',
      }}
    >
      <div>
        <h1 style={{ fontSize: '20px', lineHeight: 1.2 }}>{title}</h1>
        {subtitle ? (
          <p className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>{actions}</div> : null}
    </header>
  );
}

export function BackNav({ label = 'Back', onBack, actions, className = '' }) {
  return (
    <div
      className={`db-back-nav ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: 'var(--border-hairline) solid var(--border)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <IconButton icon={ArrowLeft} label={label} onClick={onBack} />
        <span className="mono" style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>{actions}</div> : null}
    </div>
  );
}

export function TabNav({ tabs = [], activeId, onChange, className = '' }) {
  return (
    <nav
      aria-label="Tabs"
      className={`db-tab-nav ${className}`.trim()}
      style={{
        display: 'flex',
        borderBottom: 'var(--border-hairline) solid var(--border)',
        backgroundColor: 'var(--bg)',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange?.(tab.id)}
            className="mono db-tab"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: active ? 'var(--fg)' : 'var(--fg-muted)',
              borderBottom: active ? '2px solid var(--signal)' : '2px solid transparent',
              backgroundColor: active ? 'var(--surface-1)' : 'transparent',
              opacity: tab.disabled ? 0.45 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items = [], activeId, onChange, className = '' }) {
  return (
    <nav
      aria-label="Primary"
      className={`db-bottom-nav ${className}`.trim()}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(1, items.length)}, 1fr)`,
        borderTop: 'var(--border-major) solid var(--border)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            disabled={item.disabled}
            onClick={() => onChange?.(item.id)}
            className="db-bottom-nav-item"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-1)',
              padding: 'var(--space-2) var(--space-1)',
              minHeight: '56px',
              color: active ? 'var(--signal-text)' : 'var(--fg-muted)',
              borderTop: active ? '2px solid var(--signal)' : '2px solid transparent',
              marginTop: '-2px',
            }}
          >
            {item.icon ? <Icon icon={item.icon} size={18} /> : null}
            <span className="mono" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
