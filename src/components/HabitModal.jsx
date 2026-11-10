import React, { useState, useEffect } from 'react';

const PRESETS = [
  { name: 'Kitap oku', tracking: 'quantity', target: 20, unit: 'sayfa' },
  { name: 'Su iç', tracking: 'quantity', target: 8, unit: 'bardak' },
  { name: 'Yürüyüş yap', tracking: 'quantity', target: 30, unit: 'dakika' },
  { name: 'Meditasyon', tracking: 'check', target: 1, unit: '' },
];

export default function HabitModal({ isOpen, onClose, onAddHabit }) {
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

    onAddHabit?.({
      name: name.trim().slice(0, 60),
      tracking,
      target: tracking === 'check' ? 1 : Math.max(1, Math.min(1000000, Number(target) || 1)),
      unit: tracking === 'check' ? '' : unit,
      schedule: { type: scheduleType },
      progression: { enabled: false, step: 0 },
      debt: { enabled: false },
    });

    setName('');
    setTarget(1);
    onClose();
  };

  const applyPreset = (preset) => {
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
      onClick={onClose}
    >
      <div
        className="dialog-sheet habit-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true"></div>

        <div className="dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 id="habit-modal-title" style={{ margin: 0, fontSize: '20px', color: 'var(--forest)' }}>
            Yeni Alışkanlık Ekle
          </h2>
          <button
            type="button"
            className="button-icon icon-button"
            aria-label="Kapat"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Quick starter presets */}
        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
            Hızlı Şablonlar
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="button button-quiet"
                style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px', borderRadius: '8px' }}
                onClick={() => applyPreset(p)}
              >
                + {p.name}
              </button>
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
                onClick={() => setTracking('check')}
              >
                Tek Seferlik (Evet/Hayır)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tracking === 'quantity'}
                className={`segmented-item ${tracking === 'quantity' ? 'is-selected' : ''}`}
                style={{ flex: 1, minHeight: '44px' }}
                onClick={() => setTracking('quantity')}
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
                  type="number"
                  min="1"
                  max="1000000"
                  className="form-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
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

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="button"
              className="button button-quiet"
              style={{ minHeight: '48px', padding: '0 20px' }}
              onClick={onClose}
            >
              İptal
            </button>
            <button
              type="submit"
              className="button button-primary"
              style={{ minHeight: '48px', padding: '0 24px' }}
            >
              Alışkanlığı Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
