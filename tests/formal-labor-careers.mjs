// Actual labor services + durable formal core + real multi-currency bank.
// Protect separation of temporary copper contracts, local hiring, daily work, original
// tools, cross-save interruptions and exactly-once salary after reload.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,context,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,context);}});
const T=await import('three');
const {createFormalCareers,TAVERN_STEWARD_ROLE:TAVERN,GARDEN_ASSISTANT_ROLE:GARDEN}=await import('../source/game/formal-careers.js');
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createChinaTavernLabor}=await import('../source/game/china-tavern-labor.js');
const {createChinaTavernEmployment}=await import('../source/game/china-tavern-employment.js');
const {createFranceGardenerLabor}=await import('../source/game/france-gardener-labor.js');
const {createFranceGardenerEmployment}=await import('../source/game/france-gardener-employment.js');
const {createFranceGardener}=await import('../source/game/france-gardener.js');
const {FRANCE_GARDENER:P}=await import('../source/game/france-gardener-place.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(t,role,saved={}){
 const store=copy(saved),clock={day:1,hour:8,seconds:0,...store.clock},flags={labor:false,career:false,bank:false,cleanup:false,paidCleanup:false};
 const save=key=>next=>{if(flags[key]||key==='labor'&&flags.cleanup&&next.job===null||key==='career'&&flags.paidCleanup&&next.lastDuty?.stage==='paid')return false;store[key]=copy(next);store.clock=copy(clock);};
 const bank=createCurrencyLedger({saved:store.bank,saveState:save('bank')});
 const careers=createFormalCareers({saved:store.career,saveState:save('career'),getClock:()=>clock,creditWageToBank:bank.creditWageToBank});
 const group=new T.Group();function person(point){const root=new T.Group(),hands=[new T.Object3D(),new T.Object3D()];root.add(...hands);root.userData.hands=hands;root.position.set(...point);group.add(root);return {ageYears:22,root,walking:false,route:[],characterScale:1,locomotion:{walkSpeed:2},animate(){}};}
 const garden=role.id===GARDEN.id,player=person(garden?P.registration:[22.35,.215,11.7]);let labor,employment,gardener;
 if(garden){const actor=person(P.approach);actor.station={id:P.id,npcAction:'garden'};
  gardener=createFranceGardener({npcs:[actor],lot:{group,walkableSurfaces:[]},doors:{routeStep(route,p){while(route[0]&&p.distanceTo(route[0])<.035)route.shift();return {waypoint:route[0]};}},planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,x,z)=>{n.root.position.x+=x;n.root.position.z+=z;},poseContext:n=>n.poseContext??={},getPlayer:()=>player,getBorrowedPose:()=>labor?.toolPose(),worldSeed:1});
  employment=createFranceGardenerEmployment({saved:store.employment,saveState:save('employment'),getJob:()=>labor?.state().job,meetHost:()=>labor.meetHost()});
 }else employment=createChinaTavernEmployment({saved:store.employment,saveState:save('employment'),getJob:()=>labor?.state().job,meetHost:()=>labor.meetHost()});
 const props={employment,careers,getClock:()=>clock,getPlayer:()=>player,copperLedger:bank,saved:store.labor,saveState:save('labor'),onCompleted:job=>careers.completedLowerWork({source:role.workSource,receiptId:job.receiptId}),document:null};
 labor=garden?createFranceGardenerLabor({...props,gardener}):createChinaTavernLabor({...props,host:{walking:false,root:{position:{x:24.1,y:.215,z:11.4}},station:{npcPosition:[24.1,.215,11.4]}}});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock.seconds+=.1;labor.update(.1);gardener?.update(.1,clock.seconds);}};
 const move=point=>{player.root.position.set(...point);player.walking=false;};
 const execute=(kind,expected=true)=>{const intent=labor.intent(kind);assert(intent,`missing ${kind}`);move(intent.position);assert.equal(labor.executeIntent(intent),expected,`execute ${kind}`);return intent;};
 const visit=(kind,expected=true)=>{const intent=execute(kind,expected);for(let n=0;n<1000&&labor.state().waitingForHost;n++)tick();assert(!labor.state().waitingForHost);return intent;};
 const act=kind=>{execute(kind);tick(kind==='take'||kind==='return'?15:51);};
 const finish=()=>{visit('accept');if(garden){act('take');act('water');act('water');act('return');}else{act('clean');act('clean');}assert.equal(labor.state().job.stage,'ready');};
 const train=()=>{visit('apply');for(let i=0;i<2;i++){finish();visit('claim');}assert.equal(careers.state().skills[garden?'gardening':'ritual'],2);};
 t.after(()=>{labor.dispose();gardener?.dispose();});return {store,clock,flags,bank,careers,labor,employment,gardener,player,tick,move,execute,visit,act,finish,train};
}
for(const role of [TAVERN,GARDEN])await test(`${role.id}: real practice, local acceptance, tools/work, native bank salary, daily lock and reload`,t=>{
 const f=fixture(t,role),garden=role.id===GARDEN.id;
 const apply=f.labor.intent('formal-apply');f.move([0,0,0]);assert.equal(f.labor.executeIntent(apply),false);
 f.visit('formal-apply',garden);assert.equal(f.careers.isHired(role.id),false);f.train();
 const temporaryPay=garden?12:24;assert.equal(f.bank.state().bank,temporaryPay);assert.equal(f.bank.state().cash,0);
 f.finish();assert.equal(f.labor.intent('formal-apply'),null);assert.equal(f.labor.formal.apply(),false,'earned temporary slip blocks formal hire');
 f.visit('claim');assert.equal(f.bank.state().bank,temporaryPay+(garden?6:12));
 f.visit('formal-apply');assert(f.careers.isHired(role.id));assert.equal(f.careers.catalogue().find(r=>r.id===role.id).vacancy,0);
 const earnedCash=f.bank.state().cash,bankBefore=f.bank.state().balances[role.currency].bank;f.visit('accept');assert.equal(f.labor.state().job.formalRoleId,role.id);
 assert.equal(f.labor.intent('formal-resign'),null);
 if(garden){f.act('take');f.act('water');assert.equal(f.gardener.loanState().toolHolder,'player');}else f.act('clean');
 const reload=fixture(t,role,f.store);assert(reload.careers.isHired(role.id));assert.equal(reload.labor.state().job[garden?'completedBeds':'completedTables'],1);
 if(garden){reload.act('take');reload.act('water');assert.equal(reload.careers.state().lastDuty.stage,'working');reload.act('return');assert.equal(reload.gardener.loanState().toolHolder,'rack');}else reload.act('clean');
 assert.equal(reload.careers.state().lastDuty.stage,'inspection');assert.equal(reload.bank.state().balances[role.currency].bank,bankBefore);
 reload.clock.day=2;assert(reload.careers.observeDay().ok);assert.equal(reload.careers.state().lastDuty.stage,'inspection','finished wages survive a delayed employer meeting');
 reload.flags.bank=true;reload.visit('claim',garden);assert.equal(reload.careers.state().lastDuty.stage,'ready');assert.equal(reload.bank.state().cash,earnedCash);
 reload.flags.bank=false;reload.flags.paidCleanup=true;reload.tick(51);assert.equal(reload.bank.state().balances[role.currency].bank,bankBefore+role.wage+1);assert.equal(reload.bank.state().cash,earnedCash);assert(reload.labor.state().job);
 const paid=fixture(t,role,reload.store);paid.tick(51);assert.equal(paid.careers.state().lastDuty.stage,'paid');assert.equal(paid.labor.state().job,null);assert.equal(paid.bank.state().balances[role.currency].bank,bankBefore+role.wage+1);
 assert.equal(paid.careers.state().lastEvaluation.evaluatorId,role.supervisorId);assert.equal(paid.careers.state().performance,1);
 paid.clock.hour=13;paid.finish();paid.visit('claim');assert.equal(paid.bank.state().balances[role.currency].bank,bankBefore+role.wage*2+1,'afternoon no punctuality bonus');
 assert.equal(paid.labor.accept(),false,'one formal shift per day');assert.equal(paid.bank.state().cash,earnedCash);
 assert.equal(paid.bank.history().filter(tx=>tx.action==='wage'&&tx.requestId.startsWith('career:')).length,2);
});
await test('formal start failures, cancel/expiry and v1 clerk migration remain safe',t=>{
 const f=fixture(t,TAVERN);f.train();f.visit('formal-apply');f.flags.labor=true;f.visit('accept',false);assert.equal(f.labor.state().job,null);assert.equal(f.careers.state().lastDuty.stage,'working');
 const receipt=f.careers.state().lastDuty.workReceiptId;f.flags.labor=false;assert(f.bank.earn(1,'unrelated-progress').ok);f.visit('accept');assert.equal(f.labor.state().job.receiptId,receipt,'recover the original work slip after split save failure');
 f.act('clean');f.clock.day=2;f.careers.observeDay();assert.equal(f.labor.intent('clean'),null);assert(f.labor.cancel());assert.equal(f.careers.state().performance,-1);
 f.clock.hour=8;f.finish();f.visit('claim');assert.equal(f.careers.state().performance,0);
 const fresh=createFormalCareers({saveState:()=>{},getClock:()=>({day:1,hour:8,seconds:0})}).state();delete fresh.loadError;delete fresh.lastError;fresh.version=1;delete fresh.skills.gardening;delete fresh.daily.gardening;delete fresh.lowerWork['fr-garden-labor'];fresh.skills.ritual=3;fresh.skills.writing=2;
 fresh.tenure={roleId:'cn-court-clerk',slotId:'cn-court-clerk-1',sinceDay:1,sinceHour:8};
 const migrated=createFormalCareers({saved:fresh,saveState:()=>{},getClock:()=>({day:1,hour:8,seconds:0})});assert.equal(migrated.state().loadError,null);assert(migrated.isHired());assert.deepEqual(migrated.state().skills,{ritual:3,writing:2,gardening:0});assert.deepEqual(migrated.state().tenure,fresh.tenure);
});
await test('expired garden shift can return and release the original can even after two beds',t=>{
 const f=fixture(t,GARDEN);f.train();f.visit('formal-apply');f.visit('accept');f.act('take');f.act('water');f.act('water');f.clock.day=2;f.careers.observeDay();
 assert(f.labor.state().formalExpired);assert(f.labor.cancel());f.act('return');assert.equal(f.labor.state().job,null);assert.equal(f.gardener.loanState().owner,null);assert.equal(f.bank.state().balances.france.bank,0);assert.equal(f.careers.state().performance,-1);
});
for(const role of [TAVERN,GARDEN])await test(`${role.id}: rejected completion writes retain earned physical work across day/reload`,t=>{
 const f=fixture(t,role),garden=role.id===GARDEN.id;f.train();f.visit('formal-apply');f.visit('accept');
 if(garden){f.act('take');f.act('water');f.act('water');}else f.act('clean');
 f.flags.career=true;f.act(garden?'return':'clean');assert.equal(f.careers.state().lastDuty.stage,'working');assert.equal(f.labor.state().job.stage,'working');
 f.flags.career=false;f.flags.labor=true;f.act(garden?'return':'clean');assert.equal(f.careers.state().lastDuty.stage,'inspection');assert.equal(f.labor.state().job.stage,'working');
 f.store.clock={...f.clock,day:2};const loaded=fixture(t,role,f.store);assert.equal(loaded.careers.state().loadError,null);
 if(garden){loaded.act('take');loaded.act('return');}else loaded.act('clean');
 loaded.visit('claim');assert.equal(loaded.bank.state().balances[role.currency].bank,(garden?0:24)+role.wage+1);assert.equal(loaded.careers.state().performance,1);
 assert.equal(loaded.bank.history().filter(tx=>tx.action==='wage'&&tx.requestId.startsWith('career:')).length,1);
});
