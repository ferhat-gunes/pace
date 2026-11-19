import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, StatusMarker } from './ui/index.js';

const STARTER_PRESETS = [
  {
    id: 'preset-water',
    name: 'Su iç',
    subtitle: 'Günde 6 bardak',
    tracking: 'quantity',
    direction: 'at_least',
    unit: 'bardak',
    target: 6,
    schedule: { type: 'daily' },
  },
  {
    id: 'preset-read',
    name: 'Kitap oku',
    subtitle: 'Günde 15 dakika',
    tracking: 'quantity',
    direction: 'at_least',
    unit: 'dakika',
    target: 15,
    schedule: { type: 'daily' },
  },
  {
    id: 'preset-walk',
    name: 'Yürüyüş yap',
    subtitle: 'Haftada 3 gün',
    tracking: 'check',
    direction: 'at_least',
    unit: '',
    target: 1,
    schedule: { type: 'weekly_quota', times_per_week: 3 },
  },
  {
    id: 'preset-focus',
    name: 'Nefes & Odak',
    subtitle: 'Günde 5 dakika',
    tracking: 'quantity',
    direction: 'at_least',
    unit: 'dakika',
    target: 5,
    schedule: { type: 'daily' },
  },
];

export default function OnboardingStarter({ onAddStarterHabits, onOpenCustomModal }) {
  const [selectedIds, setSelectedIds] = useState(['preset-water', 'preset-read']);
  const [submitting, setSubmitting] = useState(false);

  const togglePreset = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleStartSelected = async () => {
    if (selectedIds.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const chosen = STARTER_PRESETS.filter((p) => selectedIds.includes(p.id)).map((p) => ({
        name: p.name,
        tracking: p.tracking,
        direction: p.direction,
        unit: p.unit,
        target: p.target,
        schedule: p.schedule,
        progression: { enabled: false, step: 0 },
        debt: { enabled: false },
      }));
      await onAddStarterHabits?.(chosen);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: 'var(--space-6)',
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        textAlign: 'left',
      }}
    >
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--fg)', margin: '0 0 var(--space-1)', fontWeight: 700 }}>
          Kendi ritmini 30 saniyede kur
        </h2>
        <p style={{ color: 'var(--fg-muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
          En fazla 3 rutin seç; bugün ilk adımını hemen işaretle.
        </p>
      </div>

      <div
        role="group"
        aria-label="Başlangıç rutinleri"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-2)',
          margin: 'var(--space-4) 0',
        }}
      >
        {STARTER_PRESETS.map((preset) => {
          const isSelected = selectedIds.includes(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => togglePreset(preset.id)}
              style={{
                minHeight: '56px',
                padding: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                textAlign: 'left',
                border: isSelected ? '2px solid var(--signal)' : '1px solid var(--border)',
                background: isSelected ? 'var(--surface-2)' : 'var(--bg)',
                color: 'var(--fg)',
                cursor: 'pointer',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {preset.name}
                </div>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '2px' }}>
                  {preset.subtitle}
                </div>
              </div>
              <StatusMarker status={isSelected ? 'done' : 'missed'} size={14} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          size="md"
          disabled={selectedIds.length === 0 || submitting}
          loading={submitting}
          style={{ flex: '1 1 180px' }}
          onClick={handleStartSelected}
        >
          {submitting ? 'Ekleniyor…' : `Seçilenlerle Başla (${selectedIds.length})`}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => onOpenCustomModal?.()}
        >
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>Kendin Yaz</span>
        </Button>
      </div>
    </div>
  );
}
