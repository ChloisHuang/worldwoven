// Reproduces the hired-but-off-duty double incumbent: career tenure must own
// the slot, while the same NPC keeps an ordinary life and pending work survives.
// Props are inert and routes are deterministic; production-main owns collision QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {createFormalCareers,TAVERN_STEWARD_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createChinaTavernService} from '../source/game/china-tavern-service.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const root=fileURLToPath(new URL('../source/game/',import.meta.url));
const context=vm.createContext({console}),modules=new Map();
const position=(x=0,y=.215,z=0)=>({x,y,z,
  set(x,y,z){Object.assign(this,{x,y,z});return this;},
  toArray(){return [this.x,this.y,this.z];},
  copy(p){return this.set(p.x,p.y,p.z);},
  clone(){return position(this.x,this.y,this.z);},
  distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}
});
const navigation=new vm.SyntheticModule(['followActorRoute'],function(){
  this.setExport('followActorRoute',(n,dt)=>{
    const p=n.route[0];if(!p)return {};
    const d=n.root.position.distanceTo(p),step=Math.min(d,dt*3);
    if(d<.035){n.root.position.copy(p);n.route.shift();return {};}
    n.root.position.x+=(p.x-n.root.position.x)/d*step;
    n.root.position.y+=(p.y-n.root.position.y)/d*step;
    n.root.position.z+=(p.z-n.root.position.z)/d*step;
    n.walking=true;return {};
  });
},{context});
const props=new vm.SyntheticModule(['createTavernMealProps','createTavernDirtProps'],function(){
  this.setExport('createTavernMealProps',()=>({update(){},clear(){},state:()=>({}),dispose(){}}));
  this.setExport('createTavernDirtProps',()=>({update(){},dispose(){}}));
},{context});
const mealKit=new vm.SyntheticModule(['createPalaceMealKit'],function(){
  this.setExport('createPalaceMealKit',actor=>({show(value){actor.ownMealVisible=value;},sync(){},dispose(){}}));
},{context});
function module(file){
  if(!modules.has(file))modules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));
  return modules.get(file);
}
const sceneModule=module(path.join(root,'china-tavern-service-scene.js'));
await sceneModule.link((specifier,from)=>specifier.includes('actor-navigation')?navigation:specifier.includes('meal-props')?props:specifier.includes('china-palace-costume')?mealKit:module(path.resolve(path.dirname(from.identifier),specifier)));
await sceneModule.evaluate();

