import React, { useEffect, useRef, useState } from 'react';
import * as api from '../../lib/api.js';

export default function AccountSecuritySettings({ user, setUser }) {
  const [mode,setMode]=useState(''),[busy,setBusy]=useState(false),[current,setCurrent]=useState(''),[next,setNext]=useState(''),[reveal,setReveal]=useState(false),[notice,setNotice]=useState(null),[code,setCode]=useState('');
  const lock=useRef(false),heading=useRef(null);
  const hasPassword=user?.has_password!==false;
  useEffect(()=>{if(!code)return;heading.current?.focus();const currentUrl=location.href;const unload=e=>{e.preventDefault();e.returnValue=''};const retain=e=>{e.stopImmediatePropagation();history.pushState({},'',currentUrl);setNotice({text:'Önce yeni kurtarma kodunu kaydet ve aşağıdaki onay düğmesini kullan.'})};addEventListener('beforeunload',unload);addEventListener('popstate',retain,true);addEventListener('hashchange',retain,true);return()=>{removeEventListener('beforeunload',unload);removeEventListener('popstate',retain,true);removeEventListener('hashchange',retain,true)}},[code]);
  const submit=async e=>{
    e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setNotice(null);
    try{
      if(mode==='password'&&(next.length<10||next.length>128))throw new Error('Yeni parolan 10–128 karakter olmalı.');
      const result=mode==='password'?await api.changePassword({current_password:current,new_password:next}):await api.regenerateRecoveryCode(current);
      if(result?.ok!==true)throw new Error('Sunucu işlemi doğrulamadı.');
      if(mode==='recovery'&&!result.recovery_code)throw new Error('Yeni kurtarma kodu doğrulanamadı.');
      if(result.recovery_code){if(!/^(?:[a-f0-9]{8}-){5}[a-f0-9]{8}$/i.test(result.recovery_code))throw new Error('Kurtarma kodu biçimi doğrulanamadı.');setCode(result.recovery_code)}
      if(mode==='password')setUser?.(u=>u?{...u,has_password:true}:u);
      setCurrent('');setNext('');setMode('');setNotice({text:'Hesap güvenliği güncellendi.'});
    }catch(err){setNotice({text:err.message,error:true})}finally{lock.current=false;setBusy(false)}
  };
  const copy=async()=>{try{await navigator.clipboard.writeText(code);setNotice({text:'Kurtarma kodu kopyalandı. Güvenli bir yere kaydet.'})}catch{setNotice({error:true,text:'Kopyalanamadı. Kodu alanından seçip elle kopyalayabilirsin.'})}};
  const download=()=>{const blob=new Blob([`PACE kurtarma kodu\nE-posta: ${user.email}\nKod: ${code}\n`],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pace-kurtarma-kodu.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  return <section className="settings-section" aria-labelledby="account-security-title"><h2 id="account-security-title">Parola ve kurtarma</h2><p>Parolanı güncelle veya kaybettiğin kurtarma kodunu yenile. Yeni kod oluşturulduğunda eskisi geçersiz olur.</p>
    {notice&&<p className="inline-message" role={notice.error?'alert':'status'}>{notice.text}</p>}
    {!mode?<div className="heading-actions"><button type="button" className="button button-quiet" onClick={()=>{setNotice(null);setMode('password')}}>{hasPassword?'Parolayı değiştir':'Parola belirle'}</button><button type="button" className="button button-quiet" disabled={!hasPassword} onClick={()=>{setNotice(null);setMode('recovery')}}>Kurtarma kodunu yenile</button></div>:<form onSubmit={submit} aria-busy={busy}><fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><legend>{mode==='password'?'Parola işlemi':'Kurtarma kodunu yenile'}</legend>
      {(hasPassword||mode==='recovery')&&<label className="field" style={{display:'block',margin:'14px 0'}}>Mevcut parolan<input id="security-current-password" className="form-input" type={reveal?'text':'password'} value={current} onChange={e=>setCurrent(e.target.value)} autoComplete="current-password" minLength={8} maxLength={128} required/></label>}
      {mode==='password'&&<label className="field" style={{display:'block',margin:'14px 0'}}>Yeni parolan<input id="security-new-password" className="form-input" type={reveal?'text':'password'} value={next} onChange={e=>setNext(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} aria-describedby="security-password-help" required/><span id="security-password-help" className="field-help">Yeni parolan 10–128 karakter olmalı.</span></label>}
      <button type="button" className="button button-quiet" aria-pressed={reveal} onClick={()=>setReveal(v=>!v)}>{reveal?'Parolaları gizle':'Parolaları göster'}</button><div className="heading-actions" style={{marginTop:14}}><button type="submit" className="button button-primary">{busy?'Kaydediliyor…':mode==='password'?'Parolayı kaydet':'Yeni kod oluştur'}</button><button type="button" className="button button-quiet" onClick={()=>{setMode('');setCurrent('');setNext('')}}>Vazgeç</button></div>
    </fieldset></form>}
    {code&&<div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="fresh-recovery-title"><div className="dialog-sheet"><h2 id="fresh-recovery-title" ref={heading} tabIndex={-1}>Yeni kurtarma kodunu kaydet</h2><p>Bu kod yalnızca şimdi gösterilir. Güvenli bir yere kaydetmeden bu pencereyi kapatma.</p>{notice&&<p role={notice.error?'alert':'status'}>{notice.text}</p>}<label>Yeni kurtarma kodun<textarea readOnly rows={3} value={code} className="form-input" onFocus={e=>e.target.select()}/></label><div className="heading-actions" style={{marginTop:16}}><button type="button" className="button button-quiet" onClick={copy}>Kodu kopyala</button><button type="button" className="button button-quiet" onClick={download}>Kod dosyasını indir</button><button type="button" className="button button-primary" onClick={()=>{setCode('');setNotice({text:'Kurtarma kodunu güvenle sakla.'})}}>Kodu kaydettim</button></div></div></div>}
  </section>;
}
