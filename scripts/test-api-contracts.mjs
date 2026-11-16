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
test('caller cancellation is preserved',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(request('habits',{signal:controller.signal}),{name:'AbortError'});
});
test('demo honors actual group, decimal, invite and role contracts',async()=>{
 const values=new Map();globalThis.location={search:'?demo=1',origin:'https://pace.test'};
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const api=await import('../src/lib/api.js?demo-contracts');
 const {group}=await api.createGroup({name:'Ritim',habit_name:'Kısa yürüyüş',tracking:'quantity',target:.25,unit:'km'});
 const detail=await api.getGroup(group.id);assert.equal(detail.habits[0].target,.25);
 const {invite}=await api.createGroupInvite(group.id,{invite_type:'link'});
 assert.equal((await api.getInvitePreview(invite.token)).invite.group_id,group.id);
 await assert.rejects(api.getInvitePreview('unknown'),{status:404});
 const h=detail.habits[0],key=crypto.randomUUID();
 const {checkin}=await api.setGroupCheckin(group.id,h.id,'2026-01-01',{value:.25,expected_revision:0,idempotency_key:key});
 assert.equal(checkin.revision,1);
 assert.equal((await api.setGroupCheckin(group.id,h.id,'2026-01-01',{value:.25,expected_revision:0,idempotency_key:key})).checkin.revision,1);
 await assert.rejects(api.setGroupCheckin(group.id,h.id,'2026-01-01',{value:.5,expected_revision:0,idempotency_key:crypto.randomUUID()}),{status:409});
 const demoGroup='demo-group-morning';
 await api.transferGroup(demoGroup,'user-ayse');
 await assert.rejects(api.createGroupHabit(demoGroup,{name:'Yetkisiz',tracking:'check',target:1}),{status:403});
});