function fixture(saved=null,bank={amount:0,receipts:new Map()}){
  const stored=copy(saved||{}),clock=copy(saved?.clock||{day:1,hour:8,seconds:0});
  const flags={rejectCareerPaid:false};
  const careers=createFormalCareers({saved:stored.careers,worldSeed:26,getClock:()=>clock,
    saveState:next=>{if(flags.rejectCareerPaid&&next.lastDuty?.stage==='paid')return false;stored.careers=copy(next);},
    creditWageToBank:deposit=>{
      const prior=bank.receipts.get(deposit.receiptId);
      if(prior)return {ok:prior.amount===deposit.amount,replayed:true,receiptId:deposit.receiptId};
      bank.amount+=deposit.amount;bank.receipts.set(deposit.receiptId,copy(deposit));
      return {ok:true,receiptId:deposit.receiptId};
    }});
  if(!saved)for(const [skill,minimum]of Object.entries(ROLE.skillRequirements))for(let i=0;i<minimum;i++){
    const ticket=careers.learningTicket('cn-rest',skill+'-intro');assert(ticket.ok);
    assert(careers.completeLearning(ticket.ticket,{seconds:8}).ok);
  }
  const p={ageYears:24,root:{position:position(22.35,.215,11.7),rotation:{y:0}},walking:false};
  const ids=['cn-tavern-host','cn-tavern-cook','cn-tavern-assistant','cn-tavern-diner-west','cn-tavern-diner-east'];
  const names=['许安','沈禾','陆青','顾谨','周棠'];
  const homes=[[24.1,.215,11.4],[23.3,.215,9.36],[22,.215,14.1],[20,.215,22.4],[22,.215,22.4]];
  const npcs=ids.map((id,i)=>{
    const label={textContent:i===2?'服务助理':'酒楼居民'};
    return {station:{id,npcName:names[i],npcLabel:label.textContent,npcPosition:homes[i],ageYears:26},
      label:{querySelector:()=>label},root:{position:position(...homes[i]),rotation:{y:0},visible:true},
      home:position(...homes[i]),route:[],phase:0,walking:false,animate(t,walking,action){this.lastPose=action;}};
  });
  const items=[18.1,23.9].flatMap(x=>[-1,1].map(side=>({id:`china-tavern-dining-${x}-${side}`,kind:'seat',
    position:[x+1,.215,18.1+side*1.32],anchor:[x,.215,18.1+side*1.32],center:[x,.215,18.1+side*1.32],seatY:.9,yaw:0})))
    .concat(['lan','zhu'].map((id,i)=>({id:'china-tavern-bed-'+id,kind:'bed',position:[18+i*5,4.015,19.5],anchor:[18+i*5,4.015,18.5],center:[18+i*5,4.015,18.5],supportY:4.9,yaw:0})));
  const facilities=createFacilityQueue(),furniture={items,facilities,
    releaseActor:actor=>facilities.releaseActor(actor),
    standPoint:(nav,extra,seat)=>position(...seat.position)};
  const scene=sceneModule.namespace.createTavernServiceScene({npcs,lot:{group:{}},furniture,doors:{},
    planPath:(from,to)=>[position(to.x,to.y,to.z)],moveActor(){},poseContext:()=>({}),getPlayer:()=>p,getMounted:()=>null,
    getTenureRoleId:()=>careers.currentRole()?.id||null,getClock:()=>clock,worldSeed:26,
    saveState:next=>{stored.world=copy(next);},onReview:details=>careers.customerReview(details)});
  if(stored.world)assert(scene.restoreWorld(stored.world));else assert(scene.initializeWorld());
  const requested=[];
  const service=createChinaTavernService({meal:{staffScene:scene,view:()=>({order:null})},careers,getPlayer:()=>p,getClock:()=>clock,
    host:npcs[0],saved:stored.service,world:stored.world,saveState:next=>{stored.service=copy(next);},onIntent:next=>requested.push(next),document:null});
  if(saved?.continuity)assert(scene.restoreContinuity(saved.continuity),'current world checkpoint is restorable');
  if(saved?.actors)for(const n of npcs){const prior=saved.actors.find(a=>a.id===n.station.id);if(prior)n.root.position.set(...prior.position);}
  let t=saved?.continuity?.time||0;
  const movements=[],targets=new Set();
  const tick=(count=1)=>{for(let i=0;i<count;i++){
    const assistant=npcs[2],before=assistant.root.position.clone(),beforeMount=assistant.serviceMount;t+=.1;clock.seconds+=.1;clock.hour+=.1*.7/60;
    service.update(.1);scene.update(.1,t);service.update(0);
    assert.strictEqual(npcs.find(n=>n.station.id===ROLE.incumbentId),assistant,'incumbent object is never removed or replaced');
    assert(assistant.root.visible,'incumbent remains visible');
    const distance=before.distanceTo(assistant.root.position);
    if(!beforeMount&&!assistant.serviceMount)assert(distance<=.31,'incumbent walks continuously instead of teleporting');
    if(distance>.01)movements.push(distance);
    const target=scene.state().actors.find(a=>a.id===assistant.station.id)?.routeTarget;if(target)targets.add(target);
  }};
  const until=(pred,label,max=1000)=>{let count=0;while(!pred()&&count++<max)tick();const s=scene.state();assert(pred(),label+' '+JSON.stringify({stage:s.stage,revision:s.revision,orders:s.orders.map(o=>({id:o.id,stage:o.stage,holder:o.holder})),actors:s.actors,life:s.staffLife?.actors,events:s.staffLife?.events.slice(-5)}));};
  const choose=(kind,id=null)=>{
    const c=scene.choices().find(c=>c.kind===kind&&(!id||c.orderId===id));assert(c,kind+' is offered');
    p.root.position.set(...c.position);assert(scene.execute(c),kind+' executes');return c;
  };
  const snapshot=()=>({...copy(stored),clock:copy(clock),continuity:copy(scene.continuitySnapshot()),actors:copy(scene.state().actors)});
  return {scene,service,careers,clock,flags,bank,p,npcs,furniture,requested,tick,until,choose,snapshot,movements,targets};
}

