import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location={search:'',origin:'https://pace.test'};
globalThis.sessionStorage={getItem:()=>null};
const {request,validateResponse}=await import('../src/lib/api.js?contracts');
test('successful HTTP does not make malformed payload successful',async()=>{
 const original=globalThis.fetch;
 try{
  for(const response of [new Response('<html>error</html>'),new Response('{}'),new Response(JSON.stringify({error:'Service failure'}))]){
   globalThis.fetch=async()=>response;
   await assert.rejects(request('account',{method:'DELETE'}));
  }
  assert.throws(()=>validateResponse('habits','GET',{}));
  assert.throws(()=>validateResponse('habits/h/check-ins/2026-01-01','PUT',{checkin:{value:1}}));
 }finally{globalThis.fetch=original}
});
test('non-OK HTTP responses preserve structured payload.code',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,code:'USERNAME_REQUIRED',error:'Önce bir @kullaniciadi belirlemelisin.'}),{status:400,headers:{'Content-Type':'application/json'}});
  await assert.rejects(request('habits/h1/invites',{method:'POST',body:JSON.stringify({invite_type:'link'})}),err=>err instanceof Error&&err.status===400&&err.code==='USERNAME_REQUIRED');
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,code:'REQUIRES_DELETE',error:'Tek katılımcı sensin.'}),{status:409,headers:{'Content-Type':'application/json'}});
  await assert.rejects(request('habits/h1/leave',{method:'POST'}),err=>err instanceof Error&&err.status===409&&err.code==='REQUIRES_DELETE');
 }finally{globalThis.fetch=original}
});
test('caller cancellation is preserved',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(request('habits',{signal:controller.signal}),{name:'AbortError'});
});
test('demo honors unified habit, decimal, invite and participant contracts',async()=>{
 const values=new Map();globalThis.location={search:'?demo=1',origin:'https://pace.test'};
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const api=await import('../src/lib/api.js?demo-contracts');
 const {habit}=await api.request('habits',{method:'POST',body:JSON.stringify({name:'Kısa yürüyüş',tracking:'quantity',target:.25,unit:'km'})});
 assert.equal(habit.target,.25);
 const {invite}=await api.createHabitInvite(habit.id,{invite_type:'link'});
 assert.equal((await api.getInvitePreview(invite.token)).invite.habit_id,habit.id);
 await assert.rejects(api.getInvitePreview('unknown'),{status:404});
 const key=crypto.randomUUID();
 const {checkin}=await api.request(`habits/${habit.id}/check-ins/2026-01-01`,{method:'PUT',body:JSON.stringify({value:.25,expected_revision:0,idempotency_key:key})});
 assert.equal(checkin.revision,1);
 assert.equal((await api.request(`habits/${habit.id}/check-ins/2026-01-01`,{method:'PUT',body:JSON.stringify({value:.25,expected_revision:0,idempotency_key:key})})).checkin.revision,1);
 await assert.rejects(api.request(`habits/${habit.id}/check-ins/2026-01-01`,{method:'PUT',body:JSON.stringify({value:.5,expected_revision:0,idempotency_key:crypto.randomUUID()})}),{status:409});
 const deleted=await api.deleteHabit(habit.id);
 assert.equal(deleted.deleted,true);
});
