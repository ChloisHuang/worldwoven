// Shared-money regressions: authentic read-only source, one daily contract
// across four desks, manual contact-only progress and atomic save boundaries.
// The injected positions/contact are fixtures, not physical-scene acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {REGIONAL_TELLER_ROLES,REGIONAL_TELLER_CURRENCIES,freezeTellerSource,regionalTellerContract,regionalTellerAuditProof,regionalTellerReport,regionalTellerJournal,validateRegionalTellerContract,validateRegionalTellerAuditProof} from '../source/game/regional-teller-audit-proof.js';
import {createRegionalTellerInspection,validRegionalTellerInspection} from '../source/game/regional-teller-inspection.js';
const copy=structuredClone;
const points={home:[0,0,0],ledger:[1,0,0],abacus:[2,0,0]};
function harness({saved,ledgerSaved,country='china',legacy=-1}={}){
 const h={day:7,country,revision:3,legacy,allow:true,contact:true,missing:false,status:'player',failSave:false,failPay:false,saveMode:null,settleMode:null,writes:0,payCalls:0,poses:[],receipts:[],storage:{},pending:null};
 h.player={alive:true,root:{position:{x:0,y:0,z:0}}};
 h.ledger=createCurrencyLedger({saved:ledgerSaved,saveState:(next,tx)=>{
  h.ledgerWrites=(h.ledgerWrites||0)+1;if(h.failPay)return false;
  if(h.pending){h.storage={...h.storage,inspection:copy(h.pending.next),receipts:[...h.receipts,copy(h.pending.proof)],ledger:copy(next)};}else h.storage.ledger=copy(next);
  return true;
 }});
 h.create=state=>createRegionalTellerInspection({saved:state,getDay:()=>h.day,getPlayer:()=>h.missing?null:h.player,getLedger:()=>h.badLedger||h.ledger,getPositions:()=>points,
  getLegacyLastIssuedDay:()=>h.legacy,resolveAssignment:country=>({status:h.status,holderId:h.status==='player'?'player':'incumbent',revision:h.revision,roleId:REGIONAL_TELLER_ROLES[h.country].id,slotId:REGIONAL_TELLER_ROLES[h.country].slotId,alive:true,available:true}),
  canControl:()=>h.allow,pose:(n,t,work)=>h.poses.push(copy(work)),contact:()=>h.contact,
  saveState:next=>{h.writes++;if(h.onSave)h.onSave(next);if(h.failSave)return false;if(h.saveMode==='throw')throw Error('quota');if(h.saveMode==='promise')return Promise.reject(Error('offline'));if(h.saveMode==='undefined')return undefined;h.storage.inspection=copy(next);return true;},
  settle:(proof,next)=>{
   h.payCalls++;assert(validateRegionalTellerAuditProof(proof));if(h.onSettle)h.onSettle(proof,next);
   if(h.settleMode==='throw')throw Error('quota');if(h.settleMode==='promise')return Promise.reject(Error('offline'));
   h.pending={proof,next};let result;try{result=h.ledger.creditWageToBank({amount:proof.amount,receiptId:proof.orderId,roleId:proof.roleId,slotId:proof.slotId,day:proof.day,currency:proof.currency});}finally{h.pending=null;}
   if(result.ok&&!result.replayed)h.receipts.push(copy(proof));return result;
  }});
 h.controller=h.create(saved);
 h.step=(count=1,context={})=>{for(let i=0;i<count;i++)h.controller.update(.25,i*.25,context);};
 h.move=position=>Object.assign(h.player.root.position,{x:position[0],y:position[1],z:position[2]});
 h.start=()=>{h.move(points.home);return h.controller.start({country:h.country,workReceiptId:'regional-teller-shift:3'});};
 h.action=()=>{const action=h.controller.actionDescriptor();h.move(action.position);assert(h.controller.beginAction(action.stage).ok);h.step(action.total?8:1);};
 h.finish=()=>{for(let i=0;i<10&&h.controller.state().order;i++)h.action();assert.equal(h.controller.state().order,null);};
 h.reload=()=>{h.controller=h.create(h.controller.snapshot());};
 return h;
}
function authenticLedger(){
 let writes=0;const ledger=createCurrencyLedger({saveState:()=>{writes++;return true;},getClock:()=>({day:1})});
 assert(ledger.creditWageToBank({amount:250,receiptId:'real-job',roleId:'actual-role',slotId:'actual-slot',day:1}).ok);
 assert(ledger.withdraw(100,'original-withdraw').ok);
 assert(ledger.reserve(9,'original-hold').ok);
 assert(ledger.exchange({requestId:'original-fx',quote:ledger.quoteExchange({from:'copper',to:'japan',amount:20}).quote}).ok);
 assert(ledger.observeDay(3).ok);
 return {ledger,writes:()=>writes};
}

