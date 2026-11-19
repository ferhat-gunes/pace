import React, { useEffect, useMemo, useRef, useState } from 'react';
import { describeHabitRules } from '../lib/habit-form.js';
import { dateKey } from '../lib/rules.js';
import { buildHabitPayload, initialHabitValues } from './habit-form-model.js';
import { Modal, Button, TextInput, Select, Checkbox, InlineFeedback } from './ui/index.js';
import './HabitForm.css';

const PRESETS = [
  { name: 'Kitap oku', tracking: 'quantity', target: '20', unit: 'sayfa' },
  { name: 'Su iç', tracking: 'quantity', target: '8', unit: 'bardak' },
  { name: 'Yürüyüş yap', tracking: 'quantity', target: '30', unit: 'dakika' },
  { name: 'Meditasyon', tracking: 'check', target: '1', unit: '' },
];
const DAYS = [
  [1, 'Pzt'],
  [2, 'Sal'],
  [3, 'Çar'],
  [4, 'Per'],
  [5, 'Cum'],
  [6, 'Cmt'],
  [0, 'Paz'],
];

export default function HabitModal({
  isOpen,
  onClose,
  onAddHabit,
  onUpdateHabit,
  habit = null,
  initialDate = dateKey(),
}) {
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
    setSaving(false);
    setError(null);
    setConfirmClose(false);
    setDirty(false);
    submitLock.current = false;
  }, [isOpen, habit?.id]);

  const requestClose = () => {
    if (submitLock.current) return;
    if (dirty) setConfirmClose(true);
    else onClose?.();
  };

  useEffect(() => {
    if (!isOpen) return;
    const keydown = (e) => {
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
    setValues((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    if (error?.field === controlId || !error?.field) setError(null);
  };

  const summary = useMemo(() => {
    try {
      return describeHabitRules(buildHabitPayload(values, habit));
    } catch {
      return 'Geçerli alanları doldurduğunda planının özeti burada görünecek.';
    }
  }, [values, habit]);

  const fieldProps = (id) => ({
    id,
    'aria-invalid': error?.field === id ? true : undefined,
    'aria-describedby': error?.field === id ? 'habit-validation' : undefined,
  });

  const submit = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;
    setError(null);
    let payload;
    try {
      payload = buildHabitPayload(values, habit);
    } catch (err) {
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
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={requestClose}
      closeDisabled={saving}
      title={editing ? 'Alışkanlığı Düzenle' : 'Yeni Alışkanlık Ekle'}
      size="md"
    >
      <div className="habit-editor" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {confirmClose && (
          <InlineFeedback
            tone="error"
            role="alert"
            aria-labelledby="habit-discard-title"
            action={
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setConfirmClose(false);
                    formRef.current?.querySelector('input')?.focus();
                  }}
                >
                  Düzenlemeye devam et
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onClose?.()}>
                  Değişiklikleri bırak
                </Button>
              </div>
            }
          >
            <strong id="habit-discard-title" tabIndex={-1} ref={closePromptRef}>
              Kaydedilmemiş değişikliklerin var.
            </strong>{' '}
            Formu kapatırsan bu değişiklikler bırakılır.
          </InlineFeedback>
        )}

        {!editing && (
          <div>
            <p className="form-help" style={{ margin: '0 0 var(--space-2)' }}>
              Küçük bir rutin seç veya hazır bir başlangıç kullan.
            </p>
            <div className="form-presets" aria-label="Hızlı şablonlar" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    if (submitLock.current) return;
                    setValues((prev) => ({ ...initialHabitValues(null, prev.date), ...preset }));
                    setDirty(true);
                    setError(null);
                  }}
                >
                  + {preset.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <form ref={formRef} aria-busy={saving} onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && (
            <InlineFeedback id="habit-validation" tone="error" role="alert">
              {error.message}
            </InlineFeedback>
          )}

          <fieldset className="habit-form-fields" disabled={saving} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <TextInput
              {...fieldProps('habit-name')}
              label="Alışkanlık Adı"
              value={values.name}
              maxLength={60}
              autoFocus
              placeholder="Örn: Kitap oku, Yürüyüş yap, Su iç"
              onChange={(e) => change('name', e.target.value, 'habit-name')}
              required
            />

            <fieldset className="form-choice" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontSize: '12px', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--fg)' }}>
                Hedef Biçimi
              </legend>
              <div className="segmented-control" role="group" aria-label="Hedef Biçimi">
                {[
                  ['check', 'Yaptım / yapmadım'],
                  ['quantity', 'Miktar / Süre'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={values.tracking === value}
                    className={`segmented-item ${values.tracking === value ? 'is-selected' : ''}`}
                    onClick={() => change('tracking', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {values.tracking === 'quantity' && (
              <>
                <Select
                  id="habit-direction"
                  label="Hedef yönü"
                  value={values.direction}
                  onChange={(e) => change('direction', e.target.value)}
                >
                  <option value="at_least">En az bu miktara ulaş</option>
                  <option value="at_most">En fazla bu miktarda kal</option>
                </Select>

                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
                  <TextInput
                    {...fieldProps('habit-target')}
                    label={values.scheduleType === 'weekly_quota' ? 'Her kayıt günündeki hedef' : 'Günlük Hedef'}
                    type="text"
                    inputMode="decimal"
                    value={values.target}
                    onChange={(e) => change('target', e.target.value, 'habit-target')}
                    aria-describedby={error?.field === 'habit-target' ? 'habit-validation habit-decimal-help' : 'habit-decimal-help'}
                    required
                  />
                  <div>
                    <TextInput
                      {...fieldProps('habit-unit')}
                      label="Birim"
                      list="habit-unit-options"
                      maxLength={20}
                      value={values.unit}
                      onChange={(e) => change('unit', e.target.value, 'habit-unit')}
                      placeholder="Örn: dakika, km, litre"
                    />
                    <datalist id="habit-unit-options">
                      {['dakika', 'sayfa', 'bardak', 'km', 'tekrar', 'adım', 'litre'].map((unit) => (
                        <option key={unit} value={unit} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <p id="habit-decimal-help" className="form-help" style={{ margin: 0 }}>
                  Ondalık miktar kullanabilirsin: örneğin 0,25 km. Hedef sıfırdan büyük, en fazla 1.000.000 olmalı.
                </p>
              </>
            )}

            <Select
              id="habit-schedule"
              label="Program"
              value={values.scheduleType}
              onChange={(e) => change('scheduleType', e.target.value)}
            >
              <option value="daily">Her gün</option>
              <option value="weekdays">Seçtiğim günlerde</option>
              <option value="weekly_quota">Haftada belirli sayıda gün</option>
            </Select>

            {values.scheduleType === 'weekdays' && (
              <fieldset {...fieldProps('weekday-picker')} className="form-choice" style={{ border: '1px solid var(--border)', padding: 'var(--space-3)' }}>
                <legend style={{ fontSize: '12px', fontWeight: 600, padding: '0 var(--space-1)' }}>Plan günleri</legend>
                <div className="weekday-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  {DAYS.map(([day, label]) => (
                    <Checkbox
                      key={day}
                      label={label}
                      checked={values.days.includes(day)}
                      onChange={(e) =>
                        change(
                          'days',
                          e.target.checked
                            ? DAYS.map(([value]) => value).filter((value) => value === day || values.days.includes(value))
                            : values.days.filter((d) => d !== day),
                          'weekday-picker'
                        )
                      }
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {values.scheduleType === 'weekly_quota' && (
              <TextInput
                {...fieldProps('habit-quota')}
                label="Haftada kaç gün?"
                type="number"
                min="1"
                max="7"
                step="1"
                value={values.quota}
                onChange={(e) => change('quota', e.target.value, 'habit-quota')}
                help="Günleri sen seçersin; aynı gündeki birden fazla kayıt tek gün sayılır."
              />
            )}

            <TextInput
              {...fieldProps('habit-date')}
              label={editing ? 'Değişikliklerin geçerli olacağı tarih' : 'Başlangıç tarihi'}
              type="date"
              min={editing ? habit.start_date : undefined}
              value={values.date}
              onChange={(e) => change('date', e.target.value, 'habit-date')}
              required
              aria-describedby={error?.field === 'habit-date' ? 'habit-validation habit-date-help' : 'habit-date-help'}
              help={
                editing
                  ? `Yeni kurallar seçtiğin tarihten itibaren geçerli olur; önceki tarihlerdeki hedefler korunur. Alışkanlığın başlangıcı: ${habit.start_date || '—'}.`
                  : 'Rutin bu tarihten itibaren planlanır. Geçmiş veya gelecek bir gün seçebilirsin.'
              }
            />

            <details
              className="advanced-rules"
              open={values.progressionEnabled || values.debtEnabled ? true : undefined}
              style={{ border: '1px solid var(--border)', padding: 'var(--space-3)' }}
            >
              <summary className="mono" style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                Gelişmiş kurallar
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                {values.tracking === 'quantity' && (
                  <>
                    <Checkbox
                      label="Hedefi zamanla artır"
                      checked={values.progressionEnabled}
                      onChange={(e) => change('progressionEnabled', e.target.checked)}
                    />
                    {values.progressionEnabled && (
                      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
                        <TextInput
                          {...fieldProps('progressive-step')}
                          label={values.scheduleType === 'weekly_quota' ? 'Her hafta artış' : 'Her planlı günde artış'}
                          inputMode="decimal"
                          value={values.step}
                          onChange={(e) => change('step', e.target.value, 'progressive-step')}
                        />
                        <TextInput
                          {...fieldProps('progressive-cap')}
                          label="Üst hedef (isteğe bağlı)"
                          inputMode="decimal"
                          value={values.cap}
                          onChange={(e) => change('cap', e.target.value, 'progressive-cap')}
                        />
                      </div>
                    )}
                  </>
                )}

                {(values.tracking === 'quantity' || values.scheduleType === 'weekly_quota') &&
                (values.tracking === 'check' || values.direction !== 'at_most') ? (
                  <>
                    <Checkbox
                      label={
                        values.scheduleType === 'weekly_quota'
                          ? 'Eksik günleri sonraki haftaya taşı'
                          : 'Eksik miktarı sonraki planlı güne taşı'
                      }
                      checked={values.debtEnabled}
                      onChange={(e) => change('debtEnabled', e.target.checked)}
                    />
                    {values.debtEnabled && (
                      <TextInput
                        {...fieldProps('debt-cap')}
                        label={
                          values.scheduleType === 'weekly_quota'
                            ? 'Taşınacak gün sınırı (isteğe bağlı)'
                            : 'Taşınacak miktar sınırı (isteğe bağlı)'
                        }
                        inputMode="decimal"
                        value={values.debtCap}
                        onChange={(e) => change('debt-cap', e.target.value, 'debt-cap')}
                        help="Boş bırakırsan ayrıca bir sınır uygulanmaz. 0 girersen eksik taşıma etkisiz olur."
                      />
                    )}
                  </>
                ) : (
                  <p className="form-help" style={{ margin: 0 }}>
                    {values.tracking !== 'check' && values.direction === 'at_most'
                      ? 'Üst sınır hedeflerinde eksik miktar taşıma uygulanmaz.'
                      : 'Miktar takibi veya haftalık gün hedefi seçtiğinde ek kuralları açabilirsin.'}
                  </p>
                )}
              </div>
            </details>
          </fieldset>

          <section
            className="form-summary"
            aria-label="Plan özeti"
            style={{ border: '1px solid var(--border)', padding: 'var(--space-3)', background: 'var(--surface-2)' }}
          >
            <strong className="mono" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Planın
            </strong>
            <p style={{ margin: 'var(--space-1) 0 0', fontSize: '13px' }}>{summary}</p>
          </section>

          {saving && (
            <InlineFeedback tone="neutral" role="status" aria-live="polite">
              Kaydediliyor… Sonuç gelene kadar bu pencere açık kalır.
            </InlineFeedback>
          )}

          <div className="form-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variant="tertiary" disabled={saving} onClick={requestClose}>
              İptal
            </Button>
            <Button type="submit" variant="primary" disabled={saving} loading={saving}>
              {saving ? 'Kaydediliyor…' : editing ? 'Değişiklikleri Kaydet' : 'Alışkanlığı Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
