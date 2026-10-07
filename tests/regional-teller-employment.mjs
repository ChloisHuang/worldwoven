// Integration boundary checks with the real employment/controller, formal
// career and currency participants. Minimal actors supply contact fixtures;
// this is not navigation, real-rig, browser or visual acceptance evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Object3D,Vector3} from '../source/vendor/three/build/three.module.js';
import {createFormalCareers} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createRegionalTellerEmployment} from '../source/game/regional-teller-employment.js';
import {createTellerInspection} from '../source/game/china-teller-inspection.js';
import {TELLER_HOME} from '../source/game/china-teller-audit-proof.js';
import {REGIONAL_TELLER_ROLES,freezeTellerSource} from '../source/game/regional-teller-audit-proof.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {CHINA_MONEY_HOUSE} from '../source/game/china-money-house.js';
import {JAPAN_EXCHANGE_COUNTER} from '../source/game/japan-exchange-counter.js';
import {FRANCE_EXCHANGE_COUNTER} from '../source/game/france-exchange-counter.js';
import {EGYPT_EXCHANGE_COUNTER} from '../source/game/egypt-exchange-counter.js';
const copy=structuredClone,counters={china:CHINA_MONEY_HOUSE,japan:JAPAN_EXCHANGE_COUNTER,france:FRANCE_EXCHANGE_COUNTER,egypt:EGYPT_EXCHANGE_COUNTER};
function actor(id,position){
 const root=new Object3D();root.position.fromArray(position);root.userData.hands=[new Object3D(),new Object3D()];for(const hand of root.userData.hands)root.add(hand);
 return {station:{id,npcName:id},alive:true,ageYears:24,root,route:[],walking:false,animate(t,walking,action,context={}){for(const [i,point]of(context.archery?.hands||[]).entries())root.userData.hands[i].position.fromArray(point);root.updateWorldMatrix(true,true);}};
}
function fixture(country='japan',{saved=null,hired=true,legacy=true,clock=null}={}){
 const role=REGIONAL_TELLER_ROLES[country],counter=counters[country],home=counter.points.teller,registration=counter.points.counter;
 const rest=country==='china'?[home[0]-1.8,home[1],home[2]-.3]:[registration[0]+1.7,registration[1],registration[2]-.7];
 const f={country,role,counter,rest,clock:{day:7,hour:8,seconds:700,...clock},saved:copy(saved||{}),durable:copy(saved||{}),fail:false,mode:null,busy:false,mounted:null,legacy:-1,writes:0,notices:[],hook:null};
 f.player=actor('player',registration);f.npc=actor(role.incumbentId,home);
 const storage={setItem(key,text){const hook=f.hook;f.hook=null;hook?.();if(f.fail||f.reject?.(JSON.parse(text)))return false;if(f.mode==='object')return {ok:false,code:'storage-failed'};if(f.mode==='throw')throw Error('quota');if(f.mode==='promise')return Promise.resolve();f.durable=JSON.parse(text);f.writes++;return true;}};
 const savePart=(key,next,patch={})=>{const result=storage.setItem('worlds-days-v1',JSON.stringify({...f.saved,...patch,[key]:next}));if(result===false||result?.ok===false||result?.then)return result;Object.assign(f.saved,copy(patch),{[key]:copy(next)});return true;};
 if(!f.saved.formalCareers){const initial=createFormalCareers({saveState:()=>true,getClock:()=>f.clock}).state();Object.assign(initial.skills,{writing:1,ritual:1});if(hired)initial.tenure={roleId:role.id,slotId:role.slotId,sinceDay:f.clock.day,sinceHour:f.clock.hour};f.saved.formalCareers=initial;}
 let worldSeed=1;while(careerInterviewRoll(worldSeed,role.id,7)>=.5)worldSeed++;
 f.careers=createFormalCareers({saved:f.saved.formalCareers,worldSeed,getClock:()=>f.clock,saveState:s=>savePart('formalCareers',s),creditWageToBank:tx=>f.ledger.creditWageToBank(tx)});
 f.ledger=createGameCurrencyLedger({saved:f.saved,storage,getClock:()=>f.clock,transactionParticipant:tx=>f.employment?.prepareCurrencyCommit(tx)});
 const tools={pose(){},contact:()=>true,state:()=>({handTargets:[home,home]})};
 const buildEmployment=()=>createRegionalTellerEmployment({country,npcs:[f.npc],lot:{tellerTools:tools},careers:f.careers,ledger:f.ledger,getPlayer:()=>f.player,getClock:()=>f.clock,
  getBusy:()=>f.busy,getMounted:()=>f.mounted,getLegacyLastIssuedDay:()=>f.legacy,
  getChinaAssignment:()=>({holderId:role.incumbentId}),getChinaService:()=>({handoffBoundary:()=>({ok:true})}),getChinaPersonal:()=>({blocks:()=>false}),
  saved:f.saved.regionalTellerEmployment,savedInspection:f.saved.regionalTellerInspection,saveState:s=>savePart('regionalTellerEmployment',s),saveTaskState:(s,patch)=>savePart('regionalTellerEmployment',s,patch),saveInspection:s=>savePart('regionalTellerInspection',s),notify:text=>f.notices.push(text),
  planPath:()=>[],doors:{routeStep:()=>({waiting:false,waypoint:null})},moveActor:()=>({})});
 f.employment=buildEmployment();f.tick=dt=>{f.clock.seconds+=dt;f.clock.hour+=dt*.7/60;f.employment.update(dt,f.clock.seconds);};f.step=(count=1)=>{for(let i=0;i<count;i++)f.tick(.25);};
 f.move=position=>f.player.root.position.fromArray(position);
 f.execute=kind=>{const intent=f.employment.intent(kind);assert(intent,kind+' must have an actual work intent');f.move(intent.position);return f.employment.executeIntent(intent);};
 f.shift=()=>{f.move(registration);if(legacy){
  // Explicit historical checkpoint, not a request to mint another legacy shift.
  f.saved.regionalTellerEmployment={...f.employment.snapshot(),version:1,shift:{roleId:role.id,country,day:f.clock.day,stage:'working',standInId:role.incumbentId,assignmentRevision:f.employment.snapshot().revision},receipts:f.employment.snapshot().receipts};f.employment.dispose();f.employment=buildEmployment();
 }else{assert(f.employment.start());assert.equal(f.employment.state().shift.stage,'handoff');f.employment.update(0,f.clock.seconds);}assert.equal(f.employment.state().shift.stage,'working');f.npc.root.position.fromArray(rest);f.npc.walking=false;};
 f.begin=()=>{f.shift();assert(f.execute('begin-original'));};
 f.action=()=>{assert(f.execute('original-step'));f.step(f.employment.inspection.actionDescriptor().total?8:1);};
 f.returnReady=()=>{for(let i=0;i<9&&f.employment.inspection.state().order.stage!=='return';i++)f.action();assert.equal(f.employment.inspection.state().order.stage,'return');};
 f.finish=()=>{f.returnReady();f.action();assert.equal(f.employment.inspection.state().order,null);};
 return f;
}
const finances=f=>({bank:f.ledger.state(),career:f.careers.state(),employment:f.employment.snapshot(),inspection:f.employment.inspectionSnapshot(),durable:copy(f.durable)});

