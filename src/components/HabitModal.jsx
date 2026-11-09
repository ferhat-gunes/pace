import React, { useState } from 'react';

export default function HabitModal({ isOpen, onClose, onAddHabit }) {
  const [name, setName] = useState('');
  const [tracking, setTracking] = useState('check'); // 'check' | 'quantity'
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState('dakika');
  const [scheduleType, setScheduleType] = useState('daily');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddHabit?.({
      name: name.trim(),
      tracking,
      target: tracking === 'check' ? 1 : Number(target) || 1,
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
      style={{
        position: 'fixed',
        inset: '0',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(36, 76, 58, 0.4)',
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
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header" style={{ padding: '0 0 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--forest)' }}>Alışkanlık Ekle</h2>
          <button type="button" className="icon-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          <label className="field" style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px' }}>Adı</span>
            <input
              className="form-input"
              style={{ width: '100%', height: '44px', padding: '0 12px', marginTop: '6px' }}
              placeholder="Örn: Kitap oku, Su iç"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
            <legend style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Takip Tipi</legend>
            <div className="segmented" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`button ${tracking === 'check' ? 'button-primary' : 'button-quiet'}`}
                style={{ flex: 1 }}
                onClick={() => setTracking('check')}
              >
                Yaptım (Check)
              </button>
              <button
                type="button"
                className={`button ${tracking === 'quantity' ? 'button-primary' : 'button-quiet'}`}
                style={{ flex: 1 }}
                onClick={() => setTracking('quantity')}
              >
                Miktar
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
                </select>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="button button-quiet" onClick={onClose}>İptal</button>
            <button type="submit" className="button button-primary">Kaydet</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
