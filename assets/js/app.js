import {completionFor,isMinutes} from './entry-affordances.js';
import {habitStatistics} from './statistics.js';
import {request,isDemo,exportData,importData,listGroups,createGroup,getGroup,updateGroup,deleteGroup,leaveGroup,kickGroupMember,transferGroup,createGroupHabit,createGroupInvite,getInvitePreview,respondInvite,setGroupCheckin} from './api.js';
import {dateKey,parseDate,addDays,weekStart,weekDays,settingsAt,scheduled,amountFor,goalFor,stateFor,dueToday,formatNumber,WEEKDAYS,WEEKDAY_VALUES} from './rules.js';
import {createEntryQueue} from './entry-queue.js';
import {createLoadGuard,mergeCheckins} from './state-sync.js';
import {normalizeHabitForm,describeHabitRules} from './habit-form.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
try{const p=new URLSearchParams(location.search).get('invite');if(p)sessionStorage.setItem('pace_pending_invite',p)}catch{}
let state={habits:[],checkins:[],week_start:1,user:null,groups:[],activeGroup:null},ready=false,sessionUser=null,entryQueue=null,selectedDate=dateKey(),showAll=false,authStep='login',pendingAction=null,toastTimer,lastToday=dateKey(),lastSaveAt=0,savedStatusTimer;
const entryStates=new Map(),invalidDrafts=new Map(),loadGuard=createLoadGuard();
const keyFor=(id,day)=>JSON.stringify([id,day]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=body=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
const moreIcon=icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>');
const checkIcon=icon('<path d="m5 12 4 4L19 6"/>');
const shortUnit=unit=>isMinutes(unit)?'dk':unit;
const fmtDate=key=>new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',weekday:'long'}).format(parseDate(key));

function showToast(message,undo=null){
  const toast=$('#toast');
  toast.textContent=message;
  if(undo){
    const button=document.createElement('button');
    button.type='button';
    button.className='text-button toast-undo';
    button.dataset.action='undo';
    button.dataset.id=undo.id;
    button.dataset.day=undo.day;
    button.textContent='Geri al';
    toast.append(button);
  }
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.add('hidden'),undo?8000:4200);
}

function syncState(label,status=''){
  const indicator=$('#sync-indicator');
  indicator.dataset.state=status;
  $('span',indicator).textContent=label;
  $('#today-status').textContent=label;
  $('#today-status').dataset.state=status;
  $('#day-controls').classList.toggle('hidden',selectedDate===dateKey());
}

function announce(message){$('#save-announcer').textContent=message}
function serverRecord(id,day){return state.checkins.find(x=>x.habit_id===id&&x.habit_date===day)||null}

function logsForDisplay(){
  const logs=state.checkins.map(x=>({...x}));
  for(const {id,day,entry} of entryStates.values()){
    if(entry.status==='saved')continue;
    const i=logs.findIndex(x=>x.habit_id===id&&x.habit_date===day);
    const draft={...(i<0?{}:logs[i]),habit_id:id,habit_date:day,value:entry.value,deleted:Number(entry.deleted)};
    if(i<0)logs.push(draft);else logs[i]=draft;
  }
  return logs;
}

function setupQueue(){
  const storageKey='pace-drafts:'+sessionUser.id;
  let storage;
  try{storage=localStorage}catch{try{storage=sessionStorage}catch{}}
  entryQueue=createEntryQueue({
    storage,storageKey,readRecord:serverRecord,
    write:job=>request('habits/'+encodeURIComponent(job.id)+'/check-ins/'+job.day,{method:job.deleted?'DELETE':'PUT',body:JSON.stringify({value:job.value,expected_revision:job.expected_revision,idempotency_key:job.idempotency_key})}),
    accept:(id,day,response)=>{if(response.checkin)state.checkins=mergeCheckins(state.checkins,[response.checkin])},
    refresh:()=>loadState({quiet:true}),
    onChange:(id,day,entry)=>{
      const previousStatus=entryStates.get(keyFor(id,day))?.entry.status;
      entryStates.set(keyFor(id,day),{id,day,entry});
      updateRow(id,day);
      if(entry.status==='saved'){
        const offersUndo=previousStatus!=='saved'&&entry.canUndo&&day===selectedDate;
        if(offersUndo)showToast('Kaydedildi.',{id,day});
        lastSaveAt=Date.now();
        clearTimeout(savedStatusTimer);
        savedStatusTimer=setTimeout(updateSummary,3100);
        if(!offersUndo)announce('Kaydedildi.');
        renderWeekStrip();
      }
      updateSummary();
      if(entry.status==='error'||entry.status==='conflict')announce('Kaydedilemedi. Girdi korundu; yeniden deneyebilirsin.');
    }
  });
  try{
    const drafts=JSON.parse(storage?.getItem(storageKey)||'[]');
    for(const d of drafts){
      const entry=entryQueue.get(d.id,d.day);
      if(entry&&state.habits.some(h=>h.id===d.id))entryStates.set(keyFor(d.id,d.day),{id:d.id,day:d.day,entry});
    }
  }catch{}
}

function hasUnsaved(){return Boolean(entryQueue?.hasPending()||invalidDrafts.size)}

function showAuth(message=''){
  clearTimeout(toastTimer);
  $('#toast').classList.add('hidden');
  $('#toast').replaceChildren();
  $('#startup-screen').hidden=true;
  $('#startup-screen').classList.add('hidden');
  loadGuard.reset();
  lastSaveAt=0;
  clearTimeout(savedStatusTimer);
  entryQueue?.dispose();
  entryQueue=null;
  entryStates.clear();
  invalidDrafts.clear();
  state={habits:[],checkins:[],week_start:1,user:null,groups:[],activeGroup:null};
  ready=false;
  sessionUser=null;
  try{localStorage.removeItem('pace_last_user')}catch{}
  $('#app').hidden=true;
  $('#app').classList.add('hidden');
  $('#auth-screen').hidden=false;
  $('#auth-screen').classList.remove('hidden');
  setAuthMode('login');
  $('#auth-password').value='';
  $('#auth-message').textContent=message;
}

function enterApp(user){
  clearTimeout(toastTimer);
  $('#toast').classList.add('hidden');
  $('#toast').replaceChildren();
  $('#startup-screen').hidden=true;
  $('#startup-screen').classList.add('hidden');
  loadGuard.reset();
  lastSaveAt=0;
  clearTimeout(savedStatusTimer);
  entryQueue?.dispose();
  entryQueue=null;
  entryStates.clear();
  invalidDrafts.clear();
  sessionUser=user||{email:'Örnek görünüm',id:'demo'};
  if(isDemo())sessionUser.id='demo';
  try{localStorage.setItem('pace_last_user',JSON.stringify(sessionUser))}catch{}
  state={habits:[],checkins:[],week_start:user?.week_start??1,user,groups:[],activeGroup:null};
  ready=false;
  selectedDate=dateKey();
  showAll=false;
  $('#auth-screen').hidden=true;
  $('#auth-screen').classList.add('hidden');
  $('#app').hidden=false;
  $('#app').classList.remove('hidden');
  $('#account-email').textContent=sessionUser.email;
  $('#account-button').textContent=sessionUser.email.charAt(0).toLocaleUpperCase('tr-TR');
  $('#demo-badge').classList.toggle('hidden',!isDemo());
  $('#delete-account-button').classList.toggle('hidden',isDemo());
  $('#device-timezone').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_',' ');
  navigate('today');
  renderAll();
  void loadState();
  void loadGroups({quiet:true});
  checkUrlInvite();
}

async function loadState({quiet=false}={}){
  const ticket=loadGuard.begin();
  if(!quiet)syncState('Yükleniyor…');
  $('#load-state').classList.toggle('hidden',ready);
  $('#reload-state').classList.add('hidden');
  try{
    const data=await request('habits');
    if(!loadGuard.isCurrent(ticket)||!sessionUser)return false;
    state={...state,...data,habits:data.habits||[],checkins:mergeCheckins(state.checkins,data.checkins||[]),week_start:Number(data.week_start??1)};
    ready=true;
    if(!entryQueue)setupQueue();
    $('#load-state').classList.add('hidden');
    if(quiet&&(hasUnsaved()||document.activeElement?.matches('.amount-input'))){
      for(const h of state.habits)updateRow(h.id,selectedDate);
      renderHabits();
      renderProgress();
      updateSummary();
    }else renderAll();
    return true;
  }catch(e){
    if(!loadGuard.isCurrent(ticket)||!sessionUser)return false;
    if(e.status===401){showAuth('Oturumun sona erdi. Yeniden giriş yap.');return false}
    $('#load-state').classList.remove('hidden');
    $('#load-message').textContent=ready?'Güncel görünüm yüklenemedi.':'Verilerin yüklenemedi.';
    $('#reload-state').classList.remove('hidden');
    syncState('Bağlantı kurulamadı','error');
    return false;
  }
}

function navigate(view){
  $$('.nav-item[data-view]').forEach(b=>{
    b.classList.toggle('is-active',b.dataset.view===view);
    if(b.dataset.view===view)b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  });
  $$('.page-view').forEach(p=>p.classList.toggle('hidden',p.id!=='view-'+view));
  if(view==='progress')renderProgress();
  if(view==='groups')renderGroups();
}

function dayMetrics(habit,day,logs){
  const h=settingsAt(habit,day),actual=amountFor(habit,day,logs),exists=logs.some(x=>!x.deleted&&x.habit_id===habit.id&&x.habit_date===day),goal=h.tracking==='check'?1:goalFor(habit,day,logs,state.week_start);
  const done=h.tracking==='check'?actual>=1:h.direction==='at_most'?exists&&actual<=goal:actual>=goal;
  const progress=h.tracking==='check'?Number(done):h.direction==='at_most'?(exists?Math.min(1,goal/Math.max(actual,.001)):0):Math.min(1,actual/goal);
  return {h,actual,exists,goal,done,progress};
}

