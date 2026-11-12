import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { playPop, playSuccess } from '../lib/soundFx';
import { triggerHaptic } from '../lib/celebration';

const PRESETS = [
  { name: 'Kitap oku', tracking: 'quantity', target: 10, unit: 'sayfa' },
  { name: 'Su iç', tracking: 'quantity', target: 8, unit: 'bardak' },
  { name: 'Yürüyüş yap', tracking: 'quantity', target: 20, unit: 'dakika' },
  { name: 'Meditasyon', tracking: 'check', target: 1, unit: '' },
  { name: 'Günün Günlüğü', tracking: 'check', target: 1, unit: '' },
  { name: 'Erken Uyan', tracking: 'check', target: 1, unit: '' },
];

export default function HabitModal({ isOpen, onClose, onAddHabit, existingHabitsCount = 0 }) {
  const [name, setName] = useState('');
  const [tracking, setTracking] = useState('check'); // 'check' | 'quantity'
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState('dakika');
  const [scheduleType, setScheduleType] = useState('daily');

  // Handle ESC key for modal dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    playSuccess();
    triggerHaptic('success');

    let schedule = { type: 'daily' };
    if (scheduleType === 'weekdays') {
      schedule = { type: 'weekdays', days: [1, 2, 3, 4, 5] };
    } else if (scheduleType === 'rest_day_sunday') {
      schedule = { type: 'specific_days', days: [1, 2, 3, 4, 5, 6] };
    } else if (scheduleType === 'rest_day_saturday') {
      schedule = { type: 'specific_days', days: [1, 2, 3, 4, 5, 7] };
    }

    onAddHabit?.({
      name: name.trim().slice(0, 60),
      tracking,
      target: tracking === 'check' ? 1 : Math.max(1, Math.min(1000000, Number(target) || 1)),
      unit: tracking === 'check' ? '' : unit,
      schedule,
      progression: { enabled: false, step: 0 },
      debt: { enabled: false },
    });

    setName('');
    setTarget(1);
    onClose();
  };

  const applyPreset = (preset) => {
    playPop();
    triggerHaptic('light');
    setName(preset.name);
    setTracking(preset.tracking);
    setTarget(preset.target);
    setUnit(preset.unit || 'dakika');
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-modal-title"
      onClick={() => {
        playPop();
        onClose?.();
      }}
    >
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="dialog-sheet habit-dialog card-chunky"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true"></div>

        <div className="dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 id="habit-modal-title" style={{ margin: 0, fontSize: '20px', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            ✨ Yeni Alışkanlık Ekle
          </h2>
          <button
            type="button"
            className="button-icon icon-button"
            aria-label="Kapat"
            onClick={() => {
              playPop();
              onClose?.();
            }}
          >
            ✕
          </button>
        </div>

        {/* Quick starter presets */}
        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
            Hızlı Şablonlar
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PRESETS.map((p) => (
              <motion.button
                key={p.name}
                type="button"
                whileTap={{ scale: 0.94, y: 2 }}
                className="btn-3d btn-3d-gray"
                style={{ minHeight: '38px', padding: '0 14px', fontSize: '13px', borderRadius: '12px' }}
                onClick={() => applyPreset(p)}
              >
                + {p.name}
              </motion.button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
          <label className="field" style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px' }}>Alışkanlık Adı</span>
            <input
              className="form-input"
              style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
              placeholder="Örn: Kitap oku, Yürüyüş yap, Su iç"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
            <legend style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>Hedef Biçimi</legend>
            <div className="segmented-control" role="radiogroup" aria-label="Hedef Biçimi" style={{ width: '100%' }}>
              <button
                type="button"
                role="radio"
                aria-checked={tracking === 'check'}
                className={`segmented-item ${tracking === 'check' ? 'is-selected' : ''}`}
                style={{ flex: 1, minHeight: '44px' }}
                onClick={() => {
                  playPop();
                  triggerHaptic('light');
                  setTracking('check');
                }}
              >
                Tek Seferlik (Evet/Hayır)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tracking === 'quantity'}
                className={`segmented-item ${tracking === 'quantity' ? 'is-selected' : ''}`}
                style={{ flex: 1, minHeight: '44px' }}
                onClick={() => {
                  playPop();
                  triggerHaptic('light');
                  setTracking('quantity');
                }}
              >
                Miktar / Süre
              </button>
            </div>
          </fieldset>

          {tracking === 'quantity' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <label className="field">
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Günlük Hedef</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="10"
                  required
                />
              </label>
              <label className="field">
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Birim</span>
                <select
                  className="form-select"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="dakika">dakika</option>
                  <option value="sayfa">sayfa</option>
                  <option value="bardak">bardak</option>
                  <option value="km">km</option>
                  <option value="tekrar">tekrar</option>
                  <option value="adım">adım</option>
                  <option value="litre">litre</option>
                </select>
              </label>
            </div>
          )}

          {/* Cadence & Rest Day Selector */}
          <label className="field" style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px' }}>Planlama & Dinlenme Günü</span>
            <select
              className="form-select"
              style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '15px' }}
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value)}
            >
              <option value="daily">Her Gün (Haftada 7 Gün)</option>
              <option value="weekdays">Hafta İçi (5 Gün — Hafta Sonu Dinlenme ☕)</option>
              <option value="rest_day_sunday">Haftada 6 Gün (Pazar Dinlenme Günü ☕)</option>
              <option value="rest_day_saturday">Haftada 6 Gün (Cumartesi Dinlenme Günü ☕)</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
              Dinlenme günlerinde serin asla yanmaz; hedeflerini suçluluk duymadan sürdürebilirsin.
            </span>
          </label>

          {/* 3-Habit Behavioral Psychology Rule Banner */}
          {existingHabitsCount >= 3 && (
            <div
              style={{
                background: 'var(--surface-alt)',
                border: '1.5px solid var(--border)',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '20px' }}>💡</span>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--ink)' }}>Bilimsel Simülasyon İpucu:</strong> PACE araştırmamız, aynı anda en fazla 3 odak alışkanlığı takip eden kullanıcıların 90 günlük tutunmasının 2 kat daha yüksek olduğunu göstermektedir.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95, y: 2 }}
              className="btn-3d btn-3d-gray"
              style={{ minHeight: '48px', padding: '0 20px', borderRadius: '16px' }}
              onClick={() => {
                playPop();
                onClose?.();
              }}
            >
              İptal
            </motion.button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95, y: 3 }}
              className="btn-3d btn-3d-green"
              style={{ minHeight: '48px', padding: '0 24px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Alışkanlığı Kaydet 🚀
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