const f=fixture(),incumbent=f.npcs[2];
assert.equal(f.careers.slotHolder(ROLE.id),ROLE.incumbentId);
assert(f.service.executeIntent(f.service.intent('formal-apply',ROLE.id)));
assert(f.careers.isHired(ROLE.id));
assert.equal(f.careers.slotHolder(ROLE.id),'player','formal tenure exclusively owns the slot');
assert.equal(f.careers.state().lastDuty,null,'hiring does not auto-start duty');
assert.equal(f.service.state().job,null,'hiring does not create physical work');
assert.equal(f.requested.length,0,'hiring never requests a player route');
assert.deepEqual(copy(f.scene.choices()),[],'off-duty tenure grants no active task choices');
f.until(()=>f.scene.state().orders.every(o=>o.stage==='pass'),'orders wait for the hired assistant to report');
assert.equal(f.scene.state().staffOwnership.assistant.holderId,'player');
assert.equal(f.scene.state().staffOwnership.assistant.npcId,ROLE.incumbentId);
assert(!incumbent.label.querySelector('small').textContent.includes('服务助理'),'incumbent no longer displays the occupied role');
const pending=f.scene.state().orders.map(o=>({id:o.id,stage:o.stage,holder:o.holder,mealId:o.mealId})),till=f.scene.state().till;
const lifeBefore=copy(f.scene.state().staffLife.decisions.people[ROLE.incumbentId]);
f.tick(1000);
assert.deepEqual(copy(f.scene.state().orders.map(o=>({id:o.id,stage:o.stage,holder:o.holder,mealId:o.mealId}))),copy(pending),'incumbent cannot take the player-held slot while player is off duty');
assert.equal(f.scene.state().till,till,'waiting does not collect the same orders again');
assert.strictEqual(f.npcs[2],incumbent);assert.equal(incumbent.station.npcName,'陆青');
assert(f.movements.length>20,'displaced incumbent still walks in the world');
assert(f.targets.size>=2,'incumbent chooses real life destinations rather than one permanent parking point');
const lifeAfter=f.scene.state().staffLife.decisions.people[ROLE.incumbentId],choices=lifeAfter.choices-lifeBefore.choices;
assert(choices>=2&&choices<=20,'life choices happen at activity boundaries, not each simulation frame');
assert(Object.entries({hunger:850,fatigue:1100,social:1000}).some(([need,rate])=>lifeAfter.needs[need]<Math.min(1,lifeBefore.needs[need]+100/rate)-1e-6),'completed personal activity relieves a real need');
assert(f.scene.state().staffLife.events.some(e=>e.actorId===ROLE.incumbentId&&e.event==='completed'),'incumbent completes a real personal activity');
assert.equal(f.bank.amount,0,'tenure alone cannot earn wages');

console.log('PASS exclusive off-duty tenure: no auto-start, stable NPC identity, continued life movement, pending orders and no wage');

const restored=fixture(f.snapshot(),f.bank);
assert.equal(restored.careers.state().loadError,null);
assert.equal(restored.careers.slotHolder(ROLE.id),'player');
assert.equal(restored.careers.state().lastDuty,null);
assert.deepEqual(copy(restored.scene.state().staffLife.decisions.people[ROLE.incumbentId]),copy(lifeAfter),'reload preserves personality, needs and decision history');
assert.equal(restored.service.state().job,null);
assert.deepEqual(copy(restored.scene.state().actors.map(a=>a.id)),copy(f.scene.state().actors.map(a=>a.id)),'reload preserves world identities');
restored.tick(20);
assert.deepEqual(copy(restored.scene.state().orders.map(o=>o.id)),copy(pending.map(o=>o.id)),'reload preserves the same pending orders');
assert(restored.scene.state().orders.every(o=>o.stage==='pass'),'reload cannot reinstate an incumbent into a player-held slot');
assert.equal(restored.scene.state().till,till);
restored.p.root.position.set(22.35,.215,11.7);
restored.until(()=>!restored.npcs[0].walking&&restored.npcs[0].root.position.distanceTo(position(24.1,.215,11.4))<.15,'employer returns to the registration desk');
assert(restored.service.executeIntent(restored.service.intent('accept',ROLE.id)),'duty starts only on explicit acceptance');
assert(restored.service.state().job);
assert.equal(restored.requested.length,1,'explicit start offers the actual first work action once');
restored.choose('handover-in');
restored.until(()=>restored.scene.state().stage==='working','explicit physical duty begins');

