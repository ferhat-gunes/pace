import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/[[path]].js';
const setup=()=>{
 const db=new DatabaseSync(':memory:');
 for(const f of ['0001_initial.sql','0002_password_accounts.sql','0003_checkin_tombstones.sql','0004_groups_and_social.sql'])db.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
 const statement=(sql,args=[])=>({bind(...a){return statement(sql,a)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}});
 const env={AUTH_SECRET:'local-test-secret-not-production',DB:{prepare:sql=>statement(sql),async batch(stmts){db.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}}};
 const call=async(path,{method='GET',body,token}={})=>{const response=await onRequest({env,params:{path},request:new Request('https://pace.test/api/'+path,{method,headers:{Origin:'https://pace.test','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})})});return {status:response.status,headers:response.headers,data:await response.json()}};
 return {db,call};
};
test('real password/session/recovery handlers and two-account group isolation',async()=>{
 const {db,call}=setup();
 try{
  const password='Test-password-5678';
  const register=await call('auth/register',{method:'POST',body:{email:'owner@example.test',password}});
  assert.equal(register.status,200);const owner=register.data;assert.ok(owner.recovery_code);assert.ok(owner.token);assert.match(register.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.notEqual(db.prepare('SELECT password_hash FROM credentials WHERE user_id=?').get(owner.user.id).password_hash,password);
  assert.notEqual(db.prepare('SELECT token_hash FROM sessions WHERE user_id=?').get(owner.user.id).token_hash,owner.token);
  assert.equal((await call('auth/login',{method:'POST',body:{email:'owner@example.test',password:'Wrong-password-123'}})).status,401);
  const member=(await call('auth/register',{method:'POST',body:{email:'member@example.test',password}})).data;
  const group=(await call('groups',{method:'POST',token:owner.token,body:{name:'Ortak hedef',habit_name:'Oku',tracking:'quantity',target:20,unit:'sayfa'}})).data.group;
  const invite=(await call(`groups/${group.id}/invites`,{method:'POST',token:owner.token,body:{invite_type:'link'}})).data.invite;
  assert.equal((await call(`invites/${invite.token}/respond`,{method:'POST',token:member.token,body:{action:'accept'}})).status,200);
  const detail=(await call(`groups/${group.id}`,{token:member.token})).data;
  assert.equal(detail.members.length,2);assert.ok(!JSON.stringify(detail.members).includes('owner@example.test'));
  assert.equal((await call(`groups/${group.id}/habits`,{method:'POST',token:member.token,body:{name:'No',tracking:'check',target:1}})).status,403);
  const habit=detail.habits[0];
  for(const user of [owner,member]){
   const saved=await call(`groups/${group.id}/habits/${habit.id}/check-ins/2026-11-16`,{method:'PUT',token:user.token,body:{value:20,expected_revision:0,idempotency_key:crypto.randomUUID(),user_id:owner.user.id}});
   assert.equal(saved.status,201);
  }
  assert.equal(db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM group_checkins').get().n,2);
  const recovery=await call('auth/recover',{method:'POST',body:{email:owner.user.email,password:'New-password-2345',recovery_code:owner.recovery_code}});
  assert.equal(recovery.status,200);assert.notEqual(recovery.data.recovery_code,owner.recovery_code);
  assert.equal((await call('habits',{token:owner.token})).status,401);
  assert.equal((await call('auth/recover',{method:'POST',body:{email:owner.user.email,password:'Next-password-3456',recovery_code:owner.recovery_code}})).status,401);
  assert.equal((await call('auth/login',{method:'POST',body:{email:owner.user.email,password:'New-password-2345'}})).status,200);
 }finally{db.close()}
});
