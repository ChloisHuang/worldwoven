import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createChinaGuardSlot,guardHandoffBoundary,guardPatrolCoverage} from '../source/game/china-guard-slot.js';
import {PALACE_GUARD_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
test('patrol slot keeps reviewer, personal identity, explicit vacancy and player tenure distinct',()=>{
 const people=new Map(['cn-archery','cn-range-warden','cn-new-guard','cn-controlled'].map(id=>[id,{station:{id},alive:true}]));let boundary={atHandoff:true},failed=false,hired=false;
 const make=saved=>createChinaGuardSlot({saved,resolveActor:id=>people.get(id),canAssign:id=>id!=='cn-controlled',canRelease:()=>guardHandoffBoundary(boundary),isPlayerHired:()=>hired,saveState:()=>!failed});
 const slot=make();assert.equal(slot.resolve().actor,people.get('cn-archery'));
 for(const id of ['player','cn-range-warden','cn-controlled'])assert.equal(slot.assign(id).ok,false);
 for(const key of ['heldBow','flyingArrow','targetArrows','playerLesson','playerDuty','meeting','personalTrip']){boundary={atHandoff:true,[key]:true};assert.equal(slot.assign('cn-new-guard').code,'handoff-pending');}
 boundary={};assert.equal(slot.assign(null).code,'handoff-pending');boundary={atHandoff:true};failed=true;assert.equal(slot.assign(null).code,'save-failed');assert.equal(slot.state().holderId,'cn-archery');failed=false;
 assert(slot.assign('cn-new-guard').ok);assert.equal(people.get('cn-archery').station.id,'cn-archery');assert.equal(slot.resolve().actor,people.get('cn-new-guard'));
 people.get('cn-new-guard').alive=false;assert.equal(slot.resolve().status,'inactive');assert(slot.assign(null).ok);assert.equal(make(slot.state()).resolve().status,'vacant');assert.equal(make({...slot.state(),holderId:undefined}).resolve().holderId,null);
 hired=true;assert.equal(slot.assign('cn-archery').code,'player-tenure-owns-role');hired=false;assert.equal(slot.assign('cn-archery',{expectedRevision:0}).ok,false);assert(slot.assign('cn-archery').ok);
});
test('only physical patrol work by same current live assigned body is coverage',()=>{
 const actor={station:{id:'cn-archery'},alive:true},assignment={roleId:ROLE.id,slotId:ROLE.slotId,status:'npc',alive:true,available:true,actor,holderId:'cn-archery',revision:4},sample={actorId:'cn-archery',kind:'patrol-travel',seconds:.1};
 const coverage=(a=assignment,s=sample,extra={})=>guardPatrolCoverage({assignment:a,actor,sample:s,...extra});
 assert.equal(coverage().length,1);assert.equal(coverage(assignment,{...sample,kind:'patrol-observe'}).length,1);
 for(const kind of ['aim','flight','fetch','rack','ready','handover','relief','yielding','conversation','practice'])assert.deepEqual(coverage(assignment,{...sample,kind}),[]);
 for(const seconds of [0,-1,.3,NaN])assert.deepEqual(coverage(assignment,{...sample,seconds}),[]);
 for(const patch of [{alive:false},{available:false},{status:'player'},{status:'vacant'},{actor:{}},{holderId:'cn-range-warden'},{revision:-1},{slotId:'other'}])assert.deepEqual(coverage({...assignment,...patch}),[]);
 assert.deepEqual(coverage(assignment,sample,{dt:.25}),[],'partial final work slice cannot count as a full observed frame');assert.deepEqual(coverage(assignment,sample,{playerDuty:true}),[]);actor.alive=false;assert.deepEqual(coverage(),[]);
});
test('original patrol rate produces only observed personal income; practice and reload earn none',()=>{
 let stored;const ledger=createNPCDutyAccount({role:ROLE,namespace:'chinaGuardAccount',saveState:s=>{stored=s;return true;}}),actor={station:{id:'cn-archery'}},assignment={roleId:ROLE.id,slotId:ROLE.slotId,status:'npc',alive:true,available:true,actor,holderId:'cn-archery',revision:0};
 assert.deepEqual(ledger.account('cn-archery'),{cash:0,bank:0});assert.equal(ledger.hasIncome('cn-archery'),false);
 let seconds=0;for(let i=0;i<10000;i++){seconds+=.1;ledger.observe({seconds,dt:.1,coverage:guardPatrolCoverage({assignment,actor,sample:{actorId:'cn-archery',kind:i<5000?'patrol-travel':'aim',seconds:.1}})});}
 assert(ledger.checkpoint({day:0,hour:18}));assert.equal(ledger.account('cn-archery').bank,11);assert.equal(ledger.snapshot().receipts.length,1);assert.equal(ledger.account('cn-range-warden').bank,0);
 const reload=createNPCDutyAccount({role:ROLE,namespace:'chinaGuardAccount',saved:stored,saveState:()=>true});reload.observe({seconds:20000,dt:.1,coverage:[]});assert(reload.checkpoint({day:1,hour:18}));assert.equal(reload.account('cn-archery').bank,11);assert.equal(reload.snapshot().receipts.length,1);
});

test('five-second main coordinator seals only on the first check after 18:00',()=>{
 const ledger=createNPCDutyAccount({role:ROLE,namespace:'chinaGuardAccount',saveState:()=>true}),coverage=[{actorId:'cn-archery',roleId:ROLE.id,slotId:ROLE.slotId,holderRevision:0}];let next=0;
 for(let i=1;i<=2760;i++){const seconds=i*.25,hour=(600+seconds*.7)/60;ledger.observe({seconds,dt:.25,coverage});if(seconds>=next){next=seconds+5;assert(ledger.checkpoint({day:0,hour}));}}
 assert.equal(next,690.25);assert.equal(ledger.account('cn-archery').bank,0,'690.00 is before the first eligible scheduled seal');
 const seconds=690.25;ledger.observe({seconds,dt:.25,coverage});assert(seconds>=next);assert(ledger.checkpoint({day:0,hour:(600+seconds*.7)/60}));assert.equal(ledger.snapshot().receipts.length,1);assert(ledger.account('cn-archery').bank>0);
 assert(ledger.checkpoint({day:0,hour:(600+seconds*.7)/60}));assert.equal(ledger.snapshot().receipts.length,1);
});
