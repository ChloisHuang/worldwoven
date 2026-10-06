// Narrow dormant-unit checks: prevents invented idle wages, corrupt-ledger pay,
// repeated daily pay, and interrupted/failed-save actor/account transitions.
// Movement/contact are explicit fixtures, not 3D or browser acceptance evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {TELLER_ROLE,createTellerSlot} from '../source/game/china-teller-role.js';
import {freezeTellerSource,verifyTellerSource,tellerContract,tellerAuditProof,validateTellerAuditProof,TELLER_HOME} from '../source/game/china-teller-audit-proof.js';
import {createTellerAccount} from '../source/game/china-teller-account.js';
import {createTellerInspection} from '../source/game/china-teller-inspection.js';
const copy=structuredClone,id='cn-money-house-teller';
function ledger(){let writes=0;const l=createCurrencyLedger({saveState:()=>{writes++;return true;}});return {l,writes:()=>writes};}
function fundedLedger(){
 const f=ledger(),l=f.l;
 assert(l.creditWageToBank({amount:200,receiptId:'actual-work',roleId:'test-role',slotId:'test-slot',day:1}).ok);
 assert(l.withdraw(60,'counter-withdraw').ok);assert(l.deposit(5,'counter-deposit').ok);
 assert(l.reserve(6,'original-service').ok);
 assert(l.exchange({quote:l.quoteExchange({from:'copper',to:'japan',amount:10}).quote,requestId:'actual-exchange'}).ok);
 return f;
}
function proof(day=1,actorId=id,source=freezeTellerSource(ledger().l)){return tellerAuditProof(tellerContract(day,actorId,0,source));}
function harness({accountSaved,controllerSaved,source=ledger().l}={}){
 const h={day:1,revision:0,alive:true,missing:false,assignmentInvalid:false,canControl:true,open:false,contact:true,failController:false,failAccount:false,controllerWrites:0,accountWrites:0,poses:0,moves:0,source,storage:{}};
 h.n={station:{id},alive:true,root:{position:{x:TELLER_HOME[0],y:TELLER_HOME[1],z:TELLER_HOME[2]}}};
 h.account=createTellerAccount({saved:accountSaved,saveState:(state,receipt,patch)=>{h.accountWrites++;if(h.failAccount)return false;h.storage={...h.storage,...copy(patch),chinaTellerAccounts:copy(state)};return true;}});
 h.create=saved=>createTellerInspection({saved,getDay:()=>h.day,getActor:actorId=>!h.missing&&actorId===id?h.n:null,resolveAssignment:()=>({status:h.assignmentInvalid?'invalid':'npc',holderId:id,actor:h.n,revision:h.revision,alive:h.n.alive,available:true}),getLedger:()=>h.source,canControl:()=>h.canControl,isCounterOpen:()=>h.open,contact:()=>h.contact,economy:h.account,
 travel(n,to,dt){h.moves++;const p=n.root.position,dx=to[0]-p.x,dz=to[2]-p.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*.6);if(d){p.x+=dx/d*step;p.z+=dz/d*step;}},pose(){h.poses++;},
 saveState:s=>{h.controllerWrites++;if(h.failController)return false;h.storage.chinaTellerInspection=copy(s);return true;}});
 h.controller=h.create(controllerSaved);h.step=(count=1,context={})=>{for(let i=0;i<count;i++)h.controller.update(.25,i*.25,context);};
 h.finish=()=>{for(let i=0;i<220&&!h.account.hasIncome(id);i++)h.step();assert(h.account.hasIncome(id),'finite original work must finish');};
 return h;
}