function rowMeta(habit,day,logs){
  const m=dayMetrics(habit,day,logs),h=m.h;
  let text='';
  if(h.schedule?.type==='weekly_quota'){
    const w=stateFor(habit,day,logs,state.week_start);
    text=(text?text+' · ':'')+'Hafta '+formatNumber(w.actual)+' / '+formatNumber(w.goal)+' gün';
  }else if(!scheduled(habit,day,state.week_start))text=(text?text+' · ':'')+'Plan dışı';
  if(h.progression?.enabled)text+=(text?' · ':'')+'+'+formatNumber(h.progression.step);
  return text;
}

function feedbackHTML(id,day){
  const k=keyFor(id,day),raw=invalidDrafts.get(k),e=entryQueue?.get(id,day);
  const args=' data-id="'+esc(id)+'" data-day="'+day+'"';
  if(raw!==undefined)return '<span>Geçerli bir miktar gir.</span><button type="button" class="text-button" data-action="discard"'+args+'>Vazgeç</button>';
  if(!e)return '';
  if(e.status==='pending'||e.status==='saving')return '<span>Kaydediliyor…</span>';
  if(e.status==='error'||e.status==='conflict')return '<span>'+(e.status==='conflict'?'Başka cihazda değişti.':'Kaydedilemedi.')+'</span><button type="button" class="text-button" data-action="retry"'+args+'>'+(e.status==='conflict'?'Yeniden uygula':'Yeniden dene')+'</button><button type="button" class="text-button" data-action="undo"'+args+'>Geri al</button>';
  return '';
}

function goalCaption(m){
  return (m.h.direction==='at_most'?'En fazla ':'Hedef ')+formatNumber(m.goal)+(m.h.unit?' '+shortUnit(m.h.unit):'');
}

function amountInput(h,day,value){
  return '<label class="sr-only" for="amount-'+esc(h.id)+'">'+esc(h.name)+(isMinutes(h.unit)?' süresi':' miktarı')+'</label><input class="amount-input" id="amount-'+esc(h.id)+'" type="number" inputmode="decimal" min="0" max="1000000" step="any" autocomplete="off" value="'+esc(value)+'" data-id="'+esc(h.id)+'" data-day="'+day+'" aria-describedby="feedback-'+esc(h.id)+'">';
}

function primaryContent(h,m,minutes,c=completionFor(h,m.actual,m.goal)){
  return c?(minutes?checkIcon+'<span>+'+formatNumber(c.remaining)+' dk · Tamamla</span>':'Tamamla'):(minutes?'+5 dk':icon('<path d="M5 12h14M12 5v14"/>'));
}

function completionButton(h,m,args,minutes){
  const c=completionFor(h,m.actual,m.goal);
  return '<button type="button" class="step-button primary-step '+(c?'is-goal-step':'')+'" data-primary-step data-action="'+(c?'complete':minutes?'time-step':'step')+'"'+args+' data-delta="'+(minutes?5:1)+'" aria-label="'+esc(h.name)+(c?': '+formatNumber(c.remaining)+' '+esc(shortUnit(h.unit))+' ekleyip hedefi tamamla':minutes?' süresine 5 dakika ekle':' miktarını artır')+'">'+primaryContent(h,m,minutes)+'</button>';
}

function habitKind(h){
  return h.tracking==='check'?icon('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'):isMinutes(h.unit)?icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'):icon('<path d="M5 7h14M5 12h14M5 17h14M9 4v16m6-16v16"/>');
}