test('real four-desk employment pays the one completed audit and atomically records growth and cleared source work',()=>{
 for(const country of Object.keys(REGIONAL_TELLER_ROLES)){
  const f=fixture(country),source=freezeTellerSource(f.ledger);f.begin();assert.equal(f.employment.snapshot().receipts.length,0);f.returnReady();
  assert.deepEqual(freezeTellerSource(f.ledger),source,'all physical checking is read only');assert.equal(f.careers.state().skillXP.writing,0);
  f.action();assert.equal(f.employment.inspection.state().order,null);assert.equal(f.ledger.balances()[f.role.currency].bank,8);
  assert.equal(f.careers.state().tellerAuditServices.length,1);assert.equal(f.careers.state().performance,1);assert.equal(f.careers.state().skillXP.writing,10);
  assert.equal(f.employment.snapshot().receipts.length,1);assert.deepEqual(f.durable.regionalTellerEmployment,f.employment.snapshot());
  assert.deepEqual(f.durable.regionalTellerInspection,f.employment.inspectionSnapshot());assert.deepEqual(f.durable.formalCareers,f.saved.formalCareers);
  const loaded=fixture(country,{saved:f.durable});loaded.npc.root.position.fromArray(loaded.rest);assert.equal(loaded.employment.state().loadError,null);
  assert.equal(loaded.ledger.balances()[f.role.currency].bank,8);assert.equal(loaded.careers.state().performance,1);assert(!loaded.employment.workChoices().includes('begin-original'));
 }
});

