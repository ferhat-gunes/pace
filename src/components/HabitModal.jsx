import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { playPop, playSuccess } from '../lib/soundFx';
import { triggerHaptic } from '../lib/celebration';

const DAYS = [
  { id: 1, label: 'Pzt', name: 'Pazartesi' },
  { id: 2, label: 'Sal', name: 'Salı' },
  { id: 3, label: 'Çar', name: 'Çarşamba' },
  { id: 4, label: 'Per', name: 'Perşembe' },
  { id: 5, label: 'Cum', name: 'Cuma' },
  { id: 6, label: 'Cmt', name: 'Cumartesi' },
  { id: 0, label: 'Paz', name: 'Pazar' },
];

export default function HabitModal({
  isOpen,
  onClose,
  onAddHabit,
  onUpdateHabit,
  editingHabit = null,
  existingHabitsCount = 0,
}) {
  const [name, setName] = useState('');
  const [tracking, setTracking] = useState('check'); // 'check' | 'quantity'
  const [direction, setDirection] = useState('at_least'); // 'at_least' | 'at_most'
  const [target, setTarget] = useState('1');
  const [unit, setUnit] = useState('dakika');
  const [scheduleMode, setScheduleMode] = useState('days'); // 'days' | 'weekly_quota'
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5, 6, 0]);
  const [timesPerWeek, setTimesPerWeek] = useState(3);

  useEffect(() => {
    if (!isOpen) return;
    if (editingHabit) {
      setName(editingHabit.name || '');
      setTracking(editingHabit.tracking === 'quantity' ? 'quantity' : 'check');
      setDirection(editingHabit.direction === 'at_most' ? 'at_most' : 'at_least');
      setTarget(String(editingHabit.target || 1));
      setUnit(editingHabit.unit || 'dakika');
      if (editingHabit.schedule?.type === 'weekly_quota') {
        setScheduleMode('weekly_quota');
        setTimesPerWeek(Number(editingHabit.schedule.times_per_week || 3));
        setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
      } else {
        setScheduleMode('days');
        if (editingHabit.schedule?.type === 'weekdays' && Array.isArray(editingHabit.schedule.days) && editingHabit.schedule.days.length > 0) {
          setSelectedDays(editingHabit.schedule.days);
        } else {
          setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
        }
      }
    } else {
      setName('');
      setTracking('check');
      setDirection('at_least');
      setTarget('10');
      setUnit('dakika');
      setScheduleMode('days');
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
      setTimesPerWeek(3);
    }
  }, [isOpen, editingHabit]);

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

  const toggleDay = (dayId) => {
    playPop();
    triggerHaptic('light');
    setScheduleMode('days');
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const selectAllDays = () => {
    playPop();
    triggerHaptic('light');
    setScheduleMode('days');
    setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
  };

  const selectWeekdays = () => {
    playPop();
    triggerHaptic('light');
    setScheduleMode('days');
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const selectWeekend = () => {
    playPop();
    triggerHaptic('light');
    setScheduleMode('days');
    setSelectedDays([6, 0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    playSuccess();
    triggerHaptic('success');

    let schedule;
    if (scheduleMode === 'weekly_quota') {
      schedule = { type: 'weekly_quota', times_per_week: Math.min(7, Math.max(1, Number(timesPerWeek) || 3)) };
    } else if (selectedDays.length === 7) {
      schedule = { type: 'daily' };
    } else {
      schedule = { type: 'weekdays', days: [...selectedDays] };
    }

    const numericTarget = tracking === 'check'
      ? 1
      : Math.max(0.1, Math.min(1000000, Number(String(target).replace(',', '.')) || 1));

    const payload = {
      name: name.trim().slice(0, 60),
      tracking,
      direction: tracking === 'check' ? 'at_least' : direction,
      target: numericTarget,
      unit: tracking === 'check' ? '' : unit,
      schedule,
      progression: editingHabit?.progression || { enabled: false, step: 0 },
      debt: editingHabit?.debt || { enabled: false },
    };

    if (editingHabit) {
      onUpdateHabit?.(editingHabit.id, payload);
    } else {
      onAddHabit?.(payload);
    }

    onClose();
  };

  const isAllDays = scheduleMode === 'days' && selectedDays.length === 7;
  const isWeekdaysOnly =
    scheduleMode === 'days' &&
    selectedDays.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => selectedDays.includes(d));
  const isWeekendOnly =
    scheduleMode === 'days' &&
    selectedDays.length === 2 &&
    [6, 0].every((d) => selectedDays.includes(d));

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
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90dvh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true"></div>

        <div
          className="dialog-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 0 12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <h2
            id="habit-modal-title"
            style={{
              margin: 0,
              fontSize: '20px',
              color: 'var(--ink)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
            }}
          >
            {editingHabit ? 'Alışkanlığı Düzenle' : 'Yeni Alışkanlık Ekle'}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Kapat"
            onClick={() => {
              playPop();
              onClose?.();
            }}
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            marginTop: '12px',
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px', paddingBottom: '12px' }}>
            <label className="field" style={{ display: 'block', marginBottom: '14px' }}>
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>Alışkanlık Adı</span>
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

            <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
              <legend style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)', marginBottom: '8px' }}>
                Hedef Biçimi
              </legend>
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
                    setDirection('at_least');
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
                    if (target === '1' && !editingHabit) setTarget('15');
                  }}
                >
                  Miktar / Süre
                </button>
              </div>
            </fieldset>

            {tracking === 'quantity' && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <label className="field">
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                      {direction === 'at_most' ? 'Günlük Üst Sınır' : 'Günlük Hedef'}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-input"
                      style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                      value={target}
                      onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="15"
                      required
                    />
                  </label>
                  <label className="field">
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>Birim</span>
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
                      <option value="saat">saat</option>
                      <option value="fincan">fincan</option>
                    </select>
                  </label>
                </div>

                {/* Hedef Yönü: En Az vs En Fazla (Sınırla) */}
                <div className="segmented-control" role="radiogroup" aria-label="Hedef yönü" style={{ width: '100%' }}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={direction === 'at_least'}
                    className={`segmented-item ${direction === 'at_least' ? 'is-selected' : ''}`}
                    style={{ flex: 1, minHeight: '44px', fontSize: '12px' }}
                    onClick={() => {
                      playPop();
                      setDirection('at_least');
                    }}
                  >
                    En Az (Hedefe Ulaş)
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={direction === 'at_most'}
                    className={`segmented-item ${direction === 'at_most' ? 'is-selected' : ''}`}
                    style={{ flex: 1, minHeight: '44px', fontSize: '12px' }}
                    onClick={() => {
                      playPop();
                      setDirection('at_most');
                    }}
                  >
                    En Fazla (Sınırla)
                  </button>
                </div>
              </div>
            )}

            {/* Planlama: Günler veya Haftalık Esnek Kota */}
            <div className="field" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                  Planlama
                </span>
                <div className="segmented-control" role="tablist" aria-label="Planlama tipi">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={scheduleMode === 'days'}
                    className={`segmented-item ${scheduleMode === 'days' ? 'is-selected' : ''}`}
                    style={{ minHeight: '44px', padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => {
                      playPop();
                      setScheduleMode('days');
                    }}
                  >
                    Gün Seç
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={scheduleMode === 'weekly_quota'}
                    className={`segmented-item ${scheduleMode === 'weekly_quota' ? 'is-selected' : ''}`}
                    style={{ minHeight: '44px', padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => {
                      playPop();
                      setScheduleMode('weekly_quota');
                    }}
                  >
                    Haftada X Gün
                  </button>
                </div>
              </div>

              {scheduleMode === 'weekly_quota' ? (
                <div
                  style={{
                    background: 'var(--surface-alt)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '14px',
                    padding: '12px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                    Haftada kaç gün yapmak istersin? (Esnek günler)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                      const active = Number(timesPerWeek) === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={active}
                          className={`btn-3d ${active ? 'btn-3d-green' : 'btn-3d-gray'}`}
                          style={{ height: '44px', borderRadius: '12px', fontSize: '14px', padding: 0 }}
                          onClick={() => {
                            playPop();
                            setTimesPerWeek(n);
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', fontWeight: 600 }}>
                    Haftanın hangi günleri yaptığın önemli değil; toplam {timesPerWeek} gün tamamlaman yeterli.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{
                        minHeight: '44px',
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border)',
                        background: isAllDays ? 'var(--primary-soft, #DCFCE7)' : 'var(--surface-alt)',
                        color: isAllDays ? 'var(--primary-dark, #15803D)' : 'var(--muted)',
                        cursor: 'pointer',
                      }}
                      onClick={selectAllDays}
                    >
                      Her Gün
                    </button>
                    <button
                      type="button"
                      style={{
                        minHeight: '44px',
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border)',
                        background: isWeekdaysOnly ? 'var(--primary-soft, #DCFCE7)' : 'var(--surface-alt)',
                        color: isWeekdaysOnly ? 'var(--primary-dark, #15803D)' : 'var(--muted)',
                        cursor: 'pointer',
                      }}
                      onClick={selectWeekdays}
                    >
                      Hafta İçi
                    </button>
                    <button
                      type="button"
                      style={{
                        minHeight: '44px',
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border)',
                        background: isWeekendOnly ? 'var(--primary-soft, #DCFCE7)' : 'var(--surface-alt)',
                        color: isWeekendOnly ? 'var(--primary-dark, #15803D)' : 'var(--muted)',
                        cursor: 'pointer',
                      }}
                      onClick={selectWeekend}
                    >
                      Hafta Sonu
                    </button>
                  </div>

                  {/* 7-Day Interactive Buttons Grid */}
                  <div
                    className="weekday-picker"
                    role="group"
                    aria-label="Haftanın Günleri"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '5px',
                    }}
                  >
                    {DAYS.map((day) => {
                      const isSelected = selectedDays.includes(day.id);
                      return (
                        <motion.button
                          key={day.id}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={day.name}
                          className={`btn-3d ${isSelected ? 'btn-3d-green is-selected' : 'btn-3d-gray'}`}
                          style={{
                            height: '46px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 800,
                            padding: 0,
                          }}
                          whileTap={{ scale: 0.92, y: 2 }}
                          onClick={() => toggleDay(day.id)}
                        >
                          {day.label}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}
                  >
                    <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                      {isAllDays && '🗓️ Her Gün (7 gün)'}
                      {isWeekdaysOnly && '💼 Hafta İçi (5 gün)'}
                      {isWeekendOnly && '🎉 Hafta Sonu (2 gün)'}
                      {!isAllDays && !isWeekdaysOnly && !isWeekendOnly && (
                        `🎯 Haftada ${selectedDays.length} gün: ${DAYS.filter((d) => selectedDays.includes(d.id)).map((d) => d.label).join(', ')}`
                      )}
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700 }}>
                      {7 - selectedDays.length > 0 ? `${7 - selectedDays.length} gün dinlenme ☕` : 'Dinlenme günü yok'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {existingHabitsCount >= 3 && (
              <div
                style={{
                  background: 'var(--surface-alt)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '14px',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '18px' }}>💡</span>
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--ink)' }}>İpucu:</strong> İlk aşamada en fazla 3 odak alışkanlığıyla başlamak düzenli kalmanı kolaylaştırır.
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Footer so Save is always reachable at 320x568 */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
              flexShrink: 0,
            }}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.95, y: 2 }}
              className="btn-3d btn-3d-gray"
              style={{ minHeight: '48px', padding: '0 18px', borderRadius: '16px' }}
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
              style={{ flex: 1, minHeight: '48px', padding: '0 20px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {editingHabit ? 'Değişiklikleri Kaydet ✓' : 'Alışkanlığı Kaydet 🚀'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
