import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Plus } from 'lucide-react';
import { playPop, playSuccess } from '../lib/soundFx';
import { triggerHaptic } from '../lib/celebration';

const STARTER_PRESETS = [
  {
    id: 'preset-water',
    icon: '💧',
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
    icon: '📖',
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
    icon: '🚶',
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
    icon: '🧘',
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
    playPop();
    triggerHaptic('light');
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
    playSuccess();
    triggerHaptic('success');
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
    <div className="empty-state card-chunky" style={{ padding: '24px 18px', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'var(--primary-soft)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0,
          }}
        >
          🌱
        </div>
        <div>
          <h2 style={{ fontSize: '18px', color: 'var(--ink)', margin: '0 0 2px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Kendi ritmini 30 saniyede kur
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
            En fazla 3 küçük rutin seç; bugün ilk adımını hemen işaretle.
          </p>
        </div>
      </div>

      <div
        role="group"
        aria-label="Başlangıç rutinleri"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          margin: '16px 0',
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
              className="btn-3d btn-3d-gray"
              style={{
                minHeight: '56px',
                padding: '10px 12px',
                borderRadius: '16px',
                justifyContent: 'space-between',
                textAlign: 'left',
                borderColor: isSelected ? 'var(--green)' : 'var(--border)',
                background: isSelected ? 'var(--green-soft)' : 'var(--surface)',
                boxShadow: isSelected ? '0 3px 0 var(--green)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{preset.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preset.name}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                    {preset.subtitle}
                  </div>
                </div>
              </div>
              {isSelected && (
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '999px',
                    background: 'var(--green)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <motion.button
          type="button"
          className="btn-3d btn-3d-green"
          disabled={selectedIds.length === 0 || submitting}
          whileTap={{ scale: 0.96, y: 2 }}
          style={{ flex: '1 1 180px', minHeight: '48px', padding: '0 18px', fontSize: '14px', borderRadius: '16px' }}
          onClick={handleStartSelected}
        >
          {submitting ? 'Ekleniyor…' : `Seçilenlerle Başla (${selectedIds.length})`}
        </motion.button>
        <button
          type="button"
          className="btn-3d btn-3d-gray"
          style={{ flex: '0 1 auto', minHeight: '48px', padding: '0 14px', fontSize: '13px', borderRadius: '16px' }}
          onClick={() => {
            playPop();
            onOpenCustomModal?.();
          }}
        >
          <Plus size={16} />
          <span>Kendin Yaz</span>
        </button>
      </div>
    </div>
  );
}
