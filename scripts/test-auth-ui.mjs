import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAuthResponse } from '../src/lib/auth-ui.js';
import { normalizeThemePreference, resolveThemeMode, readThemePreference } from '../src/theme/theme-state.js';
const user={id:'u1',email:'user@example.test'};
const code='ABCDEF01-23456789-ABCDEF01-23456789-ABCDEF01-23456789';
test('auth responses require a successful user identity',()=>{
  for(const payload of [{}, {ok:true}, {user}, {ok:true,user:{id:'',email:user.email}}]) assert.throws(()=>validateAuthResponse('login',payload),/doğrulamadı/);
  assert.deepEqual(validateAuthResponse('login',{ok:true,user}),{user,recoveryCode:''});
});
test('registration and recovery require the one-time replacement code',()=>{
  for(const action of ['register','recover']) {
    assert.throws(()=>validateAuthResponse(action,{ok:true,user}),/kurtarma kodunu/);
    assert.throws(()=>validateAuthResponse(action,{ok:true,user,recovery_code:'incomplete'}),/kurtarma kodunu/);
    assert.equal(validateAuthResponse(action,{ok:true,user,recovery_code:code}).recoveryCode,code);
  }
});
test('theme preference resolves against system only for system mode',()=>{
  assert.equal(normalizeThemePreference('bogus'),'system');
  assert.equal(resolveThemeMode('system',true),'dark');
  assert.equal(resolveThemeMode('system',false),'light');
  assert.equal(resolveThemeMode('light',true),'light');
  assert.equal(resolveThemeMode('dark',false),'dark');
  assert.equal(readThemePreference({getItem(){throw Error('blocked')}}),'system');
  assert.equal(readThemePreference({getItem(){return 'dark'}}),'dark');
});