function habitRow(habit,day){
  const logs=logsForDisplay(),m=dayMetrics(habit,day,logs),h=m.h,k=keyFor(habit.id,day),value=invalidDrafts.has(k)?invalidDrafts.get(k):m.actual,args=' data-id="'+esc(habit.id)+'" data-day="'+day+'"',minutes=h.tracking==='quantity'&&isMinutes(h.unit),c=invalidDrafts.has(k)?null:completionFor(h,m.actual,m.goal),timeComplete=minutes&&h.direction!=='at_most'&&m.done&&!invalidDrafts.has(k);
  let actions;
  if(h.tracking==='check')actions='<button type="button" class="log-button '+(m.done?'is-complete':'')+'" data-action="toggle"'+args+' aria-pressed="'+m.done+'" aria-label="'+esc(h.name)+(m.done?' kaydını geri al':': yaptım olarak işaretle')+'">'+checkIcon+'<span>'+(m.done?'Tamamlandı':'Yaptım')+'</span></button>';
  else if(minutes)actions='<div class="amount-control time-control"'+(timeComplete?' hidden':'')+'>'+completionButton(h,m,args,true)+[15,30].map(n=>'<button type="button" class="step-button time-step" data-action="time-step"'+args+' data-delta="'+n+'" aria-label="'+esc(h.name)+' süresine '+n+' dakika ekle"'+(c?' hidden':'')+'>+'+n+' dk</button>').join('')+'</div><span class="habit-completion-state"'+(!timeComplete?' hidden':'')+'>'+checkIcon+'Tamamlandı</span>';
  else actions='<div class="amount-control"><button type="button" class="step-button" data-action="step"'+args+' data-delta="-1"'+(m.actual<=0?' disabled':'')+' aria-label="'+esc(h.name)+' miktarını azalt">'+icon('<path d="M5 12h14"/>')+'</button>'+amountInput(h,day,value)+'<span class="amount-unit">'+esc(h.unit)+'</span>'+completionButton(h,m,args,false)+'</div>';
  const tally=h.tracking==='quantity'?(minutes?'<div class="habit-tally tally-entry">'+amountInput(h,day,value)+'<span class="tally-goal">/ '+formatNumber(m.goal)+' dk</span></div>':'<span class="habit-tally">'+esc(goalCaption(m))+'</span>'):'';
  return '<article class="habit-row '+(h.tracking==='check'?'is-check':'is-quantity')+(m.done?' is-complete':'')+'" data-habit-row="'+esc(habit.id)+'" data-near-goal="'+Boolean(c)+'" data-time-complete="'+timeComplete+'"><div class="habit-main"><div class="habit-title-group"><span class="habit-kind" aria-hidden="true">'+habitKind(h)+'</span><div class="habit-copy"><h2>'+esc(h.name)+'</h2><p class="habit-meta">'+esc(rowMeta(habit,day,logs))+'</p></div></div>'+tally+'</div>'+(h.tracking==='quantity'?'<div class="habit-progress"><div class="progress-track" role="progressbar" aria-label="'+esc(h.name)+' günlük ilerleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(m.progress*100)+'"><div class="progress-fill" style="width:'+Math.round(m.progress*100)+'%"></div></div><span class="progress-label sr-only">'+(m.done?'Tamamlandı':h.direction==='at_most'&&!m.exists?'Kayıt yok':'')+'</span></div>':'')+'<div class="habit-actions">'+actions+'</div><div class="entry-feedback" id="feedback-'+esc(habit.id)+'" aria-live="off">'+feedbackHTML(habit.id,day)+'</div></article>';
}

function updateRow(id,day){
  if(day!==selectedDate)return;
  const habit=state.habits.find(h=>h.id===id),row=$('#today-list').querySelector('[data-habit-row="'+CSS.escape(id)+'"]');
  if(!habit||!row)return;
  const logs=logsForDisplay(),m=dayMetrics(habit,day,logs),input=$('.amount-input',row),minutes=m.h.tracking==='quantity'&&isMinutes(m.h.unit),c=invalidDrafts.has(keyFor(id,day))?null:completionFor(m.h,m.actual,m.goal),timeComplete=minutes&&m.h.direction!=='at_most'&&m.done&&!invalidDrafts.has(keyFor(id,day));
  row.classList.toggle('is-complete',m.done);
  row.dataset.nearGoal=String(Boolean(c));
  row.dataset.timeComplete=String(timeComplete);
  $('.habit-meta',row).textContent=rowMeta(habit,day,logs);
  const track=$('.progress-track',row);
  if(track){
    $('.progress-fill',row).style.width=Math.round(m.progress*100)+'%';
    track.setAttribute('aria-valuenow',String(Math.round(m.progress*100)));
    $('.progress-label',row).textContent=m.done?'Tamamlandı':m.h.direction==='at_most'&&!m.exists?'Kayıt yok':'';
    if(minutes)$('.tally-goal',row).textContent='/ '+formatNumber(m.goal)+' dk';
    else $('.habit-tally',row).textContent=goalCaption(m);
  }
  if(input&&document.activeElement!==input)input.value=invalidDrafts.get(keyFor(id,day))??m.actual;
  if(input)input.setAttribute('aria-invalid',String(invalidDrafts.has(keyFor(id,day))));
  const primary=$('[data-primary-step]',row);
  if(primary){
    primary.classList.toggle('is-goal-step',Boolean(c));
    primary.dataset.action=c?'complete':minutes?'time-step':'step';
    const primaryLabel=c?(minutes?'+'+formatNumber(c.remaining)+' dk · Tamamla':'Tamamla'):(minutes?'+5 dk':'');
    if(primary.textContent!==primaryLabel)primary.innerHTML=primaryContent(m.h,m,minutes,c);
    primary.setAttribute('aria-label',m.h.name+(c?': '+formatNumber(c.remaining)+' '+shortUnit(m.h.unit)+' ekleyip hedefi tamamla':minutes?' süresine 5 dakika ekle':' miktarını artır'));
  }
  if(minutes){
    $('.time-control',row).hidden=timeComplete;
    $('.habit-completion-state',row).hidden=!timeComplete;
    $$('.time-step',row).forEach(b=>b.hidden=Boolean(c));
  }
  const minus=$('[data-delta="-1"]',row);
  if(minus)minus.disabled=m.actual<=0;
  const button=$('.log-button',row);
  if(button){
    button.classList.toggle('is-complete',m.done);
    button.setAttribute('aria-pressed',String(m.done));
    button.setAttribute('aria-label',m.h.name+(m.done?' kaydını geri al':': yaptım olarak işaretle'));
    button.innerHTML=checkIcon+'<span>'+(m.done?'Tamamlandı':'Yaptım')+'</span>';
  }
  const feedback=$('.entry-feedback',row),focusedFeedback=feedback.contains(document.activeElement);
  feedback.innerHTML=feedbackHTML(id,day);
  if(focusedFeedback)(input||button)?.focus({preventScroll:true});
}

function updateSummary(){
  const logs=logsForDisplay(),planned=state.habits.filter(h=>dueToday(h,selectedDate,logs,state.week_start)),done=planned.filter(h=>settingsAt(h,selectedDate).schedule?.type==='weekly_quota'?stateFor(h,selectedDate,logs,state.week_start).status==='done':dayMetrics(h,selectedDate,logs).done).length;
  $('#today-completion').textContent=ready&&planned.length?done+' / '+planned.length+' tamamlandı':'';
  const entries=[...entryStates.values()].map(e=>e.entry);
  if(entries.some(e=>e.status==='error'||e.status==='conflict')||invalidDrafts.size)syncState('Kaydedilmemiş giriş var','error');
  else if(entries.some(e=>e.status==='pending'||e.status==='saving'))syncState('Kaydediliyor…','pending');
  else if(ready)syncState(Date.now()-lastSaveAt<3000?'Kaydedildi':'','saved');
}

function renderToday(){
  const today=dateKey();
  $('#selected-date-label').textContent=selectedDate===today?'Bugün':new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short'}).format(parseDate(selectedDate));
  $('#weekday-label').textContent=fmtDate(selectedDate);
  $('#record-date').value=selectedDate;
  $('#record-date').max=today;
  $('#back-today').classList.toggle('hidden',selectedDate===today);
  const logs=logsForDisplay(),active=state.habits.filter(h=>{const v=settingsAt(h,selectedDate);return !v.archived_at&&!v.paused&&selectedDate>=h.start_date}),rows=active.filter(h=>showAll||dueToday(h,selectedDate,logs,state.week_start));
  $('#today-list').innerHTML=ready?rows.map(h=>habitRow(h,selectedDate)).join(''):'';
  $('#today-list').setAttribute('aria-busy',String(!ready));
  $('#today-empty').classList.toggle('hidden',!ready||state.habits.length>0);
  $('#rest-day').classList.toggle('hidden',!ready||state.habits.length===0||rows.length>0);
  $('#show-all-habits').classList.toggle('hidden',!ready||!state.habits.length);
  $('#show-all-habits').value=showAll?'all':'planned';
  $('#view-today .page-heading .add-habit-trigger').classList.toggle('hidden',!ready||state.habits.length===0);
  renderWeekStrip();
  updateSummary();
}

function renderWeekStrip(){
  const today=dateKey(),logs=logsForDisplay();
  $('#week-strip').innerHTML=weekDays(selectedDate,state.week_start).map(day=>{
    const done=state.habits.some(h=>dueToday(h,day,logs,state.week_start)&&dayMetrics(h,day,logs).done);
    const name=new Intl.DateTimeFormat('tr-TR',{weekday:'short'}).format(parseDate(day));
    return '<button type="button" class="week-day '+(day===selectedDate?'is-selected ':'')+(day===today?'is-today ':'')+(done?'has-done':'')+'" data-action="date" data-day="'+day+'" aria-label="'+esc(fmtDate(day))+(day===today?', bugün':'')+'" aria-pressed="'+(day===selectedDate)+'"'+(day===today?' aria-current="date"':'')+(day>today?' disabled':'')+'><b>'+name+'</b><span>'+parseDate(day).getDate()+'</span></button>';
  }).join('');
}

function scheduleLabel(h){
  const s=h.schedule||{};
  return s.type==='daily'?'Her gün':s.type==='weekdays'?(s.days||[]).map(d=>WEEKDAYS[WEEKDAY_VALUES.indexOf(d)]).join(', '):'Haftada '+s.times_per_week+' gün';
}

function renderHabits(){
  const active=state.habits.filter(h=>!h.archived_at),archived=state.habits.filter(h=>h.archived_at);
  const render=h=>'<article class="manage-row" data-manage-row="'+esc(h.id)+'"><div class="manage-main"><div><h2>'+esc(h.name)+'</h2><p>'+esc(scheduleLabel(h))+(h.tracking==='quantity'?' · '+formatNumber(h.target)+' '+esc(h.unit):'')+'</p>'+(h.paused&&!h.archived_at?'<span class="manage-status">Duraklatıldı</span>':'')+'</div></div><div class="manage-actions">'+(h.archived_at?'<button class="button button-quiet" data-action="restore" data-id="'+esc(h.id)+'">Geri yükle</button>':'<button class="button button-quiet small-action" data-action="edit" data-id="'+esc(h.id)+'">Düzenle</button><button class="more-button" data-action="menu" data-id="'+esc(h.id)+'" aria-label="'+esc(h.name)+' diğer işlemler">'+moreIcon+'</button>')+'</div></article>';
  $('#all-habits-list').innerHTML=active.map(render).join('');
  $('#archive-list').innerHTML=archived.map(render).join('');
  $('#archived-habits').classList.toggle('hidden',!archived.length);
  $('#archive-count').textContent=String(archived.length);
  $('#habits-empty').classList.toggle('hidden',!ready||active.length>0||archived.length>0);
}

function renderProgress(){
  const period=$('#progress-period').value,end=dateKey(),start=period==='all'?'':addDays(end,-Number(period)+1),days=new Set();let completed=0;
  const stat=(label,value,unit='')=>'<div><dt>'+label+'</dt><dd>'+esc(value)+(unit?' <span>'+esc(unit)+'</span>':'')+'</dd></div>';
  const tableRows=[];
  const items=state.habits.map(h=>{
    const s=habitStatistics(h,state.checkins,{start,end,weekStart:state.week_start});
    s.dates.forEach(d=>days.add(d));
    completed+=s.completedDays;
    const title='<div class="progress-item-head"><h2>'+esc(h.name)+'</h2>'+(h.archived_at?'<span class="stat-badge">Arşiv</span>':h.paused?'<span class="stat-badge">Duraklatıldı</span>':'')+'</div>';
    const date=s.lastDate?new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric'}).format(parseDate(s.lastDate)):'-';
    const primaryG=s.groups[0]||{total:s.checkDays||0,average:0,best:0,unit:h.tracking==='check'?'gün':h.unit};
    tableRows.push('<tr><th scope="row">'+esc(h.name)+'</th><td>'+s.completedDays+' gün</td><td>'+formatNumber(primaryG.total)+' '+(primaryG.unit||'')+'</td><td>'+formatNumber(primaryG.average)+' '+(primaryG.unit||'')+'</td><td>'+formatNumber(primaryG.best)+' '+(primaryG.unit||'')+'</td><td>'+date+'</td></tr>');
    if(!s.recordedDays)return '<article class="progress-item">'+title+'<p class="statistics-empty">Bu dönemde kayıt yok.</p></article>';
    const groups=s.groups.map(g=>'<dl class="habit-statistics">'+stat('Toplam',formatNumber(g.total),g.unit)+stat('Ortalama / kayıt günü',formatNumber(g.average),g.unit)+stat('En yüksek / gün',formatNumber(g.best),g.unit)+stat('Kayıt yapılan',g.days,'gün')+'</dl>').join('');
    const check=s.checkDays||(!s.groups.length&&h.tracking==='check')?'<dl class="habit-statistics check-statistics">'+stat('Tamamlanan',s.checkDays,'gün')+stat('Kayıt yapılan',s.recordedDays,'gün')+'</dl>':'';
    return '<article class="progress-item" data-stat-habit="'+esc(h.id)+'">'+title+groups+check+'<p class="statistics-last">Son kayıt · '+date+'</p></article>';
  });
  $('#progress-summary').innerHTML='<span><strong>'+completed+'</strong> tamamlanan kayıt</span><span><strong>'+days.size+'</strong> kayıt günü</span>';
  $('#progress-list').innerHTML=items.join('')||'<p class="rest-state">Alışkanlık eklediğinde istatistiklerin burada görünecek.</p>';
  const tbody=$('#progress-table-body');
  if(tbody) tbody.innerHTML=tableRows.join('');
}

// --- Groups and Social Habit Features ---
async function loadGroups({quiet=false}={}){
  try{
    const data=await listGroups();
    state.groups=data.groups||[];
    if($('#view-groups')&&!$('#view-groups').classList.contains('hidden')&&!state.activeGroup){
      renderGroups();
    }
    return true;
  }catch(e){
    if(!quiet) showToast(e.message||'Gruplar yüklenemedi.');
    return false;
  }
}

function renderGroups(){
  const listContainer=$('#groups-list-container');
  const detailView=$('#group-detail-view');
  if(!listContainer||!detailView) return;

  if(state.activeGroup){
    listContainer.classList.add('hidden');
    detailView.classList.remove('hidden');
    renderActiveGroup();
  } else {
    detailView.classList.add('hidden');
    listContainer.classList.remove('hidden');
    const list=$('#groups-list');
    const empty=$('#groups-empty');
    if(!state.groups||state.groups.length===0){
      list.innerHTML='';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML=state.groups.map(g=>{
        const isOwner=g.role==='owner';
        return '<article class="group-card" data-group-card="'+esc(g.id)+'">'
          +'<div>'
            +'<div class="group-card-head">'
              +'<h2 class="group-card-title">'+esc(g.name)+'</h2>'
              +'<span class="group-badge '+(isOwner?'is-owner':'')+'">'+(isOwner?'👑 Lider':'Üye')+'</span>'
            +'</div>'
            +(g.description?'<p class="group-card-desc">'+esc(g.description)+'</p>':'')
          +'</div>'
          +'<div class="group-card-foot">'
            +'<div class="group-meta"><span>👥 '+Number(g.member_count||1)+' üye</span></div>'
            +'<button type="button" class="button button-quiet" data-action="view-group" data-id="'+esc(g.id)+'">Görüntüle</button>'
          +'</div>'
        +'</article>';
      }).join('');
    }
  }
}

async function openGroupDetail(groupId){
  try{
    const data=await getGroup(groupId);
    state.activeGroup=data;
    renderGroups();
  }catch(e){
    showToast(e.message||'Grup detayları yüklenemedi.');
  }
}

function renderActiveGroup(){
  if(!state.activeGroup) return;
  const {group,members,habits}=state.activeGroup;
  const isOwner=group.role==='owner';
  $('#group-detail-title').textContent=group.name;
  $('#group-detail-desc').textContent=group.description||'Ortak alışkanlıklar ve gelişim takibi.';
  $('#group-member-count').textContent=(members?.length||1)+' üye';
  $('#group-habit-count').textContent=(habits?.length||0)+' ortak alışkanlık';
  const roleBadge=$('#group-role-badge');
  roleBadge.textContent=isOwner?'👑 Lider':'Üye';
  roleBadge.className='group-badge '+(isOwner?'is-owner':'');
  $('#group-add-habit-btn').classList.toggle('hidden',!isOwner);

  const filterSelect=$('#group-habit-filter');
  const currentFilter=filterSelect.value||'all';
  filterSelect.innerHTML='<option value="all">Tüm Alışkanlıklar (Genel)</option>'
    +(habits||[]).map(h=>'<option value="'+esc(h.id)+'">'+esc(h.name)+' ('+(h.tracking==='check'?'Yaptım':formatNumber(h.target)+' '+(h.unit||''))+')</option>').join('');
  if((habits||[]).some(h=>h.id===currentFilter)||currentFilter==='all') filterSelect.value=currentFilter;
  else filterSelect.value='all';

  renderMatrixTable();
  renderGroupMembers();
}

function renderMatrixTable(){
  if(!state.activeGroup) return;
  const {members,habits,checkins}=state.activeGroup;
  const thead=$('#matrix-thead');
  const tbody=$('#matrix-tbody');
  const selectedFilter=$('#group-habit-filter').value||'all';
  const days=weekDays(selectedDate,state.week_start);
  const todayStr=dateKey();

  const dayHeaders=days.map(d=>{
    const pDate=parseDate(d);
    const dayName=new Intl.DateTimeFormat('tr-TR',{weekday:'short'}).format(pDate);
    const dayNum=pDate.getDate();
    const isToday=d===todayStr;
    return '<th scope="col"'+(isToday?' class="matrix-today-th"':'')+'>'
      +'<div><b>'+dayName+'</b></div>'
      +'<small>'+dayNum+'</small>'
    +'</th>';
  }).join('');

  thead.innerHTML='<tr>'
    +'<th scope="col" class="sticky-col">Üye</th>'
    +dayHeaders
    +'<th scope="col">Haftalık %</th>'
  +'</tr>';

  if(!members||members.length===0){
    tbody.innerHTML='<tr><td colspan="'+(days.length+2)+'" class="rest-state">Henüz üye yok.</td></tr>';
    return;
  }

  const selectedHabit=selectedFilter!=='all'?(habits||[]).find(h=>h.id===selectedFilter):null;

  const rows=members.map(member=>{
    const isSelf=member.user_id===sessionUser?.id||member.email===sessionUser?.email;
    const initial=(member.display_name||member.username||member.email||'U').charAt(0).toLocaleUpperCase('tr-TR');
    const displayName=(member.display_name||member.username||member.email)+(isSelf?' (Sen)':'');

    let totalPossible=0;
    let totalCompleted=0;

    const dayCells=days.map(d=>{
      const isFuture=d>todayStr;
      if(selectedHabit){
        totalPossible++;
        const log=(checkins||[]).find(c=>c.habit_id===selectedHabit.id&&c.habit_date===d&&c.user_id===member.user_id&&!c.deleted);
        const val=Number(log?.value||0);
        const isDone=selectedHabit.tracking==='check'?val>=1:val>=Number(selectedHabit.target||1);
        if(isDone) totalCompleted++;

        if(isSelf&&d===todayStr){
          return '<td>'
            +'<button type="button" class="matrix-interactive" data-action="toggle-group-checkin" data-habit="'+esc(selectedHabit.id)+'" data-day="'+d+'" data-done="'+isDone+'" data-val="'+val+'" aria-label="'+esc(selectedHabit.name)+' kaydını güncelle">'
              +(isDone?'<span class="matrix-check">'+checkIcon+'</span>':val>0?'<span class="matrix-val">'+val+'</span>':'<span class="matrix-empty">—</span>')
            +'</button>'
          +'</td>';
        } else {
          return '<td>'
            +(isDone?'<span class="matrix-check">'+checkIcon+'</span>':val>0?'<span class="matrix-val">'+val+'</span>':isFuture?'<span class="matrix-empty">·</span>':'<span class="matrix-empty">—</span>')
          +'</td>';
        }
      } else {
        const hList=habits||[];
        const habitCount=hList.length;
        if(habitCount===0) return '<td><span class="matrix-empty">—</span></td>';
        totalPossible+=habitCount;
        let dayDone=0;
        hList.forEach(h=>{
          const log=(checkins||[]).find(c=>c.habit_id===h.id&&c.habit_date===d&&c.user_id===member.user_id&&!c.deleted);
          const v=Number(log?.value||0);
          const done=h.tracking==='check'?v>=1:v>=Number(h.target||1);
          if(done) dayDone++;
        });
        totalCompleted+=dayDone;
        const allDone=dayDone===habitCount&&habitCount>0;
        return '<td>'
          +(allDone?'<span class="matrix-check">'+checkIcon+'</span>':dayDone>0?'<span class="matrix-val">'+dayDone+'/'+habitCount+'</span>':isFuture?'<span class="matrix-empty">·</span>':'<span class="matrix-empty">—</span>')
        +'</td>';
      }
    }).join('');

    const pct=totalPossible>0?Math.round((totalCompleted/totalPossible)*100):0;

    return '<tr>'
      +'<td class="sticky-col">'
        +'<div class="matrix-user-cell">'
          +'<span class="matrix-avatar">'+esc(initial)+'</span>'
          +'<span class="matrix-username">'+esc(displayName)+'</span>'
        +'</div>'
      +'</td>'
      +dayCells
      +'<td><b>%'+pct+'</b></td>'
    +'</tr>';
  }).join('');

  tbody.innerHTML=rows;
}

function renderGroupMembers(){
  if(!state.activeGroup) return;
  const {members,group}=state.activeGroup;
  const isCurrentUserOwner=group?.role==='owner';
  const list=$('#group-members-list');
  if(!members||members.length===0){
    list.innerHTML='<p class="rest-state">Üye bilgisi bulunamadı.</p>';
    return;
  }
  list.innerHTML=members.map(m=>{
    const isOwner=m.role==='owner';
    const isSelf=m.user_id===sessionUser?.id||m.email===sessionUser?.email;
    const initial=(m.display_name||m.username||m.email||'U').charAt(0).toLocaleUpperCase('tr-TR');
    const name=(m.display_name||m.username||'İsimsiz')+(isSelf?' (Sen)':'');
    const email=m.email||'';
    const canManage=isCurrentUserOwner&&!isSelf&&!isOwner;
    return '<article class="member-card">'
      +'<div class="member-card-left">'
        +'<span class="matrix-avatar">'+esc(initial)+'</span>'
        +'<div>'
          +'<div class="member-card-name">'+esc(name)+'</div>'
          +'<div class="member-card-sub">'+esc(email)+'</div>'
        +'</div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;">'
        +'<span class="group-badge '+(isOwner?'is-owner':'')+'">'+(isOwner?'👑 Lider':'Üye')+'</span>'
        +(canManage?'<button type="button" class="text-button" style="font-size:0.75rem;padding:4px 8px;min-height:36px;" data-action="transfer-group" data-member-id="'+esc(m.user_id)+'" data-name="'+esc(name)+'">Lider yap</button>'
          +'<button type="button" class="text-button text-danger" style="font-size:0.75rem;padding:4px 8px;min-height:36px;" data-action="kick-member" data-member-id="'+esc(m.user_id)+'" data-name="'+esc(name)+'">Çıkar</button>':'')
      +'</div>'
    +'</article>';
  }).join('');
}

async function toggleGroupCheckin(habitId,day,isDone){
  if(!state.activeGroup) return;
  const habit=(state.activeGroup.habits||[]).find(h=>h.id===habitId);
  if(!habit) return;
  const newVal=isDone?0:(habit.tracking==='check'?1:Number(habit.target||1));
  try{
    const res=await setGroupCheckin(state.activeGroup.group.id, habitId, day, {
      value: newVal,
      deleted: newVal===0,
      expected_revision: 0,
      idempotency_key: crypto.randomUUID()
    });
    let checkin=(state.activeGroup.checkins||[]).find(c=>c.habit_id===habitId&&c.habit_date===day&&(c.user_id===sessionUser?.id||c.user_id==='demo-user'));
    if(!checkin){
      checkin={id:res.checkin?.id||crypto.randomUUID(),habit_id:habitId,habit_date:day,user_id:sessionUser?.id||'demo-user',value:newVal,deleted:newVal===0?1:0};
      state.activeGroup.checkins.push(checkin);
    } else {
      checkin.value=newVal;
      checkin.deleted=newVal===0?1:0;
    }
    renderMatrixTable();
    showToast(newVal>0?'Grup hedefi tamamlandı!':'Grup kaydı geri alındı.');
  }catch(e){
    showToast(e.message||'Grup kaydı güncellenemedi.');
  }
}

async function openGroupInviteModal(){
  if(!state.activeGroup) return;
  const gId=state.activeGroup.group.id;
  $('#tab-link').click();
  $('#invite-username-input').value='';
  $('#invite-email-input').value='';
  $('#invite-error').textContent='';
  $('#invite-link-input').value='Oluşturuluyor…';
  $('#group-invite-dialog').showModal();
  try{
    const res=await createGroupInvite(gId, { type: 'link' });
    const link=res?.invite?.link||(location.origin+'/?invite='+res?.invite?.code);
    $('#invite-link-input').value=link;
    const shareText='PACE uygulamasında "'+state.activeGroup.group.name+'" grubuna davet edildin. Katılmak için tıkla: '+link;
    $('#share-whatsapp-btn').href='https://wa.me/?text='+encodeURIComponent(shareText);
  }catch(e){
    $('#invite-link-input').value='';
    $('#invite-error').textContent=e.message||'Davet bağlantısı oluşturulamadı.';
  }
}

async function openJoinGroupModal(prefillCode=''){
  $('#join-invite-input').value=prefillCode;
  $('#join-error').textContent='';
  $('#join-code-step').classList.remove('hidden');
  $('#join-preview-step').classList.add('hidden');
  $('#join-group-dialog').showModal();
  if(prefillCode) await handlePreviewInvite();
}

async function handlePreviewInvite(){
  const raw=$('#join-invite-input').value.trim();
  const err=$('#join-error');
  err.textContent='';
  if(!raw){ err.textContent='Davet kodu veya bağlantısı gir.'; return; }
  let code=raw;
  if(raw.includes('invite=')){
    try{ code=new URL(raw).searchParams.get('invite')||raw; }catch{ code=raw.split('invite=').pop()||raw; }
  } else if(raw.includes('/')){
    code=raw.split('/').filter(Boolean).pop();
  }
  const btn=$('#preview-invite-btn');
  btn.disabled=true;
  try{
    const res=await getInvitePreview(code);
    const invite=res.invite;
    $('#preview-group-name').textContent=invite.group_name||'Grup';
    const isMember=(state.groups||[]).some(g=>g.id===invite.group_id);
    if(isMember){
      $('#preview-inviter').textContent='Zaten bu grubun üyesisin.';
      $('#accept-invite-btn').textContent='Gruba Git';
      $('#accept-invite-btn').dataset.alreadyMember='true';
      $('#accept-invite-btn').dataset.groupId=invite.group_id;
      $('#decline-invite-btn').classList.add('hidden');
    } else {
      $('#preview-inviter').textContent='Bu davet '+(invite.inviter_name||'bir üye')+' tarafından gönderildi.';
      $('#accept-invite-btn').textContent='Katıl';
      delete $('#accept-invite-btn').dataset.alreadyMember;
      delete $('#accept-invite-btn').dataset.groupId;
      $('#decline-invite-btn').classList.remove('hidden');
    }
    $('#join-code-step').classList.add('hidden');
    $('#join-preview-step').classList.remove('hidden');
    $('#accept-invite-btn').dataset.code=code;
    $('#decline-invite-btn').dataset.code=code;
  }catch(e){
    err.textContent=e.message||'Davet bulunamadı veya süresi dolmuş.';
  }finally{
    btn.disabled=false;
  }
}

async function handleRespondInvite(action){
  if(action==='accept'&&$('#accept-invite-btn').dataset.alreadyMember==='true'){
    const gId=$('#accept-invite-btn').dataset.groupId;
    $('#join-group-dialog').close();
    if(gId) await openGroupDetail(gId);
    return;
  }
  const code=$('#accept-invite-btn').dataset.code;
  if(!code) return;
  const btn=$('#accept-invite-btn');
  btn.disabled=true;
  try{
    const res=await respondInvite(code, action);
    $('#join-group-dialog').close();
    if(action==='accept'){
      showToast('Gruba katıldın!');
      await loadGroups({ quiet: true });
      if(res.group_id) await openGroupDetail(res.group_id);
      else renderGroups();
    } else {
      showToast('Davet reddedildi.');
    }
  }catch(e){
    $('#join-error').textContent=e.message||'İşlem gerçekleştirilemedi.';
  }finally{
    btn.disabled=false;
  }
}

function checkUrlInvite(){
  let code=null;
  try{
    const params=new URLSearchParams(location.search);
    code=params.get('invite');
    if(!code) code=sessionStorage.getItem('pace_pending_invite');
  }catch{}
  if(code){
    try{
      sessionStorage.removeItem('pace_pending_invite');
      if(location.search.includes('invite=')){
        const u=new URL(location.href);
        u.searchParams.delete('invite');
        history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash);
      }
    }catch{}
    navigate('groups');
    void openJoinGroupModal(code);
  }
}

