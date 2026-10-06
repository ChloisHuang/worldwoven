// Real kitchen, inventory and daily-needs with route doubles. These checks
// reproduce duplicate/replayed meals and interrupted seat/identity ownership.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createChinaRoyalKitchenService,ROYAL_KITCHEN_POINTS:P}=await import('../source/game/china-royal-kitchen-service.js');
const {createChinaRoyalPlayerMeal}=await import('../source/game/china-royal-player-meal.js');
const {createDailyNeeds}=await import('../source/game/daily-needs.js');
const {createRoyalKitchenOrders,validRoyalKitchenState}=await import('../source/game/china-royal-kitchen-orders.js');
const copy=x=>JSON.parse(JSON.stringify(x)),EL={eligible:true,actorId:'player',titleId:'consort',appointmentId:'consort-appointment:consort-petition:player:1',appointmentReceiptId:'physical-charter-reading-1'},SEAT='china-palace-dining-seat-19.8';
function fixture(saved={}){
 const store=copy(saved),clock={day:2,hour:10,seconds:5000,...store.clock},flags={eligible:true,proof:EL.appointmentReceiptId,age:24,job:null,occupied:null,saveFail:false,needsFail:false};
 const group=new T.Group(),actor=(id,p)=>{const root=new T.Group();root.position.set(...p);group.add(root);return {root,station:{id,npcName:id,ageYears:30},ageYears:30,phase:0,route:[],walking:false,locomotion:{walkSpeed:12},animate(){}};};
 const jia=actor('cn-cooking',P.host),player=actor('player',[19.8,.215,-4.8]);player.ageYears=24;
 const seats=[{id:SEAT,position:[19.8,.215,-3.8],anchor:[19.8,.215,-4.8]},{id:'china-palace-dining-seat-22.2',position:[22.2,.215,-3.8],anchor:[22.2,.215,-4.8]}];let mounted=store.unmounted?null:seats[0];
 const eligible=()=>flags.eligible?{...copy(EL),appointmentReceiptId:flags.proof}:{eligible:false,actorId:'player',titleId:null,appointmentId:null};
 const needs=createDailyNeeds({saved:store.needs,getClock:()=>clock,getRoyalMealEligibility:()=>player.ageYears>=18?eligible():null,saveState:s=>{if(flags.needsFail)return false;store.needs=copy(s);return true;}});needs.enter('china',['cn-cooking']);
 const kitchen=createChinaRoyalKitchenService({npcs:[jia],lot:{group},doors:{routeStep(route,p){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.03)route.shift();return {waypoint:route[0],phase:'walking'};}},planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(a,x,z)=>{a.root.position.x+=x;a.root.position.z+=z;a.root.position.y=a.route[0]?.y??a.root.position.y;},poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>mounted,getPlayerSeat:()=>mounted,getPlayerMealEligibility:eligible,getSeatOccupant:()=>flags.occupied,getEmployment:()=>flags.job,isHired:()=>!!flags.job,getClock:()=>clock,sharedNeeds:needs,saved:store.kitchen,saveState:s=>{if(flags.saveFail)return false;store.kitchen=copy(s);return true;}});
 const meal=createChinaRoyalPlayerMeal({kitchen,furniture:{items:seats},getPlayer:()=>player,getMounted:()=>mounted,onMountSeat:s=>{mounted=s;player.root.position.set(...s.anchor);},canChooseSeat:()=>{flags.geometryChecks=(flags.geometryChecks||0)+1;return !flags.occupied;}});
 const tick=(n=1,state={})=>{for(let i=0;i<n;i++){clock.seconds+=.1;kitchen.update(.1,clock.seconds,state);meal.update();}};
 const until=(fn,label,max=1500)=>{for(let i=0;i<max&&!fn();i++)tick();assert(fn(),label);};
 const request=()=>{const i=meal.intent('request',SEAT);assert(i);assert(meal.executeIntent(i));return kitchen.mealFor('player');};
 const checkpoint=()=>({...copy(store),kitchen:kitchen.snapshot(),needs:needs.snapshot(),clock:copy(clock),unmounted:!mounted});
 return {flags,group,player,jia,seats,meal,kitchen,needs,tick,until,request,checkpoint,unmount:()=>{mounted=null;}};
}
test('only a current adult appointment grants access; original seat and real kitchen handover are required',()=>{
 const f=fixture();for(const status of ['submitted','rejected','accepted','charter-held']){f.flags.eligible=false;assert.equal(f.meal.intent('request'),null,status);assert.equal(f.kitchen.requestMeal({actorId:'player',seatId:SEAT}),null);}
 f.flags.eligible=true;f.flags.proof=null;assert.equal(f.meal.availability().code,'not-appointed');f.flags.proof=EL.appointmentReceiptId;f.player.ageYears=17;assert.equal(f.meal.availability().code,'adult-required');f.player.ageYears=24;
 f.flags.job={stage:'working',receiptId:'cn-royal-kitchen-labor-1',day:2};assert.equal(f.meal.availability().code,'finish-kitchen-duty');f.flags.job=null;
 f.flags.occupied='cn-emperor';assert.equal(f.meal.availability().code,'seat-busy');assert.equal(f.kitchen.requestMeal({actorId:'player',seatId:SEAT}),null);f.flags.occupied=null;
 f.unmount();assert.equal(f.kitchen.requestMeal({actorId:'player',seatId:SEAT}),null,'remote direct request cannot invent a seated diner');assert.equal(f.kitchen.supplyState().remaining,120);
});
test('one original portion travels through Jia, survives reload, and only twelve seated seconds grant one shared meal',()=>{
 const f=fixture(),o=f.request();assert.equal(f.kitchen.requestMeal({actorId:'player',seatId:SEAT}).id,o.id);assert.equal(f.kitchen.supplyState().remaining,120);
 f.until(()=>f.kitchen.mealReady(o.id,'player'),'same Jia delivers original portion');assert.equal(f.kitchen.supplyState().remaining,119);assert.equal(f.kitchen.state().heldMeals.length,1);
 assert(f.meal.executeIntent(f.meal.intent('eat')));assert.equal(f.meal.playerPose()?.seatedMeal,true);f.tick(30,{conversationActorId:'cn-cooking'});assert.equal(f.kitchen.mealProgress(o.id),0);assert.equal(f.meal.playerPose(),null);f.tick(60);assert.equal(f.kitchen.mealFor('player').stage,'eating');assert.equal(f.needs.snapshot().people.player.receipts['china-royal-kitchen'],undefined);
 const g=fixture(f.checkpoint());g.tick(61);assert.equal(g.kitchen.mealFor('player').stage,'consumed');assert.equal(g.kitchen.mealReceipts()[0].mealId,o.id+'-meal');assert.equal(g.needs.hunger('player'),0);assert.equal(g.kitchen.supplyState().remaining,119);
 g.tick(30);const hunger=g.needs.hunger('player');assert(g.kitchen.completeMeal(o.id,'player'));assert.equal(g.needs.hunger('player'),hunger);assert.equal(g.needs.snapshot().people.player.receipts['china-royal-kitchen'],o.number);assert.equal(g.kitchen.workReceipts().length,0);
});
test('failed writes cannot mint orders, food or nutrition; consumed outbox repairs failed needs save once',()=>{
 const f=fixture();f.flags.saveFail=true;const stale=f.meal.intent('request');assert.equal(f.meal.executeIntent(stale),false);assert.equal(f.kitchen.snapshot().orders.serial,0);f.flags.saveFail=false;const o=f.request();assert.equal(f.meal.executeIntent(stale),false);
 f.flags.saveFail=true;f.tick(150);assert.equal(f.kitchen.supplyState().remaining,120);assert.equal(f.kitchen.state().heldMeals.length,0);f.flags.saveFail=false;f.until(()=>f.kitchen.mealReady(o.id,'player'),'retry same order');assert(f.meal.executeIntent(f.meal.intent('eat')));
 f.flags.saveFail=true;f.tick(125);assert.equal(f.kitchen.mealFor('player').stage,'eating');assert.equal(f.needs.snapshot().people.player.receipts['china-royal-kitchen'],undefined);
 f.flags.saveFail=false;f.flags.needsFail=true;f.tick();assert.equal(f.kitchen.mealFor('player').stage,'consumed');assert.equal(f.needs.snapshot().people.player.receipts['china-royal-kitchen'],undefined);
 const g=fixture(f.checkpoint());g.flags.proof='different-reading';assert.equal(g.needs.mealReceipts(g.kitchen.mealReceipts()),false,'ordinary receipt path cannot use changed current proof');g.tick();assert.equal(g.kitchen.mealReceipts().length,1,'historical consumption stays visible after evidence changes');assert(g.needs.hunger('player')<.001);assert.equal(g.needs.snapshot().people.player.receipts['china-royal-kitchen'],o.number);assert.equal(g.kitchen.supplyState().remaining,119);
});
test('cancellation, lost seat and underage restore write off only the original prepared portion without relief',()=>{
 const early=fixture();early.request();assert(early.meal.cancel());assert.equal(early.kitchen.supplyState().remaining,120);
 const f=fixture(),o=f.request();f.until(()=>f.kitchen.mealFor('player').stage==='prepared','prepared portion');f.flags.saveFail=true;assert.equal(f.meal.leaveSeat(SEAT),false);assert.equal(f.kitchen.mealFor('player').stage,'prepared');f.unmount();f.tick(200);assert.equal(f.kitchen.mealFor('player').stage,'prepared');assert.equal(f.kitchen.supplyState().remaining,119);f.flags.saveFail=false;f.tick();assert.equal(f.kitchen.mealFor('player').stage,'cancelled');assert.equal(f.kitchen.supplyState().wasted,1);
 const g=fixture();g.request();g.until(()=>g.kitchen.mealFor('player').stage==='prepared','prepared before restore');const h=fixture(g.checkpoint());h.player.ageYears=17;h.tick();assert.equal(h.kitchen.mealFor('player').stage,'cancelled');assert.equal(h.kitchen.supplyState().wasted,1);assert.equal(h.needs.snapshot().people.player.receipts['china-royal-kitchen'],undefined);
 const busy=fixture();busy.request();busy.flags.occupied='cn-consort-yue';busy.tick();assert.equal(busy.kitchen.mealFor('player').stage,'cancelled');assert.equal(busy.kitchen.supplyState().remaining,120);
 assert(validRoyalKitchenState(f.kitchen.snapshot().orders));
});
test('orders cannot claim the diner as own kitchen worker, and exhausted inventory survives player retry',()=>{
 let saved;const orders=createRoyalKitchenOrders({getPlayerMealEligibility:()=>EL,saveState:s=>{saved=s;return true;}});
 const o=orders.request({actorId:'player',seatId:SEAT});assert(o);assert.equal(orders.claim('cn-royal-kitchen-labor-1',2),false);assert.equal(orders.request({actorId:'player',seatId:SEAT,workerId:'player',workReceiptId:'cn-royal-kitchen-labor-1'}),null);assert(orders.cancel('player'));
 for(let i=0;i<120;i++){const n=orders.request({actorId:'cn-emperor',seatId:SEAT});assert(orders.prepare(n.id));assert(orders.cancel('cn-emperor'));}
 assert.equal(orders.request({actorId:'player',seatId:SEAT}),null);const restored=createRoyalKitchenOrders({saved,getPlayerMealEligibility:()=>EL});assert.equal(restored.available('player'),false);assert.equal(restored.snapshot().supply.remaining,0);
});

