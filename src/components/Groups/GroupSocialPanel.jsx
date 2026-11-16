import React,{useEffect,useMemo,useState} from 'react';
import * as api from '../../lib/api.js';
import {NUDGE_PRESETS} from '../../lib/notifications.js';
import {dateKey} from '../../lib/rules.js';
import {groupWeekSummary,groupDayState,latestGroupLog} from '../../lib/group-ui.js';

export default function GroupSocialPanel({group,members=[],habits=[],checkins=[],reactions=[],user,anchor,weekStart=1,gamification,onRefresh,onSocialRefresh}){
  const [choice,setChoice]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null);
  useEffect(()=>{if(!choice)return;const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!busy)setChoice(null)}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true)},[choice,busy]);
  const rows=useMemo(()=>members.map(member=>{
    const sums=habits.map(h=>groupWeekSummary(h,checkins,member.user_id,anchor,weekStart));
    const total=sums.reduce((n,s)=>n+s.elapsed,0),done=sums.reduce((n,s)=>n+s.completed,0);
    return {member,done,total,percentage:total?Math.round(done/total*100):0,cheers:reactions.filter(r=>r.target_user_id===member.user_id&&r.reaction_type==='cheer').length};
  }).sort((a,b)=>b.percentage-a.percentage),[members,habits,checkins,reactions,anchor,weekStart]);
  const allDone=members.length>1&&habits.length>0&&members.every(m=>habits.every(h=>groupDayState(h,latestGroupLog(checkins,h.id,m.user_id,dateKey()),dateKey())==='Tamamlandı'));
  const send=async preset=>{
    if(!choice||busy)return;setBusy(true);setNotice(null);
    try{
      const r=await api.sendGroupReaction(group.id,{target_user_id:choice.member.user_id,reaction_type:choice.type,emoji:preset.emoji,message:preset.text,habit_date:dateKey()});
      if(!r?.reaction?.id)throw new Error('Gönderim sunucu tarafından doğrulanamadı.');
      gamification?.addXp?.(choice.type==='cheer'?10:5,'group-reaction');
      setNotice({text:choice.type==='cheer'?'Tebriğin gönderildi.':'Nazik yoklaman gönderildi.'});setChoice(null);await onRefresh?.();await onSocialRefresh?.();
    }catch(e){setNotice({error:true,text:e.message||'Tepki gönderilemedi. Yeniden deneyebilirsin.'})}finally{setBusy(false)}
  };
  const share=()=>{
    try{
      const canvas=document.createElement('canvas');canvas.width=720;canvas.height=220+Math.min(rows.length,6)*54;const c=canvas.getContext('2d');if(!c)throw new Error('Görsel oluşturulamadı.');
      c.fillStyle='#fff4d6';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#201b18';c.font='bold 30px sans-serif';c.fillText(`PACE · ${group.name}`.slice(0,45),32,54);c.font='18px sans-serif';c.fillText('Geçen planlı günlerde ortak ilerleme',32,92);
      rows.slice(0,6).forEach((r,i)=>{c.fillStyle=['#ff9470','#ffd457','#72d8c5'][i%3];c.fillRect(32,126+i*54,656,42);c.fillStyle='#201b18';c.fillText(`${r.member.display_name||'Üye'}: ${r.done}/${r.total} · %${r.percentage}`,44,153+i*54)});
      const a=document.createElement('a');a.download=`pace-grup-${dateKey()}.png`;a.href=canvas.toDataURL('image/png');a.click();setNotice({text:'Grup özeti indirmesi başlatıldı.'});
    }catch(e){setNotice({error:true,text:e.message})}
  };
  const presets=choice?.type==='cheer'?[{emoji:'👏',text:'Harika ritim, birlikte devam edelim!',label:'Alkışla'},{emoji:'🎉',text:'Hedefini tamamladın, tebrikler!',label:'Tebrik et'},{emoji:'💪',text:'İstikrarın ilham veriyor!',label:'Güç ver'}]:NUDGE_PRESETS;
  return <section style={{marginTop:24}} aria-labelledby="group-social-title"><h3 id="group-social-title">Birlikte ilerleme</h3><p className="table-hint">Yalnızca geçen günler ve gruptaki ortak hedefler üzerinden hesaplanır. Bir arkadaşına günde en fazla 3 tepki gönderebilirsin.</p>{notice&&<p className="inline-message" role={notice.error?'alert':'status'}>{notice.text}</p>}{allDone&&<p className="inline-message" role="status">Bugünkü ortak hedefler tüm üyeler için tamamlandı.</p>}
    <ol style={{padding:0,listStyle:'none'}}>{rows.map(row=><li key={row.member.user_id} className="settings-row"><div><strong>{row.member.display_name||'Üye'} · %{row.percentage}</strong><p>{row.done}/{row.total} tamamlanan hedef · {row.cheers} tebrik</p></div>{row.member.user_id!==user?.id&&<div className="heading-actions"><button className="button button-quiet" type="button" disabled={busy||!user} aria-label={`${row.member.display_name||'Üye'} için tebrik gönder`} onClick={()=>{setChoice({member:row.member,type:'cheer'});setNotice(null)}}>Tebrik et</button><button className="button button-quiet" type="button" disabled={busy||!user} aria-label={`${row.member.display_name||'Üye'} için nazik yoklama gönder`} onClick={()=>{setChoice({member:row.member,type:'nudge'});setNotice(null)}}>Nazik yokla</button></div>}</li>)}</ol>
    <button type="button" className="button button-quiet" onClick={share}>Haftalık özeti görsel indir</button>
    {reactions.length>0&&<details style={{marginTop:16}}><summary>Grubun son tebrik ve yoklamaları</summary><ul>{reactions.slice(0,10).map(r=><li key={r.id}>{r.emoji} {r.message||'Bir grup tepkisi'} · {r.habit_date}</li>)}</ul></details>}
    {choice&&<div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="social-reaction-title" onClick={()=>!busy&&setChoice(null)}><div className="dialog-sheet" onClick={e=>e.stopPropagation()}><h2 id="social-reaction-title">{choice.member.display_name||'Arkadaşın'} için {choice.type==='cheer'?'tebrik':'nazik yoklama'}</h2>{notice?.error&&<p role="alert">{notice.text}</p>}<p>Gönderilecek mesajı seç.</p><div style={{display:'grid',gap:10}}>{presets.map(p=><button className="button button-quiet" type="button" disabled={busy} key={p.text} onClick={()=>send(p)}>{p.emoji} {p.text}</button>)}</div><button type="button" className="button button-quiet" disabled={busy} style={{marginTop:18}} onClick={()=>setChoice(null)}>Vazgeç</button>{busy&&<p role="status">Gönderiliyor…</p>}</div></div>}
  </section>;
}
