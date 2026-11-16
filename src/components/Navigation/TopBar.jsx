import React, { useState, useEffect } from 'react';
import { Sun, Moon, Flame, Gem, Shield } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import * as api from '../../lib/api.js';

export default function TopBar({ setView, user, onOpenAuth, syncState, streak=0, streakFreezes=0, isStreakFrozenToday=false, buyStreakFreeze, gems=0, level=1, xp=0 }) {
  const [shieldShop,setShieldShop]=useState(false);
  const [shopMessage,setShopMessage]=useState('');
  useEffect(()=>{if(!shieldShop)return;const close=e=>{if(e.key==='Escape')setShieldShop(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[shieldShop]);
  const initial = user?.email ? user.email[0].toLocaleUpperCase('tr-TR') : 'P';
  const { mode, setPreference } = useTheme();
  const isDark = mode === 'dark';
  const isDemo = api.demoMode;
  const successful = syncState === 'Kaydedildi' || syncState === 'Güncel';
  return (
    <>
    <header className="topbar" role="banner">
      <button type="button" className="mobile-brand" data-view="today" aria-label="PACE ana sayfa" onClick={() => setView?.('today')}><span>pace</span></button>
      <span className="topbar-note">Küçük adımlar, güzel alışkanlıklar.</span>
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {syncState && <span className="mobile-sync-badge" role="status" aria-live="polite" aria-atomic="true" title={syncState} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: successful ? 'var(--forest-soft)' : 'var(--orange-soft)', color: successful ? 'var(--forest)' : 'var(--orange-dark)' }}>{syncState}</span>}
        <button type="button" className="theme-toggle-btn" aria-label={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'} title={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'} onClick={() => setPreference(isDark ? 'light' : 'dark')}>{isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
        <button type="button" className="avatar-button" id="account-button" aria-label={isDemo ? 'Demodan çık ve kendi hesabına giriş yap' : user?.email ? `Hesap ayarları (${user.email})` : 'Giriş yap veya hesap oluştur'} onClick={() => {
          if (isDemo) api.exitDemo();
          else if (user?.email) setView?.('settings');
          else onOpenAuth?.();
        }}>{initial}</button>
      </div>
    </header>
    <section className="gamification-summary" aria-label="Ritim ilerlemen" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'10px 18px',padding:'12px 20px',borderBottom:'2px dashed var(--border)',background:'var(--surface)',fontSize:13}}>
      <span title={isStreakFrozenToday?'Seri kalkanıyla korunuyor':'Kayıt girilen ardışık günler'}><Flame size={17} aria-hidden="true" /> <strong>{streak}</strong> günlük seri</span>
      <span><Gem size={17} aria-hidden="true" /> <strong>{gems}</strong> elmas</span>
      <span>Seviye {level} · {xp} XP</span>
      <button type="button" className="button button-quiet" style={{marginLeft:'auto',padding:'8px 12px',fontSize:13}} onClick={()=>{setShopMessage('');setShieldShop(true)}}><Shield size={17} aria-hidden="true" /> {streakFreezes} kalkan</button>
    </section>
    {shieldShop&&<div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shield-shop-title" onClick={()=>setShieldShop(false)}><div className="dialog-sheet" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}><h2 id="shield-shop-title">Seri kalkanı</h2><p>Kalkan, bir gün ara verdiğinde serini koruyabilir. Şu an {streakFreezes} kalkanın ve {gems} elmasın var.</p>{shopMessage&&<p role="status">{shopMessage}</p>}<div className="heading-actions"><button type="button" className="button button-primary" disabled={gems<25||!buyStreakFreeze} onClick={()=>{const result=buyStreakFreeze?.(25);setShopMessage(result?.message||'İşlem tamamlandı.')}}>25 elmasa kalkan al</button><button type="button" className="button button-quiet" onClick={()=>setShieldShop(false)}>Kapat</button></div></div></div>}
    </>
  );
}
