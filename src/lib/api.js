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
  const demoGroup={
    id:'demo-group-morning',
    name:'Sabah Rutini Ekibi',
    description:'Her sabah erken kalkıp güne enerjik başlayanlar',
    role:'owner',
    member_count:3,
    created_at:new Date().toISOString()
  };
  return {
    user:demoUser,
    week_start:1,
    habits:[
      {id:'demo-reading',name:'Kitap oku',tracking:'quantity',direction:'at_least',unit:'dakika',target:20,schedule:{type:'daily'},progression:{enabled:false,step:0},debt:{enabled:false},start_date:start,created_at:new Date().toISOString()},
      {id:'demo-water',name:'Su iç',tracking:'quantity',direction:'at_least',unit:'bardak',target:8,schedule:{type:'daily'},progression:{enabled:false,step:0},debt:{enabled:false},start_date:start,created_at:new Date().toISOString()},
      {id:'demo-walk',name:'Yürüyüş yap',tracking:'check',direction:'at_least',unit:'',target:1,schedule:{type:'weekdays',days:[1,3,5]},progression:{enabled:false,step:0},debt:{enabled:false},start_date:start,created_at:new Date().toISOString()}
    ],
    checkins:[
      {id:'demo-log-1',habit_id:'demo-reading',habit_date:t,value:12},
      {id:'demo-log-2',habit_id:'demo-water',habit_date:t,value:5}
    ],
    groups:[demoGroup],
    group_details:{
      'demo-group-morning':{
        group:demoGroup,
        members:[
          {user_id:'demo-user',email:'demo@pace.app',username:'demo',display_name:'Sen',role:'owner'},
          {user_id:'user-ayse',email:'ay***@pace.app',username:'ayse',display_name:'Ayşe K.',role:'member'},
          {user_id:'user-mehmet',email:'me***@pace.app',username:'mehmet',display_name:'Mehmet Y.',role:'member'}
        ],
        habits:[
          {id:'gh-reading',group_id:'demo-group-morning',name:'Kitap oku',tracking:'quantity',direction:'at_least',unit:'dakika',target:20},
          {id:'gh-walk',group_id:'demo-group-morning',name:'Sabah Yürüyüşü',tracking:'check',direction:'at_least',unit:'',target:1}
        ],
        checkins:[
          {id:'gc-1',habit_id:'gh-reading',habit_date:t,user_id:'demo-user',value:20,revision:1},
          {id:'gc-2',habit_id:'gh-reading',habit_date:t,user_id:'user-ayse',value:25,revision:1},
          {id:'gc-3',habit_id:'gh-walk',habit_date:t,user_id:'user-ayse',value:1,revision:1}
        ]
      }
    }
  };
}
function getDemo(){try{let raw=localStorage.getItem(DEMO_KEY);if(!raw){const s=seedDemo();try{localStorage.setItem(DEMO_KEY,JSON.stringify(s))}catch(e){}return s}return JSON.parse(raw)}catch{return seedDemo()}}
function saveDemo(state){
  try { localStorage.setItem(DEMO_KEY,JSON.stringify(state)); }
  catch { throw new Error('Örnek veriler bu tarayıcıda saklanamadı. Depolama iznini ve boş alanı kontrol et.'); }
  return state;
}
function responseError(message,status=502){return Object.assign(new Error(message),{status})}
export function validateResponse(path,method,payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.error)throw responseError(payload?.error||'Sunucu yanıtı doğrulanamadı. Yeniden dene.');
  const has=(field)=>payload[field]&&typeof payload[field]==='object';
  if(method==='GET'&&(path==='habits'||path==='export')){
    if(!Array.isArray(payload.habits)||!Array.isArray(payload.checkins)||!payload.user?.id)throw responseError('Hesap verileri eksik geldi. Mevcut kayıtların değiştirilmedi.');
  }else if(method==='GET'&&path==='groups'){
    if(!Array.isArray(payload.groups))throw responseError('Grup listesi eksik geldi. Yeniden dene.');
  }else if(method==='GET'&&/^groups\/[^/]+$/.test(path)){
    if(!has('group')||!Array.isArray(payload.members)||!Array.isArray(payload.habits)||!Array.isArray(payload.checkins))throw responseError('Grup bilgileri eksik geldi. Yeniden dene.');
  }else if(/check-ins\//.test(path)){
    if(!has('checkin')||!Number.isFinite(Number(payload.checkin.value))||!Number.isInteger(Number(payload.checkin.revision))||Number(payload.checkin.revision)<1)throw responseError('Kayıt sunucu tarafından doğrulanamadı. Yeniden dene.');
  }else if(method==='POST'&&(path==='groups'||path==='habits'||/\/habits$/.test(path))){
    const field=path==='groups'?'group':'habit';if(!payload[field]?.id)throw responseError('Oluşturulan kayıt doğrulanamadı.');
  }else if(/\/invites$/.test(path)||method==='GET'&&/^invites\//.test(path)){
    if(!has('invite'))throw responseError('Davet yanıtı doğrulanamadı.');
  }else if(method==='POST'&&/\/reactions$/.test(path)){if(!payload.reaction?.id)throw responseError('Tepki yanıtı doğrulanamadı.');
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
    if(!response.ok)throw responseError(payload.error||'İşlem tamamlanamadı.',response.status);
    return validateResponse(cleanPath,method,payload);
  }catch(error){
    if(error.name==='AbortError'&&timedOut)throw responseError('Bağlantı yanıt vermedi. Kaydının durumunu kontrol ederek yeniden deneyebilirsin.',504);
    throw error;
  }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort)}
}

