import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/[[path]].js';
const setup=()=>{
 const db=new DatabaseSync(':memory:');
 for(const f of ['0001_initial.sql','0002_password_accounts.sql','0003_checkin_tombstones.sql','0004_groups_and_social.sql','0005_social_reactions_and_gamification.sql','0006_web_push.sql'])db.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
 const statement=(sql,args=[])=>({bind(...a){return statement(sql,a)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}});
 const env={AUTH_SECRET:'local-test-secret-not-production',DB:{prepare:sql=>statement(sql),async batch(stmts){db.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}}};
 const call=async(path,{method='GET',body,token}={})=>{const response=await onRequest({env,params:{path},request:new Request('https://pace.test/api/'+path,{method,headers:{Origin:'https://pace.test','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})})});return {status:response.status,headers:response.headers,data:await response.json()}};
 return {db,call};
};

test('preserved gamification, reactions, inbox and account settings use real handlers',async()=>{
 const {db,call}=setup();
 try{
  const password='Merged-password-123';
  const owner=(await call('auth/register',{method:'POST',body:{email:'owner@merge.test',password}})).data;
  const member=(await call('auth/register',{method:'POST',body:{email:'member@merge.test',password}})).data;
  assert.equal((await call('auth/capabilities')).status,200);
  assert.equal((await call('push/public-key')).data.public_key,null);
  const group=(await call('groups',{method:'POST',token:owner.token,body:{name:'Birleşen grup'}})).data.group;
  const invite=(await call(`groups/${group.id}/invites`,{method:'POST',token:owner.token,body:{invite_type:'link'}})).data.invite;
  await call(`invites/${invite.token}/respond`,{method:'POST',token:member.token,body:{action:'accept'}});
  const reaction=await call(`groups/${group.id}/reactions`,{method:'POST',token:owner.token,body:{target_user_id:member.user.id,reaction_type:'cheer',emoji:'👏',habit_date:'2026-11-16'}});
  assert.equal(reaction.status,201);assert.ok(reaction.data.reaction.id);
  const detail=await call(`groups/${group.id}`,{token:member.token});assert.equal(detail.data.reactions.length,1);
  const inbox=await call('social/inbox',{token:member.token});assert.equal(inbox.data.items.length,1);
  assert.equal((await call(`social/inbox/${inbox.data.items[0].id}/read`,{method:'POST',token:member.token,body:{}})).status,200);
  assert.equal((await call('social/inbox',{token:member.token})).data.items.length,0);
  const saved=await call('gamification',{method:'PUT',token:owner.token,body:{xp:125,gems:15,streakFreezes:2}});assert.equal(saved.data.ok,true);
  assert.equal((await call('gamification',{token:owner.token})).data.gamification.xp,125);
  const state=await call('habits',{token:owner.token});assert.equal(state.data.gamification.xp,125);assert.equal(state.data.user.has_password,true);
  assert.equal((await call('account/password',{method:'POST',token:owner.token,body:{current_password:password,new_password:'Next-password-234'}})).data.ok,true);
  assert.ok((await call('account/recovery-code',{method:'POST',token:owner.token,body:{password:'Next-password-234'}})).data.recovery_code);
  assert.equal((await call('push/preferences',{method:'PATCH',token:owner.token,body:{daily_enabled:false}})).data.ok,true);
  assert.equal((await call('account',{method:'DELETE',token:owner.token})).data.ok,true);
  assert.equal(db.prepare('SELECT COUNT(*) as n FROM user_gamification WHERE user_id=?').get(owner.user.id).n,0);
 }finally{db.close()}
});
