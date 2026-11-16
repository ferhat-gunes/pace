import React, { useEffect, useMemo, useRef, useState } from 'react';
import { describeHabitRules } from '../lib/habit-form.js';
import { dateKey } from '../lib/rules.js';
import { buildHabitPayload, initialHabitValues } from './habit-form-model.js';
import './HabitForm.css';

const PRESETS = [
  { name: 'Kitap oku', tracking: 'quantity', target: '20', unit: 'sayfa' },
  { name: 'Su iç', tracking: 'quantity', target: '8', unit: 'bardak' },
  { name: 'Yürüyüş yap', tracking: 'quantity', target: '30', unit: 'dakika' },
  { name: 'Meditasyon', tracking: 'check', target: '1', unit: '' },
];
const DAYS = [[1, 'Pzt'], [2, 'Sal'], [3, 'Çar'], [4, 'Per'], [5, 'Cum'], [6, 'Cmt'], [0, 'Paz']];

export default function HabitModal({ isOpen, onClose, onAddHabit, onUpdateHabit, habit = null, initialDate = dateKey() }) {
  const [values, setValues] = useState(() => initialHabitValues(habit, initialDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [dirty, setDirty] = useState(false);
  const formRef = useRef(null);
  const closePromptRef = useRef(null);
  const submitLock = useRef(false);
  const editing = Boolean(habit?.id);

  useEffect(() => {
    if (!isOpen) return;
    setValues(initialHabitValues(habit, initialDate));
    setSaving(false); setError(null); setConfirmClose(false); setDirty(false);
    submitLock.current = false;
  // A midnight/calendar refresh must not reset an open, edited form.
  }, [isOpen, habit?.id]);

  const requestClose = () => {
    if (submitLock.current) return;
    if (dirty) setConfirmClose(true);
    else onClose?.();
  };
  useEffect(() => {
    if (!isOpen) return;
    const keydown = e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (submitLock.current) return;
      if (confirmClose) setConfirmClose(false);
      else if (dirty) setConfirmClose(true);
      else onClose?.();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [isOpen, dirty, confirmClose, onClose]);
  useEffect(() => {
    if (confirmClose) closePromptRef.current?.focus();
  }, [confirmClose]);

  const change = (field, value, controlId = '') => {
    if (submitLock.current) return;
    setValues(prev => ({ ...prev, [field]: value }));
    setDirty(true);
    if (error?.field === controlId || !error?.field) setError(null);
  };
  const summary = useMemo(() => {
    try { return describeHabitRules(buildHabitPayload(values, habit)); }
    catch { return 'Geçerli alanları doldurduğunda planının özeti burada görünecek.'; }
  }, [values, habit]);
  const fieldProps = id => ({
    id,
    'aria-invalid': error?.field === id ? true : undefined,
    'aria-describedby': error?.field === id ? 'habit-validation' : undefined,
  });

  const submit = async e => {
    e.preventDefault();
    if (submitLock.current) return;
    setError(null);
    let payload;
    try { payload = buildHabitPayload(values, habit); }
    catch (err) {
      setError({ message: err.message, field: err.field });
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector(`[id="${err.field}"]`);
        (invalid?.matches('fieldset') ? invalid.querySelector('input') : invalid)?.focus();
      });
      return;
    }
    submitLock.current = true;
    setSaving(true);
    try {
      const save = editing ? onUpdateHabit : onAddHabit;
      if (typeof save !== 'function') throw new Error('Kaydetme hizmeti şu anda kullanılamıyor. Lütfen yeniden dene.');
      const result = editing ? await save(habit.id, payload) : await save(payload);
      if (result === false || result?.success === false) throw new Error(result?.error || 'Alışkanlık kaydedilemedi.');
      setDirty(false);
      onClose?.();
    } catch (err) {
      setError({ message: err.message || 'Alışkanlık kaydedilemedi. Lütfen yeniden dene.' });
    } finally { submitLock.current = false; setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="habit-modal-title" onClick={requestClose}>
      <div className="dialog-sheet habit-dialog habit-editor" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="dialog-header">
          <h2 id="habit-modal-title">{editing ? 'Alışkanlığı Düzenle' : 'Yeni Alışkanlık Ekle'}</h2>
          <button type="button" className="button-icon icon-button" aria-label="Kapat" disabled={saving} onClick={requestClose}>✕</button>
        </div>
        {confirmClose && <div className="form-summary" role="alert" aria-labelledby="habit-discard-title">
          <strong id="habit-discard-title" tabIndex={-1} ref={closePromptRef}>Kaydedilmemiş değişikliklerin var.</strong>
          <p>Formu kapatırsan bu değişiklikler bırakılır.</p>
          <div className="form-footer">
            <button type="button" className="button button-quiet" onClick={() => { setConfirmClose(false); formRef.current?.querySelector('input')?.focus(); }}>Düzenlemeye devam et</button>
            <button type="button" className="button button-danger-quiet" onClick={() => onClose?.()}>Değişiklikleri bırak</button>
          </div>
        </div>}
        {!editing && <>
          <p className="form-help" style={{ marginTop: '18px' }}>Küçük bir rutin seç veya hazır bir başlangıç kullan.</p>
          <div className="form-presets" aria-label="Hızlı şablonlar">
            {PRESETS.map(preset => <button key={preset.name} type="button" className="button button-quiet" disabled={saving} onClick={() => {
              if (submitLock.current) return;
              setValues(prev => ({ ...initialHabitValues(null, prev.date), ...preset })); setDirty(true); setError(null);
            }}>+ {preset.name}</button>)}
          </div>
        </>}
        <form ref={formRef} aria-busy={saving} onSubmit={submit} noValidate>
          {error && <p id="habit-validation" className="form-message" role="alert">{error.message}</p>}
          <fieldset className="habit-form-fields" disabled={saving}>
            <label className="field" htmlFor="habit-name"><span>Alışkanlık Adı</span>
              <input {...fieldProps('habit-name')} className="form-input" value={values.name} maxLength={60} autoFocus placeholder="Örn: Kitap oku, Yürüyüş yap, Su iç" onChange={e => change('name', e.target.value, 'habit-name')} required />
            </label>
            <fieldset className="form-choice"><legend>Hedef Biçimi</legend>
              <div className="segmented-control" role="group" aria-label="Hedef Biçimi">
                {[['check', 'Yaptım / yapmadım'], ['quantity', 'Miktar / Süre']].map(([value, label]) => <button type="button" key={value} aria-pressed={values.tracking === value} className={`segmented-item ${values.tracking === value ? 'is-selected' : ''}`} onClick={() => change('tracking', value)}>{label}</button>)}
              </div>
            </fieldset>
            {values.tracking === 'quantity' && <>
              <label className="field" htmlFor="habit-direction"><span>Hedef yönü</span><select id="habit-direction" className="form-select" value={values.direction} onChange={e => change('direction', e.target.value)}><option value="at_least">En az bu miktara ulaş</option><option value="at_most">En fazla bu miktarda kal</option></select></label>
              <div className="form-grid">
                <label className="field" htmlFor="habit-target"><span>{values.scheduleType === 'weekly_quota' ? 'Her kayıt günündeki hedef' : 'Günlük Hedef'}</span><input {...fieldProps('habit-target')} type="text" inputMode="decimal" className="form-input" value={values.target} onChange={e => change('target', e.target.value, 'habit-target')} aria-describedby={error?.field === 'habit-target' ? 'habit-validation habit-decimal-help' : 'habit-decimal-help'} required /></label>
                <label className="field" htmlFor="habit-unit"><span>Birim</span><input {...fieldProps('habit-unit')} className="form-input" list="habit-unit-options" maxLength={20} value={values.unit} onChange={e => change('unit', e.target.value, 'habit-unit')} placeholder="Örn: dakika, km, litre" /><datalist id="habit-unit-options">{['dakika', 'sayfa', 'bardak', 'km', 'tekrar', 'adım', 'litre'].map(unit => <option key={unit} value={unit} />)}</datalist></label>
              </div>
              <p id="habit-decimal-help" className="form-help">Ondalık miktar kullanabilirsin: örneğin 0,25 km. Hedef sıfırdan büyük, en fazla 1.000.000 olmalı.</p>
            </>}
            <label className="field" htmlFor="habit-schedule"><span>Program</span><select id="habit-schedule" className="form-select" value={values.scheduleType} onChange={e => change('scheduleType', e.target.value)}><option value="daily">Her gün</option><option value="weekdays">Seçtiğim günlerde</option><option value="weekly_quota">Haftada belirli sayıda gün</option></select></label>
            {values.scheduleType === 'weekdays' && <fieldset {...fieldProps('weekday-picker')} className="form-choice"><legend>Plan günleri</legend><div className="weekday-picker">{DAYS.map(([day, label]) => <label key={day}><input type="checkbox" checked={values.days.includes(day)} onChange={e => change('days', e.target.checked ? DAYS.map(([value]) => value).filter(value => value === day || values.days.includes(value)) : values.days.filter(d => d !== day), 'weekday-picker')} />{label}</label>)}</div></fieldset>}
            {values.scheduleType === 'weekly_quota' && <label className="field" htmlFor="habit-quota"><span>Haftada kaç gün?</span><input {...fieldProps('habit-quota')} type="number" min="1" max="7" step="1" className="form-input" value={values.quota} onChange={e => change('quota', e.target.value, 'habit-quota')} /><small className="form-help">Günleri sen seçersin; aynı gündeki birden fazla kayıt tek gün sayılır.</small></label>}
            <label className="field" htmlFor="habit-date"><span>{editing ? 'Değişikliklerin geçerli olacağı tarih' : 'Başlangıç tarihi'}</span><input {...fieldProps('habit-date')} type="date" className="form-input" min={editing ? habit.start_date : undefined} value={values.date} onChange={e => change('date', e.target.value, 'habit-date')} required aria-describedby={error?.field === 'habit-date' ? 'habit-validation habit-date-help' : 'habit-date-help'} /></label>
            <p id="habit-date-help" className="form-help">{editing ? `Yeni kurallar seçtiğin tarihten itibaren geçerli olur; önceki tarihlerdeki hedefler korunur. Alışkanlığın başlangıcı: ${habit.start_date || '—'}.` : 'Rutin bu tarihten itibaren planlanır. Geçmiş veya gelecek bir gün seçebilirsin.'}</p>
            <details className="advanced-rules" open={values.progressionEnabled || values.debtEnabled ? true : undefined}>
              <summary>Gelişmiş kurallar</summary>
              {values.tracking === 'quantity' && <>
                <label className="checkbox-field"><input type="checkbox" checked={values.progressionEnabled} onChange={e => change('progressionEnabled', e.target.checked)} />Hedefi zamanla artır</label>
                {values.progressionEnabled && <div className="form-grid"><label className="field" htmlFor="progressive-step"><span>{values.scheduleType === 'weekly_quota' ? 'Her hafta artış' : 'Her planlı günde artış'}</span><input {...fieldProps('progressive-step')} inputMode="decimal" className="form-input" value={values.step} onChange={e => change('step', e.target.value, 'progressive-step')} /></label><label className="field" htmlFor="progressive-cap"><span>Üst hedef (isteğe bağlı)</span><input {...fieldProps('progressive-cap')} inputMode="decimal" className="form-input" value={values.cap} onChange={e => change('cap', e.target.value, 'progressive-cap')} /></label></div>}
              </>}
              {(values.tracking === 'quantity' || values.scheduleType === 'weekly_quota') && (values.tracking === 'check' || values.direction !== 'at_most') ? <>
                <label className="checkbox-field"><input type="checkbox" checked={values.debtEnabled} onChange={e => change('debtEnabled', e.target.checked)} />{values.scheduleType === 'weekly_quota' ? 'Eksik günleri sonraki haftaya taşı' : 'Eksik miktarı sonraki planlı güne taşı'}</label>
                {values.debtEnabled && <label className="field" htmlFor="debt-cap"><span>{values.scheduleType === 'weekly_quota' ? 'Taşınacak gün sınırı (isteğe bağlı)' : 'Taşınacak miktar sınırı (isteğe bağlı)'}</span><input {...fieldProps('debt-cap')} inputMode="decimal" className="form-input" value={values.debtCap} onChange={e => change('debtCap', e.target.value, 'debt-cap')} /><small className="form-help">Boş bırakırsan ayrıca bir sınır uygulanmaz. 0 girersen eksik taşıma etkisiz olur.</small></label>}
              </> : <p className="form-help">{values.tracking !== 'check' && values.direction === 'at_most' ? 'Üst sınır hedeflerinde eksik miktar taşıma uygulanmaz.' : 'Miktar takibi veya haftalık gün hedefi seçtiğinde ek kuralları açabilirsin.'}</p>}
            </details>
          </fieldset>
          <section className="form-summary" aria-label="Plan özeti"><strong>Planın</strong><p>{summary}</p></section>
          {saving && <p role="status" aria-live="polite" className="form-help">Kaydediliyor… Sonuç gelene kadar bu pencere açık kalır.</p>}
          <div className="form-footer"><button type="button" className="button button-quiet" disabled={saving} onClick={requestClose}>İptal</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Kaydediliyor…' : editing ? 'Değişiklikleri Kaydet' : 'Alışkanlığı Kaydet'}</button></div>
        </form>
      </div>
    </div>
  );
}