test('strict real journal freeze verifies balances, held amounts and FX without mutating source',()=>{
 const f=fundedLedger(),before=f.l.state(),writes=f.writes(),source=freezeTellerSource(f.l),report=verifyTellerSource(source);
 assert.equal(report.transactionCount,5);assert.equal(report.throughTransaction,5);
 assert.deepEqual(report.rows[0],{currency:'copper',accountOpened:true,cash:39,bank:145,held:6,total:190,reservationIds:['original-service']});
 assert.equal(report.rows[1].cash,5);assert.equal(report.rows[2].total,0);
 assert.deepEqual(f.l.state(),before);assert.equal(f.writes(),writes);
 assert(f.l.refund('original-service').ok);assert.equal(verifyTellerSource(source).rows[0].held,6,'frozen prefix stays frozen');
 for(const mutate of [s=>s.balances.copper.bank++,s=>s.transactions[0].after.copper.bank++,s=>s.transactions[1].before.copper.cash++,s=>s.transactions[4].quote.received++,s=>s.transactions.reverse(),s=>s.transactions.pop(),s=>s.nextTransaction++]){const bad=copy(source);mutate(bad);assert.equal(verifyTellerSource(bad),null);}
 assert.equal(freezeTellerSource({loadError:'invalid-saved-state',state:()=>before}),null);
 assert.equal(freezeTellerSource({state:()=>({...before,loadError:'invalid-saved-state'})}),null);
 assert.equal(freezeTellerSource({state:()=>{throw Error('unreadable');}}),null);
});

test('interest-bearing original ledger and no-activity daily report are real read-only inputs',()=>{
 const l=createCurrencyLedger({saveState:()=>true,getClock:()=>({day:1})});
 assert(l.creditWageToBank({amount:200,receiptId:'pay',roleId:'role',slotId:'slot',day:1}).ok);
 assert(l.observeDay(3).ok);const s=freezeTellerSource(l);assert.equal(verifyTellerSource(s).rows[0].bank,202); // Day 1 minimum was zero before the wage.
 const bad=copy(s);bad.interest.minimum.copper++;assert.equal(verifyTellerSource(bad),null);
 const p=proof();assert(validateTellerAuditProof(p));assert.equal(p.report.transactionCount,0);assert.equal(p.steps.length,4);
 assert(p.duty.includes('including-zero-activity'));for(const mutate of [p=>p.report.rows[0].bank++,p=>p.steps.pop(),p=>p.calculatedSeconds=0,p=>p.returnedHome=false,p=>p.amount=16,p=>p.actorId='player']){const bad=copy(p);mutate(bad);assert.equal(validateTellerAuditProof(bad),false);}
});

test('government account is zero-born, atomic, once per original daily order, replay-validated',()=>{
 let saved,patch,fail=true,writes=0;const a=createTellerAccount({saveState:(s,r,p)=>{writes++;if(fail)return false;saved=copy(s);patch=copy(p);return true;}}),p=proof();
 assert.deepEqual(a.account(id),{cash:0,bank:0});assert.equal(a.hasIncome(id),false);
 assert.equal(a.settle(p,{chinaTellerInspection:{order:null}}).ok,false);assert.equal(a.account(id).bank,0);
 fail=false;assert(a.settle(p,{chinaTellerInspection:{order:null}}).ok);assert.equal(a.account(id).bank,8);assert.deepEqual(patch,{chinaTellerInspection:{order:null}});
 assert(a.settle(p).replayed);assert.equal(writes,2);
 assert.equal(a.settle(proof(1,'cn-another-person')).ok,false,'replacement cannot earn another same-day slot fee');
 const restored=createTellerAccount({saved,saveState:()=>true});assert.equal(restored.account(id).bank,8);assert(restored.settle(p).replayed);
 const bad=copy(saved);bad.receipts[0].evidence.report.rows[0].cash=1;const corrupt=createTellerAccount({saved:bad,saveState:()=>assert.fail('bad save overwritten')});assert(corrupt.loadError);assert.equal(corrupt.account(id),null);assert.deepEqual(corrupt.snapshot(),bad);
 const m=restored.prepareMealPayment({actorId:id,orderId:'cn-tavern-order-1',amount:6});assert(m.ok&&m.commit().ok);assert.deepEqual(restored.account(id),{cash:0,bank:2});assert.deepEqual(m.transfer.sourceSplit,{cash:0,bank:6});
 const refund=restored.prepareMealRefund({actorId:id,orderId:'cn-tavern-order-1',amount:6});assert(refund.ok&&refund.commit().ok);assert.equal(restored.account(id).bank,8);
});