test('all local employers freeze 8 original units and one global daily order; full journal stays read only',()=>{
 const f=authenticLedger(),before=f.ledger.state(),writes=f.writes(),source=freezeTellerSource(f.ledger);
 for(const [country,role]of Object.entries(REGIONAL_TELLER_ROLES)){
  const contract=regionalTellerContract({country,day:7,holderRevision:3,source}),proof=regionalTellerAuditProof(contract);
  assert(validateRegionalTellerAuditProof(proof));assert.equal(proof.orderId,'regional-teller-audit:7');assert.equal(proof.amount,8);
  const duty=regionalTellerAuditProof(regionalTellerContract({country,day:7,holderRevision:3,source,contractVersion:2,workReceiptId:role.workSource+'-9'}));
  assert(validateRegionalTellerAuditProof(duty));assert.equal(duty.amount,0);assert.equal(duty.contractVersion,2);assert.equal(duty.orderId,proof.orderId);assert.deepEqual(duty.source,proof.source);assert.equal(validateRegionalTellerAuditProof({...duty,amount:8}),false);
  assert.equal(proof.currency,role.currency);assert.equal(proof.roleId,role.id);assert.equal(proof.slotId,role.slotId);
  assert.equal(role.paymentKind,'salary');assert.equal(role.minimumAgeYears,18);assert.deepEqual(role.skillRequirements,{writing:1,ritual:1});
  assert(proof.duty.includes('including-zero-activity'));assert.deepEqual(proof.report.rows.map(r=>r.currency),REGIONAL_TELLER_CURRENCIES);
  assert.deepEqual(proof.journal,f.ledger.history());assert.equal(proof.steps.length,4);assert.equal(proof.calculatedSeconds,8);
 }
 assert.deepEqual(regionalTellerJournal(source,'japan').map(tx=>tx.requestId),['original-fx']);
 assert.equal(regionalTellerJournal(source,'egypt').length,0);assert.equal(regionalTellerReport(source).rows[0].held,9);
 assert.deepEqual(f.ledger.state(),before);assert.equal(f.writes(),writes);
});

test('proof requires authentic full arithmetic, original journal, all four stages and frozen employer currency',()=>{
 const source=freezeTellerSource(authenticLedger().ledger),proof=regionalTellerAuditProof(regionalTellerContract({country:'france',day:7,holderRevision:3,source}));
 for(const mutate of [p=>p.currency='japan',p=>p.country='japan',p=>p.amount=16,p=>p.orderId='fr-teller-audit:7',p=>p.sourceHash+='0',
  p=>p.source.balances.copper.bank++,p=>p.source.transactions[0].after.copper.bank++,p=>p.source.transactions.reverse(),
  p=>p.report.rows.pop(),p=>p.journal.pop(),p=>p.journal.push({action:'deposit',currency:'france',amount:3}),p=>p.steps.pop(),
  p=>p.steps[0].checkedSeconds=1,p=>p.calculatedSeconds=0,p=>p.recordedSeconds=0,p=>p.returnedHome=false,p=>p.actorId='npc',p=>p.extra=true]){
  const bad=copy(proof);mutate(bad);assert.equal(validateRegionalTellerAuditProof(bad),false);
 }
 assert.equal(validateRegionalTellerContract(regionalTellerContract({country:'france',day:2,holderRevision:3,source})),false,'future observed interest day cannot backdate a job');
});