test('a saved consumed portion repairs failed needs write after resignation and reload, without granting new dining rights',()=>{
 const f=fixture(),o=f.request();f.until(()=>f.kitchen.mealReady(o.id,'player'),'original meal served');assert(f.meal.executeIntent(f.meal.intent('eat')));
 f.flags.needsFail=true;f.tick(125);assert.equal(f.kitchen.mealFor('player').stage,'consumed');assert.equal(f.meal.active(),false);assert.equal(f.needs.snapshot().people.player.receipts['china-royal-kitchen'],undefined);
 f.flags.eligible=false;f.flags.proof=null;assert.equal(f.meal.availability().code,'not-appointed');assert.equal(f.meal.intent('request'),null);
 const g=fixture(f.checkpoint());g.flags.eligible=false;g.flags.proof=null;
 const receipt=g.kitchen.mealReceipts()[0],source=g.kitchen.snapshot().orders;
 assert.equal(g.needs.mealReceipts([receipt]),false,'no current title grants no ordinary receipt authority');
 g.tick();assert(g.needs.hunger('player')<.001,'saved consumed meal must repair needs after resignation');
 const uncredited=createDailyNeeds({getRoyalMealEligibility:()=>null});
 assert.equal(uncredited.royalMealReceipts([receipt],null),false,'a receipt alone cannot prove the source consumed order');
 const partial=copy(source);partial.orders[0].stage='eating';partial.orders[0].receipt=null;
 assert.equal(uncredited.royalMealReceipts([receipt],partial),false,'prepared or partial source cannot feed');
 for(const changed of [{mealId:'another-dish'},{eatingSeconds:11},{eligibility:{...receipt.eligibility,appointmentReceiptId:'another-reading'}}])assert.equal(uncredited.royalMealReceipts([{...receipt,...changed}],source),false);
 assert.equal(g.needs.snapshot().people.player.receipts['china-royal-kitchen'],o.number);assert.equal(g.kitchen.supplyState().remaining,119);
 assert.equal(g.kitchen.requestMeal({actorId:'player',seatId:SEAT}),null,'historical repair never authorizes a new meal');
 g.tick(30);const hunger=g.needs.hunger('player');assert(g.kitchen.completeMeal(o.id,'player'));assert.equal(g.needs.hunger('player'),hunger);assert.equal(g.needs.royalMealReceipts([receipt],source),false);
 const h=fixture(g.checkpoint());h.flags.eligible=false;h.flags.proof=null;const before=h.needs.hunger('player');h.tick();assert(h.needs.hunger('player')>=before,'second reload does not feed again');assert.equal(h.kitchen.snapshot().orders.serial,1);
});

