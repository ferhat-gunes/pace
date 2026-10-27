import assert from 'node:assert/strict';
import {normalizeHabitForm as normalize, describeHabitRules as describe} from '../assets/js/habit-form.js';

const base={name:' Oku ',tracking:'quantity',direction:'at_least',target:20,unit:' dakika ',scheduleType:'daily',days:[1,3,5],quota:3,progressionEnabled:false,step:1,cap:'',debtEnabled:false,debtCap:''};
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name)}
function invalid(patch,field){assert.throws(()=>normalize({...base,...patch}),e=>e instanceof Error&&e.field===field)}
test('daily defaults normalize without mutating input',()=>{const p=normalize(base);assert.equal(p.name,'Oku');assert.equal(p.unit,'dakika');assert.deepEqual(p.schedule,{type:'daily',days:[],times_per_week:null});assert.equal(base.name,' Oku ')});
test('check ignores hidden stale fields and uses effective direction for weekly debt',()=>{const p=normalize({...base,tracking:'check',direction:'at_most',target:'bad',unit:'x'.repeat(30),progressionEnabled:true,step:-2,cap:-4,scheduleType:'weekly_quota',debtEnabled:true});assert.equal(p.direction,'at_least');assert.equal(p.target,1);assert.equal(p.unit,'');assert.deepEqual(p.progression,{enabled:false,step:0,cap:null});assert.equal(p.debt.enabled,true)});
test('disabled progression and debt discard stale caps',()=>{const p=normalize({...base,cap:-3,debtCap:-8});assert.equal(p.progression.cap,null);assert.equal(p.debt.cap,null)});
test('at-most quantity disables stale carryover',()=>assert.deepEqual(normalize({...base,direction:'at_most',debtEnabled:true,debtCap:-9}).debt,{enabled:false,cap:null}));
test('check daily disables carryover',()=>assert.equal(normalize({...base,tracking:'check',debtEnabled:true}).debt.enabled,false));
test('selected days deduplicate and inactive quota is ignored',()=>assert.deepEqual(normalize({...base,scheduleType:'weekdays',days:[1,1,0],quota:0}).schedule,{type:'weekdays',days:[1,0],times_per_week:null}));
test('selected days reject empty or invalid choices',()=>{for(const days of [[],[7],[1.5],['bad']])invalid({scheduleType:'weekdays',days},'weekday-picker')});
test('quota requires integer one through seven only when active',()=>{for(const quota of ['',0,8,2.5,Infinity])invalid({scheduleType:'weekly_quota',quota},'habit-quota');assert.equal(normalize({...base,quota:'bad'}).schedule.times_per_week,null)});
test('name and unit length validation',()=>{invalid({name:'  '},'habit-name');invalid({name:'x'.repeat(61)},'habit-name');invalid({unit:'x'.repeat(21)},'habit-unit');assert.equal(normalize({...base,unit:''}).unit,'')});
test('decimal targets and upper bounds',()=>{assert.equal(normalize({...base,target:'0.25'}).target,.25);assert.equal(normalize({...base,target:1e6}).target,1e6);for(const target of ['',0,-1,NaN,Infinity,1000001])invalid({target},'habit-target')});
test('progression +1 and +5 retain active cap',()=>{for(const step of [1,5])assert.deepEqual(normalize({...base,progressionEnabled:true,step,cap:30}).progression,{enabled:true,step,cap:30})});
test('active step and cap validation including explicit zero',()=>{for(const step of ['',0,-1,Infinity,1000001])invalid({progressionEnabled:true,step},'progressive-step');for(const cap of [0,19,Infinity,1000001])invalid({progressionEnabled:true,cap},'progressive-cap');assert.equal(normalize({...base,progressionEnabled:true,cap:''}).progression.cap,null)});
test('carryover zero cap is retained and invalid limits reject',()=>{assert.equal(normalize({...base,debtEnabled:true,debtCap:0}).debt.cap,0);for(const debtCap of [-1,Infinity,1000001])invalid({debtEnabled:true,debtCap},'debt-cap')});
test('descriptions separate weekly quantity from quota and match cadence',()=>{const text=describe(normalize({...base,scheduleType:'weekly_quota',progressionEnabled:true,step:5,cap:40,debtEnabled:true}));assert.match(text,/3/);assert.match(text,/20 dakika/);assert.match(text,/hafta.*\+5/i);assert.match(text,/40/);assert.match(text,/7/);assert.match(text,/gün/)});
test('check description excludes stale quantity and progression',()=>{const text=describe(normalize({...base,tracking:'check',progressionEnabled:true,step:5,cap:30}));assert.match(text,/Her gün/);assert.doesNotMatch(text,/20|dakika|\+5|30/)});
test('selected day and progressive daily descriptions are explicit',()=>{const text=describe(normalize({...base,scheduleType:'weekdays',days:[1,3],progressionEnabled:true,step:1,debtEnabled:true,debtCap:0}));assert.match(text,/Pzt.*Çar/);assert.match(text,/planlı günde \+1/);assert.match(text,/miktar/);assert.match(text,/0/)});
console.log(`${count} habit form tests passed.`);
