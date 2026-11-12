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

export default function HabitModal({ isOpen, onClose, onAddHabit, existingHabitsCount = 0 }) {
  const [name, setName] = useState('');
  const [tracking, setTracking] = useState('check'); // 'check' | 'quantity'
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState('dakika');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5, 6, 0]);

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
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length === 1) return; // En az bir gün seçili kalmalı
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const selectAllDays = () => {
    playPop();
    triggerHaptic('light');
    setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
  };

  const selectWeekdays = () => {
    playPop();
    triggerHaptic('light');
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const selectWeekend = () => {
    playPop();
    triggerHaptic('light');
    setSelectedDays([6, 0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    playSuccess();
    triggerHaptic('success');

    let schedule;
    if (selectedDays.length === 7) {
      schedule = { type: 'daily' };
    } else if (
      selectedDays.length === 5 &&
      [1, 2, 3, 4, 5].every((d) => selectedDays.includes(d))
    ) {
      schedule = { type: 'weekdays', days: [1, 2, 3, 4, 5] };
    } else {
      schedule = { type: 'weekdays', days: [...selectedDays] };
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
    setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
    onClose();
  };

  const isAllDays = selectedDays.length === 7;
  const isWeekdaysOnly =
    selectedDays.length === 5 && [1, 2, 3, 4, 5].every((d) => selectedDays.includes(d));
  const isWeekendOnly =
    selectedDays.length === 2 && [6, 0].every((d) => selectedDays.includes(d));

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

        <div
          className="dialog-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 0 16px',
            borderBottom: '1px solid var(--border)',
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
            Yeni Alışkanlık Ekle
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

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          <label className="field" style={{ display: 'block', marginBottom: '16px' }}>
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

          <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
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
                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>Günlük Hedef</span>
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
                </select>
              </label>
            </div>
          )}

          {/* Haftanın Günleri Seçimi & Planlama */}
          <div className="field" style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                Planlama: Haftanın Günleri
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 9px',
                    borderRadius: '8px',
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
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 9px',
                    borderRadius: '8px',
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
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 9px',
                    borderRadius: '8px',
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
            </div>

            {/* 7-Day Interactive Buttons Grid */}
            <div
              className="weekday-picker"
              role="group"
              aria-label="Haftanın Günleri"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '6px',
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
                      fontSize: '13px',
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

            {/* Summary Indicator & Rest Day Note */}
            <div
              style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
              }}
            >
              <span style={{ color: 'var(--ink)', fontWeight: 800 }}>
                {isAllDays && '🗓️ Her Gün (Haftada 7 gün planlandı)'}
                {isWeekdaysOnly && '💼 Hafta İçi (5 gün — Hafta sonu serin korunur ☕)'}
                {isWeekendOnly && '🎉 Hafta Sonu (2 gün — Cmt & Paz)'}
                {!isAllDays && !isWeekdaysOnly && !isWeekendOnly && (
                  `🎯 Haftada ${selectedDays.length} gün: ${DAYS.filter((d) => selectedDays.includes(d.id)).map((d) => d.label).join(', ')}`
                )}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 700 }}>
                {7 - selectedDays.length > 0 ? `${7 - selectedDays.length} gün dinlenme ☕` : 'Dinlenme yok'}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block', lineHeight: 1.4 }}>
              Dinlenme günlerinde serin asla yanmaz; hedeflerini suçluluk duymadan sürdürebilirsin.
            </span>
          </div>

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
