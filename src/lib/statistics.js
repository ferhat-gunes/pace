import {settingsAt,goalFor} from './rules.js';
const unitKey=unit=>{const value=String(unit||'').trim();return ['dk','dakika','min','minute','minutes'].includes(value.toLocaleLowerCase('tr-TR').replaceAll('.',''))?'dk':value||'birim'};
/** Average uses recorded dates, including explicit zero; different historical units never mix. */
export function habitStatistics(habit,checkins,{start='',end,weekStart=1}={}) {
  const latest=new Map();
  for(const row of checkins){if(row.habit_id!==habit.id)continue;const previous=latest.get(row.habit_date);if(!previous||Number(row.revision||0)>=Number(previous.revision||0))latest.set(row.habit_date,row)}
  const history=[...latest.values()],rows=history.filter(r=>!r.deleted&&r.habit_date>=(habit.start_date||'')&&r.habit_date>=start&&r.habit_date<=end&&Number.isFinite(Number(r.value))&&Number(r.value)>=0).sort((a,b)=>a.habit_date.localeCompare(b.habit_date));
  const groups=new Map();let checkDays=0,completedDays=0;
  for(const row of rows){const h=settingsAt(habit,row.habit_date),value=Number(row.value);if(h.tracking==='check'){if(value>=1){checkDays++;completedDays++}continue}const unit=unitKey(h.unit),group=groups.get(unit)||{unit,total:0,days:0,best:0};group.total+=value;group.days++;group.best=Math.max(group.best,value);groups.set(unit,group);const goal=goalFor(habit,row.habit_date,history,weekStart);if(h.direction==='at_most'?value<=goal:value>=goal)completedDays++}
  return {groups:[...groups.values()].map(g=>({...g,average:g.total/g.days})),recordedDays:rows.length,completedDays,checkDays,lastDate:rows.at(-1)?.habit_date||null,dates:rows.map(r=>r.habit_date)};
}
