import React, { useEffect, useRef, useState } from 'react';
import * as api from '../../lib/api.js';
import { Button, FormField, InlineFeedback, Modal, TextInput, Textarea } from '../ui/index.js';

export default function AccountSecuritySettings({ user, setUser }) {
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [reveal, setReveal] = useState(false);
  const [notice, setNotice] = useState(null);
  const [code, setCode] = useState('');
  const lock = useRef(false);
  const heading = useRef(null);
  const hasPassword = user?.has_password !== false;

  useEffect(() => {
    if (!code) return;
    heading.current?.focus();
    const currentUrl = location.href;
    const unload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const retain = (e) => {
      e.stopImmediatePropagation();
      history.pushState({}, '', currentUrl);
      setNotice({ text: 'Önce yeni kurtarma kodunu kaydet ve aşağıdaki onay düğmesini kullan.' });
    };
    addEventListener('beforeunload', unload);
    addEventListener('popstate', retain, true);
    addEventListener('hashchange', retain, true);
    return () => {
      removeEventListener('beforeunload', unload);
      removeEventListener('popstate', retain, true);
      removeEventListener('hashchange', retain, true);
    };
  }, [code]);

  const submit = async (e) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'password' && (next.length < 10 || next.length > 128)) {
        throw new Error('Yeni parolan 10–128 karakter olmalı.');
      }
      const result =
        mode === 'password'
          ? await api.changePassword({ current_password: current, new_password: next })
          : await api.regenerateRecoveryCode(current);
      if (result?.ok !== true) throw new Error('Sunucu işlemi doğrulamadı.');
      if (mode === 'recovery' && !result.recovery_code) {
        throw new Error('Yeni kurtarma kodu doğrulanamadı.');
      }
      if (result.recovery_code) {
        if (!/^(?:[a-f0-9]{8}-){5}[a-f0-9]{8}$/i.test(result.recovery_code)) {
          throw new Error('Kurtarma kodu biçimi doğrulanamadı.');
        }
        setCode(result.recovery_code);
      }
      if (mode === 'password') {
        setUser?.((u) => (u ? { ...u, has_password: true } : u));
      }
      setCurrent('');
      setNext('');
      setMode('');
      setNotice({ text: 'Hesap güvenliği güncellendi.' });
    } catch (err) {
      setNotice({ text: err.message, error: true });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ text: 'Kurtarma kodu kopyalandı. Güvenli bir yere kaydet.' });
    } catch {
      setNotice({ error: true, text: 'Kopyalanamadı. Kodu alanından seçip elle kopyalayabilirsin.' });
    }
  };

  const download = () => {
    const blob = new Blob([`PACE kurtarma kodu\nE-posta: ${user.email}\nKod: ${code}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pace-kurtarma-kodu.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section
      aria-labelledby="account-security-title"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-1)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div>
        <h2 id="account-security-title" style={{ fontSize: '16px', fontWeight: 700 }}>
          Parola ve kurtarma
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
          Parolanı güncelle veya kaybettiğin kurtarma kodunu yenile. Yeni kod oluşturulduğunda eskisi geçersiz olur.
        </p>
      </div>

      {notice ? (
        <InlineFeedback message={notice.text} tone={notice.error ? 'danger' : 'signal'} />
      ) : null}

      {!mode ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setNotice(null);
              setMode('password');
            }}
          >
            {hasPassword ? 'Parolayı değiştir' : 'Parola belirle'}
          </Button>
          <Button
            variant="secondary"
            disabled={!hasPassword}
            onClick={() => {
              setNotice(null);
              setMode('recovery');
            }}
          >
            Kurtarma kodunu yenile
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} aria-busy={busy} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <legend className="mono" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
              {mode === 'password' ? 'Parola işlemi' : 'Kurtarma kodunu yenile'}
            </legend>

            {(hasPassword || mode === 'recovery') && (
              <FormField label="Mevcut parolan" htmlFor="security-current-password">
                <TextInput
                  id="security-current-password"
                  type={reveal ? 'text' : 'password'}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </FormField>
            )}

            {mode === 'password' && (
              <FormField
                label="Yeni parolan"
                htmlFor="security-new-password"
                hint="Yeni parolan 10–128 karakter olmalı."
              >
                <TextInput
                  id="security-new-password"
                  type={reveal ? 'text' : 'password'}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
              </FormField>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button variant="tertiary" aria-pressed={reveal} onClick={() => setReveal((v) => !v)}>
                {reveal ? 'Parolaları gizle' : 'Parolaları göster'}
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                {busy ? 'Kaydediliyor…' : mode === 'password' ? 'Parolayı kaydet' : 'Yeni kod oluştur'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMode('');
                  setCurrent('');
                  setNext('');
                }}
              >
                Vazgeç
              </Button>
            </div>
          </fieldset>
        </form>
      )}

      <Modal
        open={Boolean(code)}
        title="Yeni kurtarma kodunu kaydet"
        footer={
          <>
            <Button variant="secondary" onClick={copy}>
              Kodu kopyala
            </Button>
            <Button variant="secondary" onClick={download}>
              Kod dosyasını indir
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCode('');
                setNotice({ text: 'Kurtarma kodunu güvenle sakla.' });
              }}
            >
              Kodu kaydettim
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p ref={heading} tabIndex={-1} style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>
            Bu kod yalnızca şimdi gösterilir. Güvenli bir yere kaydetmeden bu pencereyi kapatma.
          </p>
          {notice ? (
            <InlineFeedback message={notice.text} tone={notice.error ? 'danger' : 'signal'} />
          ) : null}
          <FormField label="Yeni kurtarma kodun" htmlFor="fresh-recovery-code">
            <Textarea
              id="fresh-recovery-code"
              readOnly
              rows={3}
              value={code}
              className="mono"
              onFocus={(e) => e.target.select()}
            />
          </FormField>
        </div>
      </Modal>
    </section>
  );
}
