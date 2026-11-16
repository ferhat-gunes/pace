import { validateBackup } from './backup.js';
import { dateKey, settingsAt } from './rules.js';
const KEY='pace_guest_v2';
export const GUEST_USER={id:'guest-local',is_guest:true,week_start:1};
const empty=()=>({user:GUEST_USER,week_start:1,habits:[],checkins:[]});
export function readGuest(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');return s&&Array.isArray(s.habits)&&Array.isArray(s.checkins)?{...s,user:{...GUEST_USER,week_start:s.week_start??1}}:empty()}catch{return empty()}}
export function clearGuest(){localStorage.removeItem(KEY);localStorage.removeItem('pace_entry_drafts_v2:guest-local');localStorage.removeItem('pace_cache_v2:guest-local')}
export function guestBackup(){const s=readGuest();let drafts=[];try{drafts=JSON.parse(localStorage.getItem('pace_entry_drafts_v2:guest-local')||'[]')}catch{}const records=s.checkins.map(c=>({...c}));for(const d of drafts){if(!s.habits.some(h=>h.id===d.id))continue;const i=records.findIndex(c=>c.habit_id===d.id&&c.habit_date===d.day),next={...(records[i]||{}),habit_id:d.id,habit_date:d.day,value:Number(d.value),deleted:Boolean(d.deleted)};if(i<0)records.push(next);else records[i]=next;}return {habits:s.habits,checkins:records,week_start:s.week_start}}
export async function guestRequest(path,options={}){
 const s=readGuest(),method=options.method||'GET',body=options.body?JSON.parse(options.body):{};
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{throw new Error('Cihaz verileri saklanamadı. Depolama alanını kontrol et.')}};
 if(path==='habits'&&method==='GET')return s;
 if(path==='groups'&&method==='GET')return {groups:[]};
 if(path==='export')return s;
 if(path==='habits'&&method==='POST'){
  const habit={...body,id:crypto.randomUUID(),start_date:body.start_date||dateKey(),created_at:new Date().toISOString(),paused:false,archived_at:null};
  habit.versions=[{effective_from:habit.start_date,settings:{...habit}}];s.habits.push(habit);save();return {habit};
 }
 const record=path.match(/^habits\/([^/]+)\/check-ins\/(\d{4}-\d{2}-\d{2})$/);
 if(record&&['PUT','DELETE'].includes(method)){
  const id=decodeURIComponent(record[1]),day=record[2],index=s.checkins.findIndex(c=>c.habit_id===id&&c.habit_date===day),old=s.checkins[index];
  const value=method==='DELETE'?0:Number(body.value),deleted=Number(method==='DELETE');
  if(!s.habits.some(h=>h.id===id)||!Number.isFinite(value)||value<0||value>1e6)throw new Error('Kayıt geçersiz.');
  if(old?.idempotency_key===body.idempotency_key)return {checkin:old};
  if(Number(old?.revision||0)!==Number(body.expected_revision||0))throw Object.assign(new Error('Cihaz kaydı değişti. Güncel kaydı yeniden yükle.'),{status:409});
  const checkin={id:old?.id||crypto.randomUUID(),habit_id:id,habit_date:day,value,deleted,revision:Number(old?.revision||0)+1,idempotency_key:body.idempotency_key};
  if(index<0)s.checkins.push(checkin);else s.checkins[index]=checkin;save();return {checkin};
 }
 const habit=path.match(/^habits\/([^/]+)(?:\/(archive|restore))?$/);
 if(habit&&['POST','PATCH'].includes(method)){
  const index=s.habits.findIndex(h=>h.id===decodeURIComponent(habit[1]));if(index<0)throw new Error('Alışkanlık bulunamadı.');
  const h=s.habits[index],effective=body.effective_from||dateKey(),patch=habit[2]?{archived_at:habit[2]==='archive'?new Date().toISOString():null,paused:false}:body;
  const next={...settingsAt(h,effective),...patch},versions=(h.versions?.length?h.versions:[{effective_from:h.start_date,settings:{...h}}]).filter(v=>v.effective_from!==effective);
  versions.push({effective_from:effective,settings:{...next,versions:undefined}});s.habits[index]={...next,versions};save();return {ok:true};
 }
 if(path==='account/preferences'&&method==='PATCH'){s.week_start=Number(body.week_start)===0?0:1;save();return {ok:true,week_start:s.week_start}}
 if(path==='import'&&method==='POST'){
  const data=validateBackup(body),mapping=new Map();
  for(const h of data.habits){const id=h.id||crypto.randomUUID();mapping.set(h.id,id);const i=s.habits.findIndex(x=>x.id===id);if(i<0)s.habits.push({...h,id});else s.habits[i]={...h,id}}
  for(const c of data.checkins){const habit_id=mapping.get(c.habit_id),i=s.checkins.findIndex(x=>x.habit_id===habit_id&&x.habit_date===c.habit_date),next={...c,habit_id,id:crypto.randomUUID(),revision:Number(s.checkins[i]?.revision||0)+1};if(i<0)s.checkins.push(next);else s.checkins[i]=next}
  if(data.week_start!==undefined)s.week_start=data.week_start;save();return {ok:true,habits_count:data.habits.length,checkins_count:data.checkins.length};
 }
 throw new Error('Bu işlem için hesabına giriş yap.');
}
