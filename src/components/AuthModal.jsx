import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import * as api from '../lib/api.js';
import { PASSWORD_HELP, validateAuthResponse } from '../lib/auth-ui.js';
import { Modal, TabNav, TextInput, Button, InlineFeedback } from './ui/index.js';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  emailCodeEnabled = false,
  guestHabitsCount = 0,
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const pendingRef = useRef(false);
  const codeRef = useRef('');
  const mountedRef = useRef(true);
  const controllerRef = useRef(null);
  const recoveryHeadingRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isOpen && !pendingRef.current && !codeRef.current) {
      setMode(initialMode === 'code' && !emailCodeEnabled ? 'login' : initialMode);
      setCodeSent(false);
      setEmailCode('');
    }
  }, [isOpen, initialMode, emailCodeEnabled]);

  const requestClose = useCallback(() => {
    if (pendingRef.current) {
      setNotice('İşlem sürüyor. Sonuç gelene kadar bu pencereyi açık tut.');
      return;
    }
    if (codeRef.current) {
      setNotice('Kurtarma kodunu güvenli bir yere kaydet, ardından "Kodu kaydettim, devam et" düğmesini kullan.');
      return;
    }
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!generatedCode && !loading) return;
    const frame = generatedCode ? requestAnimationFrame(() => recoveryHeadingRef.current?.focus()) : null;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [generatedCode, loading]);

  const changeMode = (next) => {
    if (pendingRef.current || codeRef.current) return;
    setMode(next);
    setErrorMsg('');
    setNotice('');
    setPassword('');
    setShowPassword(false);
    setCodeSent(false);
    setEmailCode('');
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pendingRef.current || codeRef.current) return;
    if (api.demoMode) {
      setErrorMsg('Örnek görünümde gerçek hesaba giriş yapılamaz. "Kendi hesabıma geç" ile demodan çık.');
      return;
    }
    pendingRef.current = true;
    setLoading(true);
    setErrorMsg('');
    setNotice('');
    const action = mode;
    if (action === 'code' && !emailCodeEnabled) {
      pendingRef.current = false;
      setLoading(false);
      setErrorMsg('E-posta koduyla giriş şu anda etkin değil.');
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const endpoint = action === 'code' ? (codeSent ? 'verify-code' : 'request-code') : action;
      const payload = await api.request(`auth/${endpoint}`, {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify(
          action === 'code'
            ? { email: email.trim(), ...(codeSent ? { code: emailCode.trim() } : {}) }
            : { email: email.trim(), password, ...(action === 'recover' ? { recovery_code: recoveryCode.trim() } : {}) }
        ),
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      if (action === 'code' && !codeSent) {
        if (payload?.ok !== true) throw new Error('Kod isteği sunucu tarafından doğrulanamadı.');
        setCodeSent(true);
        setNotice(payload.message || 'Giriş kodu e-postana gönderildi.');
        return;
      }
      const result = validateAuthResponse(action === 'code' ? 'login' : action, payload);
      setPassword('');
      setRecoveryCode('');
      setShowPassword(false);
      if (result.recoveryCode) {
        codeRef.current = result.recoveryCode;
        setGeneratedCode(result.recoveryCode);
        setAuthenticatedUser(result.user);
        setNotice(
          action === 'register'
            ? 'Hesabın oluşturuldu. Kurtarma kodunu şimdi kaydet.'
            : 'Parolan yenilendi. Eski kurtarma kodun geçersiz; yeni kodunu şimdi kaydet.'
        );
      } else {
        onAuthSuccess?.(result.user);
        onClose?.();
      }
    } catch (err) {
      if (mountedRef.current && !controller.signal.aborted) {
        setErrorMsg(err.message || 'İşlem tamamlanamadı. Lütfen yeniden dene.');
      }
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      if (!mountedRef.current) return;
      setCopied(true);
      setErrorMsg('');
      setNotice('Kurtarma kodu panoya kopyalandı. Güvenli bir yere yapıştırıp kaydet.');
    } catch {
      if (mountedRef.current) {
        setCopied(false);
        setErrorMsg('Kopyalanamadı. Aşağıdaki kodu seçip elle kopyalayabilir veya güvenli bir yere yazabilirsin.');
      }
    }
  };

  const finishRecovery = () => {
    if (!authenticatedUser || !codeRef.current) return;
    codeRef.current = '';
    setGeneratedCode('');
    onAuthSuccess?.(authenticatedUser);
    onClose?.();
  };

  const title = generatedCode
    ? 'Kurtarma kodunu kaydet'
    : mode === 'login'
      ? 'Giriş yap'
      : mode === 'register'
        ? 'Hesap oluştur'
        : mode === 'code'
          ? 'E-posta koduyla giriş'
          : 'Hesabını kurtar';

  const lead = generatedCode
    ? 'Bu kod yalnızca şimdi gösterilir. Hesabına devam etmeden önce güvenli bir yere kaydet.'
    : mode === 'login'
      ? 'Hesabına giriş yap, alışkanlıklarını eşitle.'
      : mode === 'register'
        ? 'Kendi hesabını oluştur, cihazların arasında takip et.'
        : mode === 'code'
          ? 'Tek kullanımlık giriş kodunu e-postandan al.'
          : 'Kurtarma kodunla yeni bir parola belirle.';

  const tabs = [
    { id: 'login', label: 'Giriş Yap' },
    { id: 'register', label: 'Kayıt Ol' },
    ...(emailCodeEnabled ? [{ id: 'code', label: 'E-posta kodu' }] : []),
  ];

  return (
    <Modal
      open={isOpen}
      onClose={requestClose}
      title={title}
      description={lead}
      id="auth-screen"
      size="sm"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} aria-busy={loading}>
        {guestHabitsCount > 0 && !generatedCode && (
          <InlineFeedback tone="neutral">
            Bu cihazda <strong className="mono">{guestHabitsCount}</strong> kişisel rutinin var. Hesabına girişten sonra aktarım seçeneği sunulacak.
          </InlineFeedback>
        )}

        {notice && (
          <InlineFeedback tone="neutral" role="status" aria-live="polite" aria-atomic="true">
            {notice}
          </InlineFeedback>
        )}

        {errorMsg && (
          <InlineFeedback id="auth-error" tone="error" role="alert">
            {errorMsg}
          </InlineFeedback>
        )}

        {api.demoMode && (
          <InlineFeedback
            tone="neutral"
            action={<Button variant="primary" size="sm" onClick={() => api.exitDemo()}>Kendi hesabıma geç</Button>}
          >
            Demo kayıtların bu tarayıcıda kalır ve gerçek hesabına otomatik aktarılmaz.
          </InlineFeedback>
        )}

        {generatedCode ? (
          <section
            aria-labelledby="recovery-code-title"
            style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <h3 id="recovery-code-title" ref={recoveryHeadingRef} tabIndex={-1} style={{ margin: 0, fontSize: '15px' }}>
              Kurtarma kodun hazır
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              Parolanı unutursan hesabını bu kodla kurtarabilirsin. Kodu parola yöneticine veya yalnızca senin erişebileğin güvenli bir yere kaydet.
            </p>
            <label htmlFor="generated-recovery-code" className="mono" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              Yeni kurtarma kodun
            </label>
            <textarea
              id="generated-recovery-code"
              readOnly
              rows={3}
              value={generatedCode}
              spellCheck={false}
              className="mono"
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                resize: 'none',
                fontSize: '13px',
              }}
              onFocus={(event) => event.target.select()}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={handleCopyCode} aria-label="Kodu kopyala">
                {copied ? <Check size={16} strokeWidth={1.5} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.5} aria-hidden="true" />}
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </Button>
              <Button variant="primary" size="md" style={{ flex: 1 }} onClick={finishRecovery}>
                Kodu kaydettim, devam et
              </Button>
            </div>
          </section>
        ) : (
          <>
            {mode !== 'recover' && (
              <TabNav
                tabs={tabs}
                activeTab={mode}
                onChange={changeMode}
                ariaLabel="Hesap işlemi seç"
              />
            )}

            <form id="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
              <fieldset
                disabled={loading}
                style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 0 }}
              >
                <legend className="sr-only">{title}</legend>

                <TextInput
                  ref={emailRef}
                  id="auth-email"
                  name="email"
                  type="email"
                  label="E-posta adresin"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  disabled={mode === 'code' && codeSent}
                  required
                  placeholder="ornek@email.com"
                  aria-describedby={errorMsg ? 'auth-error' : undefined}
                />

                {mode === 'code' && codeSent && (
                  <TextInput
                    id="auth-email-code"
                    label="E-postandaki 6 haneli kod"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    required
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                  />
                )}

                {mode === 'recover' && (
                  <TextInput
                    id="auth-recovery"
                    name="recovery"
                    type="text"
                    label="Kurtarma kodun"
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value)}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={128}
                    required
                    placeholder="Hesap oluştururken kaydettiğin kod"
                    help="Parolan yenilendiğinde bu kod geçersiz olur ve sana yeni bir kurtarma kodu verilir."
                  />
                )}

                {mode !== 'code' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <TextInput
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      label={mode === 'recover' ? 'Yeni parolan' : 'Parolan'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={mode === 'login' ? 8 : 10}
                      maxLength={128}
                      required
                      help={
                        mode === 'login'
                          ? 'Mevcut parolanla giriş yap. Eski 8–9 karakterlik parolalar da kabul edilir.'
                          : PASSWORD_HELP
                      }
                      aria-describedby={errorMsg ? 'auth-error' : undefined}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                        aria-pressed={showPassword}
                        aria-controls="auth-password"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <EyeOff size={15} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={15} strokeWidth={1.5} aria-hidden="true" />}
                        {showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  id="auth-submit"
                  disabled={loading || api.demoMode}
                  loading={loading}
                  style={{ width: '100%', marginTop: 'var(--space-2)' }}
                >
                  {loading
                    ? 'İşleniyor…'
                    : mode === 'login'
                      ? 'Giriş Yap'
                      : mode === 'register'
                        ? 'Hesap Oluştur'
                        : mode === 'code'
                          ? codeSent
                            ? 'Kodu Doğrula ve Giriş Yap'
                            : 'Giriş Kodu Gönder'
                          : 'Parolayı Sıfırla'}
                </Button>

                {mode === 'code' && codeSent && (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => {
                      setCodeSent(false);
                      setEmailCode('');
                      setNotice('');
                    }}
                  >
                    E-postayı değiştir veya yeni kod iste
                  </Button>
                )}

                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={() => changeMode(mode === 'recover' ? 'login' : 'recover')}
                >
                  {mode === 'recover' ? 'Giriş ekranına dön' : 'Parolamı unuttum — kurtarma koduyla aç'}
                </Button>
              </fieldset>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