test('each country physically starts the same finite manual job and earns only the frozen local wage',()=>{
 for(const country of Object.keys(REGIONAL_TELLER_ROLES)){
  const h=harness({country}),before=h.ledger.state();assert(h.start().ok);
  const issued=h.controller.snapshot();h.step(100);assert.deepEqual(h.controller.snapshot(),issued,'idle seconds cannot audit');
  assert.equal(h.controller.beginAction('calculate').ok,false);assert.equal(h.controller.beginAction('check').ok,false,'must reach ledger');
  for(let i=0;i<9;i++){
   h.action();assert.deepEqual(h.ledger.state(),before,'manual audit work cannot mutate source');assert.equal(h.receipts.length,0);
   assert.equal(h.controller.isActing(),false,'one click never starts the following row');
  }
  assert.equal(h.controller.state().order.stage,'return');assert.equal(h.controller.handoffBoundary().ok,false);
  assert.equal(h.controller.beginAction('return').ok,false,'must really return home');h.action();
  assert.equal(h.receipts.length,1);assert.equal(h.controller.handoffBoundary().ok,true);
  assert.equal(h.ledger.balances()[REGIONAL_TELLER_ROLES[country].currency].bank,8);
  assert.equal(h.controller.start({country}).code,'teller-day-consumed');h.step(100);assert.equal(h.payCalls,1);
  assert.deepEqual(h.storage.inspection,h.controller.snapshot());
 }
});

test('global day is consumed across every local entry, reload, abandonment and China legacy duty',()=>{
 const h=harness({country:'japan'});assert(h.start().ok);assert.equal(h.controller.start({country:'france'}).code,'teller-order-unfinished');
 assert(h.controller.abandon().ok);assert.equal(h.receipts.length,0);h.reload();
 for(const country of Object.keys(REGIONAL_TELLER_ROLES)){h.country=country;assert.equal(h.start().code,'teller-day-consumed');}
 h.day++;assert(h.start().ok);assert.equal(h.controller.state().order.contract.day,8);
 for(const legacy of [7,8]){const old=harness({legacy,country:'egypt'});assert.equal(old.start().code,'teller-day-consumed');assert.equal(old.writes,0);}
 const fresh=harness({legacy:6});assert(fresh.start().ok);
});

test('chat freezes same pending work; explicit cancel/movement lose only current uncompleted seconds',()=>{
 const h=harness();assert(h.start().ok);h.move(points.ledger);assert(h.controller.beginAction('check').ok);h.step(3);
 assert.equal(h.controller.actionDescriptor().seconds,.75);const writes=h.writes,poses=h.poses.length;
 h.step(50,{conversationActorId:'original-person'});assert.equal(h.controller.actionDescriptor().seconds,.75);assert(h.controller.isActing());
 assert.equal(h.writes,writes);assert.equal(h.poses.length,poses);h.step(5);assert.equal(h.controller.state().order.index,1);
 assert(h.controller.beginAction('check').ok);h.step(4);h.controller.pause();h.step(100);assert.equal(h.controller.actionDescriptor().seconds,1);h.controller.resume();h.step(4);assert.equal(h.controller.state().order.index,2);
 assert(h.controller.beginAction('check').ok);h.step(7);h.controller.cancelAction();h.step(100);assert.equal(h.controller.state().order.index,2);
 assert.equal(h.controller.actionDescriptor().seconds,0);assert(h.controller.beginAction('check').ok);h.step(3);h.move(points.home);h.step();assert.equal(h.controller.isActing(),false);assert.equal(h.controller.state().order.index,2);
});

test('contact, current actor, live ledger and assignment gate work; large dt never completes a stage',()=>{
 const h=harness();assert(h.start().ok);h.move(points.ledger);assert(h.controller.beginAction('check').ok);
 h.controller.update(100,0);assert.equal(h.controller.actionDescriptor().seconds,.25);
 h.contact=false;h.step();assert.equal(h.controller.isActing(),false);assert.equal(h.controller.state().order.index,0);
 h.contact=true;assert(h.controller.beginAction('check').ok);h.missing=true;h.step();assert.equal(h.controller.isActing(),false);assert(h.controller.state().order,'unloaded player is not invented or discarded');
 h.missing=false;assert(h.controller.beginAction('check').ok);h.badLedger={loadError:'bad',state:()=>({})};h.step();assert.equal(h.controller.isActing(),false);
 h.badLedger=null;assert(h.controller.beginAction('check').ok);h.revision++;h.step();assert.equal(h.controller.state().order,null);assert.equal(h.controller.state().interruptions[0].reason,'assignment-changed');assert.equal(h.receipts.length,0);
});

