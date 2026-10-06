import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createChinaRangeWardenSlot,RANGE_WARDEN_ROLE as ROLE,rangeWardenPatrolCoverage as coverage} from '../source/game/china-range-warden-slot.js';
import {guardPatrolCoverage} from '../source/game/china-guard-slot.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
test('warden appointment and observed wages are separate from patrol and start at zero',()=>{
 const people=new Map(['cn-range-warden','cn-archery','cn-new-warden'].map(id=>[id,{station:{id},alive:true}]));let saved;
 const options={resolveActor:id=>people.get(id),canAssign:()=>true,canRelease:()=>({ok:true}),getPatrolHolderId:()=> 'cn-archery',saveState:s=>{saved=s;return true;}};
 const slot=createChinaRangeWardenSlot(options),actor=people.get('cn-range-warden'),assignment=slot.resolve(),sample={actorId:'cn-range-warden',kind:'patrol-travel',seconds:.1};
 assert.equal(slot.assign('player').ok,false);assert.equal(slot.assign('cn-archery').ok,false);
 assert.equal(coverage({assignment,actor,sample}).length,1);assert.deepEqual(guardPatrolCoverage({assignment,actor,sample}),[]);
 for(const kind of ['aim','flight','ready','handover','relief','conversation','blocked'])assert.deepEqual(coverage({assignment,actor,sample:{...sample,kind}}),[]);
 for(const patch of [{alive:false},{available:false},{revision:-1},{status:'vacant'},{actor:{}},{holderId:'cn-archery'}])assert.deepEqual(coverage({assignment:{...assignment,...patch},actor,sample}),[]);
 const accounts=createNPCDutyAccount({role:ROLE,namespace:'chinaRangeWardenAccounts',saveState:()=>true});assert.deepEqual(accounts.account('cn-range-warden'),{cash:0,bank:0});
 for(let i=1;i<=7000;i++)accounts.observe({seconds:i*.1,dt:.1,coverage:coverage({assignment,actor,sample})});accounts.checkpoint({day:0,hour:19});assert(accounts.account('cn-range-warden').bank>=6);assert.deepEqual(accounts.account('cn-archery'),{cash:0,bank:0});
 assert(slot.assign('cn-new-warden').ok);assert.equal(createChinaRangeWardenSlot({...options,saved}).resolve().holderId,'cn-new-warden');assert(slot.assign(null).ok);assert.equal(slot.resolve().status,'vacant');
});
