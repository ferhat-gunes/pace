import { settingsAt } from './rules.js';
import { validateBackup } from './backup.js';
const DEMO_KEY='pace_demo_state_v1';
const params=new URLSearchParams(globalThis.location?.search||'');
function rememberedDemo(){try{return sessionStorage.getItem('pace_demo')==='1'}catch{return false}}
export const demoMode=params.has('demo') || rememberedDemo();
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function seedDemo(){
  const t=today();
  const d=new Date();
  const monday=new Date(d);
  monday.setDate(d.getDate()-(d.getDay()+6)%7);
  const start=monday.getFullYear()+'-'+String(monday.getMonth()+1).padStart(2,'0')+'-'+String(monday.getDate()).padStart(2,'0');
  const demoUser={id:'demo-user',email:'demo@pace.app',username:'demo'};
  return {
    user:demoUser,
    week_start:1,
    habits:[
      {
        id:'demo-reading',name:'Kitap oku',tracking:'quantity',direction:'at_least',unit:'dakika',target:20,
        schedule:{type:'daily'},progression:{enabled:false,step:0},debt:{enabled:false},start_date:start,created_at:new Date().toISOString(),
        role:'owner',participant_count:3,
        participants:[
          {user_id:'demo-user',username:'demo',role:'owner',joined_at:start,is_me:true},
          {user_id:'user-ayse',username:'ayse',role:'member',joined_at:start,is_me:false},
          {user_id:'user-mehmet',username:'mehmet',role:'member',joined_at:start,is_me:false}
        ]
      },
      {
        id:'demo-water',name:'Su iç',tracking:'quantity',direction:'at_least',unit:'bardak',target:8,
        schedule:{type:'daily'},progression:{enabled:false,step:0},debt:{enabled:false},start_date:start,created_at:new Date().toISOString(),
        role:'owner',participant_count:1,
        participants:[{user_id:'demo-user',username:'demo',role:'owner',joined_at:start,is_me:true}]
      },
      {
        id:'demo-walk',name:'Yürüyüş yap',tracking:'check',direction:'at_least',unit:'',target:1,
        schedule:{type:'weekdays',days:[1,3,5]},progression:{enabled:false,step:0},debt:{enabled:false},start_date:start,created_at:new Date().toISOString(),
        role:'owner',participant_count:2,
        participants:[
          {user_id:'demo-user',username:'demo',role:'owner',joined_at:start,is_me:true},
          {user_id:'user-ayse',username:'ayse',role:'member',joined_at:start,is_me:false}
        ]
      }
    ],
    checkins:[
      {id:'demo-log-1',habit_id:'demo-reading',habit_date:t,value:12},
      {id:'demo-log-2',habit_id:'demo-water',habit_date:t,value:5}
    ],
    participant_checkins:[
      {habit_id:'demo-reading',user_id:'user-ayse',habit_date:t,value:25,updated_at:new Date().toISOString()},
      {habit_id:'demo-walk',user_id:'user-ayse',habit_date:t,value:1,updated_at:new Date().toISOString()}
    ],
    invites:{},
    invite_inbox:[]
  };
}
function getDemo(){try{let raw=localStorage.getItem(DEMO_KEY);if(!raw){const s=seedDemo();try{localStorage.setItem(DEMO_KEY,JSON.stringify(s))}catch(e){}return s}return JSON.parse(raw)}catch{return seedDemo()}}
function saveDemo(state){
  try { localStorage.setItem(DEMO_KEY,JSON.stringify(state)); }
  catch { throw new Error('Örnek veriler bu tarayıcıda saklanamadı. Depolama iznini ve boş alanı kontrol et.'); }
  return state;
}
function responseError(message,status=502,code){return Object.assign(new Error(message),{status,...(code?{code}:{})})}
export function validateResponse(path,method,payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.error)throw responseError(payload?.error||'Sunucu yanıtı doğrulanamadı. Yeniden dene.');
  const has=(field)=>payload[field]&&typeof payload[field]==='object';
  if(method==='GET'&&(path==='habits'||path==='export')){
    if(!Array.isArray(payload.habits)||!Array.isArray(payload.checkins)||!payload.user?.id)throw responseError('Hesap verileri eksik geldi. Mevcut kayıtların değiştirilmedi.');
  }else if(method==='GET'&&path==='invites/inbox'){
    if(!Array.isArray(payload.invites))throw responseError('Davet listesi eksik geldi. Yeniden dene.');
  }else if(/check-ins\//.test(path)){
    if(!has('checkin')||!Number.isFinite(Number(payload.checkin.value))||!Number.isInteger(Number(payload.checkin.revision))||Number(payload.checkin.revision)<1)throw responseError('Kayıt sunucu tarafından doğrulanamadı. Yeniden dene.');
  }else if(method==='POST'&&(path==='habits'||/\/habits$/.test(path))){
    if(!payload.habit?.id)throw responseError('Oluşturulan kayıt doğrulanamadı.');
  }else if(/\/invites$/.test(path)||(method==='GET'&&/^invites\/[^/]+$/.test(path))){
    if(!has('invite'))throw responseError('Davet yanıtı doğrulanamadı.');
  }else if(method!=='GET'&&!path.startsWith('auth/')&&payload.ok!==true)throw responseError('İşlemin tamamlandığı doğrulanamadı. Yeniden dene.');
  return payload;
}
export async function request(path,options={}){
  const cleanPath=String(path||'').replace(/^\/?api\//,'').replace(/^\//,'');
  const method=(options.method||'GET').toUpperCase();
  if(options.signal?.aborted)throw new DOMException('İstek iptal edildi.','AbortError');
  if(demoMode)return validateResponse(cleanPath,method,await demoRequest(cleanPath,options));
  const controller=new AbortController();
  let timedOut=false;
  const abort=()=>controller.abort();
  options.signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort()},12000);
  try{
    const response=await fetch('/api/'+cleanPath,{...options,method,signal:controller.signal,credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})}});
    let payload;
    try{payload=await response.json()}catch{throw responseError('Sunucudan geçerli yanıt alınamadı. Yeniden dene.',response.ok?502:response.status)}
    if(!response.ok)throw responseError(payload.error||'İşlem tamamlanamadı.',response.status,payload.code);
    return validateResponse(cleanPath,method,payload);
  }catch(error){
    if(error.name==='AbortError'&&timedOut)throw responseError('Bağlantı yanıt vermedi. Kaydının durumunu kontrol ederek yeniden deneyebilirsin.',504);
    throw error;
  }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort)}
}