test('failed issuance, stage checkpoint and final settlement retain the same unpaid order',()=>{
 const h=harness();h.failSave=true;assert.equal(h.start().code,'save-failed');assert.equal(h.controller.state().lastIssuedDay,-1);
 h.failSave=false;assert(h.start().ok);h.failSave=true;h.action();assert.equal(h.controller.state().order.index,0);assert.equal(h.controller.lastError,'save-failed');
 h.failSave=false;h.step();assert.equal(h.controller.state().order.index,1);assert.equal(h.controller.isActing(),false);
 while(h.controller.state().order.stage!=='return')h.action();const before=copy(h.controller.snapshot());h.failPay=true;h.action();
 assert.deepEqual(h.controller.snapshot(),before);assert.equal(h.receipts.length,0);assert.equal(h.ledger.balances().copper.bank,0);
 h.failPay=false;h.step();assert.equal(h.controller.state().order,null);assert.equal(h.receipts.length,1);assert.equal(h.ledger.balances().copper.bank,8);
 h.step(100);assert.equal(h.ledger.history().filter(tx=>tx.action==='wage').length,1);
});

test('reentrant save and settlement cannot consume extra rows, issue another order or pay twice',()=>{
 const h=harness();h.onSave=()=>{assert.equal(h.controller.start({country:h.country}).ok,false);assert.equal(h.controller.beginAction('check').ok,false);assert.equal(h.controller.abandon().ok,false);h.controller.update(.25,0);};
 assert(h.start().ok);h.onSettle=()=>{assert.equal(h.controller.beginAction('return').ok,false);assert.equal(h.controller.abandon().ok,false);h.controller.update(.25,0);};
 h.finish();assert.equal(h.receipts.length,1);assert.equal(h.payCalls,1);assert.equal(h.ledger.balances().copper.bank,8);
});

test('reload preserves only completed physical work; malformed checkpoints never mint or reset a day',()=>{
 const h=harness();assert(h.start().ok);h.action();h.move(points.ledger);assert(h.controller.beginAction('check').ok);h.step(7);h.reload();
 assert.equal(h.controller.state().order.index,1);assert.equal(h.controller.isActing(),false);assert.equal(h.controller.actionDescriptor().seconds,0);h.step(100);assert.equal(h.controller.state().order.index,1);
 const base=h.controller.snapshot();
 for(const mutate of [s=>s.lastIssuedDay--,s=>s.order.index++,s=>s.order.checked.pop(),s=>s.order.calculationIndex=4,s=>s.order.stage='return',
  s=>s.order.recorded=true,s=>s.order.contract.source.balances.france.bank++,s=>s.extra=1,s=>s.order.seconds=2,s=>s.interruptions.push({order:copy(s.order),reason:'player-abandoned'})]){
  const bad=copy(base);mutate(bad);assert.equal(validRegionalTellerInspection(bad),false);const loaded=h.create(bad);assert.equal(loaded.loadError,'invalid-regional-teller-inspection');assert.equal(loaded.start({country:'china'}).ok,false);assert.equal(loaded.handoffBoundary().ok,false);loaded.update(100,0);
 }
 h.finish();h.reload();assert.equal(h.start().code,'teller-day-consumed');assert.equal(h.receipts.length,1);
});

test('abandonment and death are persistent, unpaid boundaries; storage failure cannot release the slot',()=>{
 const h=harness();assert(h.start().ok);h.move(points.ledger);assert(h.controller.beginAction('check').ok);h.step(3);h.failSave=true;
 assert.equal(h.controller.abandon().ok,false);assert.equal(h.controller.handoffBoundary().ok,false);assert.equal(h.controller.actionDescriptor().seconds,.75);
 h.failSave=false;assert(h.controller.abandon().ok);assert.equal(h.controller.handoffBoundary().ok,true);assert.equal(h.controller.isActing(),false);h.reload();assert.equal(h.start().code,'teller-day-consumed');
 const dead=harness();assert(dead.start().ok);dead.player.alive=false;dead.failSave=true;dead.step();assert(dead.controller.state().order);dead.failSave=false;dead.step();
 assert.equal(dead.controller.state().order,null);assert.equal(dead.controller.state().interruptions[0].reason,'actor-dead');assert.equal(dead.receipts.length,0);
});

test('unsupported asynchronous or throwing saves/payments never adopt controller success',async()=>{
 for(const mode of ['throw','promise','undefined']){const h=harness();h.saveMode=mode;assert.equal(h.start().ok,false);assert.equal(h.controller.state().lastIssuedDay,-1);}
 for(const mode of ['throw','promise']){const h=harness();assert(h.start().ok);while(h.controller.state().order.stage!=='return')h.action();h.settleMode=mode;h.action();assert(h.controller.state().order);assert.equal(h.receipts.length,0);assert.equal(h.controller.lastError,'settlement-failed');}
 await new Promise(resolve=>setImmediate(resolve));
});
