// Host breaks must drain only admitted, physically present registration waits.
// New requests and checkpoint reloads cannot turn a queued request into consent.
import assert from 'node:assert/strict';
import {createChinaTavernService} from '../source/game/china-tavern-service.js';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createChinaTavernEmployment} from '../source/game/china-tavern-employment.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';

function fixture(kind) {
 const flags={phase:'open',visible:true,mounted:null,hired:false},messages=[];
 const player={walking:false,ageYears:26,root:{position:{x:22.35,y:.215,z:6.7},rotation:{y:0}}};
 const host={walking:false,root:{position:{x:24.1,y:.215,z:6.4}},station:{npcPosition:[24.1,.215,6.4]}};
 let service,writes=0,revision=0;
 const gates={hostAdmissionOpen:()=>flags.phase==='open',hostCompletionAvailable:()=>flags.phase!=='away',hostUnavailableReason:()=> '许安正在用餐，回案后再办理',active:()=>false};
 const careers={isHired:()=>flags.hired,workState:()=>({revision}),state:()=>({revision}),applicationResult:()=>null,
  apply(){writes++;revision++;return {ok:true};},beginDutyAvailability:()=>({ok:true})};
 const ledger=createCurrencyLedger({saveState:()=>{}});
 const employment=createChinaTavernEmployment({saveState(){writes++;},meetHost:()=>service.meetRegistrationHost(),getJob:()=>service.view().job});
 if(kind==='service') {
  const scene={...gates,snapshot:()=>null,state:()=>({}),choices:()=>[],finished:()=>false,stopActivity(){}};
  service=createChinaTavernService({meal:{staffScene:scene,view:()=>({order:null})},careers,host,getPlayer:()=>player,getMounted:()=>flags.mounted,canSee:()=>flags.visible,getClock:()=>({day:1,hour:10}),notify:m=>messages.push(m),document:null});
 } else service=createChinaTavernLabor({serviceAdapter:()=>gates,employment,careers,host,getPlayer:()=>player,getMounted:()=>flags.mounted,canSee:()=>flags.visible,copperLedger:ledger,notify:m=>messages.push(m),document:null});
 const request=()=>service.intent(kind==='service'?'formal-apply':'apply');
 return {service,flags,player,host,messages,employment,ledger,request,get writes(){return writes;},away(){host.root.position.x=25;},home(){host.root.position.x=24.1;}};
}
function originalCheckpoint(kind){const f=fixture(kind);f.away();assert(f.service.executeIntent(f.request()));return f.service.snapshot();}
for(const kind of ['service','labor']) {
 const old=fixture(kind);old.away();assert(old.service.executeIntent(old.request()));
 assert(old.service.hasPresentHostMeeting());assert.equal(old.service.snapshot().waitingRegistrationAccepted,true);
 old.flags.phase='draining';old.home();old.service.update(.1);old.service.update(.1);
 assert.equal(old.writes,1,kind+' drains a previously admitted request once');assert(!old.service.hasPresentHostMeeting());

 // The saved marker separates new waits from accepted requests through reload.
 for(const accepted of [true,false,'legacy']) {
  const original=fixture(kind);original.away();if(accepted===false)original.flags.phase='draining';
  assert(original.service.executeIntent({...original.request(),accepted:true,waitingRegistrationAccepted:true},true));
  const checkpoint=original.service.snapshot();if(accepted==='legacy')delete checkpoint.waitingRegistrationAccepted;
  const restored=fixture(kind);restored.flags.phase='draining';assert(restored.service.restore(checkpoint));
  assert.equal(restored.service.hasPresentHostMeeting(),accepted!==false);
  restored.service.update(.1);assert.equal(restored.writes,accepted===false?0:1,kind+' honors '+accepted+' checkpoint');
  if(accepted===false){assert.equal(restored.service.snapshot().waitingRegistrationAccepted,false);restored.flags.phase='open';restored.service.update(.1);assert.equal(restored.writes,1);}
 }

 const invalid=fixture(kind),malformed=originalCheckpoint(kind);malformed.waitingRegistrationAccepted='false';assert.equal(invalid.service.restore(malformed),false);
 const away=fixture(kind);away.away();assert(away.service.executeIntent(away.request()));away.home();away.flags.phase='away';away.service.update(.1);
 assert.equal(away.writes,0,kind+' cannot complete when host is away despite a stale home position');
 away.flags.phase='draining';away.service.update(.1);assert.equal(away.writes,1);

 for(const absent of ['distance','floor','mounted','hidden']) {
  const f=fixture(kind);f.away();assert(f.service.executeIntent(f.request()));f.flags.phase='draining';f.home();
  if(absent==='distance')f.player.root.position.x=19;
  if(absent==='floor')f.player.root.position.y=4.015;
  if(absent==='mounted')f.flags.mounted={id:'chair'};
  if(absent==='hidden')f.flags.visible=false;
  assert(!f.service.hasPresentHostMeeting(),kind+' does not hold draining for '+absent+' player');
  f.service.update(.1);assert.equal(f.writes,0);assert.equal(f.service.snapshot().waitingRegistration,null);
  assert.equal(f.service.snapshot().waitingRegistrationAccepted,false);
 }
 const stale=fixture(kind);stale.away();assert(stale.service.executeIntent(stale.request()));const cp=stale.service.snapshot();cp.waitingRegistration.intentKey+=':stale';
 const reload=fixture(kind);assert(reload.service.restore(cp));assert(!reload.service.hasPresentHostMeeting());reload.service.update(.1);assert.equal(reload.writes,0);

 const direct=fixture(kind);direct.flags.phase='draining';assert(direct.service.executeIntent(direct.request()));
 assert(!direct.service.hasPresentHostMeeting());assert.equal(direct.writes,0);assert(direct.messages.some(m=>m.includes('正在用餐')));
 if(kind==='labor') {
  assert.equal(direct.service.meetHost(.9,true),false,'public meetHost cannot forge completion');
  assert.equal(direct.employment.apply(),false,'direct employment mutation must also obey admission');
 } else {
  direct.flags.hired=true;assert.equal(direct.service.accept(),false,'direct begin-shift admission closes during draining');
  assert.equal(direct.service.hostAdmissionOpen(),false);assert.equal(direct.service.hostCompletionAvailable(),true);assert.match(direct.service.hostUnavailableReason(),/正在用餐/);
 }
 assert.equal(direct.writes,0);assert.equal(direct.ledger.state().bank,0);
}
// A finished job is a durable wage receipt, not a previously admitted meeting.
// Reject new acceptance/inspection during draining without altering that receipt.
for(const ready of [false,true]) {
 const gate={hostAdmissionOpen:()=>false,hostCompletionAvailable:()=>true,hostUnavailableReason:()=> '许安正在用餐，回案后再办理',active:()=>false};
 const player={root:{position:{x:22.35,y:.215,z:6.7}}},host={walking:false,root:{position:{x:24.1,y:.215,z:6.4}},station:{npcPosition:[24.1,.215,6.4]}};
 const ledger=createCurrencyLedger({saveState:()=>{}}),job=ready?{id:'cn-tavern-labor-1',receiptId:'cn-tavern-labor-1',stage:'ready',completedTables:2}:null;
 let writes=0;
 const labor=createChinaTavernLabor({serviceAdapter:()=>gate,getPlayer:()=>player,host,employment:{isHired:()=>true,state:()=>({revision:1})},copperLedger:ledger,saved:{version:2,serial:ready?1:0,job},saveState:()=>{writes++;},document:null});
 assert.equal(ready?labor.claim():labor.accept(),false);assert.equal(writes,0);assert.deepEqual(labor.view().job,job);assert.equal(ledger.state().bank,0);
 if(ready) {
  const serviceJob={id:job.id,receiptId:job.receiptId,formalRoleId:'cn-tavern-steward',stage:'inspection',coveredSeconds:5,completedTasks:2};
  const scene={...gate,snapshot:()=>null,restoreWorld(){},state:()=>({})};
  const careers={isHired:()=>true,workState:()=>({revision:1,lastDuty:{workReceiptId:job.id,stage:'inspection'}}),laborEvent(){writes++;return {ok:true};}};
  const service=createChinaTavernService({meal:{staffScene:scene},careers,host,getPlayer:()=>player,saved:{version:1,serial:1,job:serviceJob},saveState:()=>{writes++;},document:null});
  assert.equal(service.claim(),false);assert.equal(writes,0);assert.deepEqual(service.state().job.receiptId,job.id);
 }
}
console.log('PASS host registration gates: pre-break drain, new wait, legacy/marked reload, away/presence/LOS gates and unforgeable public admission');
