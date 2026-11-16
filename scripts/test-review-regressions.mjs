import test from 'node:test';
import assert from 'node:assert/strict';
import { initialHabitValues } from '../src/components/habit-form-model.js';
import { dateKey, addDays, stateFor, settingsAt, latestCheckins } from '../src/lib/rules.js';
import { habitStreak } from '../src/lib/statistics.js';
const today=dateKey();
const base={name:'Hedef',tracking:'quantity',direction:'at_least',unit:'km',target:10,schedule:{type:'daily'},progression:{enabled:false},debt:{enabled:false},paused:false,archived_at:null};
test('editor initializes current effective rules, not a future snapshot',()=>{
 const h={...base,id:'h',target:20,start_date:addDays(today,-7),versions:[{effective_from:addDays(today,-7),settings:base},{effective_from:addDays(today,7),settings:{...base,target:20,paused:true}}]};
 assert.equal(settingsAt(h,today).target,10);assert.equal(initialHabitValues(h).target,'10');
 assert.equal(initialHabitValues(h).date,today);assert.equal(settingsAt(h,addDays(today,8)).target,20);
});
test('future checkins never complete the current weekly quota',()=>{
 const h={...base,id:'h',tracking:'check',target:1,start_date:today,schedule:{type:'weekly_quota',times_per_week:2}};
 const records=[1,2].map(n=>({habit_id:'h',habit_date:addDays(today,n),value:1,revision:1}));
 assert.equal(stateFor(h,today,records).status,'open');assert.equal(stateFor(h,today,records).actual,0);
});
test('indexed history preserves tombstones and long streaks',()=>{
 const h={...base,id:'h',tracking:'check',target:1,start_date:addDays(today,-1999)};
 const rows=Array.from({length:2000},(_,n)=>({habit_id:'h',habit_date:addDays(today,-n),value:1,revision:1}));
 assert.equal(habitStreak(h,rows).count,2000);
 const indexed=latestCheckins([...rows,{habit_id:'h',habit_date:addDays(today,-1),value:0,deleted:1,revision:2}]);
 assert.equal(latestCheckins(indexed),indexed);assert.equal(habitStreak(h,indexed).count,1);
});