test('application and hiring neither open a shift nor issue source work; explicit safe handoff is required',()=>{
 const f=fixture('france',{hired:false,legacy:false});assert.equal(f.employment.start(),false);assert(f.execute('formal-apply'));
 assert.equal(f.employment.active(),false);assert.equal(f.careers.state().tenure,null);assert.equal(f.employment.inspection.state().order,null);
 assert(f.execute('formal-review'));assert(f.careers.isHired(f.role.id));assert.equal(f.employment.active(),false);assert.equal(f.employment.inspection.state().order,null);
 f.shift();assert.equal(f.employment.inspection.state().order,null);assert(f.execute('begin-original'));assert.equal(f.ledger.history().length,0);
});

test('salary storage failure retains bank, formal review, employment receipt and original work together',()=>{
 for(const mode of ['false','object','throw','promise']){
  const f=fixture('egypt');f.begin();f.returnReady();const before=finances(f);f.fail=mode==='false';f.mode=mode==='false'?null:mode;f.action();
  assert.deepEqual(finances(f),before,mode+' must leave every money and work participant unchanged');
  f.fail=false;f.mode=null;f.step();assert.equal(f.employment.inspection.state().order,null);assert.equal(f.ledger.balances().egypt.bank,8);
  assert.equal(f.careers.state().performance,1);assert.equal(f.employment.snapshot().receipts.length,1);
 }
});

test('same original receipt replay clears a stale source checkpoint durably without paying or growing twice',()=>{
 const f=fixture();f.begin();f.returnReady();const beforeReturn=f.employment.inspectionSnapshot();f.action();const paid=copy(f.durable);
 paid.regionalTellerInspection=beforeReturn;const restored=fixture('japan',{saved:paid});restored.npc.root.position.fromArray(restored.rest);
 restored.fail=true;restored.action();assert(restored.employment.inspection.state().order);assert.equal(restored.ledger.balances().japan.bank,8);
 restored.fail=false;restored.step();assert.equal(restored.employment.inspection.state().order,null);assert.equal(restored.durable.regionalTellerInspection.order,null);
 assert.equal(restored.careers.state().tellerAuditServices.length,1);assert.equal(restored.careers.state().skillXP.writing,10);assert.equal(restored.employment.snapshot().receipts.length,1);assert.equal(restored.ledger.history().filter(tx=>tx.action==='wage').length,1);
});

test('persistent foreign shift blocks new local entry and global day stays consumed after handback',()=>{
 const f=fixture('japan');f.begin();const ongoing=copy(f.saved);const away=fixture('egypt',{saved:ongoing});assert.equal(away.employment.active(),true);assert.deepEqual(away.employment.workChoices(),[]);assert.equal(away.employment.start(),false);
 f.finish();f.move(f.counter.points.counter);assert(f.employment.endShift());f.npc.root.position.fromArray(f.counter.points.teller);f.step();assert.equal(f.employment.active(),false);
 // A real later career transfer preserves the bank/controller records.
 assert(f.careers.resign().ok);const next=copy(f.saved),other=REGIONAL_TELLER_ROLES.france;next.formalCareers.tenure={roleId:other.id,slotId:other.slotId,sinceDay:f.clock.day,sinceHour:f.clock.hour};
 const moved=fixture('france',{saved:next});moved.shift();assert(!moved.employment.workChoices().includes('begin-original'));assert.equal(moved.employment.inspection.start({country:'france'}).code,'teller-day-consumed');
});

test('nested wage and career mutations cannot break the atomic salary participant',()=>{
 const f=fixture();f.begin();f.returnReady();f.hook=()=>{
  assert.equal(f.careers.resign().code,'career-busy');assert.equal(f.employment.start(),false);assert.equal(f.employment.endShift(),false);
  assert.equal(f.employment.inspection.abandon().ok,false);assert.equal(f.ledger.creditWageToBank({amount:8,receiptId:'nested',currency:'japan',roleId:f.role.id,slotId:f.role.slotId,day:7}).code,'ledger-busy');
  f.employment.update(.25,701);
 };
 f.action();assert.equal(f.employment.inspection.state().order,null);assert.equal(f.ledger.balances().japan.bank,8);assert.equal(f.careers.state().performance,1);assert.deepEqual(f.durable.regionalTellerEmployment,f.employment.snapshot());
});

test('shift admission save cannot reenter a still-current resignation intent and diverge live from durable tenure',()=>{
 const f=fixture(),resign=f.employment.intent('formal-resign');let nested;
 f.hook=()=>{nested=f.employment.executeIntent(resign);};
 assert(f.employment.start());assert.equal(nested,false,'admission must own its career/handoff boundary throughout storage');
 assert(f.careers.isHired(f.role.id));assert.equal(f.durable.formalCareers.tenure?.roleId,f.careers.state().tenure?.roleId);
 assert.equal(f.employment.state().shift.stage,'handoff');
});

