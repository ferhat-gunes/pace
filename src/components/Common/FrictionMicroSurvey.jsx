import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { trackEvent, isFeatureEnabled } from '../../lib/telemetry';

const SURVEY_STORAGE_KEY = 'pace_comeback_survey_answered';

const REASONS = [
  { id: 'time', label: 'Zaman darlığı' },
  { id: 'target_too_big', label: 'Hedef büyük geldi' },
  { id: 'missed_reminder', label: 'Hatırlatıcı eksikti' },
  { id: 'just_a_break', label: 'Sadece mola verdim' },
];

export default function FrictionMicroSurvey({ todayIso }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(SURVEY_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [selectedReason, setSelectedReason] = useState(null);

  if (!isFeatureEnabled('tally_churn_microsurvey') || dismissed) {
    return null;
  }

  const handleSelect = (reason) => {
    setSelectedReason(reason.id);
    trackEvent('micro_survey_submitted', {
      reason: reason.id,
      date: todayIso,
    });
    try {
      localStorage.setItem(SURVEY_STORAGE_KEY, `${todayIso}:${reason.id}`);
    } catch {}
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(SURVEY_STORAGE_KEY, `${todayIso}:dismissed`);
    } catch {}
  };

  return (
    <div
      style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        width: '100%',
      }}
    >
      {selectedReason ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--ink)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Check size={14} aria-hidden="true" />
            Geri bildirimin kaydedildi, teşekkürler.
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Kapat"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              minWidth: '32px',
              minHeight: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
              Ara vermene en çok ne sebep oldu? (İsteğe bağlı)
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Anketi kapat"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px',
                minWidth: '32px',
                minHeight: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r)}
                style={{
                  minHeight: '36px',
                  padding: '0 12px',
                  borderRadius: '999px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