const originalOrderIds=restored.scene.state().orders.map(o=>o.id),firstOrder=originalOrderIds[0];
restored.choose('choose-order',firstOrder);
const pickup=restored.choose('pickup',firstOrder);
assert.equal(restored.scene.state().heldTrayId,firstOrder);
assert.equal(restored.scene.execute(pickup),false,'a consumed pickup cannot claim the same tray twice');
const claimed=fixture(restored.snapshot(),restored.bank);
assert.equal(claimed.careers.state().loadError,null);
assert.equal(claimed.scene.state().heldTrayId,firstOrder,'current continuity preserves the one held tray');
assert.equal(claimed.scene.execute(pickup),false,'reload does not make the consumed pickup live again');
assert.deepEqual(copy(claimed.scene.state().orders.map(o=>o.id)),copy(originalOrderIds));
assert.equal(claimed.scene.state().orders.filter(o=>o.id===firstOrder).length,1);
assert.equal(claimed.scene.state().till,till,'order ownership recovery never recollects customer money');
claimed.choose('return-tray',firstOrder);

// A short quiet shift creates one real salary receipt, enough to exercise the
// split-save recovery boundary without replaying the full wage/meal scenarios.
claimed.tick(900);
assert(claimed.service.executeIntent(claimed.service.intent('end-shift')));
claimed.choose('handover-out');
claimed.until(()=>claimed.scene.finished()&&claimed.service.state().job?.stage==='inspection','explicit shift ends for inspection');
assert(claimed.careers.isHired(ROLE.id),'end of shift does not end tenure');
assert.equal(claimed.careers.slotHolder(ROLE.id),'player');
const waitingAfterShift=copy(claimed.scene.state().orders.map(o=>({id:o.id,stage:o.stage,holder:o.holder})));
claimed.tick(180);
assert.deepEqual(copy(claimed.scene.state().orders.map(o=>({id:o.id,stage:o.stage,holder:o.holder}))),waitingAfterShift,'ending duty cannot restore NPC ownership');
assert.equal(claimed.scene.state().till,till);
claimed.p.root.position.set(22.35,.215,11.7);
claimed.until(()=>!claimed.npcs[0].walking&&claimed.npcs[0].root.position.distanceTo(position(24.1,.215,11.4))<.15,'employer is ready for inspection');
claimed.flags.rejectCareerPaid=true;
assert(claimed.service.claim(),'a successful bank credit may precede a rejected career cleanup write');
const wage=claimed.bank.amount;
assert(wage>0&&wage<ROLE.wage,'only the short witnessed shift is paid');
assert.equal(claimed.bank.receipts.size,1);
const paid=fixture(claimed.snapshot(),claimed.bank);
assert.equal(paid.careers.state().loadError,null);
assert(paid.careers.settle().replayed,'reload recovers the already credited wage receipt');
assert.equal(paid.bank.amount,wage,'salary recovery cannot credit twice');
assert.equal(paid.bank.receipts.size,1);
assert.equal(paid.careers.settle().code,'work-incomplete');
paid.tick(30);
assert(paid.scene.state().orders.every(o=>o.stage==='pass'),'paid off-duty tenure still has exclusive ownership');
assert.equal(paid.service.intent('accept',ROLE.id),null,'a paid day cannot start another salary');

const sameActor=paid.npcs[2];
paid.p.root.position.set(22.35,.215,11.7);
paid.until(()=>!paid.npcs[0].walking&&paid.npcs[0].root.position.distanceTo(position(24.1,.215,11.4))<.15,'employer returns for resignation');
assert(paid.service.executeIntent(paid.service.intent('formal-resign',ROLE.id)));
assert.equal(paid.careers.state().tenure,null);
assert.equal(paid.careers.slotHolder(ROLE.id),ROLE.incumbentId);
paid.until(()=>paid.scene.state().orders.some(o=>o.stage==='carrying'),'resignation restores a real incumbent to the vacant slot');
assert.equal(paid.scene.state().staffOwnership.assistant.holderId,ROLE.incumbentId);
assert.strictEqual(paid.npcs[2],sameActor,'the same resident resumes the vacant job');
assert.equal(sameActor.station.npcName,'陆青');
assert.equal(paid.bank.amount,wage);assert.equal(paid.bank.receipts.size,1);
console.log('PASS explicit duty, one tray claim across reload, persistent tenure after shift, one wage receipt and resignation vacancy restoration');

