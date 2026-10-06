import assert from 'node:assert/strict';
import {fixture} from './china-host-needs.mjs';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
import {createClinicNPCEconomy} from '../source/game/china-clinic-npc-economy.js';
import {createClinicNPCDutyObserver} from '../source/game/china-clinic-npc-duty.js';
import {ROYAL_KITCHEN_ROLE as ROYAL} from '../source/game/china-royal-kitchen-role.js';
import {CLINIC_PHYSICIAN_ROLE as DOCTOR} from '../source/game/formal-careers.js';
import {createClinicNeeds} from '../source/game/china-clinic-needs.js';
import {CHINA_CLINIC as CLINIC} from '../source/game/china-clinic.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
const copy=structuredClone,ID='cn-cooking',OTHER='cn-distinct-person';
function earnedRoyal(account,actorId=ID,day=1,hours=1.5){const coverage=[{actorId,roleId:ROYAL.id,slotId:ROYAL.slotId,holderRevision:day}];let t=(day*1440+360-600)/RATE,end=t+hours*60/RATE;account.observe({seconds:t,dt:.25,coverage});while(t<end){const dt=Math.min(.25,end-t);t+=dt;account.observe({seconds:t,dt,coverage});}assert(account.checkpoint({day,hour:18}));}
function earnedClinic(account,actorId=ID,day=2,hours=1.25){const observer=createClinicNPCDutyObserver({saveState:()=>true}),coverage=[{actorId,roleId:DOCTOR.id,slotId:DOCTOR.slotId,holderRevision:day}];let t=(day*1440+360-600)/RATE,end=t+hours*60/RATE;observer.observe({seconds:t,dt:.25,coverage});while(t<end){const dt=Math.min(.25,end-t);t+=dt;observer.observe({seconds:t,dt,coverage});}const proof=observer.seal({actorId,roleId:DOCTOR.id,day,currentDay:day,currentHour:18,pendingOrders:false});assert(proof);assert(account.settle(proof).ok);}
function setup(saved,{actorId=ID,fund=true,authority='clinic',legacy=false}={}){
 let game=copy(saved||{}),f=null,fail=false,onSave=null,currentAuthority=authority;
 const store=patch=>{onSave?.();if(fail)return false;Object.assign(game,copy(patch));if(f)Object.assign(f.game,copy(patch));return true;};
 const royal=createNPCDutyAccount({role:ROYAL,namespace:'chinaRoyalKitchenAccounts',saved:game.chinaRoyalKitchenAccounts,saveState:(s,r,p={})=>store({...p,chinaRoyalKitchenAccounts:s})});
 const clinic=createClinicNPCEconomy({saved:game.chinaClinicNPCEconomy,saveState:(s,r,p={})=>store({...p,chinaClinicNPCEconomy:s})});
 if(!saved&&fund){earnedRoyal(royal,actorId);earnedClinic(clinic,actorId);earnedClinic(clinic,OTHER,3);}
 const aggregate=createNPCGuestAccounts([{id:'china-royal-kitchen-accounts',economy:royal},{id:'china-clinic-npc-economy',economy:clinic}],{saved:game.chinaGuestMealAccounts,saveState:(s,p)=>store({...p,chinaGuestMealAccounts:s})});
 function scene(){const guest={station:{id:actorId,npcName:actorId,npcPosition:[24,.215,10]},root:{position:{x:24,y:.215,z:10,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}},rotation:{y:0}},route:[],phase:0,alive:true,animate(){}};f=fixture(game,{extraActors:[guest],sceneOptions:{guestEconomy:aggregate,clinicEconomy:clinic,...(!legacy?{personalMealEconomy:aggregate}:{}),canBorrowGuest:id=>id===actorId&&['guest','both'].includes(currentAuthority),canBorrowClinic:id=>id===actorId&&['clinic','both'].includes(currentAuthority)}});f.hungry(false);f.needs.set(actorId,{seekMeal:true,seekToilet:false});return {...f,guest};}
 return {royal,clinic,aggregate,scene,actorId,get game(){return copy(f?.game||game);},fail:value=>fail=value,onSave:fn=>onSave=fn,authority:value=>currentAuthority=value};
}
const snapshot=f=>({royal:f.royal.snapshot(),clinic:f.clinic.snapshot(),aggregate:f.aggregate.snapshot(),game:f.game});
for(const authority of ['clinic','guest']){
 const f=setup(null,{authority}),s=f.scene(),register=authority==='clinic'?'registerClinicPerson':'registerGuestPerson',request=authority==='clinic'?'requestClinicMeal':'requestGuestMeal',cancel=authority==='clinic'?'cancelClinicMeal':'cancelGuestMeal';
 assert.equal(f.royal.account(ID).bank,4);assert.equal(f.clinic.account(ID).bank,3);assert.equal(f.aggregate.account(ID).bank,7);assert(s.scene[register](ID));assert(s.scene[request](ID));s.until(()=>s.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'same original host receives earned4+3');assert.equal(f.aggregate.account(ID).bank,1);assert.equal(f.clinic.account(OTHER).bank,3);
 const saved=f.game,reloaded=setup(saved,{authority}),r=reloaded.scene();assert.equal(r.scene.state().loadError,null);assert.equal(reloaded.aggregate.account(ID).bank,1);const before=snapshot(reloaded),world=copy(r.scene.snapshot());reloaded.fail(true);assert.equal(r.scene[cancel](ID),false);assert.deepEqual(snapshot(reloaded),before);assert.deepEqual(copy(r.scene.snapshot()),world);reloaded.fail(false);r.guest.alive=false;assert(r.scene[cancel](ID));assert.equal(reloaded.royal.account(ID).bank,4);assert.equal(reloaded.clinic.account(ID).bank,3);assert.equal(reloaded.clinic.account(OTHER).bank,3);assert.equal(r.scene[cancel](ID),false);assert.equal(setup(reloaded.game,{authority}).aggregate.loadError,null);
 const consumed=setup(saved,{authority}),c=consumed.scene();c.until(()=>!c.scene[authority==='clinic'?'clinicMeal':'guestMeal'](ID),'one original plate consumed');assert.equal(consumed.aggregate.account(ID).bank,1);assert.equal(consumed.aggregate.snapshot().transfers.length,1);
}
console.log('PASS observer-earned clinic3 plus real guest4 in both meal categories: original6 meal, atomic failure/reload, death/exact refund once, other person unchanged and delivered plate never refunded');

