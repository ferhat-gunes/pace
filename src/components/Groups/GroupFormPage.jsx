import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, FormField, TextInput, Select, InlineFeedback } from '../ui/index.js';

function SharedHabitFields({ draft, setDraft, optional = false }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <FormField
        label={optional ? 'Ortak Alışkanlık Adı (İsteğe bağlı)' : 'Alışkanlık Adı'}
        htmlFor="group-habit-name"
      >
        <TextInput
          id="group-habit-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          maxLength={60}
          placeholder="Örn. 5 km Koşu veya Kitap Okuma"
          required={!optional}
          autoFocus={!optional}
        />
      </FormField>
      {(!optional || draft.name.trim()) && (
        <>
          <FormField label="Takip Türü" htmlFor="group-habit-tracking">
            <Select
              id="group-habit-tracking"
              value={draft.tracking}
              onChange={(e) => setDraft({ ...draft, tracking: e.target.value })}
              options={[
                { value: 'check', label: 'İşaretleme (Yapıldı / Yapılmadı)' },
                { value: 'quantity', label: 'Miktar veya Süre' },
              ]}
            />
          </FormField>
          {draft.tracking === 'quantity' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
              <FormField label="Günlük Hedef" htmlFor="group-habit-target">
                <TextInput
                  id="group-habit-target"
                  type="number"
                  min="0"
                  max="1000000"
                  step="any"
                  required
                  value={draft.target}
                  onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                />
              </FormField>
              <FormField label="Birim" htmlFor="group-habit-unit">
                <TextInput
                  id="group-habit-unit"
                  maxLength={20}
                  placeholder="Örn. km, dk, sayfa"
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                />
              </FormField>
              <FormField label="Hedef Yönü" htmlFor="group-habit-direction">
                <Select
                  id="group-habit-direction"
                  value={draft.direction}
                  onChange={(e) => setDraft({ ...draft, direction: e.target.value })}
                  options={[
                    { value: 'at_least', label: 'En az' },
                    { value: 'at_most', label: 'En fazla' },
                  ]}
                />
              </FormField>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function GroupFormPage({
  mode, // 'create' | 'edit' | 'habit'
  groupName = '',
  name,
  setName,
  description,
  setDescription,
  draft,
  setDraft,
  busy,
  error,
  onSubmit,
  onCancel,
}) {
  useEffect(() => {
    window.scrollTo?.({ top: 0, behavior: 'instant' });
  }, [mode]);

  const title =
    mode === 'create'
      ? 'Yeni Grup Oluştur'
      : mode === 'edit'
        ? 'Grubu Düzenle'
        : 'Ortak Alışkanlık Ekle';

  const subtitle =
    mode === 'create'
      ? 'Önce grubunu kur, ardından tek dokunuşla arkadaşını davet et.'
      : mode === 'edit'
        ? 'Grup adını ve kısa açıklamasını güncelle.'
        : groupName
          ? `${groupName} grubuna yeni ortak alışkanlık ekle.`
          : 'Gruba yeni ortak alışkanlık ekle.';

  const submitLabel =
    mode === 'create'
      ? 'Grup oluştur'
      : mode === 'edit'
        ? 'Değişiklikleri kaydet'
        : 'Alışkanlığı kaydet';

  return (
    <section
      className="page-view"
      id="view-group-form"
      aria-labelledby="group-form-title"
      style={{ width: '100%', minWidth: 0, maxWidth: '640px', paddingBottom: 'var(--space-8)' }}
    >
      <div
        className="page-heading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          minHeight: '44px',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(busy)}
            onClick={onCancel}
            aria-label="Gruplara dön"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Geri</span>
          </Button>
          <div>
            <h1 id="group-form-title" style={{ margin: 0, fontSize: '20px' }}>
              {title}
            </h1>
            <p className="mono" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--fg-muted)' }}>
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} aria-busy={Boolean(busy)}>
        <fieldset
          disabled={Boolean(busy)}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 'var(--space-4)' }}
        >
          {error && <InlineFeedback message={error} tone="danger" />}

          {(mode === 'create' || mode === 'edit') && (
            <div
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-1)',
                padding: 'var(--space-4)',
                display: 'grid',
                gap: 'var(--space-3)',
              }}
            >
              <div className="mono" style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>
                {mode === 'create' ? '1. GRUP BİLGİLERİ' : 'GRUP BİLGİLERİ'}
              </div>
              <FormField label="Grup Adı" htmlFor="group-name-input">
                <TextInput
                  id="group-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn. Sabah Koşucuları"
                  maxLength={60}
                  required
                  autoFocus
                />
              </FormField>
              <FormField label="Açıklama (İsteğe bağlı)" htmlFor="group-desc-input">
                <TextInput
                  id="group-desc-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kısa grup hedefi"
                  maxLength={280}
                />
              </FormField>
            </div>
          )}

          {mode === 'create' && (
            <div
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-1)',
                padding: 'var(--space-4)',
                display: 'grid',
                gap: 'var(--space-3)',
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>
                  2. İLK ORTAK ALIŞKANLIK (İSTEĞE BAĞLI)
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--fg-muted)' }}>
                  Hemen birlikte takip edeceğiniz ilk hedefi belirleyebilir veya sonra ekleyebilirsin.
                </p>
              </div>
              <SharedHabitFields draft={draft} setDraft={setDraft} optional />
            </div>
          )}

          {mode === 'habit' && (
            <div
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-1)',
                padding: 'var(--space-4)',
                display: 'grid',
                gap: 'var(--space-3)',
              }}
            >
              <SharedHabitFields draft={draft} setDraft={setDraft} />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-2)',
              paddingTop: 'var(--space-2)',
            }}
          >
            <Button variant="secondary" disabled={Boolean(busy)} onClick={onCancel}>
              İptal
            </Button>
            <Button type="submit" variant="primary" loading={Boolean(busy)} disabled={Boolean(busy)}>
              {submitLabel}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
