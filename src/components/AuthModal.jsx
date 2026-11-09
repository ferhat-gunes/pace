import React, { useState } from 'react';
import * as api from '../lib/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'recover'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res?.user) {
          onAuthSuccess?.(res.user);
          onClose();
        }
      } else if (mode === 'register') {
        const res = await api.request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res?.recovery_code) {
          setGeneratedCode(res.recovery_code);
          if (res.user) onAuthSuccess?.(res.user);
        }
      } else if (mode === 'recover') {
        const res = await api.request('/api/auth/recover', {
          method: 'POST',
          body: JSON.stringify({ email, recovery_code: recoveryCode, new_password: password }),
        });
        if (res?.success) {
          alert('Parolanız sıfırlandı. Giriş yapabilirsiniz.');
          setMode('login');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'İşlem sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="auth-screen"
      id="auth-screen"
      style={{ display: 'flex', zIndex: 100 }}
    >
      <div className="auth-brand">
        <span>pace</span>
      </div>

      <div className="auth-panel">
        <h1 id="auth-title">
          {generatedCode ? 'Kurtarma Kodunu Sakla' : mode === 'login' ? 'Alışkanlıklarına yer aç.' : mode === 'register' ? 'Hesap Oluştur' : 'Parola Sıfırla'}
        </h1>

        {generatedCode ? (
          <div>
            <div className="habit-row" style={{ background: 'var(--orange-soft)', borderColor: 'var(--orange-border)', textAlign: 'center', margin: '20px 0' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: 'var(--ink)' }}>
                {generatedCode}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0 0' }}>
                Parolanı unutursan bu kodla hesabına dönebilirsin. Kod yalnızca şimdi gösterilir.
              </p>
            </div>
            <button
              type="button"
              className="button button-primary"
              style={{ width: '100%' }}
              onClick={() => {
                setGeneratedCode('');
                onClose();
              }}
            >
              Kodu kaydettim
            </button>
          </div>
        ) : (
          <form id="auth-form" onSubmit={handleSubmit}>
            {errorMsg && (
              <p className="form-message" role="status" style={{ color: 'var(--red)' }}>
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
                  autoComplete="off"
                  placeholder="Hesabını açarken kaydettiğin kod"
                  required
                />
              </div>
            )}

            <label htmlFor="auth-password" id="auth-password-label">
              {mode === 'recover' ? 'Yeni Parolan' : 'Parolan'}
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={10}
              maxLength={128}
              required
              placeholder="En az 10 karakter"
            />

            <button className="button button-primary auth-submit" id="auth-submit" type="submit" disabled={loading}>
              {loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş yap' : mode === 'register' ? 'Hesap oluştur' : 'Parolamı sıfırla'}
            </button>

            <div className="auth-switch">
              {mode === 'login' ? (
                <>
                  <button type="button" onClick={() => setMode('register')}>Hesap oluştur</button>
                  <button type="button" onClick={() => setMode('recover')}>Parolamı unuttum</button>
                </>
              ) : (
                <button type="button" onClick={() => setMode('login')}>Giriş yap</button>
              )}
            </div>

            <p className="auth-privacy">Verilerin hesabında saklanır.</p>
            <button
              type="button"
              className="text-button"
              style={{ marginTop: '12px' }}
              onClick={onClose}
            >
              Kapat
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
