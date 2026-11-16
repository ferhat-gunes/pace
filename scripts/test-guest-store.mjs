import test from 'node:test';import assert from 'node:assert/strict';
const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const {guestRequest,guestBackup,clearGuest}=await import('../src/lib/guest-store.js');
test('isolated guest habits, precise records, history and explicit cleanup',async()=>{
 const {habit}=await guestRequest('habits',{method:'POST',body:JSON.stringify({name:'Yerel',tracking:'quantity',direction:'at_least',target:.25,unit:'km',schedule:{type:'daily'},progression:{enabled:false},debt:{enabled:false},start_date:'2026-11-01'})});
 await guestRequest(`habits/${habit.id}/check-ins/2026-11-16`,{method:'PUT',body:JSON.stringify({value:.25,expected_revision:0,idempotency_key:'one'})});
 await guestRequest(`habits/${habit.id}`,{method:'PATCH',body:JSON.stringify({target:.5,effective_from:'2026-12-01'})});
 const data=guestBackup();assert.equal(data.habits.length,1);assert.equal(data.habits[0].versions.length,2);assert.equal(data.checkins[0].value,.25);
 values.set('pace_entry_drafts_v2:guest-local',JSON.stringify([{id:habit.id,day:'2026-11-16',value:.75,deleted:false}]));assert.equal(guestBackup().checkins[0].value,.75);
 values.set('pace_cache_v2:someone-else','private');clearGuest();assert.equal(guestBackup().habits.length,0);assert.equal(values.get('pace_cache_v2:someone-else'),'private');
});
