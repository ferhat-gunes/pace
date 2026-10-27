import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadGuard,mergeCheckins} from '../assets/js/state-sync.js';
const log=(value,revision,deleted=0)=>({habit_id:'a',habit_date:'2026-10-27',value,revision,deleted});
test('late GET cannot replace accepted newer PUT or remove tombstone',()=>{const current=[log(0,5,1)];assert.deepEqual(mergeCheckins(current,[log(8,4)]),current);assert.deepEqual(mergeCheckins(current,[]),current);assert.equal(mergeCheckins(current,[log(2,6)])[0].value,2)});
test('different records merge and old write response cannot replace refreshed newer value',()=>{const b={...log(4,1),habit_id:'b'};const result=mergeCheckins([log(10,8)],[log(3,7),b]);assert.equal(result.length,2);assert.equal(result.find(x=>x.habit_id==='a').value,10)});
test('older load is rejected after newer request begins regardless of completion order',()=>{const guard=createLoadGuard();const a=guard.begin(),b=guard.begin();assert.equal(guard.isCurrent(a),false);assert.equal(guard.isCurrent(b),true)});
test('session reset rejects old successes and failures even after same account logs in again',()=>{const guard=createLoadGuard(),old=guard.begin();guard.reset();const current=guard.begin();assert.equal(guard.isCurrent(old),false);assert.equal(guard.isCurrent(current),true);guard.reset();assert.equal(guard.isCurrent(current),false)});
