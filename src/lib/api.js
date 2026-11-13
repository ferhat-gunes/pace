const DEMO_KEY='pace_demo_state_v1';
const params=new URLSearchParams(typeof location!=='undefined'?location.search:'');
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
          {id:'gc-1',group_habit_id:'gh-reading',habit_date:t,user_id:'demo-user',value:20,revision:1},
          {id:'gc-2',group_habit_id:'gh-reading',habit_date:t,user_id:'user-ayse',value:25,revision:1},
          {id:'gc-3',group_habit_id:'gh-walk',habit_date:t,user_id:'user-ayse',value:1,revision:1}
        ],
        reactions:[]
      }
    },
    gamification:{xp:45,gems:15,streakFreezes:1,usedFreezeDates:{},claimedDates:{},allDoneBonusDates:{}},
    social_inbox:[]
  };
}
function getDemo(){try{let raw=localStorage.getItem(DEMO_KEY);if(!raw){const s=seedDemo();try{localStorage.setItem(DEMO_KEY,JSON.stringify(s))}catch(e){}return s}return JSON.parse(raw)}catch{return seedDemo()}}
function saveDemo(state){try{localStorage.setItem(DEMO_KEY,JSON.stringify(state));}catch(e){console.warn('localStorage save failed:', e);}return state}
export async function request(path,options={}){
  const cleanPath = String(path||'').replace(/^\/?api\//,'').replace(/^\//,'');
  if(demoMode)return demoRequest(cleanPath,options);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch('/api/'+cleanPath,{...options,signal:controller.signal,credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})}});
    const payload=await response.json().catch(()=>({error:'Sunucudan yanıt alınamadı.'}));
    if(!response.ok){
      const err=new Error(payload.error||'İşlem tamamlanamadı.');
      err.status=response.status;
      throw err;
    }
    return payload;
  }catch(e){
    if(e.name==='AbortError')throw new Error('Bağlantı yanıt vermedi. Yeniden deneyebilirsin.');
    throw e;
  }finally{
    clearTimeout(timer);
  }
}