test('the original China NPC controller honors the global player-issued day and resumes issuance on the next day',()=>{
 const f=fixture('china'),npc=f.npc;let pay=0,writes=0;const source=freezeTellerSource(f.ledger);npc.root.position.fromArray(TELLER_HOME);
 const controller=createTellerInspection({getDay:()=>f.clock.day,getGlobalAuditDay:()=>7,getActor:()=>npc,getLedger:()=>f.ledger,
  resolveAssignment:()=>({status:'npc',holderId:npc.station.id,actor:npc,revision:0,alive:true,available:true}),
  canControl:()=>true,isCounterOpen:()=>false,travel(){},pose(){},contact:()=>true,economy:{settle(){pay++;return {ok:true};}},saveState:()=>{writes++;return true;}});
 for(let i=0;i<100;i++)controller.update(.25,i*.25);
 assert.equal(controller.state().order,null);assert.equal(writes,0);assert.equal(pay,0);assert.deepEqual(freezeTellerSource(f.ledger),source);
 f.clock.day=8;controller.update(.25,26);assert.equal(controller.state().order.contract.day,8);assert.equal(controller.state().order.contract.actorId,npc.station.id);
 assert.equal(controller.state().lastIssuedDay,8);assert.equal(writes,1);assert.equal(pay,0,'issuing the next authentic job is still unpaid');
});

// Salary lifecycle uses only tiny actor/contact fixtures, never a whole scene.
for(const country of Object.keys(REGIONAL_TELLER_ROLES)){
 test(country+': fixed attendance salary works when original NPC already used daily audit; absent/chat/offline do not count',()=>{
  const f=fixture(country,{legacy:false,clock:{hour:6}});f.legacy=7;f.shift();assert(!f.employment.workChoices().includes('begin-original'));assert(f.execute('duty'));
  f.busy=true;f.step(4);assert.equal(f.employment.state().shift.coveredSeconds,0);f.busy=false;
  f.move([100,0,100]);f.step(4);assert.equal(f.employment.state().shift.coveredSeconds,0);
  f.execute('duty');f.clock.seconds+=100;f.clock.hour+=100*.7/60;f.employment.update(0,f.clock.seconds);assert.equal(f.employment.state().shift.coveredSeconds,0);
  for(let i=0;i<480;i++)f.tick(.25);assert(Math.abs(f.employment.state().shift.coveredSeconds-120)<1e-7);
  assert.equal(f.ledger.history().length,0,'on-duty time is not paid per frame');
  const snap=copy(f.saved),live=f.employment.snapshot();snap.regionalTellerEmployment=live;
  const reloaded=fixture(country,{saved:snap,legacy:false,clock:copy(f.clock)});reloaded.npc.root.position.fromArray(reloaded.rest);reloaded.execute('duty');reloaded.tick(.25);
  assert(Math.abs(reloaded.employment.state().shift.coveredSeconds-120.25)<1e-7,'resume counts only newly loaded time');
  reloaded.move(reloaded.counter.points.counter);assert(reloaded.employment.endShift());const frozen=reloaded.employment.state().shift.coveredSeconds;
  reloaded.npc.root.position.fromArray(reloaded.counter.points.teller);reloaded.tick(.25);
  assert.equal(reloaded.employment.state().shift,null);assert.equal(reloaded.careers.workState().lastDuty.stage,'paid');
  assert.equal(reloaded.careers.workState().lastDuty.coveredSeconds,frozen);assert.equal(reloaded.ledger.balances()[reloaded.role.currency].bank,Math.floor(reloaded.role.wage*(frozen*.7/60)/12+1e-9));
 });
 test(country+': new completed audit records only duty growth; salary waits for actual attendance and handback',()=>{
  const f=fixture(country,{legacy:false,clock:{hour:6}});f.begin();assert.equal(f.employment.inspection.state().order.contract.contractVersion,2);f.returnReady();
  const before=finances(f);f.fail=true;f.action();assert.deepEqual(f.ledger.state(),before.bank);assert.equal(f.careers.state().skillXP.writing,0);assert(f.employment.inspection.state().order);f.fail=false;f.step();
  assert.equal(f.employment.inspection.state().order,null);assert.equal(f.ledger.history().length,0);assert.equal(f.employment.snapshot().receipts[0].amount,0);assert.equal(f.careers.state().tellerAuditServices[0].amount,0);assert.equal(f.careers.state().skillXP.writing,10);
  const bankBefore=f.ledger.state();f.execute('duty');f.step(8);assert.deepEqual(f.ledger.state(),bankBefore);
  f.move(f.counter.points.counter);assert(f.employment.endShift());f.npc.root.position.fromArray(f.counter.points.teller);f.step();assert.equal(f.employment.state().shift,null);assert.equal(f.careers.workState().lastDuty.wage,0,'18-second task alone never earns a daily salary');
 });
}