const arrival=fixture(),queue=arrival.furniture.facilities,seat='china-tavern-dining-18.1--1',guest=arrival.npcs[3];
assert(queue.reserve(seat,'previous-occupant',{purpose:'meal'}));assert(queue.occupy(seat,'previous-occupant'));
assert(queue.reserve('china-tavern-dining-18.1-1','previous-occupant',{purpose:'meal'}));assert(queue.occupy('china-tavern-dining-18.1-1','previous-occupant'));
arrival.tick(40);
assert(!guest.serviceMount,'occupied chair cannot be stolen by an arriving diner');
assert(queue.state().find(f=>f.id===seat).queue.includes(guest.station.id),'arriving diner joins the real facility queue');
const waitingPosition=guest.root.position.clone();
queue.releaseActor('previous-occupant');
arrival.until(()=>guest.serviceMount?.id===seat,'vacating the real chair wakes the queued diner');
assert(guest.root.position.distanceTo(waitingPosition)>.3,'released capacity causes physical progress into the restaurant');
assert.equal(queue.reservation(seat,guest.station.id)?.status,'occupied');
assert.equal(queue.state().find(f=>f.id===seat).queue.filter(id=>id===guest.station.id).length,0,'one arrival consumes one queue entry');
assert.equal(arrival.scene.state().orders.filter(o=>o.customerId===guest.station.id).length,1,'queue recovery never duplicates an order');
const occupiedPosition=guest.root.position.clone();
queue.releaseActor(guest.station.id);arrival.tick();
assert.equal(queue.reservation(seat,guest.station.id)?.status,'occupied','a seated diner reconstructs a missing scene reservation');
assert(guest.root.position.distanceTo(occupiedPosition)<.01,'reservation reconciliation does not move a seated diner');
const arrivalReload=fixture(arrival.snapshot());
arrivalReload.until(()=>arrivalReload.npcs[3].serviceMount?.id===seat,'reload reclaims the live diner seat');
assert.equal(arrivalReload.furniture.facilities.state().flatMap(f=>f.reservations).filter(r=>r.actor===guest.station.id).length,1,'reload restores one scene reservation for the existing diner');
assert(!arrivalReload.furniture.facilities.state().some(f=>f.queue.includes('previous-occupant')),'released stale occupant never returns to the queue');
assert.equal(arrivalReload.scene.state().orders.filter(o=>o.customerId===guest.station.id).length,1);
console.log('PASS actual facility queue: occupied diner chair, waiting arrival, released capacity, real seating, restored reservation and one order');

const alternate=fixture(),originalSeat='china-tavern-dining-18.1--1',freeSeat='china-tavern-dining-18.1-1',alternateGuest=alternate.npcs[3];
assert(alternate.furniture.facilities.reserve(originalSeat,'existing-diner',{purpose:'meal'}));
assert(alternate.furniture.facilities.occupy(originalSeat,'existing-diner'));
alternate.until(()=>alternateGuest.serviceMount?.id===freeSeat,'an arriving diner uses the reachable empty chair at the same table');
const alternateOrder=alternate.scene.state().orders.find(o=>o.customerId===alternateGuest.station.id);
assert.equal(alternateOrder.tableId,'west');assert.equal(alternateOrder.seatId,freeSeat);
assert.equal(alternate.furniture.facilities.reservation(freeSeat,alternateGuest.station.id)?.status,'occupied');
assert(!alternate.furniture.facilities.state().find(f=>f.id===originalSeat).queue.includes(alternateGuest.station.id),'changing to a free chair releases the old queue entry');
assert.equal(alternate.scene.state().orders.filter(o=>o.customerId===alternateGuest.station.id).length,1);
console.log('PASS same-table arrival: occupied requested chair, reachable alternate chair, synchronized order and cleared stale queue');

const stale=fixture(),staleQueue=stale.furniture.facilities;
assert(staleQueue.reserve(originalSeat,'player',{purpose:'meal'}));assert(staleQueue.occupy(originalSeat,'player'));
stale.until(()=>stale.npcs[3].serviceMount?.id===originalSeat,'standing player no longer leaves a stale chair claim blocking the arrival');
assert.equal(staleQueue.reservation(originalSeat,'player'),null);
assert.equal(staleQueue.reservation(originalSeat,stale.npcs[3].station.id)?.status,'occupied');
console.log('PASS known stale reservation: standing player releases the abandoned chair and the waiting diner really occupies it');