for(const actorId of [ID,DOCTOR.incumbentId]){
 const f=setup(null,{actorId,authority:'clinic'}),s=f.scene();assert(s.scene.registerClinicPerson(actorId));const before=copy(s.scene.snapshot());f.authority('both');assert.equal(s.scene.registerGuestPerson(actorId),false);assert.equal(s.scene.requestClinicMeal(actorId),false,'preexisting category does not bypass exclusive current borrower');f.authority('neither');assert.equal(s.scene.registerGuestPerson(actorId),false);assert.deepEqual(copy(s.scene.snapshot()),before);
 f.authority('guest');s.reject(true);assert.equal(s.scene.registerGuestPerson(actorId),false);assert.deepEqual(copy(s.scene.snapshot()),before);s.reject(false);assert(s.scene.registerGuestPerson(actorId));assert(!s.scene.snapshot().clinicPeople.includes(actorId));assert(s.scene.snapshot().guestPeople.includes(actorId));
 assert(s.scene.requestGuestMeal(actorId));f.authority('clinic');assert.equal(s.scene.registerClinicPerson(actorId),false,'unpaid original lease cannot change category');f.authority('guest');s.until(()=>s.scene.snapshot().orders.some(o=>o.customerId===actorId&&o.payment==='reserved'),'original guest reserve');f.authority('clinic');const held=copy(s.scene.snapshot());assert.equal(s.scene.registerClinicPerson(actorId),false,'prepaid original lease cannot change category');assert.deepEqual(copy(s.scene.snapshot()),held);assert(s.scene.cancelGuestMeal(actorId));assert(s.scene.registerClinicPerson(actorId));assert(!s.scene.snapshot().guestPeople.includes(actorId));assert(s.scene.snapshot().clinicPeople.includes(actorId));assert.equal(f.aggregate.account(actorId).bank,7);
}
console.log('PASS authorized idle clinic↔guest registration only, including original doctor identity; dual/no owner and failed save refuse; active unpaid/prepaid order never reclassified');

// Legacy clinic orders have no aggregate marker and remain pinned to clinic even
// when the same person later earns elsewhere or loses the current borrower.
const old=setup(null,{fund:false,authority:'clinic',legacy:true});earnedClinic(old.clinic,ID,1,3);const os=old.scene();assert(os.scene.registerClinicPerson(ID));assert(os.scene.requestClinicMeal(ID));os.until(()=>os.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'old clinic-only payment');earnedRoyal(old.royal,ID,2);const loaded=setup(old.game,{authority:'neither'}),ls=loaded.scene();assert.equal(ls.scene.clinicMeal(ID).accountProvider,'china-clinic-npc-economy');const original=loaded.royal.account(ID).bank;ls.guest.alive=false;assert(ls.scene.cancelClinicMeal(ID));assert.equal(loaded.clinic.account(ID).bank,7);assert.equal(loaded.royal.account(ID).bank,original);assert.equal(loaded.aggregate.snapshot().transfers.length,0);
const meal={actorId:ID,orderId:'cn-tavern-order-99',amount:6};assert(loaded.clinic.prepareMealPayment(meal).commit().ok);assert(loaded.clinic.prepareMealRefund(meal).commit().ok);assert.equal(loaded.clinic.prepareMealPayment(meal).ok,false,'refunded payment never reopens through replay');
console.log('PASS legacy prepaid clinic source survives additional guest income and death; original clinic receipt refunded exactly; payment replay after refund rejected');