function renderAll(){
  $('#week-start').value=String(state.week_start);
  renderToday();
  renderHabits();
  renderProgress();
  renderGroups();
}

let habitLauncher=null;
function formValues(){return {name:$('#habit-name').value,tracking:$('input[name="tracking"]:checked').value,direction:$('#habit-direction').value,target:$('#habit-target').value,unit:$('#habit-unit').value,scheduleType:$('input[name="schedule"]:checked').value,days:$$('#weekday-picker button.is-selected').map(b=>Number(b.dataset.day)),quota:$('#habit-quota').value,progressionEnabled:$('#progressive-enabled').checked,step:$('#progressive-step').value,cap:$('#progressive-cap').value,debtEnabled:$('#debt-enabled').checked,debtCap:$('#debt-cap').value}}
function updateFormVisibility(){const v=formValues(),quantity=v.tracking==='quantity',weekly=v.scheduleType==='weekly_quota',direction=quantity?v.direction:'at_least',debtEligible=(quantity||weekly)&&direction==='at_least';$('#quantity-fields').classList.toggle('hidden',!quantity);$('#habit-target-label').textContent=weekly?'Bir gündeki hedef':'Günlük hedef';$('#direction-field').classList.toggle('hidden',!quantity);$('#weekday-field').classList.toggle('hidden',v.scheduleType!=='weekdays');$('#quota-field').classList.toggle('hidden',!weekly);$('#progressive-row').classList.toggle('hidden',!quantity);$('#progressive-fields').classList.toggle('hidden',!quantity||!v.progressionEnabled);$('#progressive-cadence').textContent=weekly?'Her haftada artış':'Her planlı günde artış';$('#debt-row').classList.toggle('hidden',!debtEligible);$('#debt-row small').classList.toggle('hidden',!v.debtEnabled);$('#debt-row small').textContent=weekly?'Eksik günler sonraki haftaya eklenir. Toplam en fazla 7 gün.':'Kalan miktar sonraki planlı güne eklenir.';$('#debt-cap-field').classList.toggle('hidden',!debtEligible||!v.debtEnabled);$('#debt-cap-field span').textContent=weekly?'En fazla taşınacak gün':'En fazla taşınacak miktar';$('.advanced-options').classList.toggle('hidden',!quantity&&!weekly);$$('[data-progression-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.progressionStep)===Number(v.step))));updateRulePreview()}
function updateRulePreview(){try{const payload=normalizeHabitForm(formValues());$('#rule-preview').textContent=describeHabitRules(payload);const parts=[];if(payload.progression.enabled)parts.push('+'+formatNumber(payload.progression.step));if(payload.debt.enabled)parts.push('eksikleri taşı');$('#rules-summary').textContent='Diğer kurallar'+(parts.length?' · '+parts.join(', '):'')}catch{$('#rule-preview').textContent='';$('#rules-summary').textContent='Diğer kurallar'}}
function initWeekdayPicker(){$('#weekday-picker').innerHTML=WEEKDAY_VALUES.map((day,i)=>'<button type="button" data-day="'+day+'" aria-pressed="false">'+WEEKDAYS[i]+'</button>').join('')}
function openHabit(habit){habitLauncher=document.activeElement;const form=$('#habit-form');form.reset();$('.advanced-options').open=Boolean(habit&&(habit.progression?.enabled||habit.debt?.enabled||habit.direction==='at_most'));$('#habit-id').value=habit?.id||'';$('#habit-dialog-title').textContent=habit?'Alışkanlığı düzenle':'Alışkanlık ekle';$('#habit-name').value=habit?.name||'';$('#habit-target').value=habit?.target??1;$('#habit-unit').value=habit?.unit||'';$('#habit-direction').value=habit?.direction||'at_least';$('#habit-quota').value=habit?.schedule?.times_per_week||3;$('input[name="tracking"][value="'+(habit?.tracking||'check')+'"]').checked=true;$('input[name="schedule"][value="'+(habit?.schedule?.type||'daily')+'"]').checked=true;const days=habit?.schedule?.days||[1,3,5];$$('#weekday-picker button').forEach(b=>{const selected=days.includes(Number(b.dataset.day));b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',String(selected))});$('#progressive-enabled').checked=Boolean(habit?.progression?.enabled);$('#progressive-step').value=habit?.progression?.step||1;$('#progressive-cap').value=habit?.progression?.cap??'';$('#debt-enabled').checked=Boolean(habit?.debt?.enabled);$('#debt-cap').value=habit?.debt?.cap??'';$('#habit-error').textContent='';$$('[aria-invalid]',form).forEach(e=>e.removeAttribute('aria-invalid'));$('#edit-effective-note').classList.toggle('hidden',!habit);updateFormVisibility();$('#habit-dialog').showModal();$('#habit-name').focus()}
function versionSettings(h){return {name:h.name,tracking:h.tracking,direction:h.direction,unit:h.unit,target:h.target,schedule:h.schedule,progression:h.progression,debt:h.debt,paused:Boolean(h.paused),archived_at:h.archived_at??null}}
function updateLocalHabit(id,changes){const i=state.habits.findIndex(h=>h.id===id);if(i<0)return;const old=state.habits[i],updated={...old,...changes,updated_at:new Date().toISOString()},effective=dateKey(),versions=(old.versions||[]).filter(v=>v.effective_from!==effective);versions.push({id:crypto.randomUUID(),effective_from:effective,settings:versionSettings(updated)});state.habits[i]={...updated,versions}}
async function saveHabit(ev){ev.preventDefault();const button=$('#habit-form button[type="submit"]');if(button.disabled)return;$('#habit-error').textContent='';$$('[aria-invalid]',$('#habit-form')).forEach(e=>e.removeAttribute('aria-invalid'));let payload;try{payload=normalizeHabitForm(formValues())}catch(e){$('#habit-error').textContent=e.message;const field=document.getElementById(e.field);field?.setAttribute('aria-invalid','true');field?.setAttribute('aria-describedby','habit-error');if(e.field==='weekday-picker')$('button',field)?.focus();else field?.focus();return}const id=$('#habit-id').value;button.disabled=true;button.textContent='Kaydediliyor…';try{if(id){await request('habits/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({...payload,effective_from:dateKey()})});updateLocalHabit(id,payload)}else{const response=await request('habits',{method:'POST',body:JSON.stringify({...payload,start_date:dateKey()})});const h={...payload,id:response.habit.id,start_date:dateKey(),paused:false,archived_at:null,created_at:new Date().toISOString(),versions:[{effective_from:dateKey(),settings:{...payload,paused:false,archived_at:null}}]};state.habits.push(h)}$('#habit-dialog').close();renderAll();showToast(id?'Alışkanlık güncellendi.':'Alışkanlık eklendi.');(habitLauncher?.isConnected?habitLauncher:$('#today-list button')||$('.add-habit-trigger'))?.focus({preventScroll:true})}catch(e){$('#habit-error').textContent=e.message||'Kaydedilemedi. Bilgilerin korundu.';if(e.status===401)$('#habit-error').textContent='Oturumun sona erdi. Formunu kapatıp yeniden giriş yap.'}finally{button.disabled=false;button.textContent='Kaydet'}}
function setAmount(id,day,value,{immediate=false,deleted=false}={}){if(!entryQueue)return;const k=keyFor(id,day);try{const n=Number(value);if(String(value).trim()===''||!Number.isFinite(n)||n<0||n>1e6)throw new Error();invalidDrafts.delete(k);entryQueue.set(id,day,n,{deleted,immediate});updateRow(id,day);updateSummary()}catch{invalidDrafts.set(k,String(value));updateRow(id,day);updateSummary()}}
function currentAmount(id,day){const raw=invalidDrafts.get(keyFor(id,day));if(raw!==undefined&&raw.trim()!==''&&Number.isFinite(Number(raw)))return Number(raw);const draft=entryQueue?.get(id,day);if(draft&&draft.status!=='saved')return draft.deleted?0:draft.value;return Number(serverRecord(id,day)?.value||0)}
function hasHabitDraft(id){return [...entryStates.values()].some(e=>e.id===id&&e.entry.status!=='saved')||[...invalidDrafts.keys()].some(k=>JSON.parse(k)[0]===id)}
function confirm(title,copy,label,callback){$('#confirm-title').textContent=title;$('#confirm-copy').textContent=copy;$('#confirm-action').textContent=label;$('#confirm-error').textContent='';pendingAction=callback;$('#confirm-dialog').showModal()}

async function doHabitAction(action,id){
  const h=state.habits.find(h=>h.id===id);
  if(!h)return;
  if(action==='edit'){openHabit(h);return}
  if(action==='menu'){
    const row=$('#all-habits-list').querySelector('[data-manage-row="'+CSS.escape(id)+'"]');
    const old=$('.habit-menu',row);
    $$('.habit-menu').forEach(e=>e.remove());
    if(old)return;
    const menu=document.createElement('div');
    menu.className='habit-menu';
    menu.setAttribute('role','group');
    menu.setAttribute('aria-label',h.name+' işlemleri');
    menu.innerHTML='<button type="button" data-action="'+(h.paused?'resume':'pause')+'" data-id="'+esc(id)+'">'+(h.paused?'Devam et':'Duraklat')+'</button><button type="button" data-action="archive" data-id="'+esc(id)+'">Arşivle</button>';
    row.appendChild(menu);
    return;
  }
  if(hasHabitDraft(id)){showToast('Önce kaydedilmemiş girişi tamamla veya geri al.');navigate('today');showAll=true;renderToday();return}
  const apply=async changes=>{await request('habits/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({...changes,effective_from:dateKey()})});updateLocalHabit(id,changes);renderAll()};
  if(action==='pause'||action==='resume'){await apply({paused:action==='pause'});showToast(action==='pause'?'Alışkanlık duraklatıldı.':'Alışkanlık devam ediyor.')}
  if(action==='restore'){await apply({archived_at:null,paused:false});showToast('Alışkanlık geri yüklendi.')}
  if(action==='archive')confirm('Alışkanlığı arşivle?','Geçmiş kayıtların korunur. Arşivlenenler bölümünden geri yükleyebilirsin.','Arşivle',async()=>{await apply({archived_at:new Date().toISOString()});showToast('Alışkanlık arşivlendi.')});
}

async function signout(){
  const perform=async()=>{
    if(!isDemo())await request('auth/logout',{method:'POST',body:'{}'});
    entryQueue?.dispose({clear:true});
    entryQueue=null;
    try{localStorage.removeItem('pace_last_user')}catch{}
    showAuth('Oturum kapatıldı.');
    if(isDemo()){sessionStorage.removeItem('pace_demo');location.href='/'}
  };
  if(hasUnsaved())confirm('Kaydedilmemiş girişler var.','Kaydedilmemiş girişleri bırakıp çıkış yapmak ister misin?','Çıkış yap',perform);
  else await perform();
}

async function onDocumentClick(ev){
  const nav=ev.target.closest('[data-view]');
  if(nav){navigate(nav.dataset.view);return}
  if(ev.target.closest('.add-habit-trigger')){openHabit();return}
  if(ev.target.closest('[data-close-dialog]')){
    const dlg=ev.target.closest('dialog');
    dlg?.close();
    habitLauncher?.focus({preventScroll:true});
    return;
  }
  if(ev.target.closest('[data-cancel-confirm]')){$('#confirm-dialog').close();pendingAction=null;return}
  const preset=ev.target.closest('[data-progression-step]');
  if(preset){$('#progressive-step').value=preset.dataset.progressionStep;updateFormVisibility();return}

  // Close habit menu if clicked outside
  if(!ev.target.closest('.habit-menu')&&!ev.target.closest('[data-action="menu"]')){
    $$('.habit-menu').forEach(e=>e.remove());
  }

  // Group Navigation and Actions
  if(ev.target.closest('#create-group-trigger')||ev.target.closest('#empty-create-group-btn')){
    $('#group-edit-id').value='';
    $('#group-name').value='';
    $('#group-description').value='';
    $('#group-dialog-title').textContent='Grup kur';
    $('#group-form-error').textContent='';
    $('#group-dialog').showModal();
    $('#group-name').focus();
    return;
  }
  if(ev.target.closest('#join-group-trigger')){
    void openJoinGroupModal();
    return;
  }
  if(ev.target.closest('#group-back-btn')){
    state.activeGroup=null;
    renderGroups();
    return;
  }
  if(ev.target.closest('#group-invite-btn')){
    void openGroupInviteModal();
    return;
  }
  if(ev.target.closest('#group-add-habit-btn')){
    $('#group-habit-name').value='';
    $('#group-habit-error').textContent='';
    $('input[name="gh-tracking"][value="check"]').checked=true;
    $('#gh-quantity-fields').classList.add('hidden');
    $('#group-habit-dialog').showModal();
    $('#group-habit-name').focus();
    return;
  }
  if(ev.target.closest('#group-more-btn')){
    if(!state.activeGroup) return;
    const isOwner=state.activeGroup.group.role==='owner';
    if(isOwner){
      confirm('Grubu sil?', 'Grup ve tüm ortak rutin kayıtları kalıcı olarak silinir.', 'Grubu sil', async()=>{
        await deleteGroup(state.activeGroup.group.id);
        state.activeGroup=null;
        await loadGroups({quiet:true});
        renderGroups();
        showToast('Grup silindi.');
      });
    } else {
      confirm('Gruptan ayrıl?', 'Bu gruptaki ortak rutinlerden çıkarılacaksın.', 'Ayrıl', async()=>{
        await leaveGroup(state.activeGroup.group.id);
        state.activeGroup=null;
        await loadGroups({quiet:true});
        renderGroups();
        showToast('Gruptan ayrıldın.');
      });
    }
    return;
  }

  // Invite Dialog tabs and buttons
  if(ev.target.closest('#tab-link')){
    $$('.invite-tab').forEach(t=>t.classList.toggle('is-active',t.id==='tab-link'));
    $('#panel-link').classList.remove('hidden');
    $('#panel-username').classList.add('hidden');
    $('#panel-email').classList.add('hidden');
    return;
  }
  if(ev.target.closest('#tab-username')){
    $$('.invite-tab').forEach(t=>t.classList.toggle('is-active',t.id==='tab-username'));
    $('#panel-username').classList.remove('hidden');
    $('#panel-link').classList.add('hidden');
    $('#panel-email').classList.add('hidden');
    $('#invite-username-input').focus();
    return;
  }
  if(ev.target.closest('#tab-email')){
    $$('.invite-tab').forEach(t=>t.classList.toggle('is-active',t.id==='tab-email'));
    $('#panel-email').classList.remove('hidden');
    $('#panel-link').classList.add('hidden');
    $('#panel-username').classList.add('hidden');
    $('#invite-email-input').focus();
    return;
  }
  if(ev.target.closest('#copy-invite-link-btn')){
    const val=$('#invite-link-input').value;
    try{
      await navigator.clipboard.writeText(val);
      showToast('Davet bağlantısı kopyalandı.');
    }catch{
      $('#invite-link-input').select();
      showToast('Bağlantıyı seçip kopyalayabilirsin.');
    }
    return;
  }
  if(ev.target.closest('#send-username-invite-btn')){
    if(!state.activeGroup) return;
    const target=$('#invite-username-input').value.trim();
    if(!target){ $('#invite-error').textContent='Kullanıcı adı gir.'; return; }
    $('#invite-error').textContent='';
    try{
      await createGroupInvite(state.activeGroup.group.id, { type: 'username', target });
      showToast('Davet gönderildi!');
      $('#group-invite-dialog').close();
    }catch(e){
      $('#invite-error').textContent=e.message||'Davet gönderilemedi.';
    }
    return;
  }
  if(ev.target.closest('#send-email-invite-btn')){
    if(!state.activeGroup) return;
    const target=$('#invite-email-input').value.trim();
    if(!target){ $('#invite-error').textContent='E-posta adresi gir.'; return; }
    $('#invite-error').textContent='';
    try{
      await createGroupInvite(state.activeGroup.group.id, { type: 'email', target });
      showToast('Davet gönderildi!');
      $('#group-invite-dialog').close();
    }catch(e){
      $('#invite-error').textContent=e.message||'Davet gönderilemedi.';
    }
    return;
  }

  // Join Dialog buttons
  if(ev.target.closest('#preview-invite-btn')){
    await handlePreviewInvite();
    return;
  }
  if(ev.target.closest('#accept-invite-btn')){
    await handleRespondInvite('accept');
    return;
  }
  if(ev.target.closest('#decline-invite-btn')){
    await handleRespondInvite('decline');
    return;
  }

  const action=ev.target.closest('[data-action]');
  if(action){
    const {id}=action.dataset,day=action.dataset.day||selectedDate,a=action.dataset.action;
    if(a==='view-group'){
      await openGroupDetail(id);
      return;
    }
    if(a==='kick-member'){
      const memberId=action.dataset.memberId,memberName=action.dataset.name||'Bu üyeyi';
      if(!state.activeGroup||!memberId)return;
      confirm('Üyeyi gruptan çıkar?','“'+memberName+'” gruptan ve ortak rutinlerden çıkarılacak.','Çıkar',async()=>{
        await kickGroupMember(state.activeGroup.group.id,memberId);
        showToast('Üye gruptan çıkarıldı.');
        await openGroupDetail(state.activeGroup.group.id);
      });
      return;
    }
    if(a==='transfer-group'){
      const memberId=action.dataset.memberId,memberName=action.dataset.name||'Bu üyeyi';
      if(!state.activeGroup||!memberId)return;
      confirm('Grup liderliğini devret?','“'+memberName+'” grubun yeni lideri yapılacak. Sen üye olarak kalacaksın.','Devret',async()=>{
        await transferGroup(state.activeGroup.group.id,memberId);
        showToast('Grup liderliği devredildi.');
        await openGroupDetail(state.activeGroup.group.id);
      });
      return;
    }
    if(a==='toggle-group-checkin'){
      const habitId=action.dataset.habit;
      const isDone=action.dataset.done==='true';
      await toggleGroupCheckin(habitId, day, isDone);
      return;
    }
    if(['edit','menu','pause','resume','archive','restore'].includes(a)){await doHabitAction(a,id);return}
    if(a==='date'){selectedDate=day;$('#date-panel').classList.add('hidden');$('#date-toggle').setAttribute('aria-expanded','false');renderToday();return}
    if(a==='show-all'){showAll=true;renderToday();return}
    if(a==='toggle'){const value=currentAmount(id,day)>0?0:1;setAmount(id,day,value,{deleted:value===0,immediate:true});return}
    if(a==='complete'){
      const h=state.habits.find(h=>h.id===id);
      if(h&&!invalidDrafts.has(keyFor(id,day))){
        const m=dayMetrics(h,day,logsForDisplay()),c=completionFor(m.h,m.actual,m.goal);
        if(c)setAmount(id,day,c.target,{immediate:true});
      }
      return;
    }
    if(a==='step'||a==='time-step'){setAmount(id,day,Math.max(0,currentAmount(id,day)+Number(action.dataset.delta)));return}
    if(a==='retry'){await entryQueue.retry(id,day);return}
    if(a==='undo'){
      if(!entryQueue)return;
      invalidDrafts.delete(keyFor(id,day));
      await entryQueue.undo(id,day);
      updateRow(id,day);
      updateSummary();
      showToast('Geri alındı.');
      return;
    }
    if(a==='discard'){
      invalidDrafts.delete(keyFor(id,day));
      updateRow(id,day);
      const input=$('#amount-'+CSS.escape(id));
      if(input)input.value=currentAmount(id,day);
      updateSummary();
      return;
    }
  }

  if(ev.target.closest('#date-toggle')){
    const panel=$('#date-panel'),open=panel.classList.contains('hidden');
    panel.classList.toggle('hidden',!open);
    $('#date-toggle').setAttribute('aria-expanded',String(open));
    if(open)$('#record-date').focus();
    return;
  }
  if(ev.target.closest('#back-today')){
    selectedDate=dateKey();
    $('#date-panel').classList.add('hidden');
    $('#date-toggle').setAttribute('aria-expanded','false');
    renderToday();
    return;
  }
  if(ev.target.closest('#reload-state')){await loadState();return}
  if(ev.target.closest('#account-button')){navigate('settings');return}
  if(ev.target.closest('#signout-button')){await signout();return}
  if(ev.target.closest('#delete-account-button')){
    confirm('Hesabını ve verilerini sil?','Tüm alışkanlık, grup ve kayıtların silinir. Bu işlem geri alınamaz.','Hesabı sil',async()=>{
      await request('account',{method:'DELETE'});
      entryQueue?.dispose({clear:true});
      entryQueue=null;
      try{localStorage.removeItem('pace_last_user')}catch{}
      showAuth('Hesabın silindi.');
    });
    return;
  }
  if(ev.target.closest('#export-button')){
    const data=await exportData(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');
    a.href=url;
    a.download='pace-yedek-'+dateKey()+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('Yedek indirildi.');
    return;
  }
  if(ev.target.closest('#import-button')){
    $('#import-file-input').click();
    return;
  }
}

async function saveGroup(ev){
  ev.preventDefault();
  const editId=$('#group-edit-id').value;
  const name=$('#group-name').value.trim();
  const description=$('#group-description').value.trim();
  const err=$('#group-form-error');
  err.textContent='';
  if(!name){ err.textContent='Grup adı gerekli.'; return; }
  const btn=$('#group-form-submit');
  btn.disabled=true;
  try{
    if(editId){
      await updateGroup(editId, { name, description });
      if(state.activeGroup&&state.activeGroup.group.id===editId){
        state.activeGroup.group.name=name;
        state.activeGroup.group.description=description;
      }
      showToast('Grup güncellendi.');
    } else {
      const res=await createGroup({ name, description });
      showToast('Grup kuruldu!');
      $('#group-dialog').close();
      await loadGroups({ quiet: true });
      if(res?.group?.id){
        await openGroupDetail(res.group.id);
      } else {
        renderGroups();
      }
      return;
    }
    $('#group-dialog').close();
    await loadGroups({ quiet: true });
    renderGroups();
  }catch(e){
    err.textContent=e.message||'İşlem gerçekleştirilemedi.';
  }finally{
    btn.disabled=false;
  }
}

async function saveGroupHabit(ev){
  ev.preventDefault();
  if(!state.activeGroup) return;
  const name=$('#group-habit-name').value.trim();
  const tracking=$('input[name="gh-tracking"]:checked').value;
  const target=tracking==='check'?1:Number($('#gh-target').value||1);
  const unit=tracking==='check'?'':$('#gh-unit').value.trim();
  const err=$('#group-habit-error');
  err.textContent='';
  if(!name){ err.textContent='Alışkanlık adı gerekli.'; return; }
  const btn=$('#group-habit-submit');
  btn.disabled=true;
  try{
    const res=await createGroupHabit(state.activeGroup.group.id, { name, tracking, target, unit, direction: 'at_least' });
    if(res?.habit){
      if(!state.activeGroup.habits) state.activeGroup.habits=[];
      state.activeGroup.habits.push(res.habit);
    }
    $('#group-habit-dialog').close();
    renderActiveGroup();
    showToast('Alışkanlık gruba eklendi.');
  }catch(e){
    err.textContent=e.message||'Alışkanlık eklenemedi.';
  }finally{
    btn.disabled=false;
  }
}

function bind(){
  document.addEventListener('click',ev=>{
    void onDocumentClick(ev).catch(e=>{
      showToast(e.message||'İşlem tamamlanamadı.');
      if(e.status===401)showAuth('Oturumun sona erdi. Yeniden giriş yap.');
    });
  });

  $('#habit-form')?.addEventListener('submit',saveHabit);
  $('#habit-form')?.addEventListener('change',updateFormVisibility);
  $('#habit-form')?.addEventListener('input',updateRulePreview);

  $('#group-form')?.addEventListener('submit',saveGroup);
  $('#group-habit-form')?.addEventListener('submit',saveGroupHabit);

  // Group Habit tracking radios toggle quantity fields
  $$('input[name="gh-tracking"]').forEach(radio=>{
    radio.addEventListener('change',()=>{
      $('#gh-quantity-fields')?.classList.toggle('hidden', radio.value!=='quantity');
    });
  });

  $('#group-habit-filter')?.addEventListener('change',renderMatrixTable);

  $('#progress-period')?.addEventListener('change',renderProgress);
  $('#show-all-habits')?.addEventListener('change',e=>{showAll=e.target.value==='all';renderToday()});
  $('#record-date')?.addEventListener('change',e=>{
    if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)&&e.target.value<=dateKey()){
      selectedDate=e.target.value;
      $('#date-panel')?.classList.add('hidden');
      $('#date-toggle')?.setAttribute('aria-expanded','false');
      renderToday();
      $('#date-toggle')?.focus();
    }else e.target.value=selectedDate;
  });

  $('#week-start')?.addEventListener('change',async()=>{
    const previous=state.week_start,next=Number($('#week-start').value);
    try{
      await request('account/preferences',{method:'PATCH',body:JSON.stringify({week_start:next})});
      state.week_start=next;
      renderAll();
    }catch(e){
      if($('#week-start'))$('#week-start').value=String(previous);
      showToast(e.message||'Tercih kaydedilemedi.');
    }
  });

  $('#weekday-picker')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-day]');
    if(!b)return;
    const selected=!b.classList.contains('is-selected');
    b.classList.toggle('is-selected',selected);
    b.setAttribute('aria-pressed',String(selected));
    updateRulePreview();
  });

  document.addEventListener('focusin',e=>{if(e.target.matches('.amount-input'))e.target.select()});
  document.addEventListener('input',e=>{if(e.target.matches('.amount-input'))setAmount(e.target.dataset.id,e.target.dataset.day,e.target.value)});
  document.addEventListener('focusout',e=>{if(e.target.matches('.amount-input')&&!invalidDrafts.has(keyFor(e.target.dataset.id,e.target.dataset.day)))void entryQueue?.flush(e.target.dataset.id,e.target.dataset.day)});

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      $$('.habit-menu').forEach(el=>el.remove());
      if(!$('#date-panel')?.classList.contains('hidden')){
        $('#date-panel')?.classList.add('hidden');
        $('#date-toggle')?.setAttribute('aria-expanded','false');
        $('#date-toggle')?.focus();
      }
    }
    if(e.key==='Enter'&&e.target.matches('.amount-input')){
      e.preventDefault();
      if(!invalidDrafts.has(keyFor(e.target.dataset.id,e.target.dataset.day)))void entryQueue?.flush(e.target.dataset.id,e.target.dataset.day);
    }
  });

  $('#confirm-action')?.addEventListener('click',async()=>{
    if(!pendingAction)return;
    const button=$('#confirm-action');
    if(button)button.disabled=true;
    $$('[data-cancel-confirm]').forEach(b=>b.disabled=true);
    if($('#confirm-error'))$('#confirm-error').textContent='';
    try{
      await pendingAction();
      pendingAction=null;
      $('#confirm-dialog')?.close();
    }catch(e){
      if($('#confirm-error'))$('#confirm-error').textContent=e.message||'İşlem tamamlanamadı. Yeniden dene.';
    }finally{
      if(button)button.disabled=false;
      $$('[data-cancel-confirm]').forEach(b=>b.disabled=false);
    }
  });

  $('#confirm-dialog')?.addEventListener('cancel',e=>{
    if($('#confirm-action')?.disabled)e.preventDefault();
    else pendingAction=null;
  });

  $('#auth-form')?.addEventListener('submit',submitAuth);
  $$('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.authMode)));
  $('#close-recovery')?.addEventListener('click',()=>{$('#recovery-dialog')?.close();if($('#recovery-code'))$('#recovery-code').value=''});
  $('#recovery-dialog')?.addEventListener('cancel',e=>e.preventDefault());
  $('#copy-recovery')?.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText($('#recovery-code')?.value||'');
      showToast('Kurtarma kodu kopyalandı.');
    }catch{
      $('#recovery-code')?.select();
      showToast('Kodu seçip kopyalayabilirsin.');
    }
  });

  $('#import-file-input')?.addEventListener('change',async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    try{
      const text=await file.text();
      const json=JSON.parse(text);
      if(!json||typeof json!=='object')throw new Error('Geçersiz yedek dosyası.');
      await importData(json);
      showToast('Yedek başarıyla yüklendi.');
      await loadState();
    }catch(err){
      showToast(err.message||'Yedek yüklenemedi.');
    }finally{
      e.target.value='';
    }
  });

  window.addEventListener('beforeunload',e=>{if(hasUnsaved()){e.preventDefault();e.returnValue=''}});

  setInterval(()=>{
    const today=dateKey();
    if(today!==lastToday){
      const wasToday=selectedDate===lastToday;
      lastToday=today;
      if(wasToday){
        selectedDate=today;
        showToast('Yeni bir gün başladı! Bugünün alışkanlıkları görüntülendi.');
      }
      renderAll();
    }
  },30000);

  document.addEventListener('visibilitychange',()=>{
    const today=dateKey();
    if(today!==lastToday){
      if(selectedDate===lastToday)selectedDate=today;
      lastToday=today;
      renderAll();
    }
    if(document.visibilityState==='visible'&&ready&&!hasUnsaved()&&!$('dialog[open]')){
      void loadState({quiet:true});
      void loadGroups({quiet:true});
    }
  });
}

function setAuthMode(mode){
  authStep=mode;
  $('#auth-title').textContent=mode==='register'?'Hesap oluştur':mode==='recover'?'Hesabını kurtar':'PACE’e giriş yap';
  $('#auth-message').textContent='';
  $('#recovery-field-wrap').classList.toggle('hidden',mode!=='recover');
  $('#auth-recovery').required=mode==='recover';
  $('#auth-password').autocomplete=mode==='login'?'current-password':'new-password';
  $('#auth-password-label').textContent=mode==='recover'?'Yeni parolan':'Parolan';
  $('#auth-submit').textContent=mode==='register'?'Hesap oluştur':mode==='recover'?'Hesabımı kurtar':'Giriş yap';
  $('#auth-register-link').classList.toggle('hidden',mode==='register');
  $('#auth-login-link').classList.toggle('hidden',mode==='login');
  $('#auth-recover-link').classList.toggle('hidden',mode==='recover');
}

async function submitAuth(e){
  e.preventDefault();
  const button=$('#auth-submit');
  if(button.disabled)return;
  const email=$('#auth-email').value.trim(),password=$('#auth-password').value,recovery_code=$('#auth-recovery').value.trim();
  button.disabled=true;
  $('#auth-message').textContent='';
  try{
    const data=await request('auth/'+authStep,{method:'POST',body:JSON.stringify({email,password,...(authStep==='recover'?{recovery_code}:{})})});
    $('#auth-password').value='';
    $('#auth-recovery').value='';
    enterApp(data.user);
    if(data.recovery_code){
      $('#recovery-code').value=data.recovery_code;
      $('#recovery-dialog').showModal();
    }
  }catch(err){
    $('#auth-message').textContent=err.message||'İşlem tamamlanamadı.';
  }finally{
    button.disabled=false;
  }
}

function showStartupError(){
  $('#app').hidden=true;$('#app').classList.add('hidden');
  $('#auth-screen').hidden=true;$('#auth-screen').classList.add('hidden');
  $('#startup-screen').hidden=false;$('#startup-screen').classList.remove('hidden');
  $('#startup-message').textContent='PACE’e bağlanılamadı. Bağlantını kontrol edip yeniden dene.';
  $('#startup-retry').classList.remove('hidden');
}

let restoringSession=false;
async function restoreSession(){
  if(restoringSession)return;
  restoringSession=true;
  $('#startup-retry').disabled=true;
  $('#startup-message').textContent='PACE hazırlanıyor…';
  $('#startup-retry').classList.add('hidden');
  try{
    if(isDemo()){enterApp({email:'Örnek görünüm',id:'demo'});return}
    const data=await request('auth/me');
    if(!data?.user||typeof data.user.id!=='string'||!data.user.id||typeof data.user.email!=='string'||!data.user.email)throw new Error('Geçersiz oturum yanıtı.');
    enterApp(data.user);
  }catch(e){
    if(e.status===401){
      try{localStorage.removeItem('pace_last_user')}catch{}
      showAuth();
    } else {
      let cachedUser=null;
      try{cachedUser=JSON.parse(localStorage.getItem('pace_last_user'))}catch{}
      if(cachedUser&&cachedUser.id&&cachedUser.email){
        enterApp(cachedUser);
        showToast('Çevrimdışı moddasın. Kayıtların yerel olarak saklanacak.');
      } else {
        showStartupError();
      }
    }
  }finally{
    restoringSession=false;
    $('#startup-retry').disabled=false;
  }
}

async function boot(){
  initWeekdayPicker();
  bind();
  $('#startup-retry').addEventListener('click',()=>void restoreSession());
  await restoreSession();
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').then(reg=>{
    reg.addEventListener('updatefound',()=>{
      const newWorker=reg.installing;
      if(!newWorker)return;
      newWorker.addEventListener('statechange',()=>{
        if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
          showToast('Yeni bir sürüm mevcut. Güncellemek için dokun.');
          const toast=$('#toast');
          const btn=document.createElement('button');
          btn.type='button';
          btn.className='text-button toast-undo';
          btn.textContent='Yenile';
          btn.onclick=()=>{
            newWorker.postMessage({type:'SKIP_WAITING'});
            location.reload();
          };
          toast.appendChild(btn);
        }
      });
    });
  }).catch(()=>{});
}
boot().catch(showStartupError);
