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
          body: JSON.stringify({ email, recovery_code: recoveryCode, new_password: password }),
        });
        if (res?.success) {
          alert('Parolanız sıfırlandı. Giriş yapabilirsiniz.');
          setMode('login');
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
      className="auth-screen"
      id="auth-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      style={{ display: 'flex', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        className="auth-panel"
        style={{ position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button"
          aria-label="Kapat"
          style={{ position: 'absolute', top: '16px', right: '16px' }}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="auth-brand" style={{ marginBottom: '16px' }}>
          <span>pace</span>
        </div>

        <h1 id="auth-title">
          {generatedCode ? 'Kurtarma Kodunu Sakla' : mode === 'login' ? 'Alışkanlıklarına yer aç.' : mode === 'register' ? 'Hesap Oluştur' : 'Parola Sıfırla'}
        </h1>

        {generatedCode ? (
          <div>
            <div
              className="panel-card"
              style={{
                background: 'var(--orange-soft)',
                border: '1px solid var(--orange-border)',
                borderRadius: '16px',
                textAlign: 'center',
                margin: '20px 0',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '3px', color: 'var(--ink)' }}>
                {generatedCode}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '10px 0 16px' }}>
                Parolanı unutursan bu kodla hesabına dönebilirsin. Kod yalnızca şimdi gösterilir.
              </p>
              <button
                type="button"
                className="button button-quiet"
                style={{ width: '100%', minHeight: '40px', fontWeight: 700 }}
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check size={16} style={{ marginRight: '6px' }} />
                    Kod Panoya Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy size={16} style={{ marginRight: '6px' }} />
                    Kodu Kopyala
                  </>
                )}
              </button>
            </div>
            <button
              type="button"
              className="button button-primary"
              style={{ width: '100%', minHeight: '44px' }}
              onClick={() => {
                setGeneratedCode('');
                onClose();
              }}
            >
              Kodu kaydettim, devam et
            </button>
          </div>
        ) : (
          <form id="auth-form" onSubmit={handleSubmit}>
            {errorMsg && (
              <p className="form-message" role="status" style={{ color: 'var(--red)', fontWeight: 600 }}>
                {errorMsg}
              </p>
            )}

            <label htmlFor="auth-email">E-posta adresin</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="ornek@email.com"
            />

            {mode === 'recover' && (
              <div>
                <label htmlFor="auth-recovery">Kurtarma kodun</label>
                <input
                  id="auth-recovery"
                  name="recovery"
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  required
                  placeholder="Kayıt olurken verilen kod"
                />
              </div>
            )}

            <label htmlFor="auth-password">
              {mode === 'recover' ? 'Yeni parolan' : 'Parolan'}
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              placeholder="En az 8 karakter"
            />

            <button
              type="submit"
              className="button button-primary"
              id="auth-submit"
              disabled={loading}
              style={{ width: '100%', minHeight: '44px', marginTop: '12px' }}
            >
              {loading
                ? 'İşleniyor…'
                : mode === 'login'
                ? 'Giriş Yap'
                : mode === 'register'
                ? 'Hesap Oluştur'
                : 'Parolayı Güncelle'}
            </button>
          </form>
        )}

        {!generatedCode && (
          <div className="auth-footer" style={{ marginTop: '16px', textAlign: 'center' }}>
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => { setMode('register'); setErrorMsg(''); }}
                >
                  Hesabın yok mu? Kayıt ol
                </button>
                <span style={{ margin: '0 8px', color: 'var(--border)' }}>•</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => { setMode('recover'); setErrorMsg(''); }}
                >
                  Parolamı unuttum
                </button>
              </>
            )}
            {mode === 'register' && (
              <button
                type="button"
                className="text-button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
              >
                Zaten hesabın var mı? Giriş yap
              </button>
            )}
            {mode === 'recover' && (
              <button
                type="button"
                className="text-button"
                onClick={() => { setMode('login'); setErrorMsg(''); }}
              >
                Giriş ekranına dön
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