test('HUD discovery rejects distant and ineligible diners before seat geometry; explicit menus retain real validation',()=>{
 const f=fixture();f.unmount();f.flags.eligible=false;f.flags.geometryChecks=0;for(let i=0;i<120;i++){assert.equal(f.meal.intent(),null);assert.equal(f.meal.nearbyIntent(),null);f.meal.view();}assert.equal(f.flags.geometryChecks,0);
 f.flags.eligible=true;f.player.root.position.set(0,0,39);for(let i=0;i<120;i++)assert.equal(f.meal.nearbyIntent(),null);assert.equal(f.flags.geometryChecks,0,'remote HUD is not an implicit seat-transfer query');
 assert(f.meal.intent('request',SEAT),'explicit remote menu still offers a properly validated auto-route');assert(f.flags.geometryChecks>0);f.flags.geometryChecks=0;f.player.root.position.set(...f.seats[0].position);assert(f.meal.nearbyIntent());assert(f.flags.geometryChecks>0);f.flags.geometryChecks=0;f.player.root.position.y+=3;assert.equal(f.meal.nearbyIntent(),null);assert.equal(f.flags.geometryChecks,0);
});
test('legacy moved dining seat preserves the same half-eaten royal meal until real reseating',()=>{
 const f=fixture(),o=f.request();f.until(()=>f.kitchen.mealReady(o.id,'player'),'original served meal');assert(f.meal.executeIntent(f.meal.intent('eat')));f.tick(25);const saved=f.checkpoint();delete saved.kitchen.layoutRevision;saved.unmounted=true;
 const g=fixture(saved),progress=g.kitchen.mealProgress(o.id),before=g.kitchen.supplyState();g.tick(40);assert.equal(g.kitchen.mealFor('player').id,o.id);assert.equal(g.kitchen.mealFor('player').stage,'eating');assert.equal(g.kitchen.mealProgress(o.id),progress);const resume=g.meal.menuDefinition().primary;assert.equal(resume.kind,'resume');assert.equal(g.meal.executeIntent(resume),false,'cannot resume from outside the current approach');g.player.root.position.set(...resume.position);assert(g.meal.executeIntent(resume));g.tick(100);assert.equal(g.kitchen.mealFor('player').stage,'consumed');assert.deepEqual(g.kitchen.supplyState(),before);assert.equal(g.kitchen.mealReceipts().length,1);
});
