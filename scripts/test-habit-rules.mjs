import assert from 'node:assert/strict';
import {scheduled,dueToday,goalFor,stateFor,settingsAt} from '../assets/js/rules.js';
import * as server from '../functions/api/[[path]].js';
const base={id:'h',name:'Read',start_date:'2026-10-19',tracking:'quantity',direction:'at_least',target:10,unit:'min',schedule:{type:'daily'},progression:{enabled:true,step:2,cap:null},debt:{enabled:true},paused:false,archived_at:null};
const version=(effective_from,settings)=>({effective_from,settings:{...base,...settings}});
const logs=[{habit_id:'h',habit_date:'2026-10-19',value:10}];
async function patch(body){const writes=[];const row={id:'h',...base,paused:1,schedule_type:'daily',schedule_days:'[]',times_per_week:null,progression_enabled:1,progression_step:2,progression_cap:null,debt_enabled:1,debt_cap:null};const db={prepare(sql){return {bind(...args){this.args=args;return this},async first(){return row},async run(){writes.push({sql,args:this.args});return {meta:{changes:1}}}}},async batch(statements){for(const statement of statements)await statement.run()}};await server.updateHabit(new Request('https://pace.test/api/habits/h',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{id:'u'},{DB:db},'h');return writes}
const lifecycle={...base,versions:[version('2026-10-19',{}),version('2026-10-20',{paused:true}),version('2026-10-22',{paused:false})]};
const tests=[
 ['server normalizes disabled cap and check direction',()=>{const s=server.settingsFrom({...base,tracking:'check',direction:'at_most',progression:{enabled:false,cap:1}});assert.equal(s.direction,'at_least');assert.equal(s.progression.cap,null)}],
 ['lifecycle PATCH writes full dated configuration',async()=>{const writes=await patch({paused:false,effective_from:'2026-10-22'}),v=writes.find(w=>w.sql.includes('INSERT INTO habit_versions'));assert.ok(v);const settings=JSON.parse(v.args[4]);assert.equal(v.args[3],'2026-10-22');assert.equal(settings.paused,false);assert.equal(settings.target,10);assert.equal(settings.progression.step,2)}],
 ['normal settings PATCH retains pause',async()=>{const writes=await patch({name:'Renamed',effective_from:'2026-10-22'}),v=writes.find(w=>w.sql.includes('INSERT INTO habit_versions'));assert.equal(JSON.parse(v.args[4]).paused,true)}],
 ['pause excludes planned days',()=>assert.equal(scheduled(lifecycle,'2026-10-20'),false)],
 ['resume continues progression without pause debt',()=>assert.equal(goalFor(lifecycle,'2026-10-22',logs),12)],
 ['resume retains debt from before pause only',()=>{const h={...base,versions:[version('2026-10-19',{}),version('2026-10-21',{paused:true}),version('2026-10-24',{paused:false})]};assert.equal(goalFor(h,'2026-10-24',logs),26)}],
 ['rename does not reset progression or debt',()=>{const h={...base,versions:[version('2026-10-19',{}),version('2026-10-21',{name:'Reading'})]};assert.equal(goalFor(h,'2026-10-21',logs),26)}],
 ['normalizing disabled progression does not reset debt',()=>{const h={...base,versions:[version('2026-10-19',{progression:{enabled:false,step:0,cap:50}}),version('2026-10-21',{name:'Read again',progression:{enabled:false,step:0,cap:null}})]};assert.equal(goalFor(h,'2026-10-21',logs),20)}],
 ['legacy version does not inherit current pause/archive',()=>{const {paused,archived_at,...legacy}=base;const h={...base,paused:true,archived_at:'2026-10-22',versions:[{effective_from:'2026-10-19',settings:legacy}]};assert.equal(scheduled(h,'2026-10-19'),true)}],
 ['dated archive retains past expectations',()=>{const h={...base,archived_at:'2026-10-22',versions:[version('2026-10-19',{}),version('2026-10-22',{archived_at:'2026-10-22'})]};assert.equal(scheduled(h,'2026-10-21'),true);assert.equal(scheduled(h,'2026-10-22'),false)}],
 ['future start never due',()=>assert.equal(dueToday({...base,start_date:'2026-11-01'},'2026-10-26',[]),false)],
 ['completed weekly rows remain due',()=>{const h={...base,tracking:'check',schedule:{type:'weekly_quota',times_per_week:1},debt:{enabled:false}};assert.equal(dueToday(h,'2026-10-20',logs),true)}],
 ['weekly debt caps quota at seven',()=>{const h={...base,tracking:'check',schedule:{type:'weekly_quota',times_per_week:5}};assert.equal(stateFor(h,'2026-11-02',[]).goal,7)}],
 ['fully paused week adds no weekly debt',()=>{const settings={tracking:'check',schedule:{type:'weekly_quota',times_per_week:3}};const h={...base,...settings,versions:[version('2026-10-19',{...settings,paused:true}),version('2026-10-26',settings)]};assert.equal(stateFor(h,'2026-10-26',[]).goal,3)}],
 ['future-start weekly records are not completed sessions',()=>{const h={...base,start_date:'2026-10-22',tracking:'check',schedule:{type:'weekly_quota',times_per_week:3}};assert.equal(stateFor(h,'2026-10-22',logs).actual,0)}],
 ['explicit zero completes at-most weekly quantity',()=>{const h={...base,direction:'at_most',schedule:{type:'weekly_quota',times_per_week:1},debt:{enabled:false}};assert.equal(stateFor(h,'2026-10-19',[{habit_id:'h',habit_date:'2026-10-19',value:0}]).actual,1)}],
 ['dated target edits preserve previous settings',()=>{const h={...base,target:20,versions:[version('2026-10-19',{}),version('2026-10-22',{target:20})]};assert.equal(settingsAt(h,'2026-10-20').target,10);assert.equal(goalFor(h,'2026-10-22',[]),20)}],
];
let failed=0;for(const [name,run] of tests){try{await run();console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+': '+e.message)}}if(failed)process.exitCode=1;