test('fixed shift recovery abandons a missed unpaid order durably and death never loops ready/returning',()=>{
 for(const death of [false,true]){
  const f=fixture('china',{legacy:false});f.begin();
  if(death)f.player.alive=false;else {f.clock.day++;f.clock.hour=6;f.clock.seconds+=2000;assert(f.careers.observeDay().ok);}
  f.fail=true;f.step();assert(f.employment.inspection.state().order);assert(f.employment.state().shift);
  f.fail=false;f.step();assert.equal(f.employment.inspection.state().order,null);f.npc.root.position.fromArray(f.counter.points.teller);f.step();assert.equal(f.employment.state().shift,null);
  const writes=f.writes;f.step(4);assert.equal(f.writes,writes);assert.equal(f.ledger.history().length,0);
 }
 const waiting=fixture('china',{legacy:false});assert(waiting.employment.start());waiting.npc.alive=false;
 waiting.clock.day++;waiting.clock.hour=6;waiting.clock.seconds+=2000;assert(waiting.careers.observeDay().ok);waiting.step(2);assert.equal(waiting.employment.state().shift,null);assert.equal(waiting.ledger.history().length,0);
});
test('real salary deposit survives paid cleanup failure and resumes once after return checkpoint failure',()=>{
 const f=fixture('china',{legacy:false,clock:{hour:6}});f.legacy=7;f.shift();f.execute('duty');f.step(480);f.move(f.counter.points.counter);
 f.reject=next=>next.regionalTellerEmployment?.shift?.stage==='returning';assert.equal(f.employment.endShift(),false);assert.equal(f.careers.workState().lastDuty.stage,'inspection');assert.equal(f.employment.state().shift.stage,'working');
 f.reject=null;f.step();assert.equal(f.employment.state().shift.stage,'returning');f.npc.root.position.fromArray(f.counter.points.teller);
 f.reject=next=>next.formalCareers?.lastDuty?.stage==='paid';f.step();assert.equal(f.employment.state().shift.stage,'ready');assert.equal(f.ledger.history().filter(tx=>tx.action==='wage').length,1);const money=f.ledger.balances().copper.bank;assert(money>0);
 f.reject=null;assert(f.execute('claim'));assert.equal(f.employment.state().shift,null);assert.equal(f.ledger.balances().copper.bank,money);assert.equal(f.ledger.history().filter(tx=>tx.action==='wage').length,1);
});
test('old pending eight-unit contract must finish before salary admission and blocks that paid day only',()=>{
 const f=fixture('japan');f.begin();assert.equal(f.employment.start(),false);f.finish();f.move(f.counter.points.counter);assert(f.employment.endShift());f.npc.root.position.fromArray(f.counter.points.teller);f.step();
 assert.equal(f.employment.start(),false);assert.equal(f.ledger.balances().japan.bank,8);const performance=f.careers.state().performance;
 f.clock.day++;f.clock.hour=6;f.clock.seconds+=2000;assert(f.employment.start());assert.equal(f.careers.state().performance,performance,'legacy commission day is not retrospectively marked absent');assert.equal(f.employment.state().shift.salaryVersion,1);assert.equal(f.ledger.balances().japan.bank,8);
});
test('full actual loaded 06–18 China standby shift earns fixed24 once despite NPC-consumed audit',()=>{
 const f=fixture('china',{legacy:false,clock:{hour:6}});f.legacy=7;f.shift();f.execute('duty');let remaining=12*60/.7;
 while(remaining>1e-8){const dt=Math.min(.25,remaining);f.tick(dt);remaining-=dt;}
 f.move(f.counter.points.counter);assert(f.employment.endShift());f.npc.root.position.fromArray(f.counter.points.teller);f.step();
 assert.equal(f.employment.state().shift,null);assert.equal(f.ledger.balances().copper.bank,24);assert.equal(f.ledger.history().filter(tx=>tx.action==='wage').length,1);
});
