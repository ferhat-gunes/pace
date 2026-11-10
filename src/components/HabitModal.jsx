import React, { useState, useEffect } from 'react';

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

  return (
    <dialog
      className="habit-dialog"
      open
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-modal-title"
      style={{
        position: 'fixed',
        inset: '0',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(36, 76, 58, 0.45)',
        border: 'none',
        width: '100%',
        maxWidth: '100%',
        height: '100%',
      }}
      onClick={onClose}
    >
      <div
        className="dialog-body"
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          width: 'min(500px, 92vw)',
          color: 'var(--ink)',
          boxShadow: '0 8px 32px rgba(36, 76, 58, 0.16)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 id="habit-modal-title" style={{ margin: 0, fontSize: '20px', color: 'var(--forest)' }}>
            Yeni Alışkanlık Ekle
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Kapat"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          <label className="field" style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px' }}>Alışkanlık Adı</span>
            <input
              className="form-input"
              style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
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
            <div className="segmented" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`button ${tracking === 'check' ? 'button-primary' : 'button-quiet'}`}
                style={{
                  flex: 1,
                  height: '42px',
                  background: tracking === 'check' ? 'var(--forest)' : undefined,
                  color: tracking === 'check' ? '#FFFFFF' : undefined,
                  borderColor: tracking === 'check' ? 'var(--forest)' : undefined,
                }}
                onClick={() => setTracking('check')}
              >
                Tek Seferlik (Evet/Hayır)
              </button>
              <button
                type="button"
                className={`button ${tracking === 'quantity' ? 'button-primary' : 'button-quiet'}`}
                style={{
                  flex: 1,
                  height: '42px',
                  background: tracking === 'quantity' ? 'var(--forest)' : undefined,
                  color: tracking === 'quantity' ? '#FFFFFF' : undefined,
                  borderColor: tracking === 'quantity' ? 'var(--forest)' : undefined,
                }}
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
                  style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Birim</span>
                <select
                  className="form-select"
                  style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="dakika">dakika</option>
                  <option value="sayfa">sayfa</option>
                  <option value="bardak">bardak</option>
                  <option value="km">km</option>
                  <option value="tekrar">tekrar</option>
                  <option value="adım">adım</option>
                </select>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="button"
              className="button button-quiet"
              style={{ minHeight: '42px' }}
              onClick={onClose}
            >
              İptal
            </button>
            <button
              type="submit"
              className="button button-primary"
              style={{ minHeight: '42px', padding: '0 20px' }}
            >
              Alışkanlığı Kaydet
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
