const LIMIT=1000000;
const WEEKDAYS=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
function fail(field,message){const error=new Error(message);error.field=field;throw error}
function number(value,field,message,{min=0,inclusive=false,integer=false}={}){
  const n=typeof value==='number'||typeof value==='string'&&value.trim()!==''?Number(value):NaN;
  if(!Number.isFinite(n)||n>LIMIT||(inclusive?n<min:n<=min)||(integer&&!Number.isInteger(n)))fail(field,message);
  return n;
}
function optional(value,field,message,options){return value==null||typeof value==='string'&&value.trim()===''?null:number(value,field,message,options)}

/** Normalize only active controls; hidden values cannot affect the saved rule. */
export function normalizeHabitForm(values){
  const name=String(values.name??'').trim();
  if(!name||name.length>60)fail('habit-name','Alışkanlık adı 1–60 karakter olmalı.');
  const tracking=values.tracking==='check'?'check':'quantity';
  const direction=tracking==='check'?'at_least':values.direction==='at_most'?'at_most':'at_least';
  const target=tracking==='check'?1:number(values.target,'habit-target','Hedef sıfırdan büyük ve en fazla 1.000.000 olmalı.');
  const unit=tracking==='check'?'':String(values.unit??'').trim();
  if(unit.length>20)fail('habit-unit','Birim en fazla 20 karakter olmalı.');
  const type=['daily','weekdays','weekly_quota'].includes(values.scheduleType)?values.scheduleType:'daily';
  let days=[];
  if(type==='weekdays'){
    const raw=Array.isArray(values.days)?values.days:[];
    if(!raw.length||raw.some(day=>!(typeof day==='number'||typeof day==='string'&&day.trim()!=='')||!Number.isInteger(Number(day))||Number(day)<0||Number(day)>6))fail('weekday-picker','En az bir geçerli plan günü seç.');
    days=[...new Set(raw.map(Number))];
  }
  let quota=null;
  if(type==='weekly_quota'){
    quota=number(values.quota,'habit-quota','Haftalık hedef 1–7 arasında tam sayı olmalı.',{integer:true});
    if(quota>7)fail('habit-quota','Haftalık hedef 1–7 arasında tam sayı olmalı.');
  }
  const progressionEnabled=tracking==='quantity'&&Boolean(values.progressionEnabled);
  const step=progressionEnabled?number(values.step,'progressive-step','Artış sıfırdan büyük ve en fazla 1.000.000 olmalı.'):0;
  const cap=progressionEnabled?optional(values.cap,'progressive-cap','Üst hedef başlangıç hedefinden küçük ve 1.000.000 değerinden büyük olamaz.',{min:target,inclusive:true}):null;
  const debtEnabled=(tracking==='quantity'||type==='weekly_quota')&&direction==='at_least'&&Boolean(values.debtEnabled);
  const debtCap=debtEnabled?optional(values.debtCap,'debt-cap','Taşıma sınırı 0–1.000.000 arasında olmalı.',{inclusive:true}):null;
  return {name,tracking,direction,unit,target,schedule:{type,days,times_per_week:quota},progression:{enabled:progressionEnabled,step,cap},debt:{enabled:debtEnabled,cap:debtCap}};
}

const fmt=value=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:10}).format(value);
/** Describe configured rules, without predicting history-dependent targets. */
export function describeHabitRules(payload){
  const {tracking,direction,target,unit,schedule,progression,debt}=payload;
  const weekly=schedule.type==='weekly_quota';
  const when=weekly?`Haftada ${fmt(schedule.times_per_week)} gün`:schedule.type==='weekdays'?schedule.days.map(day=>WEEKDAYS[day]).join(', '):'Her gün';
  const amount=`${direction==='at_most'?'en fazla':'en az'} ${fmt(target)}${unit?' '+unit:''}`;
  const parts=[tracking==='check'?`${when}: yaptım / yapmadım.`:`${when}: ${weekly?'her kayıt gününde ':''}${amount}.`];
  if(progression.enabled){
    parts.push(`${weekly?'Her hafta seans hedefi':'Her planlı günde'} +${fmt(progression.step)}${unit?' '+unit:''}${progression.cap!==null?`; üst hedef ${fmt(progression.cap)}${unit?' '+unit:''}`:''}.`);
  }
  if(debt.enabled){
    parts.push(weekly?'Eksik günler sonraki haftaya taşınır; bir haftada en fazla 7 gün tamamlanabilir.':'Eksik miktar sonraki planlı güne taşınır.');
    if(debt.cap!==null)parts.push(`Taşıma sınırı: ${fmt(debt.cap)}${weekly?' gün':unit?' '+unit:''}.`);
  }
  return parts.join(' ');
}