test('original work must reach ledger and abacus, have contact, and return; no idle or blocked wages',()=>{
 const h=harness();h.open=true;h.step(100);assert.equal(h.controller.snapshot().order,null);
 h.open=false;h.step();assert(h.controller.owns(h.n));h.contact=false;h.step(100);assert.equal(h.account.account(id).bank,0);assert.equal(h.controller.snapshot().order.seconds,0);
 h.contact=true;h.step(50,{conversationActorId:id});assert.equal(h.controller.snapshot().order.seconds,0);
 h.step(50,{performing:id});assert.equal(h.controller.snapshot().order.seconds,0);
 h.canControl=false;h.step(50);assert.equal(h.account.account(id).bank,0);h.canControl=true;h.finish();
 assert.equal(h.account.account(id).bank,8);assert(h.moves>0&&h.poses>0);assert.equal(h.controller.snapshot().order,null);assert.equal(h.storage.chinaTellerInspection.order,null);assert(h.controller.handoffBoundary().ok);
 h.step(220);assert.equal(h.account.account(id).bank,8);assert.equal(h.account.snapshot().receipts.length,1);
 assert(h.controllerWrites<25,'no per-frame persistence');
});

test('midwork reload, failed salary save and next natural day retain one authoritative job',()=>{
 const h=harness();h.step(14);const checkpoint=h.controller.snapshot();assert(checkpoint.order);h.controller=h.create(checkpoint);h.failAccount=true;h.step(200);
 assert.equal(h.controller.snapshot().order.stage,'settle');assert.equal(h.account.account(id).bank,0);
 h.failAccount=false;h.finish();assert.equal(h.account.account(id).bank,8);
 const end=h.controller.snapshot();h.controller=h.create(end);h.step(100);assert.equal(h.account.account(id).bank,8);
 h.day=2;h.step(220);assert.equal(h.account.account(id).bank,16);assert.equal(h.account.snapshot().receipts.length,2);
 h.day=50;h.step();assert.equal(h.controller.snapshot().order.contract.day,50);assert.equal(h.account.account(id).bank,16,'no offline catch-up');
});

test('death, missing person, changed tenure cancel unpaid and cannot reissue same-day; invalid binding pauses',()=>{
 for(const kind of ['dead','missing','changed']){const h=harness();h.step(15);const poses=h.poses,moves=h.moves;if(kind==='dead')h.n.alive=false;if(kind==='missing')h.missing=true;if(kind==='changed')h.revision++;h.step();assert.equal(h.account.account(id).bank,0);assert.equal(h.controller.snapshot().order,null);assert.equal(h.controller.snapshot().interruptions.length,1);assert.equal(h.poses,poses);assert.equal(h.moves,moves);h.n.alive=true;h.missing=false;h.step(20);assert.equal(h.controller.snapshot().order,null);}
 const h=harness();h.step(10);const original=h.controller.snapshot();h.assignmentInvalid=true;h.step(20);assert.deepEqual(h.controller.snapshot(),original);h.assignmentInvalid=false;h.finish();
});

test('bad live source pauses settlement, failed cancellation retries without moving dead body, corrupt progress fails closed',()=>{
 const h=harness();h.step(10);const original=h.controller.snapshot();h.source={loadError:'bad',state:()=>({loadError:'bad'})};h.step(100);assert.deepEqual(h.controller.snapshot(),original);assert.equal(h.account.account(id).bank,0);
 h.n.alive=false;h.failController=true;const moves=h.moves;h.step();assert(h.controller.snapshot().order);assert.equal(h.moves,moves);h.failController=false;h.step();assert.equal(h.controller.snapshot().order,null);
 const bad=copy(original);bad.order.checked=[{currency:'copper',bank:200}];const c=h.create(bad);assert(c.loadError);c.update(.25,0);assert.deepEqual(c.snapshot(),bad);assert.equal(c.handoffBoundary().ok,false);
});

test('role disallows player, dormant module does not touch player ledger, source mutations remain outside frozen report',()=>{
 const slot=createTellerSlot();assert.equal(slot.assign('player').ok,false);assert.equal(TELLER_ROLE.amount,8);
 const f=fundedLedger(),h=harness({source:f.l});h.step();const source=copy(h.controller.snapshot().order.contract.source);assert(f.l.withdraw(1,'new-player-transaction').ok);const before=f.l.state(),writes=f.writes();h.finish();
 assert.deepEqual(h.account.snapshot().receipts[0].evidence.source,source);assert.deepEqual(f.l.state(),before);assert.equal(f.writes(),writes);
});
