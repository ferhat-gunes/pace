import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { trackEvent, isFeatureEnabled } from '../../lib/telemetry';
import { Button, IconButton } from '../ui/index.js';

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
        marginTop: 'var(--space-3)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--border)',
        width: '100%',
      }}
    >
      {selectedReason ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            fontSize: '12px',
            color: 'var(--fg)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 700 }}>
            <Check size={14} aria-hidden="true" />
            Geri bildirimin kaydedildi, teşekkürler.
          </span>
          <IconButton icon={X} label="Kapat" onClick={handleDismiss} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fg)' }}>
              Ara vermene en çok ne sebep oldu? (İsteğe bağlı)
            </span>
            <IconButton icon={X} label="Anketi kapat" onClick={handleDismiss} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {REASONS.map((r) => (
              <Button
                key={r.id}
                variant="secondary"
                size="sm"
                onClick={() => handleSelect(r)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
