import React, { useState, useEffect } from 'react';
import { Copy, Check, X, Download, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import * as api from '../lib/api';
import { playPop } from '../lib/soundFx';

function evaluatePassword(pwd) {
  if (!pwd) return { ok: false, score: 0, label: 'En az 8 karakter gerekli' };
  const lenOk = pwd.length >= 8 && pwd.length <= 128;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
  if (!lenOk) return { ok: false, score: 0, label: pwd.length > 128 ? 'En fazla 128 karakter' : `${8 - pwd.length} karakter daha ekle` };
  if (score <= 2) return { ok: true, score: 2, label: 'Orta güçlükte parola ✓' };
  return { ok: true, score: 4, label: 'Güçlü parola ✓' };
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  emailCodeEnabled = false,
  initialMode = 'login',
  guestHabitsCount = 0,
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'code' | 'recover'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync mode when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode || 'login');
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratedCode('');
    setSavedConfirmed(false);
    setCodeSent(false);
    setEmailCode('');
    setShowPassword(false);
  }, [isOpen, initialMode]);

  // Handle ESC key for modal dismissal (blocked only while unsaved recovery code is displayed)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (!generatedCode || savedConfirmed)) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, generatedCode, savedConfirmed]);

  if (!isOpen) return null;

  const isDemo = api.isDemo();
  const pwdInfo = evaluatePassword(password);
  const needsStrongHint = mode === 'register' || mode === 'recover';

  const switchMode = (nextMode) => {
    playPop();
    setMode(nextMode);
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratedCode('');
    setSavedConfirmed(false);
    setCodeSent(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Geçerli bir e-posta adresi gir.');
      return;
    }

    if (mode !== 'code' && (password.length < 8 || password.length > 128)) {
      setErrorMsg('Parolan 8–128 karakter arasında olmalı.');
      return;
    }

    if (mode === 'recover' && recoveryCode.replace(/[^a-f0-9]/gi, '').length !== 48) {
      setErrorMsg('Kurtarma kodunu eksiksiz gir.');
      return;
    }

    if (mode === 'code' && codeSent && !/^\d{6}$/.test(emailCode.trim())) {
      setErrorMsg('6 haneli sayısal kodu gir.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.request('auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        if (res?.user) {
          await onAuthSuccess?.(res.user);
          onClose();
        }
      } else if (mode === 'register') {
        const res = await api.request('auth/register', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        if (res?.recovery_code) {
          setGeneratedCode(res.recovery_code);
          setSavedConfirmed(false);
          if (res.user) await onAuthSuccess?.(res.user);
        }
      } else if (mode === 'code') {
        if (!codeSent) {
          const res = await api.request('auth/request-code', {
            method: 'POST',
            body: JSON.stringify({ email: cleanEmail }),
          });
          setCodeSent(true);
          setSuccessMsg(res?.message || '6 haneli giriş kodun e-postana gönderildi.');
        } else {
          const res = await api.request('auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ email: cleanEmail, code: emailCode.trim() }),
          });
          if (res?.user) {
            await onAuthSuccess?.(res.user);
            onClose();
          }
        }
      } else if (mode === 'recover') {
        const res = await api.request('auth/recover', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, recovery_code: recoveryCode.trim(), password }),
        });
        if (res?.ok || res?.user) {
          if (res.user) await onAuthSuccess?.(res.user);
          if (res.recovery_code) {
            setGeneratedCode(res.recovery_code);
            setSavedConfirmed(false);
          } else {
            setSuccessMsg('Parolan sıfırlandı. Yeni parolanla giriş yapabilirsin.');
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
      setSavedConfirmed(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleDownloadCode = () => {
    if (!generatedCode) return;
    const content = `PACE Hesap Kurtarma Kodu\nE-posta: ${email}\nKurtarma Kodu: ${generatedCode}\n\nBu kodu güvenli bir yerde saklayın. Parolanızı unutursanız hesabınızı bu kodla kurtarabilirsiniz.\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pace-kurtarma-kodu.txt';
    a.click();
    URL.revokeObjectURL(url);
    setSavedConfirmed(true);
  };

  return (
    <div
      className="modal-overlay"
      id="auth-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onClick={() => {
        if (!generatedCode || savedConfirmed) onClose?.();
      }}
    >
      <div
        className="dialog-sheet auth-panel"
        style={{ position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true"></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div className="auth-brand" id="auth-title" style={{ flex: '1 1 auto', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, color: 'var(--ink)' }}>
              pace
            </span>
            <p className="auth-lead" style={{ marginTop: '4px', marginBottom: 0, color: 'var(--muted)', fontSize: '13px', fontWeight: 500, lineHeight: 1.35 }}>
              {isDemo && 'Şu an örnek Demo verilerini inceliyorsun.'}
              {!isDemo && mode === 'login' && 'Hesabına giriş yap, alışkanlıklarını eşitle.'}
              {!isDemo && mode === 'register' && 'Ücretsiz hesabını oluştur, cihazlar arası takip et.'}
              {!isDemo && mode === 'code' && 'Parolasız tek kullanımlık e-posta koduyla giriş yap.'}
              {!isDemo && mode === 'recover' && 'Kurtarma kodunla yeni bir parola belirle.'}
            </p>
          </div>

          {(!generatedCode || savedConfirmed) && (
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Kapat"
              style={{ minWidth: '44px', minHeight: '44px', flexShrink: 0 }}
              onClick={() => {
                playPop();
                onClose();
              }}
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {isDemo ? (
          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'var(--primary-soft)',
                border: '1.5px solid var(--primary)',
                borderRadius: '16px',
                padding: '14px',
                fontSize: '13px',
                color: 'var(--ink)',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--primary-dark)' }}>
                Demo Modundasın
              </strong>
              Gerçek bir hesaba giriş yapmak veya yeni hesap açmak için Demo modundan çıkmalısın. Demo verilerin hesabına karışmaz.
            </div>

            <button
              type="button"
              className="btn-3d btn-3d-green"
              style={{ width: '100%', minHeight: '48px', fontSize: '14px' }}
              onClick={() => {
                playPop();
                api.exitDemo(true);
              }}
            >
              <span>Demo'dan Çık ve Giriş Yap</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn-3d btn-3d-gray"
              style={{ width: '100%', minHeight: '44px', fontSize: '13px' }}
              onClick={() => {
                playPop();
                onClose();
              }}
            >
              Demo'yu İncelemeye Devam Et
            </button>
          </div>
        ) : generatedCode ? (
          <div
            className="recovery-box"
            style={{
              background: 'var(--orange-soft)',
              border: '1.5px solid var(--orange)',
              borderRadius: '16px',
              padding: '16px',
              margin: '16px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={20} color="var(--orange-dark)" />
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--orange-dark)' }}>
                Önemli: Kurtarma Kodunu Kaydet!
              </h3>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.45, color: 'var(--ink)' }}>
              Parolanı unutursan hesabını bu kodla açabilirsin. Kodu kopyala veya dosya olarak indir.
            </p>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                wordBreak: 'break-all',
                background: 'var(--surface)',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                marginBottom: '12px',
              }}
            >
              <div style={{ marginBottom: '10px', userSelect: 'all' }}>{generatedCode}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-3d btn-3d-gray"
                  style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '10px', flex: '1 1 110px' }}
                  onClick={handleCopyCode}
                  aria-label="Kodu kopyala"
                >
                  {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                  <span style={{ marginLeft: '4px' }}>{copied ? 'Kopyalandı ✓' : 'Kopyala'}</span>
                </button>
                <button
                  type="button"
                  className="btn-3d btn-3d-gray"
                  style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '10px', flex: '1 1 110px' }}
                  onClick={handleDownloadCode}
                  aria-label="Kodu .txt olarak indir"
                >
                  <Download size={14} />
                  <span style={{ marginLeft: '4px' }}>.txt İndir</span>
                </button>
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minHeight: '44px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--ink)',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              <input
                type="checkbox"
                checked={savedConfirmed}
                onChange={(e) => setSavedConfirmed(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--green)', flexShrink: 0, margin: 0 }}
              />
              <span>Kurtarma kodumu güvenli bir yere kaydettim</span>
            </label>

            <button
              type="button"
              className="btn-3d btn-3d-green"
              disabled={!savedConfirmed}
              style={{ width: '100%', minHeight: '48px', borderRadius: '14px' }}
              onClick={() => {
                setGeneratedCode('');
                setSavedConfirmed(false);
                onClose();
              }}
            >
              Hesabımla Devam Et
            </button>
          </div>
        ) : (
          <>
            {/* Tab mode toggle */}
            <div className="segmented-control" role="tablist" style={{ width: '100%', margin: '14px 0' }}>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={`segmented-item ${mode === 'login' ? 'is-selected' : ''}`}
                style={{ flex: 1, minHeight: '44px', padding: '6px 8px', fontSize: '12px' }}
                onClick={() => switchMode('login')}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={`segmented-item ${mode === 'register' ? 'is-selected' : ''}`}
                style={{ flex: 1, minHeight: '44px', padding: '6px 8px', fontSize: '12px' }}
                onClick={() => switchMode('register')}
              >
                Kayıt Ol
              </button>
              {emailCodeEnabled && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'code'}
                  className={`segmented-item ${mode === 'code' ? 'is-selected' : ''}`}
                  style={{ flex: 1, minHeight: '44px', padding: '6px 6px', fontSize: '12px' }}
                  onClick={() => switchMode('code')}
                >
                  Kodla Giriş
                </button>
              )}
            </div>

            {guestHabitsCount > 0 && (mode === 'login' || mode === 'register') && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary-dark)',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '12px',
                }}
              >
                <Sparkles size={16} style={{ flexShrink: 0 }} />
                <span>Bu cihazdaki {guestHabitsCount} alışkanlığın hesabına otomatik aktarılacak.</span>
              </div>
            )}

            <form id="auth-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} noValidate>
              {errorMsg && (
                <p className="form-message" role="alert" style={{ color: 'var(--red)', fontWeight: 700, fontSize: '13px', margin: 0, background: 'var(--red-soft)', padding: '10px 12px', borderRadius: '10px' }}>
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p className="form-message" role="status" style={{ color: 'var(--green-dark)', fontWeight: 700, fontSize: '13px', margin: 0, background: 'var(--green-soft)', padding: '10px 12px', borderRadius: '10px' }}>
                  {successMsg}
                </p>
              )}

              <label htmlFor="auth-email" style={{ fontSize: '13px', fontWeight: 700, marginTop: 0 }}>
                E-posta adresin
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  className="form-input"
                  style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '16px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={mode === 'code' && codeSent}
                  required
                  placeholder="ornek@email.com"
                />
              </label>

              {mode === 'code' && codeSent && (
                <label htmlFor="auth-email-code" style={{ fontSize: '13px', fontWeight: 700, marginTop: 0 }}>
                  6 Haneli Giriş Kodu
                  <input
                    id="auth-email-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="form-input"
                    style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '18px', letterSpacing: '6px', fontWeight: 800, textAlign: 'center' }}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                    required
                    placeholder="000000"
                  />
                </label>
              )}

              {mode === 'recover' && (
                <label htmlFor="auth-recovery" style={{ fontSize: '13px', fontWeight: 700, marginTop: 0 }}>
                  Kurtarma kodun
                  <input
                    id="auth-recovery"
                    name="recovery"
                    type="text"
                    className="form-input"
                    style={{ width: '100%', height: '48px', padding: '0 12px', marginTop: '6px', fontSize: '15px', fontFamily: 'monospace' }}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    required
                    placeholder="XXXXXXXX-XXXXXXXX-..."
                  />
                </label>
              )}

              {mode !== 'code' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="auth-password" style={{ fontSize: '13px', fontWeight: 700, marginTop: 0 }}>
                    {mode === 'recover' ? 'Yeni parolan' : 'Parolan'}
                  </label>
                  <div className="password-field-wrap">
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      style={{ width: '100%', height: '48px', padding: '0 48px 0 12px', marginTop: 0, fontSize: '16px' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'register' || mode === 'recover' ? 'new-password' : 'current-password'}
                      minLength={8}
                      maxLength={128}
                      required
                      placeholder="En az 8 karakter"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                      aria-pressed={showPassword}
                      onClick={() => {
                        playPop();
                        setShowPassword((v) => !v);
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {needsStrongHint && (
                    <div className="strength-meter" aria-live="polite">
                      <div className="strength-bars" aria-hidden="true">
                        {[1, 2, 3, 4].map((step) => (
                          <span
                            key={step}
                            className={`strength-bar ${
                              pwdInfo.score >= step
                                ? pwdInfo.score >= 3
                                  ? 'is-strong'
                                  : 'is-ok'
                                : ''
                            }`}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: pwdInfo.ok ? 'var(--green-dark)' : 'var(--muted)' }}>
                        {pwdInfo.label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn-3d btn-3d-green"
                id="auth-submit"
                disabled={loading}
                style={{ width: '100%', minHeight: '48px', marginTop: '4px', fontSize: '15px' }}
              >
                {loading
                  ? 'İşleniyor…'
                  : mode === 'login'
                  ? 'Giriş Yap'
                  : mode === 'register'
                  ? 'Hesap Oluştur'
                  : mode === 'code'
                  ? (codeSent ? 'Kodu Doğrula ve Giriş Yap' : 'Giriş Kodu Gönder')
                  : 'Parolayı Sıfırla'}
              </button>

              {mode === 'code' && codeSent && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
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
                      minHeight: '44px',
                      padding: '8px 0',
                    }}
                    onClick={() => {
                      setCodeSent(false);
                      setEmailCode('');
                      setSuccessMsg('');
                    }}
                  >
                    E-postayı değiştir
                  </button>
                  <button
                    type="button"
                    className="button-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-dark)',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      minHeight: '44px',
                      padding: '8px 0',
                    }}
                    onClick={() => {
                      setCodeSent(false);
                      setEmailCode('');
                      setSuccessMsg('');
                    }}
                  >
                    Yeni kod iste
                  </button>
                </div>
              )}

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
                    minHeight: '44px',
                    padding: '4px 0',
                  }}
                  onClick={() => switchMode('recover')}
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
                    minHeight: '44px',
                    padding: '4px 0',
                  }}
                  onClick={() => switchMode('login')}
                >
                  ← Giriş ekranına dön
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
