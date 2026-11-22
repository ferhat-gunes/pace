import React, { useState, useEffect } from 'react';
import { Modal, TextInput, Button, InlineFeedback } from './ui/index.js';

const USERNAME_RE = /^[a-z0-9._]{3,24}$/;

export default function UsernamePromptModal({
  open = false,
  onClose,
  onSaveUsername,
  reason = 'Arkadaş davet etmek veya bir daveti kabul etmek için benzersiz bir @kullanıcıadı belirlemelisin.',
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
      setSaving(false);
    }
  }, [open]);

  const cleaned = value.trim().replace(/^@+/, '').toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!USERNAME_RE.test(cleaned)) {
      setError('Kullanıcı adı 3–24 karakter olmalı; yalnızca küçük harf, rakam, nokta (.) ve alt çizgi (_) kullanılabilir.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSaveUsername?.(cleaned);
    } catch (err) {
      setError(err.message || 'Kullanıcı adı kaydedilemedi. Lütfen yeniden dene.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose?.(); }}
      title="Kullanıcı adı belirle"
      description={reason}
      size="sm"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {error && (
          <InlineFeedback tone="error" role="alert">
            {error}
          </InlineFeedback>
        )}

        <TextInput
          id="username-prompt-input"
          label="@kullanıcıadı"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError('');
          }}
          placeholder="ornek.kullanici"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={25}
          autoFocus
          required
          help="3–24 karakter: a-z, 0-9, nokta (.) ve alt çizgi (_). Ortak alışkanlıklarda arkadaşların seni bu adla görür."
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <Button type="button" variant="tertiary" disabled={saving} onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !cleaned} loading={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