function demoRequest(path,options={}){
  path = String(path||'').replace(/^\/?api\//,'').replace(/^\//,'');
  let s=getDemo();
  if(!s.groups) s.groups=[];
  if(!s.group_details) s.group_details={};
  if(!s.gamification) s.gamification={xp:0,gems:10,streakFreezes:1,usedFreezeDates:{},claimedDates:{},allDoneBonusDates:{}};
  if(!s.social_inbox) s.social_inbox=[];
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
  if(path==='habits'&&method==='POST'){
    const h={...body,id:crypto.randomUUID(),start_date:body.start_date||today(),created_at:new Date().toISOString()};
    s.habits.push(h);
    saveDemo(s);
    return Promise.resolve({habit:h});
  }
  const checkinMatch=path.match(/^habits\/([^/]+)\/check-ins\/(\d{4}-\d{2}-\d{2})$/);
  if(checkinMatch&&(method==='PUT'||method==='DELETE')){
    const id=checkinMatch[1],day=checkinMatch[2],index=s.checkins.findIndex(x=>x.habit_id===id&&x.habit_date===day),old=index>=0?s.checkins[index]:null;
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
  const archiveMatch=path.match(/^habits\/([^/]+)\/archive$/);
  if(archiveMatch&&method==='POST'){
    s.habits=s.habits.map(h=>h.id===archiveMatch[1]?{...h,archived_at:new Date().toISOString()}:h);
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  const restoreMatch=path.match(/^habits\/([^/]+)\/restore$/);
  if(restoreMatch&&method==='POST'){
    s.habits=s.habits.map(h=>h.id===restoreMatch[1]?{...h,archived_at:null}:h);
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  const habitMatch=path.match(/^habits\/([^/]+)$/);
  if(habitMatch&&method==='PATCH'){
    s.habits=s.habits.map(h=>{
      if(h.id!==habitMatch[1])return h;
      const updated={...h,...body},effective=body.effective_from||today(),versions=(h.versions||[{effective_from:h.start_date,settings:{...h,paused:false,archived_at:null}}]).filter(v=>v.effective_from!==effective);
      const settings={name:updated.name,tracking:updated.tracking,direction:updated.direction,unit:updated.unit,target:updated.target,schedule:updated.schedule,progression:updated.progression,debt:updated.debt,paused:Boolean(updated.paused),archived_at:updated.archived_at??null};
      versions.push({effective_from:effective,settings});
      return {...updated,versions};
    });
    saveDemo(s);
    return Promise.resolve({ok:true});
  }
  if(path==='account/preferences'&&method==='PATCH'){
    s.week_start=Number(body.week_start)===0?0:1;
    saveDemo(s);
    return Promise.resolve({ok:true,week_start:s.week_start});
  }
  if(path==='import'&&method==='POST'){
    if(Array.isArray(body.habits)) s.habits=body.habits;
    if(Array.isArray(body.checkins)) s.checkins=body.checkins;
    if(body.week_start!==undefined) s.week_start=Number(body.week_start);
    saveDemo(s);
    return Promise.resolve({ok:true,habits_count:s.habits.length,checkins_count:(s.checkins||[]).length});
  }
  if(habitMatch&&method==='DELETE'){
    s.habits=s.habits.filter(h=>h.id!==habitMatch[1]);
    s.checkins=s.checkins.filter(x=>x.habit_id!==habitMatch[1]);
    saveDemo(s);
    return Promise.resolve({ok:true});
  }

  // Groups and Social Demo Handlers
  if(path==='groups'&&method==='GET'){
    return Promise.resolve({groups:s.groups});
  }
  if(path==='groups'&&method==='POST'){
    const newGroup={
      id:'grp-'+crypto.randomUUID().slice(0,8),
      name:String(body.name||'').trim(),
      description:String(body.description||'').trim(),
      role:'owner',
      member_count:1,
      created_at:new Date().toISOString()
    };
    const habits = body.habit_name ? [{
      id:'gh-'+crypto.randomUUID().slice(0,8),
      group_id:newGroup.id,
      name:String(body.habit_name).trim(),
      tracking:body.tracking==='quantity'?'quantity':'check',
      direction:body.direction==='at_most'?'at_most':'at_least',
      unit:String(body.unit||'').trim(),
      target:Number(body.target||1)
    }] : [];
    s.groups.unshift(newGroup);
    s.group_details[newGroup.id]={
      group:newGroup,
      members:[{id:'m-'+crypto.randomUUID().slice(0,6),user_id:'demo-user',email:'demo@pace.app',username:'demo',display_name:'Sen',role:'owner'}],
      habits,
      checkins:[],
      reactions:[]
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
    const gId=leaveMatch[1];
    s.groups=s.groups.filter(x=>x.id!==gId);
    delete s.group_details[gId];
    saveDemo(s);
    return Promise.resolve({ok:true});
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
    details.habits.push(newHabit);
    saveDemo(s);
    return Promise.resolve({habit:newHabit});
  }
  const inviteMatch=path.match(/^groups\/([^/]+)\/invites$/);
  if(inviteMatch&&method==='POST'){
    const code='inv-'+crypto.randomUUID().slice(0,8);
    const link=location.origin+'/?join='+code;
    return Promise.resolve({
      invite:{
        id:'inv-'+crypto.randomUUID().slice(0,6),
        token:code,
        code,
        link,
        invite_type:body.invite_type||body.type||'link',
        recipient:body.recipient||null,
        expires_at:new Date(Date.now()+7*86400000).toISOString()
      }
    });
  }
  const reactionMatch=path.match(/^groups\/([^/]+)\/reactions$/);
  if(reactionMatch&&method==='POST'){
    const gId=reactionMatch[1];
    const details=s.group_details[gId];
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
  const previewInviteMatch=path.match(/^invites\/([^/]+)$/);
  if(previewInviteMatch&&method==='GET'){
    return Promise.resolve({
      invite:{
        code:previewInviteMatch[1],
        group_id:'demo-group-morning',
        group_name:'Sabah Rutini Ekibi',
        inviter_display:'demo',
        type:'link',
        status:'pending',
        expires_at:new Date(Date.now()+7*86400000).toISOString()
      }
    });
  }
  const respondInviteMatch=path.match(/^invites\/([^/]+)\/(accept|decline|respond)$/);
  if(respondInviteMatch&&method==='POST'){
    return Promise.resolve({ok:true,group_id:'demo-group-morning'});
  }
  const groupCheckinMatch=path.match(/^groups\/([^/]+)\/habits\/([^/]+)\/check-ins\/(\d{4}-\d{2}-\d{2})$/);
  if(groupCheckinMatch&&(method==='PUT'||method==='DELETE')){
    const gId=groupCheckinMatch[1],hId=groupCheckinMatch[2],day=groupCheckinMatch[3];
    const details=s.group_details[gId];
    if(!details) return Promise.reject(Object.assign(new Error('Grup bulunamadı.'),{status:404}));
    const del=method==='DELETE'||Boolean(body.deleted);
    const val=del?0:Number(body.value||0);
    let checkin=details.checkins.find(c=>(c.group_habit_id===hId||c.habit_id===hId)&&c.habit_date===day&&c.user_id==='demo-user');
    if(!checkin){
      checkin={id:'gc-'+crypto.randomUUID().slice(0,8),group_habit_id:hId,habit_date:day,user_id:'demo-user',value:val,deleted:del?1:0,revision:1};
      details.checkins.push(checkin);
    } else {
      checkin.group_habit_id=hId;
      checkin.value=val;
      checkin.deleted=del?1:0;
      checkin.revision=(checkin.revision||1)+1;
    }
    saveDemo(s);
    return Promise.resolve({checkin});
  }
  const kickMatch=path.match(/^groups\/([^/]+)\/members\/([^/]+)$/);
  if(kickMatch&&method==='DELETE'){
    const gId=kickMatch[1],uId=kickMatch[2];
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
    const gId=transferMatch[1];
    const newOwner=body.new_owner_id;
    if(s.group_details[gId]&&newOwner){
      s.group_details[gId].members=s.group_details[gId].members.map(m=>({...m,role:m.user_id===newOwner?'owner':'member'}));
      s.group_details[gId].group.role='member';
    }
    const g=s.groups.find(x=>x.id===gId);
    if(g) g.role='member';
    saveDemo(s);
    return Promise.resolve({ok:true});
  }

  return Promise.reject(new Error('Bu işlem örnek görünümde desteklenmiyor.'));
}

export const getAuthCapabilities=()=>request('auth/capabilities');
export const getGamification=()=>request('gamification');
export const saveGamification=(data)=>request('gamification',{method:'PUT',body:JSON.stringify(data)});
export const listGroups=()=>request('groups');
export const createGroup=(data)=>request('groups',{method:'POST',body:JSON.stringify(data)});
export const getGroup=(id)=>request(`groups/${id}`);
export const updateGroup=(id,data)=>request(`groups/${id}`,{method:'PATCH',body:JSON.stringify(data)});
export const deleteGroup=(id)=>request(`groups/${id}`,{method:'DELETE'});
export const leaveGroup=(id)=>request(`groups/${id}/leave`,{method:'POST'});
export const kickGroupMember=(groupId,userId)=>request(`groups/${groupId}/members/${userId}`,{method:'DELETE'});
export const transferGroup=(groupId,newOwnerId)=>request(`groups/${groupId}/transfer`,{method:'POST',body:JSON.stringify({new_owner_id:newOwnerId})});
export const createGroupHabit=(groupId,data)=>request(`groups/${groupId}/habits`,{method:'POST',body:JSON.stringify(data)});
export const createGroupInvite=(groupId,data)=>request(`groups/${groupId}/invites`,{method:'POST',body:JSON.stringify(typeof data==='string'?{invite_type:data}:(data||{invite_type:'link'}))});
export const sendGroupReaction=(groupId,data)=>request(`groups/${groupId}/reactions`,{method:'POST',body:JSON.stringify(data)});
export const getSocialInbox=()=>request('social/inbox');
export const markSocialInboxRead=(id)=>request(`social/inbox/${encodeURIComponent(id)}/read`,{method:'POST',body:'{}'});
export const getInvitePreview=(code)=>request(`invites/${encodeURIComponent(code)}`);
export const respondInvite=(code,action)=>request(`invites/${encodeURIComponent(code)}/respond`,{method:'POST',body:JSON.stringify({action})});
export const setGroupCheckin=(groupId,habitId,day,body)=>request(`groups/${groupId}/habits/${habitId}/check-ins/${day}`,{method:'PUT',body:JSON.stringify(body)});
export const getPushPublicKey=()=>request('push/public-key');
export const subscribePush=(payload)=>request('push/subscribe',{method:'POST',body:JSON.stringify(payload)});
export const unsubscribePush=(endpoint)=>request('push/subscribe',{method:'DELETE',body:JSON.stringify({endpoint})});
export const updatePushPreferences=(prefs)=>request('push/preferences',{method:'PATCH',body:JSON.stringify(prefs)});
export const changePassword=(data)=>request('account/password',{method:'POST',body:JSON.stringify(data)});
export const regenerateRecoveryCode=(password)=>request('account/recovery-code',{method:'POST',body:JSON.stringify({password})});

export function isDemo(){return demoMode}
export async function exportData(){if(demoMode)return getDemo();return request('export')}
export const importData=(data)=>request('import',{method:'POST',body:JSON.stringify(data)});
export function startDemo(){try{sessionStorage.setItem('pace_demo','1');}catch{}location.href='/?demo=1'}
export function exitDemo(openAuth=false){try{sessionStorage.removeItem('pace_demo');}catch{}location.href=openAuth?'/?auth=login':'/'}
