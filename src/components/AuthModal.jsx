import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, X, Eye, EyeOff } from 'lucide-react';
import * as api from '../lib/api.js';
import { PASSWORD_HELP, validateAuthResponse } from '../lib/auth-ui.js';

const fieldStyle = { width: '100%', minHeight: '48px', padding: '10px 12px', marginTop: '6px', fontSize: '16px' };

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', emailCodeEnabled = false, guestHabitsCount = 0 }) {
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
  const [emailCode,setEmailCode]=useState('');
  const [codeSent,setCodeSent]=useState(false);
  const pendingRef = useRef(false);
  const codeRef = useRef('');
  const mountedRef = useRef(true);
  const controllerRef = useRef(null);
  const recoveryHeadingRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; controllerRef.current?.abort(); };
  }, []);

  useEffect(()=>{if(isOpen&&!pendingRef.current&&!codeRef.current){setMode(initialMode==='code'&&!emailCodeEnabled?'login':initialMode);setCodeSent(false);setEmailCode('');}},[isOpen,initialMode,emailCodeEnabled]);

  const requestClose = useCallback(() => {
    if (pendingRef.current) { setNotice('İşlem sürüyor. Sonuç gelene kadar bu pencereyi açık tut.'); return; }
    if (codeRef.current) { setNotice('Kurtarma kodunu güvenli bir yere kaydet, ardından “Kodu kaydettim, devam et” düğmesini kullan.'); return; }
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); requestClose(); }
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, [isOpen, requestClose]);

  useEffect(() => {
    if (!generatedCode && !loading) return;
    const frame = generatedCode ? requestAnimationFrame(() => recoveryHeadingRef.current?.focus()) : null;
    const beforeUnload = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { if (frame !== null) cancelAnimationFrame(frame); window.removeEventListener('beforeunload', beforeUnload); };
  }, [generatedCode, loading]);

  const changeMode = next => {
    if (pendingRef.current || codeRef.current) return;
    setMode(next); setErrorMsg(''); setNotice(''); setPassword(''); setShowPassword(false); setCodeSent(false);setEmailCode('');
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (pendingRef.current || codeRef.current) return;
    if (api.demoMode) {
      setErrorMsg('Örnek görünümde gerçek hesaba giriş yapılamaz. “Kendi hesabıma geç” ile demodan çık.');
      return;
    }
    pendingRef.current = true;
    setLoading(true); setErrorMsg(''); setNotice('');
    const action = mode;
    if(action==='code'&&!emailCodeEnabled){pendingRef.current=false;setLoading(false);setErrorMsg('E-posta koduyla giriş şu anda etkin değil.');return;}
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const endpoint=action==='code'?(codeSent?'verify-code':'request-code'):action;
      const payload = await api.request(`auth/${endpoint}`, {
        method: 'POST', signal: controller.signal,
        body: JSON.stringify(action==='code'?{email:email.trim(),...(codeSent?{code:emailCode.trim()}:{})}:{ email: email.trim(), password, ...(action === 'recover' ? { recovery_code: recoveryCode.trim() } : {}) }),
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      if(action==='code'&&!codeSent){if(payload?.ok!==true)throw new Error('Kod isteği sunucu tarafından doğrulanamadı.');setCodeSent(true);setNotice(payload.message||'Giriş kodu e-postana gönderildi.');return;}
      const result = validateAuthResponse(action==='code'?'login':action, payload);
      setPassword(''); setRecoveryCode(''); setShowPassword(false);
      if (result.recoveryCode) {
        codeRef.current = result.recoveryCode;
        setGeneratedCode(result.recoveryCode);
        setAuthenticatedUser(result.user);
        setNotice(action === 'register' ? 'Hesabın oluşturuldu. Kurtarma kodunu şimdi kaydet.' : 'Parolan yenilendi. Eski kurtarma kodun geçersiz; yeni kodunu şimdi kaydet.');
      } else {
        onAuthSuccess?.(result.user);
        onClose?.();
      }
    } catch (err) {
      if (mountedRef.current && !controller.signal.aborted) setErrorMsg(err.message || 'İşlem tamamlanamadı. Lütfen yeniden dene.');
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
      setCopied(true); setErrorMsg(''); setNotice('Kurtarma kodu panoya kopyalandı. Güvenli bir yere yapıştırıp kaydet.');
    } catch {
      if (mountedRef.current) { setCopied(false); setErrorMsg('Kopyalanamadı. Aşağıdaki kodu seçip elle kopyalayabilir veya güvenli bir yere yazabilirsin.'); }
    }
  };

  const finishRecovery = () => {
    if (!authenticatedUser || !codeRef.current) return;
    codeRef.current = '';
    setGeneratedCode('');
    onAuthSuccess?.(authenticatedUser);
    onClose?.();
  };

  if (!isOpen) return null;
  const title = generatedCode ? 'Kurtarma kodunu kaydet' : mode === 'login' ? 'Tekrar merhaba!' : mode === 'register' ? 'Kendi ritmini bul.' : mode==='code' ? 'E-posta koduyla giriş' : 'Hesabını kurtar';
  const lead = mode === 'login' ? 'Hesabına giriş yap, alışkanlıklarını eşitle.' : mode === 'register' ? 'Kendi hesabını oluştur, cihazların arasında takip et.' : mode==='code' ? 'Tek kullanımlık giriş kodunu e-postandan al.' : 'Kurtarma kodunla yeni bir parola belirle.';
  return (
    <div className="modal-overlay" id="auth-screen" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description" aria-busy={loading} onClick={requestClose}>
      <div className="dialog-sheet auth-panel" style={{ position: 'relative' }} onClick={event => event.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <button type="button" className="button-icon icon-button" aria-label="Kapat" disabled={loading || Boolean(generatedCode)} title={generatedCode ? 'Önce kurtarma kodunu kaydet.' : undefined} style={{ position: 'absolute', top: '16px', right: '16px' }} onClick={requestClose}><X size={20} aria-hidden="true" /></button>
        <div className="auth-brand"><span>pace</span></div>
        <h2 id="auth-title" className="auth-title">{title}</h2>
        <p id="auth-description" className="auth-lead">{generatedCode ? 'Bu kod yalnızca şimdi gösterilir. Hesabına devam etmeden önce güvenli bir yere kaydet.' : lead}</p>
        {guestHabitsCount>0&&!generatedCode&&<p className="inline-message">Bu cihazda {guestHabitsCount} kişisel rutinin var. Hesabına girişten sonra aktarım seçeneği sunulacak.</p>}
        {notice && <p className="inline-message" role="status" aria-live="polite" aria-atomic="true">{notice}</p>}
        {errorMsg && <p id="auth-error" className="form-message" role="alert">{errorMsg}</p>}
        {api.demoMode && <p className="inline-message">Demo kayıtların bu tarayıcıda kalır ve gerçek hesabına otomatik aktarılmaz. <button type="button" className="button button-primary" onClick={() => api.exitDemo()}>Kendi hesabıma geç</button></p>}

        {generatedCode ? (
          <section className="recovery-box" aria-labelledby="recovery-code-title" style={{ padding: '16px', margin: '16px 0' }}>
            <h3 id="recovery-code-title" ref={recoveryHeadingRef} tabIndex={-1}>Kurtarma kodun hazır</h3>
            <p>Parolanı unutursan hesabını bu kodla kurtarabilirsin. Kodu parola yöneticine veya yalnızca senin erişebileceğin güvenli bir yere kaydet.</p>
            <label htmlFor="generated-recovery-code">Yeni kurtarma kodun</label>
            <textarea id="generated-recovery-code" readOnly rows={3} value={generatedCode} spellCheck={false} style={{ width: '100%', fontFamily: 'monospace', padding: '12px', resize: 'none', margin: '8px 0 12px' }} onFocus={event => event.target.select()} />
            <button type="button" className="button button-quiet" onClick={handleCopyCode} aria-label="Kodu kopyala">{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? 'Kopyalandı' : 'Kopyala'}</button>
            <button type="button" className="button button-primary" style={{ width: '100%', marginTop: '16px', minHeight: '48px' }} onClick={finishRecovery}>Kodu kaydettim, devam et</button>
          </section>
        ) : (
          <>
            <div className="segmented-control" role="group" aria-label="Hesap işlemi seç" style={{ width: '100%', margin: '16px 0' }}>
              <button type="button" className={`segmented-item ${mode === 'login' ? 'is-selected' : ''}`} style={{ flex: 1 }} aria-pressed={mode === 'login'} disabled={loading} onClick={() => changeMode('login')}>Giriş Yap</button>
              <button type="button" className={`segmented-item ${mode === 'register' ? 'is-selected' : ''}`} style={{ flex: 1 }} aria-pressed={mode === 'register'} disabled={loading} onClick={() => changeMode('register')}>Kayıt Ol</button>
              {emailCodeEnabled&&<button type="button" className={`segmented-item ${mode==='code'?'is-selected':''}`} style={{flex:1}} aria-pressed={mode==='code'} disabled={loading} onClick={()=>changeMode('code')}>E-posta kodu</button>}
            </div>
            <form id="auth-form" onSubmit={handleSubmit} aria-busy={loading} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <fieldset disabled={loading} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '14px', minWidth: 0 }}>
                <legend className="sr-only">{title}</legend>
                <label htmlFor="auth-email">E-posta adresin<input ref={emailRef} id="auth-email" name="email" type="email" className="form-input" style={fieldStyle} value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} disabled={mode==='code'&&codeSent} required placeholder="ornek@email.com" aria-describedby={errorMsg ? 'auth-error' : undefined} /></label>
                {mode==='code'&&codeSent&&<label htmlFor="auth-email-code">E-postandaki 6 haneli kod<input id="auth-email-code" className="form-input" style={fieldStyle} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={emailCode} onChange={e=>setEmailCode(e.target.value)} /></label>}
                {mode === 'recover' && <label htmlFor="auth-recovery">Kurtarma kodun<input id="auth-recovery" name="recovery" type="text" className="form-input" style={fieldStyle} value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={128} required placeholder="Hesap oluştururken kaydettiğin kod" aria-describedby="recovery-help" /><span id="recovery-help" className="field-help">Parolan yenilendiğinde bu kod geçersiz olur ve sana yeni bir kurtarma kodu verilir.</span></label>}
                {mode!=='code'&&<div>
                  <label htmlFor="auth-password">{mode === 'recover' ? 'Yeni parolan' : 'Parolan'}<input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} className="form-input" style={fieldStyle} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode==='login'?8:10} maxLength={128} required aria-describedby={`auth-password-help${errorMsg ? ' auth-error' : ''}`} /></label>
                  <p id="auth-password-help" className="field-help">{mode==='login'?'Mevcut parolanla giriş yap. Eski 8–9 karakterlik parolalar da kabul edilir.':PASSWORD_HELP}</p>
                  <button type="button" className="button button-quiet" aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'} aria-pressed={showPassword} aria-controls="auth-password" onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{showPassword ? 'Parolayı gizle' : 'Parolayı göster'}</button>
                </div>}
                <button type="submit" className="button button-primary" id="auth-submit" disabled={loading || api.demoMode} style={{ width: '100%', minHeight: '48px', marginTop: '8px' }}>{loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Hesap Oluştur' : mode==='code'?(codeSent?'Kodu Doğrula ve Giriş Yap':'Giriş Kodu Gönder'):'Parolayı Sıfırla'}</button>
                {mode==='code'&&codeSent&&<button type="button" className="button button-quiet" onClick={()=>{setCodeSent(false);setEmailCode('');setNotice('');}}>E-postayı değiştir veya yeni kod iste</button>}
                <button type="button" className="button button-quiet" onClick={() => changeMode(mode === 'recover' ? 'login' : 'recover')}>{mode === 'recover' ? 'Giriş ekranına dön' : 'Parolamı unuttum — kurtarma koduyla aç'}</button>
              </fieldset>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
