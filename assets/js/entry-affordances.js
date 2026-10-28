export const isMinutes=unit=>['dakika','dk','min','minute','minutes'].includes(String(unit||'').toLocaleLowerCase('tr-TR').replaceAll('.','').trim());
/** Offer completion only close to a minimum goal, using its exact value. */
export function completionFor(habit,actual,goal){
if(habit.tracking!=='quantity'||habit.direction==='at_most'||!Number.isFinite(actual)||actual<0||!Number.isFinite(goal)||goal<=actual||goal>1e6)return null;
const remaining=Number((goal-actual).toFixed(9));
return remaining>0&&remaining<=(isMinutes(habit.unit)?5:1)?{target:goal,remaining}:null;
}