function demoRequest(path,options={}){
  path = String(path||'').replace(/^\/?api\//,'').replace(/^\//,'');
  let s=getDemo();
  if(!s.groups) s.groups=[];
  if(!s.group_details) s.group_details={};
  if(!s.gamification)s.gamification={xp:0,gems:10,streakFreezes:1,usedFreezeDates:{},claimedDates:{},allDoneBonusDates:{}};
  if(!s.social_inbox)s.social_inbox=[];
  const method=options.method||'GET';
  const body=options.body?JSON.parse(options.body):{};
  const grouped=path.match(/^groups\/([^/]+)/);
  if(grouped&&s.group_details[grouped[1]]){
    const detail=s.group_details[grouped[1]],member=detail.members.find(m=>m.user_id===s.user.id);
    if(!member)throw responseError('Grup bulunamadı.',404);
    const memberAction=method==='GET'||/\/(invites|leave|reactions)$/.test(path)||/\/check-ins\//.test(path);
    if(!memberAction&&member.role!=='owner')throw responseError('Yalnızca grup lideri bu işlemi yapabilir.',403);
  }
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
  if(path==='habits'&&method==='POST'){
    const h={...body,id:crypto.randomUUID(),start_date:body.start_date||today(),created_at:new Date().toISOString()};
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
  const habitMatch=path.match(/^habits\/([^/]+)$/);
  if(habitMatch&&method==='PATCH'){
    s.habits=s.habits.map(h=>{
      if(h.id!==habitMatch[1])return h;
      const effective=body.effective_from||today(),updated={...settingsAt(h,effective),...body},versions=(h.versions?.length?h.versions:[{effective_from:h.start_date,settings:{...h,paused:Boolean(h.paused),archived_at:h.archived_at??null}}]).filter(v=>v.effective_from!==effective);
      const settings={name:updated.name,tracking:updated.tracking,direction:updated.direction,unit:updated.unit,target:updated.target,schedule:updated.schedule,progression:updated.progression,debt:updated.debt,paused:Boolean(updated.paused),archived_at:updated.archived_at??null};
      versions.push({effective_from:effective,settings});
      return {...updated,versions};
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
    saveDemo(s);
    return Promise.resolve({ok:true});
  }

  // Groups and Social Demo Handlers
  if(path==='groups'&&method==='GET'){
    return Promise.resolve({groups:s.groups.filter(g=>s.group_details[g.id]?.members.some(m=>m.user_id===s.user.id)).map(g=>({...g,member_count:s.group_details[g.id].members.length,role:s.group_details[g.id].members.find(m=>m.user_id===s.user.id).role}))});
  }
  if(path==='groups'&&method==='POST'){
    const name=String(body.name||'').trim();
    const habitName=String(body.habit_name||'').trim();
    if(!name||name.length>60) return Promise.reject(new Error('Grup adı 1–60 karakter olmalı.'));
    if(habitName.length>60) return Promise.reject(new Error('Ortak alışkanlık adı en fazla 60 karakter olmalı.'));
    const newGroup={
      id:'grp-'+crypto.randomUUID().slice(0,8),
      name:String(body.name||'').trim(),
      description:String(body.description||'').trim(),
      role:'owner',
      owner_id:s.user.id,
      member_count:1,
      created_at:new Date().toISOString()
    };
    if(habitName&&body.tracking==='quantity'&&(!Number.isFinite(Number(body.target))||Number(body.target)<=0||Number(body.target)>1000000))throw responseError('Hedef sıfırdan büyük ve en fazla 1.000.000 olmalı.',400);
    s.groups.unshift(newGroup);
    s.group_details[newGroup.id]={
      group:newGroup,
      members:[{user_id:s.user.id,email:s.user.email,username:s.user.username,display_name:'Sen',role:'owner'}],
      habits:habitName?[{id:'gh-'+crypto.randomUUID().slice(0,8),group_id:newGroup.id,name:habitName,tracking:body.tracking==='quantity'?'quantity':'check',direction:body.direction==='at_most'?'at_most':'at_least',unit:body.tracking==='quantity'?String(body.unit||''):'',target:body.tracking==='quantity'?Number(body.target):1}]:[],
      checkins:[]
    };
    saveDemo(s);
    return Promise.resolve({group:newGroup});
  }
  const groupDetailMatch=path.match(/^groups\/([^/]+)$/);
  if(groupDetailMatch&&method==='GET'){
    const gId=groupDetailMatch[1];
    const details=s.group_details[gId];
    if(!details) return Promise.reject(Object.assign(new Error('Grup bulunamadı.'),{status:404}));
    return Promise.resolve(details);
  }
  if(groupDetailMatch&&method==='PATCH'){
    const gId=groupDetailMatch[1];
    const g=s.groups.find(x=>x.id===gId);
    if(g){
      if(body.name) g.name=String(body.name).trim();
      if(body.description!==undefined) g.description=String(body.description).trim();
    }
    if(s.group_details[gId]){
      if(body.name) s.group_details[gId].group.name=String(body.name).trim();
      if(body.description!==undefined) s.group_details[gId].group.description=String(body.description).trim();
    }
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  if(groupDetailMatch&&method==='DELETE'){
    const gId=groupDetailMatch[1];
    s.groups=s.groups.filter(x=>x.id!==gId);
    delete s.group_details[gId];
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  const leaveMatch=path.match(/^groups\/([^/]+)\/leave$/);
  if(leaveMatch&&method==='POST'){
    const gId=leaveMatch[1],details=s.group_details[gId],member=details?.members.find(m=>m.user_id===s.user.id);
    if(!member)throw responseError('Grup bulunamadı.',404);
    if(member.role==='owner'&&details.members.length>1){const next=details.members.find(m=>m.user_id!==s.user.id);next.role='owner';details.group.owner_id=next.user_id;member.role='member';}
    if(member.role==='owner'){s.groups=s.groups.filter(g=>g.id!==gId);delete s.group_details[gId];}
    else{details.members=details.members.filter(m=>m.user_id!==s.user.id);details.checkins=details.checkins.filter(c=>c.user_id!==s.user.id);s.groups=s.groups.filter(g=>g.id!==gId);}
    saveDemo(s);return {ok:true};
  }
  const addHabitMatch=path.match(/^groups\/([^/]+)\/habits$/);
  if(addHabitMatch&&method==='POST'){
    const gId=addHabitMatch[1];
    const details=s.group_details[gId];
    if(!details) return Promise.reject(Object.assign(new Error('Grup bulunamadı.'),{status:404}));
    const newHabit={
      id:'gh-'+crypto.randomUUID().slice(0,8),
      group_id:gId,
      name:String(body.name||'').trim(),
      tracking:body.tracking||'quantity',
      direction:body.direction||'at_least',
      unit:String(body.unit||'').trim(),
      target:Number(body.target||1)
    };
    if(!newHabit.name||newHabit.name.length>60||!Number.isFinite(newHabit.target)||newHabit.target<=0||newHabit.target>1000000)throw responseError('Alışkanlık adı ve hedef geçerli olmalı.',400);
    details.habits.push(newHabit);
    saveDemo(s);
    return Promise.resolve({habit:newHabit});
  }
  const groupHabitLifecycleMatch=path.match(/^groups\/([^/]+)\/habits\/([^/]+)\/(archive|restore)$/);
  if(groupHabitLifecycleMatch&&method==='POST'){
    const [,gId,hId,action]=groupHabitLifecycleMatch,details=s.group_details[gId];
    if(!details)throw responseError('Grup bulunamadı.',404);
    if(!details.archived_habits)details.archived_habits=[];
    if(action==='archive'){
      const idx=details.habits.findIndex(h=>h.id===hId);
      if(idx<0)throw responseError('Grup alışkanlığı bulunamadı.',404);
      const [item]=details.habits.splice(idx,1);
      const archived_at=new Date().toISOString();
      details.archived_habits.unshift({...item,archived_at});
      saveDemo(s);
      return Promise.resolve({ok:true,archived_at});
    }else{
      const idx=details.archived_habits.findIndex(h=>h.id===hId);
      if(idx<0)throw responseError('Grup alışkanlığı bulunamadı.',404);
      const [item]=details.archived_habits.splice(idx,1);
      details.habits.push({...item,archived_at:null});
      saveDemo(s);
      return Promise.resolve({ok:true});
    }
  }
  const groupHabitItemMatch=path.match(/^groups\/([^/]+)\/habits\/([^/]+)$/);
  if(groupHabitItemMatch&&method==='PATCH'){
    const [,gId,hId]=groupHabitItemMatch,details=s.group_details[gId];
    const targetHabit=details?.habits.find(h=>h.id===hId)||details?.archived_habits?.find(h=>h.id===hId);
    if(!targetHabit)throw responseError('Grup alışkanlığı bulunamadı.',404);
    const name=String(body.name||'').trim();
    const tracking=body.tracking==='quantity'?'quantity':'check';
    const target=tracking==='quantity'?Number(body.target):1;
    const unit=tracking==='quantity'?String(body.unit||'').trim().slice(0,20):'';
    const direction=body.direction==='at_most'&&tracking==='quantity'?'at_most':'at_least';
    if(!name||name.length>60||!Number.isFinite(target)||target<=0||target>1000000)throw responseError('Alışkanlık adı ve hedef geçerli olmalı.',400);
    if(tracking!==targetHabit.tracking&&details.checkins.some(c=>(c.group_habit_id||c.habit_id)===hId&&!c.deleted))throw responseError('Kayıt bulunan alışkanlığın takip türü değiştirilemez.',400);
    Object.assign(targetHabit,{name,tracking,direction,unit,target,updated_at:new Date().toISOString()});
    saveDemo(s);
    return Promise.resolve({ok:true,habit:targetHabit});
  }
  if(groupHabitItemMatch&&method==='DELETE'){
    const [,gId,hId]=groupHabitItemMatch,details=s.group_details[gId];
    if(!details)throw responseError('Grup bulunamadı.',404);
    const beforeCount=details.habits.length+(details.archived_habits?.length||0);
    details.habits=details.habits.filter(h=>h.id!==hId);
    if(details.archived_habits)details.archived_habits=details.archived_habits.filter(h=>h.id!==hId);
    if(details.habits.length+(details.archived_habits?.length||0)===beforeCount)throw responseError('Grup alışkanlığı bulunamadı.',404);
    details.checkins=details.checkins.filter(c=>(c.group_habit_id||c.habit_id)!==hId);
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  const inviteMatch=path.match(/^groups\/([^/]+)\/invites$/);
  if(inviteMatch&&method==='POST'){
    const details=s.group_details[inviteMatch[1]];
    if(!details?.members.some(m=>m.user_id===s.user.id))throw responseError('Grup bulunamadı.',404);
    const token='inv-'+crypto.randomUUID(),expires_at=new Date(Date.now()+7*86400000).toISOString();
    const invite={token,group_id:inviteMatch[1],invite_type:'link',status:'pending',expires_at,inviter_display:s.user.username||'Bir üye'};
    s.invites={...(s.invites||{}),[token]:invite};saveDemo(s);
    return {invite};
  }
  const reactionMatch=path.match(/^groups\/([^/]+)\/reactions$/);
  if(reactionMatch&&method==='POST'){
    const gId=reactionMatch[1];
    const details=s.group_details[gId];
    if(!details?.members.some(m=>m.user_id===body.target_user_id)||body.target_user_id===s.user.id)throw responseError('Geçersiz hedef üye.',400);
    const sent=(details.reactions||[]).filter(r=>r.sender_user_id===s.user.id&&r.target_user_id===body.target_user_id&&r.habit_date===(body.habit_date||today()));
    if(sent.length>=3)throw responseError('Bugün bu arkadaşına yeterince tepki gönderdin.',429);
    const reaction={
      id:'rx-'+crypto.randomUUID().slice(0,8),
      group_id:gId,
      sender_user_id:'demo-user',
      target_user_id:body.target_user_id,
      habit_date:body.habit_date||today(),
      reaction_type:body.reaction_type==='nudge'?'nudge':'cheer',
      emoji:body.emoji||'👏',
      message:body.message||'',
      created_at:new Date().toISOString()
    };
    if(details){
      details.reactions=[reaction,...(details.reactions||[])];
      saveDemo(s);
    }
    return Promise.resolve({reaction});
  }
  const inviteAction=path.match(/^invites\/([^/]+)(\/respond)?$/);
  if(inviteAction){
    const token=decodeURIComponent(inviteAction[1]),invite=s.invites?.[token],details=invite&&s.group_details[invite.group_id];
    if(!invite||!details||invite.status!=='pending'||invite.expires_at<new Date().toISOString())throw responseError('Davet geçersiz veya süresi dolmuş.',404);
    if(method==='GET'&&!inviteAction[2])return {invite:{...invite,group_name:details.group.name,group_description:details.group.description,member_count:details.members.length}};
    if(method==='POST'&&inviteAction[2]){
      if(!['accept','decline'].includes(body.action))throw responseError('Davet yanıtı geçersiz.',400);
      if(body.action==='accept'&&!details.members.some(m=>m.user_id===s.user.id)){
        details.members.push({user_id:s.user.id,display_name:'Sen',role:'member'});
        if(!s.groups.some(g=>g.id===invite.group_id))s.groups.push({...details.group,role:'member'});
      }
      if(body.action==='decline')invite.status='declined';
      saveDemo(s);return {ok:true,group_id:invite.group_id};
    }
  }
  const groupCheckinMatch=path.match(/^groups\/([^/]+)\/habits\/([^/]+)\/check-ins\/(\d{4}-\d{2}-\d{2})$/);
  if(groupCheckinMatch&&['PUT','DELETE'].includes(method)){
    const [,gId,hId,day]=groupCheckinMatch,details=s.group_details[gId];
    if(!details?.members.some(m=>m.user_id===s.user.id)||!details.habits.some(h=>h.id===hId))throw responseError('Grup alışkanlığı bulunamadı.',404);
    const value=method==='DELETE'?0:Number(body.value),deleted=method==='DELETE'?1:0;
    if(!Number.isFinite(value)||value<0||value>1000000)throw responseError('Geçerli bir miktar gir.',400);
    const old=details.checkins.find(c=>(c.group_habit_id||c.habit_id)===hId&&c.habit_date===day&&c.user_id===s.user.id);
    if(old?.idempotency_key===body.idempotency_key&&old.value===value&&Boolean(old.deleted)===Boolean(deleted))return {checkin:old};
    if(Number(old?.revision||0)!==Number(body.expected_revision||0))throw responseError('Kayıt başka bir cihazda değişti. Güncelleyip yeniden dene.',409);
    const checkin={id:old?.id||crypto.randomUUID(),group_id:gId,group_habit_id:hId,habit_id:hId,habit_date:day,user_id:s.user.id,value,deleted,revision:Number(old?.revision||0)+1,idempotency_key:body.idempotency_key};
    if(old)Object.assign(old,checkin);else details.checkins.push(checkin);
    saveDemo(s);return {checkin};
  }
  const kickMatch=path.match(/^groups\/([^/]+)\/members\/([^/]+)$/);
  if(kickMatch&&method==='DELETE'){
    const gId=kickMatch[1],uId=kickMatch[2];
    if(uId===s.user.id||s.group_details[gId]?.members.find(m=>m.user_id===uId)?.role==='owner')throw responseError('Lideri veya kendini gruptan çıkaramazsın.',400);
    if(s.group_details[gId]){
      s.group_details[gId].members=s.group_details[gId].members.filter(m=>m.user_id!==uId);
      s.group_details[gId].checkins=s.group_details[gId].checkins.filter(c=>c.user_id!==uId);
    }
    const g=s.groups.find(x=>x.id===gId);
    if(g) g.member_count=Math.max(1,(g.member_count||1)-1);
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  const transferMatch=path.match(/^groups\/([^/]+)\/transfer$/);
  if(transferMatch&&method==='POST'){
    const details=s.group_details[transferMatch[1]],owner=details?.members.find(m=>m.user_id===s.user.id);
    if(owner?.role!=='owner')throw responseError('Yalnızca grup lideri bu işlemi yapabilir.',403);
    const target=details.members.find(m=>m.user_id===body.new_owner_id);
    if(!target)throw responseError('Seçilen kullanıcı grup üyesi değil.',404);
    owner.role='member';target.role='owner';details.group.owner_id=target.user_id;details.group.role='member';
    const group=s.groups.find(g=>g.id===transferMatch[1]);if(group)Object.assign(group,{owner_id:target.user_id,role:'member'});
    saveDemo(s);return {ok:true,new_owner_id:target.user_id};
  }

  return Promise.reject(new Error('Bu işlem örnek görünümde desteklenmiyor.'));
}

export const listGroups=()=>request('groups');
export const createGroup=(data)=>request('groups',{method:'POST',body:JSON.stringify(data)});
export const getGroup=(id)=>request(`groups/${id}`);
export const updateGroup=(id,data)=>request(`groups/${id}`,{method:'PATCH',body:JSON.stringify(data)});
export const deleteGroup=(id)=>request(`groups/${id}`,{method:'DELETE'});
export const leaveGroup=(id)=>request(`groups/${id}/leave`,{method:'POST'});
export const kickGroupMember=(groupId,userId)=>request(`groups/${groupId}/members/${userId}`,{method:'DELETE'});
export const transferGroup=(groupId,newOwnerId)=>request(`groups/${groupId}/transfer`,{method:'POST',body:JSON.stringify({new_owner_id:newOwnerId})});
export const createGroupHabit=(groupId,data)=>request(`groups/${groupId}/habits`,{method:'POST',body:JSON.stringify(data)});
export const updateGroupHabit=(groupId,habitId,data)=>request(`groups/${encodeURIComponent(groupId)}/habits/${encodeURIComponent(habitId)}`,{method:'PATCH',body:JSON.stringify(data)});
export const archiveGroupHabit=(groupId,habitId)=>request(`groups/${encodeURIComponent(groupId)}/habits/${encodeURIComponent(habitId)}/archive`,{method:'POST',body:'{}'});
export const restoreGroupHabit=(groupId,habitId)=>request(`groups/${encodeURIComponent(groupId)}/habits/${encodeURIComponent(habitId)}/restore`,{method:'POST',body:'{}'});
export const deleteGroupHabit=(groupId,habitId)=>request(`groups/${encodeURIComponent(groupId)}/habits/${encodeURIComponent(habitId)}`,{method:'DELETE'});
export const createGroupInvite=(groupId,data)=>request(`groups/${groupId}/invites`,{method:'POST',body:JSON.stringify(typeof data==='string'?{invite_type:data}:data)});
export const getInvitePreview=(code)=>request(`invites/${encodeURIComponent(code)}`);
export const respondInvite=(code,action)=>request(`invites/${encodeURIComponent(code)}/respond`,{method:'POST',body:JSON.stringify({action})});
export const setGroupCheckin=(groupId,habitId,day,body)=>request(`groups/${groupId}/habits/${habitId}/check-ins/${day}`,{method:'PUT',body:JSON.stringify(body)});

export function isDemo(){return demoMode}
export async function exportData(){if(demoMode){const s=getDemo();return {user:{id:s.user.id,email:s.user.email},week_start:s.week_start,habits:s.habits,checkins:s.checkins}}return request('export')}
export const importData=(data)=>request('import',{method:'POST',body:JSON.stringify(data)});
export function startDemo(){sessionStorage.setItem('pace_demo','1');location.href='/?demo=1'}

export function exitDemo(){try{sessionStorage.removeItem('pace_demo')}catch{}const url=new URL(location.href);url.searchParams.delete('demo');url.searchParams.set('auth','login');url.hash='today';location.assign(url.pathname+url.search+url.hash)}

export const getAuthCapabilities=()=>request('auth/capabilities');
export const getGamification=()=>request('gamification');
export const saveGamification=(data)=>request('gamification',{method:'PUT',body:JSON.stringify(data)});
export const sendGroupReaction=(groupId,data)=>request(`groups/${groupId}/reactions`,{method:'POST',body:JSON.stringify(data)});
export const getSocialInbox=()=>request('social/inbox');
export const markSocialInboxRead=(id)=>request(`social/inbox/${encodeURIComponent(id)}/read`,{method:'POST',body:'{}'});
export const getPushPublicKey=()=>request('push/public-key');
export const subscribePush=(payload)=>request('push/subscribe',{method:'POST',body:JSON.stringify(payload)});
export const unsubscribePush=(endpoint)=>request('push/subscribe',{method:'DELETE',body:JSON.stringify({endpoint})});
export const updatePushPreferences=(prefs)=>request('push/preferences',{method:'PATCH',body:JSON.stringify(prefs)});
export const changePassword=(data)=>request('account/password',{method:'POST',body:JSON.stringify(data)});
export const regenerateRecoveryCode=(password)=>request('account/recovery-code',{method:'POST',body:JSON.stringify({password})});