const poor=setup(null,{fund:false});earnedRoyal(poor.royal);const p=poor.scene();assert(p.scene.registerClinicPerson(ID));const noOrder=copy(p.scene.snapshot());assert.equal(p.scene.requestClinicMeal(ID),false);assert.deepEqual(copy(p.scene.snapshot()),noOrder);
const stale=setup(),candidate=stale.aggregate.prepareMealPayment(meal);earnedClinic(stale.clinic,ID,4);const changed=snapshot(stale);assert.equal(candidate.commit().ok,false);assert.deepEqual(snapshot(stale),changed);
const locked=setup(),prepared=locked.aggregate.prepareMealPayment(meal);locked.onSave(()=>{assert.equal(locked.clinic.prepareMealPayment({...meal,orderId:'cn-tavern-order-100',amount:1}).ok,false);assert.equal(locked.clinic.settle(locked.clinic.snapshot().receipts[0].evidence).ok,false);});assert(prepared.commit().ok);locked.onSave(null);assert.equal(setup(locked.game).aggregate.loadError,null);
const zero=setup(null,{fund:false});earnedRoyal(zero.royal,ID,1,3);earnedClinic(zero.clinic,ID);const zeroCandidate=zero.aggregate.prepareMealPayment(meal);zero.onSave(()=>assert.equal(zero.clinic.prepareMealPayment({...meal,amount:1}).ok,false));assert(zeroCandidate.commit().ok);zero.onSave(null);assert.equal(setup(zero.game).aggregate.loadError,null);
const bad=copy(locked.game);bad.chinaClinicNPCEconomy.accounts[ID].bank++;const rejected=setup(bad);assert(rejected.clinic.loadError);assert.equal(rejected.aggregate.account(ID),null);assert.deepEqual(rejected.clinic.snapshot(),bad.chinaClinicNPCEconomy);assert.equal(rejected.aggregate.prepareMealRefund(meal).ok,false);
console.log('PASS insufficient total produces no order, stale clinic income rejects, participating/zero-portion clinic locks prevent reentry, rejected strict evidence retained without mutation');

// Actual clinic needs consumer at a safe role boundary. Direct-route fixture,
// not proof that a retained former controller releases this body in production.
for(const sufficient of [false,true]){
 const funds=setup(null,{fund:sufficient});if(!sufficient)earnedRoyal(funds.royal);
 const point=CLINIC.points.doctor,n={station:{id:ID},alive:true,root:{position:{x:point[0],y:point[1],z:point[2]}}};let mayDepart=false;
 const life=createClinicNeeds({getHolder:role=>role==='physician'?{status:'npc',available:true,alive:true,holderId:ID}:null,getActor:id=>id===ID?n:null,canDepart:()=>mayDepart,sharedNeeds:{has:()=>true,status:()=>({seekMeal:true,seekToilet:false})},economy:funds.aggregate,getTavern:()=>({publicToiletRoute:()=>[[16.9,.215,9.1]],clinicMeal:()=>null}),getToilet:()=>({publicIntent:()=>({position:[16.9,4.015,10]})}),travel:()=>false,pose:()=>{},resetRoute:()=>{},saveState:()=>true});
 const before=snapshot(funds);life.update(1,1);
 if(sufficient){assert.equal(life.snapshot().task.phase,'draining','original patient/work gate is preserved');mayDepart=true;life.update(.1,1.1);assert.equal(life.snapshot().task.phase,'go-meal');assert.equal(life.snapshot().task.actorId,ID);}else assert.equal(life.snapshot().task,null);
 assert.deepEqual(snapshot(funds),before,'eligibility and safe departure do not mutate wage or meal accounts');life.dispose({suspend:true});
}
console.log('PASS actual clinic-needs consumer waits for original work boundary then departs on clinic3+guest4, while guest4 alone stays put; no account/body reassignment');

const exhausted=setup(null,{fund:false});earnedRoyal(exhausted.royal,ID,1,1.25);earnedClinic(exhausted.clinic,ID);assert.equal(exhausted.aggregate.account(ID).bank,6);assert(exhausted.aggregate.prepareMealPayment(meal).commit().ok);assert.equal(exhausted.aggregate.account(ID).bank,0);assert(exhausted.clinic.hasIncome(ID));assert(exhausted.aggregate.providerFor(ID));const exhaustedReload=setup(exhausted.game);assert(exhaustedReload.aggregate.prepareMealRefund(meal).commit().ok);assert.equal(exhaustedReload.clinic.account(ID).bank,3);assert.equal(exhaustedReload.royal.account(ID).bank,3);
console.log('PASS clinic+guest zero-total original payer survives reload and restores exact original3+3 sources once');
