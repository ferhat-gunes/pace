import React from 'react';
import { Search, X } from 'lucide-react';
import { Icon } from './Icon.jsx';

export function FieldError({ error, id }) {
  if (!error) return null;
  return (
    <p id={id} className="db-field-error" role="alert">
      {error}
    </p>
  );
}

export function FormField({ label, htmlFor, error, hint, children, className = '' }) {
  return (
    <div className={`db-field ${className}`.trim()}>
      {label ? (
        <label htmlFor={htmlFor} className="db-label">
          {label}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
          {hint}
        </p>
      ) : null}
      <FieldError error={error} />
    </div>
  );
}

export function TextInput({ error, label, help, className = '', ...props }) {
  const input = <input className={`db-input ${className}`.trim()} aria-invalid={Boolean(error) || undefined} {...props} />;
  if (label || help) {
    return (
      <FormField label={label} htmlFor={props.id} error={error} hint={help}>
        {input}
      </FormField>
    );
  }
  return input;
}

export function SearchInput({ error, onClear, label, className = '', value, ...props }) {
  const hasValue = Boolean(value);
  const inputEl = (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: '12px', color: 'var(--fg-muted)', pointerEvents: 'none', display: 'flex' }}>
        <Icon icon={Search} size={16} />
      </span>
      <input
        type="search"
        value={value}
        className={`db-input ${className}`.trim()}
        style={{ paddingLeft: '36px', paddingRight: hasValue && onClear ? '44px' : undefined }}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Aramayı temizle"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '44px',
            height: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
          }}
        >
          <Icon icon={X} size={16} />
        </button>
      ) : null}
    </div>
  );
  if (label) {
    return (
      <FormField label={label} htmlFor={props.id} error={error}>
        {inputEl}
      </FormField>
    );
  }
  return inputEl;
}

export function Textarea({ error, className = '', ...props }) {
  return <textarea className={`db-textarea ${className}`.trim()} aria-invalid={Boolean(error) || undefined} {...props} />;
}

export function Select({ options = [], error, label, help, className = '', children, ...props }) {
  const select = (
    <select className={`db-select ${className}`.trim()} aria-invalid={Boolean(error) || undefined} {...props}>
      {children || options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
  if (label || help) {
    return (
      <FormField label={label} htmlFor={props.id} error={error} hint={help}>
        {select}
      </FormField>
    );
  }
  return select;
}

export function DateTimePicker({ type = 'date', error, className = '', ...props }) {
  return <input type={type} className={`db-input mono ${className}`.trim()} aria-invalid={Boolean(error) || undefined} {...props} />;
}

export function Checkbox({ label, checked, onChange, disabled = false, ...props }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: '44px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ accentColor: 'var(--signal)', width: '18px', height: '18px' }} {...props} />
      <span style={{ fontSize: '14px' }}>{label}</span>
    </label>
  );
}

export function Radio({ label, name, value, checked, onChange, disabled = false, ...props }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: '44px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} style={{ accentColor: 'var(--signal)', width: '18px', height: '18px' }} {...props} />
      <span style={{ fontSize: '14px' }}>{label}</span>
    </label>
  );
}

export function Toggle({ label, checked = false, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="db-toggle"
      onClick={() => onChange?.(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        minHeight: '44px',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        style={{
          width: '40px',
          height: '22px',
          border: '1px solid var(--border-strong)',
          backgroundColor: checked ? 'var(--signal)' : 'var(--surface-1)',
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px',
          justifyContent: checked ? 'flex-end' : 'flex-start',
        }}
      >
        <span style={{ width: '16px', height: '16px', backgroundColor: checked ? 'var(--signal-fg)' : 'var(--fg-muted)' }} />
      </span>
      {label ? <span style={{ fontSize: '14px' }}>{label}</span> : null}
    </button>
  );
}
