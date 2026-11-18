import React from 'react';
import { Loader2 } from 'lucide-react';
import { Icon } from './Icon.jsx';

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`db-btn db-btn--${variant} ${className}`.trim()}
      {...props}
    >
      {loading ? <Icon icon={Loader2} size={16} className="db-spin" /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  pressed,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={`db-icon-btn ${className}`.trim()}
      {...props}
    >
      <Icon icon={icon} size={18} />
    </button>
  );
}
