import React, { useState, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import * as api from '../lib/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'recover'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.request('auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res?.user) {
          onAuthSuccess?.(res.user);
          onClose();
        }
      } else if (mode === 'register') {
        const res = await api.request('auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res?.recovery_code) {
          setGeneratedCode(res.recovery_code);
          if (res.user) onAuthSuccess?.(res.user);
        }
      } else if (mode === 'recover') {
        const res = await api.request('auth/recover', {
          method: 'POST',
          body: JSON.stringify({ email, recovery_code: recoveryCode, password }),
        });
        if (res?.ok || res?.user) {
          if (res.user) onAuthSuccess?.(res.user);
          if (res.recovery_code) {
            setGeneratedCode(res.recovery_code);
          } else {
            alert('Parolanız sıfırlandı. Yeni parolanızla giriş yapabilirsiniz.');
            setMode('login');
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'İşlem başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="modal-overlay"
      id="auth-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onClick={onClose}
    >
      <div
        className="dialog-sheet auth-panel"
        style={{ position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true"></div>

        <button
          type="button"
          className="button-icon icon-button"
          aria-label="Kapat"
          style={{ position: 'absolute', top: '16px', right: '16px' }}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="auth-brand">
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 800, color: 'var(--ink)' }}>
            pace
          </span>
          <p className="auth-lead" style={{ marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>
            {mode === 'login' && 'Hesabına giriş yap, alışkanlıklarını eşitle.'}
            {mode === 'register' && 'Hemen hesabını oluştur, cihazlar arası takip et.'}
            {mode === 'recover' && 'Kurtarma kodunla parolanı yenile.'}
          </p>
        </div>

        {/* Tab mode toggle */}
        <div className="segmented-control" role="tablist" style={{ width: '100%', margin: '16px 0' }}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`segmented-item ${mode === 'login' ? 'is-selected' : ''}`}
            style={{ flex: 1, minHeight: '42px' }}
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setGeneratedCode('');
            }}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`segmented-item ${mode === 'register' ? 'is-selected' : ''}`}
            style={{ flex: 1, minHeight: '42px' }}
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setGeneratedCode('');
            }}
          >
            Kayıt Ol
          </button>
        </div>

        {generatedCode ? (
          <div
            className="recovery-box"
            style={{
              background: 'var(--orange-soft)',
              border: '1px solid var(--orange-border)',
              borderRadius: '12px',
              padding: '16px',
              margin: '16px 0',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: 'var(--orange-dark)' }}>
              Önemli: Kurtarma Kodunu Kaydet!
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.4 }}>
              Parolanı unutursan hesabını yalnızca bu kodla kurtarabilirsin. Başka bir kurtarma yöntemi yoktur.
            </p>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '1px',
                wordBreak: 'break-all',
                background: 'var(--surface)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{generatedCode}</span>
              <button
                type="button"
                className="btn-3d btn-3d-gray"
                style={{ height: '36px', padding: '0 12px', fontSize: '12px', borderRadius: '10px' }}
                onClick={handleCopyCode}
                aria-label="Kodu kopyala"
              >
                {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                <span style={{ marginLeft: '4px' }}>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>
            <button
              type="button"
              className="btn-3d btn-3d-green"
              style={{ width: '100%', minHeight: '48px', borderRadius: '14px' }}
              onClick={() => {
                setGeneratedCode('');
                onClose();
              }}
            >
              Kodu kaydettim, devam et
            </button>
          </div>
        ) : (
          <form id="auth-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errorMsg && (
              <p className="form-message" role="alert" style={{ color: 'var(--red)', fontWeight: 600, fontSize: '14px', margin: 0 }}>
                {errorMsg}
              </p>
            )}

            <label htmlFor="auth-email" style={{ fontSize: '13px', fontWeight: 700 }}>
              E-posta adresin
              <input
                id="auth-email"
                name="email"
                type="email"
                className="form-input"
                style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                placeholder="ornek@email.com"
              />
            </label>

            {mode === 'recover' && (
              <label htmlFor="auth-recovery" style={{ fontSize: '13px', fontWeight: 700 }}>
                Kurtarma kodun
                <input
                  id="auth-recovery"
                  name="recovery"
                  type="text"
                  className="form-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  required
                  placeholder="Kayıt olurken verilen kod"
                />
              </label>
            )}

            <label htmlFor="auth-password" style={{ fontSize: '13px', fontWeight: 700 }}>
              {mode === 'recover' ? 'Yeni parolan' : 'Parolan'}
              <input
                id="auth-password"
                name="password"
                type="password"
                className="form-input"
                style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                placeholder="En az 10 karakter"
              />
            </label>

            <button
              type="submit"
              className="btn-3d btn-3d-green"
              id="auth-submit"
              disabled={loading}
              style={{ width: '100%', minHeight: '48px', marginTop: '8px', fontSize: '15px' }}
            >
              {loading
                ? 'İşleniyor…'
                : mode === 'login'
                ? 'Giriş Yap'
                : mode === 'register'
                ? 'Hesap Oluştur'
                : 'Parolayı Sıfırla'}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                className="button-link"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
                onClick={() => {
                  setMode('recover');
                  setErrorMsg('');
                }}
              >
                Parolamı unuttum (Kurtarma koduyla aç)
              </button>
            )}

            {mode === 'recover' && (
              <button
                type="button"
                className="button-link"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
              >
                ← Giriş ekranına dön
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
