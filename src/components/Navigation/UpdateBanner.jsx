import React, { useEffect, useState } from 'react';
import { Button } from '../ui/index.js';

export default function UpdateBanner({ blocked=false }){
  const [registration,setRegistration]=useState(null);
  const [activeForm,setActiveForm]=useState(false);
  useEffect(()=>{
    const check=()=>setActiveForm(Boolean(document.querySelector('[role="dialog"],#backup-preview-title')));
    const appEl=document.getElementById('app');
    const observer=new MutationObserver(check);
    if(appEl)observer.observe(appEl,{childList:true,subtree:true});
    check();
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const ready=e=>setRegistration(e.detail);
    window.addEventListener('pace:update-ready',ready);
    navigator.serviceWorker?.getRegistration().then(r=>{if(r?.waiting)setRegistration(r)}).catch(()=>{});
    return()=>window.removeEventListener('pace:update-ready',ready);
  },[]);
  if(!registration?.waiting)return null;
  const update=()=>{
    if(blocked||activeForm)return;
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
    registration.waiting.postMessage({type:'SKIP_WAITING'});
  };
  return (
    <aside className="context-banner" role="status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <strong className="mono" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Yeni sürüm hazır</strong>
        <span style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>{blocked||activeForm?'Açık formunu ve bekleyen kayıtlarını tamamladıktan sonra güncelleyebilirsin.':'Güncelleme için uygulama yenilenecek.'}</span>
      </div>
      <Button variant="secondary" size="sm" disabled={blocked||activeForm} onClick={update}>Güncelle</Button>
    </aside>
  );
}
