import React, { useEffect, useState } from 'react';
export default function UpdateBanner({ blocked=false }){
  const [registration,setRegistration]=useState(null);
  const [activeForm,setActiveForm]=useState(false);
  useEffect(()=>{const check=()=>setActiveForm(Boolean(document.querySelector('[role="dialog"],#backup-preview-title')));const observer=new MutationObserver(check);observer.observe(document.getElementById('app'),{childList:true,subtree:true});check();return()=>observer.disconnect()},[]);
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
  return <aside className="context-banner" role="status"><strong>Yeni sürüm hazır</strong><span>{blocked||activeForm?'Açık formunu ve bekleyen kayıtlarını tamamladıktan sonra güncelleyebilirsin.':'Güncelleme için uygulama yenilenecek.'}</span><button type="button" className="button button-quiet" disabled={blocked||activeForm} onClick={update}>Güncelle</button></aside>;
}
