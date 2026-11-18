import React from 'react';

export function Icon({ icon: IconComponent, size = 18, className = '', ...props }) {
  if (!IconComponent) return null;
  return <IconComponent size={size} strokeWidth={1.5} className={className} aria-hidden="true" {...props} />;
}

export function StatusMarker({ status = 'missed', label, className = '' }) {
  const normalized = ['done', 'missed', 'partial', 'rest'].includes(status) ? status : 'missed';
  return (
    <span
      className={`db-status-marker db-status-marker--${normalized} ${className}`.trim()}
      role="img"
      aria-label={label || `Status: ${normalized}`}
    />
  );
}

export default Icon;