function demoRequest(path,options={}){
  path = String(path||'').replace(/^\/?api\//,'').replace(/^\//,'');
  let s=getDemo();
  if(!s.participant_checkins) s.participant_checkins=[];
  if(!s.invites) s.invites={};
  if(!s.invite_inbox) s.invite_inbox=[];
  if(!s.gamification)s.gamification={xp:0,gems:10,streakFreezes:1,usedFreezeDates:{},claimedDates:{},allDoneBonusDates:{}};
  if(!s.social_inbox)s.social_inbox=[];
  const method=options.method||'GET';
  const body=options.body?JSON.parse(options.body):{};
  if(path==='auth/capabilities'&&method==='GET')return Promise.resolve({email_code_enabled:false,push_enabled:false});
  if(path==='push/public-key'&&method==='GET')return Promise.resolve({public_key:null});
  if(path==='push/subscribe'&&(method==='POST'||method==='DELETE'))return Promise.resolve({ok:true});
  if(path==='push/preferences'&&method==='PATCH')return Promise.resolve({ok:true});
  if(path==='gamification'&&method==='GET')return Promise.resolve({gamification:s.gamification});
  if(path==='gamification'&&method==='PUT'){s.gamification={...s.gamification,...body};saveDemo(s);return Promise.resolve({ok:true});}
  if(path==='social/inbox'&&method==='GET')return Promise.resolve({items:s.social_inbox.filter(x=>!x.read)});
  const inboxReadMatch=path.match(/^social\/inbox\/([^/]+)\/read$/);
  if(inboxReadMatch&&method==='POST'){
    s.social_inbox=s.social_inbox.map(x=>x.id===inboxReadMatch[1]?{...x,read:true}:x);
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  if(path==='auth/me')return Promise.resolve({user:s.user});
  if(path==='habits'&&method==='GET')return Promise.resolve(s);
  if(path==='auth/logout')return Promise.resolve({ok:true});
  if(path==='account/username'&&method==='PATCH'){
    const cleaned=String(body.username||'').trim().replace(/^@+/,'').toLowerCase();
    if(!/^[a-z0-9._]{3,24}$/.test(cleaned))throw responseError('Kullanıcı adı 3–24 karakter olmalı; yalnızca küçük harf, rakam, nokta ve alt çizgi kullanılabilir.',400);
    s.user.username=cleaned;
    s.habits=s.habits.map(h=>({...h,participants:(h.participants||[]).map(p=>p.user_id===s.user.id?{...p,username:cleaned}:p)}));
    saveDemo(s);
    return Promise.resolve({ok:true,username:cleaned});
  }
  if(path==='habits'&&method==='POST'){
    const h={
      ...body,id:crypto.randomUUID(),start_date:body.start_date||today(),created_at:new Date().toISOString(),
      role:'owner',participant_count:1,
      participants:[{user_id:s.user.id,username:s.user.username||'demo',role:'owner',joined_at:new Date().toISOString(),is_me:true}]
    };
    h.versions=[{effective_from:h.start_date,settings:{...body,paused:false,archived_at:null}}];
    s.habits.push(h);
    saveDemo(s);
    return Promise.resolve({habit:h});
  }
  const checkinMatch=path.match(/^habits\/([^/]+)\/check-ins\/(\d{4}-\d{2}-\d{2})$/);
  if(checkinMatch&&(method==='PUT'||method==='DELETE')){
    const id=checkinMatch[1],day=checkinMatch[2],index=s.checkins.findIndex(x=>x.habit_id===id&&x.habit_date===day),old=index>=0?s.checkins[index]:null;
    const desired=method==='DELETE'?0:Number(body.value),deleted=method==='DELETE'?1:0;
    if(!s.habits.some(h=>h.id===id))throw responseError('Alışkanlık bulunamadı.',404);
    if(!Number.isFinite(desired)||desired<0||desired>1000000)throw responseError('Geçerli bir miktar gir.',400);
    if(old?.idempotency_key===body.idempotency_key&&old.value===desired&&Boolean(old.deleted)===Boolean(deleted))return {checkin:old};
    if(Number(old?.revision||0)!==Number(body.expected_revision||0))throw responseError('Kayıt başka bir cihazda değişti. Güncel durumu kontrol et.',409);
    const log={id:old?.id||crypto.randomUUID(),habit_id:id,habit_date:day,value:method==='DELETE'?0:Number(body.value),deleted:method==='DELETE'?1:0,revision:(old?.revision||0)+1,idempotency_key:body.idempotency_key||crypto.randomUUID(),created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
    if(index>=0)s.checkins[index]=log;else s.checkins.push(log);
    saveDemo(s);
    return Promise.resolve({checkin:log});
  }
  if(path==='checkins'&&method==='POST'){
    const { habit_id, habit_date, value } = body;
    const index = s.checkins.findIndex(x=>x.habit_id===habit_id&&x.habit_date===habit_date);
    const old = index >= 0 ? s.checkins[index] : null;
    const log = {
      id: old?.id || crypto.randomUUID(),
      habit_id,
      habit_date,
      value: Number(value || 0),
      deleted: 0,
      revision: (old?.revision || 0) + 1,
      idempotency_key: crypto.randomUUID(),
      created_at: old?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if(index >= 0) s.checkins[index] = log; else s.checkins.push(log);
    saveDemo(s);
    return Promise.resolve({checkin: log});
  }
  const lifecycleMatch=path.match(/^habits\/([^/]+)\/(archive|restore)$/);
  if(lifecycleMatch&&method==='POST'){
    return demoRequest(`habits/${lifecycleMatch[1]}`,{method:'PATCH',body:JSON.stringify({archived_at:lifecycleMatch[2]==='archive'?new Date().toISOString():null,paused:false,effective_from:body.effective_from||today()})});
  }
  const leaveHabitMatch=path.match(/^habits\/([^/]+)\/leave$/);
  if(leaveHabitMatch&&method==='POST'){
    const hId=leaveHabitMatch[1],h=s.habits.find(x=>x.id===hId);
    if(!h)throw responseError('Alışkanlık bulunamadı.',404);
    const others=(h.participants||[]).filter(p=>p.user_id!==s.user.id);
    if(h.role==='owner'&&others.length===0){
      throw Object.assign(responseError('Tek katılımcı sensin; alışkanlığı kalıcı olarak silmelisin.',409),{code:'REQUIRES_DELETE'});
    }
    s.habits=s.habits.filter(x=>x.id!==hId);
    s.checkins=s.checkins.filter(x=>x.habit_id!==hId);
    saveDemo(s);
    return Promise.resolve({ok:true,left:true,transferred_to:others[0]?.user_id});
  }
  const removeParticipantMatch=path.match(/^habits\/([^/]+)\/participants\/([^/]+)$/);
  if(removeParticipantMatch&&method==='DELETE'){
    const [,hId,uId]=removeParticipantMatch,h=s.habits.find(x=>x.id===hId);
    if(!h)throw responseError('Alışkanlık bulunamadı.',404);
    if(h.role!=='owner')throw responseError('Yalnızca alışkanlık sahibi katılımcı çıkarabilir.',403);
    h.participants=(h.participants||[]).filter(p=>p.user_id!==uId);
    h.participant_count=h.participants.length;
    s.participant_checkins=(s.participant_checkins||[]).filter(c=>!(c.habit_id===hId&&c.user_id===uId));
    saveDemo(s);
    return Promise.resolve({ok:true,removed:uId});
  }
  const habitInviteMatch=path.match(/^habits\/([^/]+)\/invites$/);
  if(habitInviteMatch&&method==='POST'){
    const hId=habitInviteMatch[1],h=s.habits.find(x=>x.id===hId);
    if(!h)throw responseError('Alışkanlık bulunamadı.',404);
    if(body.invite_type==='email')throw responseError('E-posta daveti desteklenmiyor.',400);
    if(!s.user.username)throw Object.assign(responseError('Davet göndermek için kullanıcı adı belirlemelisin.',400),{code:'USERNAME_REQUIRED'});
    const token='inv-'+crypto.randomUUID(),expires_at=new Date(Date.now()+7*86400000).toISOString();
    const targetUsername=body.invite_type==='username'?String(body.username||'').trim().replace(/^@+/,'').toLowerCase():null;
    if(body.invite_type==='username'&&!targetUsername)throw responseError('Geçerli bir kullanıcı adı gir.',400);
    const invite={id:crypto.randomUUID(),habit_id:hId,token,invite_type:body.invite_type==='username'?'username':'link',target_username:targetUsername,status:'pending',expires_at,created_at:new Date().toISOString()};
    s.invites[token]=invite;
    saveDemo(s);
    return Promise.resolve({ok:true,invite});
  }
  if(path==='invites/inbox'&&method==='GET'){
    return Promise.resolve({ok:true,invites:s.invite_inbox||[]});
  }
  const inviteTokenMatch=path.match(/^invites\/([^/]+)(?:\/(accept|decline))?$/);
  if(inviteTokenMatch){
    const token=decodeURIComponent(inviteTokenMatch[1]),action=inviteTokenMatch[2];
    const invite=s.invites?.[token]||(s.invite_inbox||[]).find(i=>i.token===token);
    if(!invite)throw responseError('Davet geçersiz veya süresi dolmuş.',404);
    const h=s.habits.find(x=>x.id===invite.habit_id);
    if(method==='GET'&&!action){
      return Promise.resolve({ok:true,invite:{...invite,habit_name:h?.name||invite.habit_name||'Ortak Alışkanlık',tracking:h?.tracking||invite.tracking||'check',target:h?.target||invite.target||1,unit:h?.unit||invite.unit||'',participant_count:h?.participant_count||1,inviter_username:s.user.username||'demo'}});
    }
    if(method==='POST'&&action==='accept'){
      s.invite_inbox=(s.invite_inbox||[]).filter(i=>i.token!==token);
      saveDemo(s);
      return Promise.resolve({ok:true,habit_id:invite.habit_id,already_member:Boolean(h)});
    }
    if(method==='POST'&&action==='decline'){
      s.invite_inbox=(s.invite_inbox||[]).filter(i=>i.token!==token);
      invite.status='declined';
      saveDemo(s);
      return Promise.resolve({ok:true,status:'declined'});
    }
  }
  const habitMatch=path.match(/^habits\/([^/]+)$/);
  if(habitMatch&&method==='PATCH'){
    s.habits=s.habits.map(h=>{
      if(h.id!==habitMatch[1])return h;
      const effective=body.effective_from||today(),updated={...settingsAt(h,effective),...body},versions=(h.versions?.length?h.versions:[{effective_from:h.start_date,settings:{...h,paused:Boolean(h.paused),archived_at:h.archived_at??null}}]).filter(v=>v.effective_from!==effective);
      const settings={name:updated.name,tracking:updated.tracking,direction:updated.direction,unit:updated.unit,target:updated.target,schedule:updated.schedule,progression:updated.progression,debt:updated.debt,paused:Boolean(updated.paused),archived_at:updated.archived_at??null};
      versions.push({effective_from:effective,settings});
      return {...h,...updated,versions};
    });
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  if(path==='account/preferences'&&method==='PATCH'){
    s.week_start=Number(body.week_start)===0?0:1;
    s.user.week_start=s.week_start;
    saveDemo(s);
    return Promise.resolve({ok:true,week_start:s.week_start});
  }
  if(path==='import'&&method==='POST'){
    const data=validateBackup(body),idMap=new Map();
    for(const imported of data.habits){
      const id=imported.id||crypto.randomUUID();idMap.set(imported.id,id);
      const next={...imported,id,created_at:imported.created_at||new Date().toISOString()},index=s.habits.findIndex(h=>h.id===id);
      if(index>=0)s.habits[index]=next;else s.habits.push(next);
    }
    for(const imported of data.checkins){
      const habit_id=idMap.get(imported.habit_id),index=s.checkins.findIndex(c=>c.habit_id===habit_id&&c.habit_date===imported.habit_date),old=index>=0?s.checkins[index]:null;
      const next={...imported,habit_id,deleted:Number(imported.deleted),id:old?.id||crypto.randomUUID(),revision:Number(old?.revision||0)+1,idempotency_key:crypto.randomUUID()};
      if(index>=0)s.checkins[index]=next;else s.checkins.push(next);
    }
    if(data.week_start!==undefined){s.week_start=data.week_start;s.user.week_start=data.week_start;}
    saveDemo(s);return {ok:true,habits_count:data.habits.length,checkins_count:data.checkins.length};
  }
  if(habitMatch&&method==='DELETE'){
    s.habits=s.habits.filter(h=>h.id!==habitMatch[1]);
    s.checkins=s.checkins.filter(x=>x.habit_id!==habitMatch[1]);
    s.participant_checkins=(s.participant_checkins||[]).filter(x=>x.habit_id!==habitMatch[1]);
    saveDemo(s);
    return Promise.resolve({ok:true,deleted:true,id:habitMatch[1]});
  }

  return Promise.reject(new Error('Bu işlem örnek görünümde desteklenmiyor.'));
}

export const setUsername=(username)=>request('account/username',{method:'PATCH',body:JSON.stringify({username})});
export const archiveHabit=(id,body={})=>request(`habits/${encodeURIComponent(id)}/archive`,{method:'POST',body:JSON.stringify(body)});
export const restoreHabit=(id,body={})=>request(`habits/${encodeURIComponent(id)}/restore`,{method:'POST',body:JSON.stringify(body)});
export const deleteHabit=(id)=>request(`habits/${encodeURIComponent(id)}`,{method:'DELETE'});
export const leaveHabit=(id)=>request(`habits/${encodeURIComponent(id)}/leave`,{method:'POST',body:'{}'});
export const removeParticipant=(habitId,userId)=>request(`habits/${encodeURIComponent(habitId)}/participants/${encodeURIComponent(userId)}`,{method:'DELETE'});
export const createHabitInvite=(habitId,data)=>request(`habits/${encodeURIComponent(habitId)}/invites`,{method:'POST',body:JSON.stringify(data)});
export const getInviteInbox=()=>request('invites/inbox');
export const getInvitePreview=(token)=>request(`invites/${encodeURIComponent(token)}`);
export const acceptInvite=(token)=>request(`invites/${encodeURIComponent(token)}/accept`,{method:'POST',body:'{}'});
export const declineInvite=(token)=>request(`invites/${encodeURIComponent(token)}/decline`,{method:'POST',body:'{}'});

export function isDemo(){return demoMode}
export async function exportData(){if(demoMode){const s=getDemo();return {user:{id:s.user.id,email:s.user.email},week_start:s.week_start,habits:s.habits,checkins:s.checkins}}return request('export')}
export const importData=(data)=>request('import',{method:'POST',body:JSON.stringify(data)});
export function startDemo(){sessionStorage.setItem('pace_demo','1');location.href='/?demo=1'}

export function exitDemo(){try{sessionStorage.removeItem('pace_demo')}catch{}const url=new URL(location.href);url.searchParams.delete('demo');url.searchParams.set('auth','login');url.hash='today';location.assign(url.pathname+url.search+url.hash)}

export const getAuthCapabilities=()=>request('auth/capabilities');
export const getGamification=()=>request('gamification');
export const saveGamification=(data)=>request('gamification',{method:'PUT',body:JSON.stringify(data)});
export const getSocialInbox=()=>request('social/inbox');
export const markSocialInboxRead=(id)=>request(`social/inbox/${encodeURIComponent(id)}/read`,{method:'POST',body:'{}'});
export const getPushPublicKey=()=>request('push/public-key');
export const subscribePush=(payload)=>request('push/subscribe',{method:'POST',body:JSON.stringify(payload)});
export const unsubscribePush=(endpoint)=>request('push/subscribe',{method:'DELETE',body:JSON.stringify({endpoint})});
export const updatePushPreferences=(prefs)=>request('push/preferences',{method:'PATCH',body:JSON.stringify(prefs)});
export const changePassword=(data)=>request('account/password',{method:'POST',body:JSON.stringify(data)});
export const regenerateRecoveryCode=(password)=>request('account/recovery-code',{method:'POST',body:JSON.stringify({password})});
