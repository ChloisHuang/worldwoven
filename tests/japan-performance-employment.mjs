// One realistic module boundary: original paid service -> earned NPC funds ->
// voluntary employment order -> physical service -> one atomic bank/XP receipt.
// Scene navigation and hand props are observed, not claimed as rendered QA.
import assert from 'node:assert/strict';
import {createJapanPerformanceService} from '../source/game/japan-performance-service.js';
import {createJapanPerformanceEconomy,JAPAN_PERFORMANCE_ACTOR_IDS} from '../source/game/japan-performance-economy.js';
import {createJapanPerformanceEmployment} from '../source/game/japan-performance-employment.js';
import {createFormalCareers} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {JAPAN_PERFORMANCE_ROLES,japanPerformanceSkill,japanPerformanceServiceSeconds} from '../source/game/japan-performance-role.js';
import {PERFORMANCE_CAST,PERFORMANCE_SEATS,PERFORMANCE_POINTS as P} from '../source/game/japan-performance-cast.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {beginActorNavigationStep} from '../source/game/actor-navigation.js';
import {holdSocialActors,releaseSocialActors} from '../source/game/npc-social-ownership.js';
const copy=x=>structuredClone(x),[RECEPTION,MAI,ICHIRO]=JAPAN_PERFORMANCE_ROLES,TABLE='jp-performance-table';
class V{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}
 copy(p){return this.set(p.x,p.y,p.z);}clone(){return new V(this.x,this.y,this.z);}toArray(){return [this.x,this.y,this.z];}
 distanceToSquared(p){return (this.x-p.x)**2+(this.y-p.y)**2+(this.z-p.z)**2;}
}
function fixture(role=RECEPTION,{saved:input=null,continuity=null,hire=true}={}){
 const saved=copy(input||{});let durable=copy(saved),failure=null,mounted=null,busy=false,time=continuity?.time||0,employment;
 const clock={day:1,hour:10,seconds:100+time},propsLog=[],notices=[],writes=[];
 const write=(next,kind)=>{if(failure===kind||failure==='all')return false;if(failure==='throw')throw Error('test storage failure');if(failure==='async')return Promise.resolve(false);durable=copy(next);writes.push(kind);return true;};
 const patch=(value,kind)=>{const next={...saved,...copy(value)};const result=write(next,kind);if(result!==true)return result;Object.assign(saved,next);return true;};
 let worldSeed=1;while(careerInterviewRoll(worldSeed,role.id,clock.day)>=.5)worldSeed++;
 if(!saved.formalCareers){const seed=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();Object.assign(seed.skills,role.skillRequirements);saved.formalCareers=seed;}
 const ledger=createGameCurrencyLedger({saved,getClock:()=>clock,storage:{setItem(key,value){const next=JSON.parse(value),tx=next.copperLedger.transactions.at(-1);return write(next,tx?.action==='wage'&&tx.requestId.startsWith('jp-performance-work-')?'wage':'currency');}},transactionParticipant:tx=>employment?.prepareCurrencyCommit(tx)||null});
 const careers=createFormalCareers({saved:saved.formalCareers,worldSeed,getClock:()=>clock,saveState:next=>patch({formalCareers:next},'career'),creditWageToBank:ledger.creditWageToBank});
 const make=(position,station)=>({station,ageYears:station.ageYears,root:{position:new V(...position),rotation:{y:0},userData:{}},home:new V(...position),locomotion:{walkSpeed:5},animate(t,walking,action,context){this.lastPose={walking,action,context};}});
 const npcs=PERFORMANCE_CAST.map(a=>make(a.position,{id:a.id,npcName:a.name,ageYears:a.ageYears,performance:{...a}})),player=make(P.reception,{id:'player',ageYears:43});
 const actor=id=>npcs.find(n=>n.station.id===id),navigation={legacyGround:false,surfaces:[{minX:-12,maxX:12,minZ:-15,maxZ:9,y:7.6}]};
 const furniture={items:PERFORMANCE_SEATS,facilities:createFacilityQueue(),canSit:nav=>{assert.equal(nav,navigation);return true;},standPoint:(nav,extra,seat)=>{assert.equal(nav,navigation);return new V(...seat.position);}};
 const props={update(o,people,t){propsLog.push(o?{...copy(o),actors:{server:people.server?.station.id,artist:people.artist?.station.id,player:people.player?.station.id},positions:Object.fromEntries(Object.entries(people).filter(([,n])=>n).map(([k,n])=>[k,n.root.position.toArray()]))}:null);},clearOrder(){propsLog.push(null);},dispose(){},state:()=>propsLog.at(-1)||null};
 const service=createJapanPerformanceService({npcs,furniture,navigation,worldSeed:1,doors:{routeStep(path,p){while(path.length&&p.distanceToSquared(path[0])<.008)path.shift();return {waypoint:path[0]};}},planPath:(a,b)=>[new V(b.x,b.y,b.z)],moveActor:(a,x,z)=>{a.root.position.x+=x;a.root.position.z+=z;},poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>mounted,copperLedger:ledger,props,saved:{...(saved.originalPerformance||{}),...(continuity?{continuity:continuity.service}:{})},saveState:next=>patch({originalPerformance:next},'service')});
 const economy=createJapanPerformanceEconomy({saved:saved.japanPerformanceEconomy,copperLedger:ledger,getServiceHistory:()=>service.state().history,saveState:(next,record,extra)=>patch({...extra,japanPerformanceEconomy:next},'economy')});
 employment=createJapanPerformanceEmployment({service,economy,careers,copperLedger:ledger,npcs,furniture,navigation,getPlayer:()=>player,getMounted:()=>mounted,getBusy:()=>busy,getClock:()=>clock,saved:saved.japanPerformanceEmployment,saveState:next=>patch({japanPerformanceEmployment:next},'employment'),notify:message=>notices.push(message),onFurniture:seat=>{mounted=seat;player.root.position.set(...seat.anchor);return true;}});
 const go=point=>{mounted=null;player.root.position.set(...point);};
 const step=(seconds=.1)=>{for(let i=0;i<Math.ceil(seconds/.1);i++){time+=.1;clock.seconds=100+time;beginActorNavigationStep(.1);service.update(.1,time);employment.update(.1,time);}};
 const until=(predicate,max=800)=>{for(let i=0;i<max&&!predicate();i++)step();assert(predicate(),JSON.stringify({employment:employment.state(),service:service.view()}));};
 const execute=(kind,move=true)=>{const intent=employment.forRole(role.id).intent(kind);assert(intent,`missing ${kind}: ${JSON.stringify(employment.state())}`);if(move){if(!intent.keepSeat)go(intent.position);else player.root.position.set(...intent.position);}return employment.executeIntent(intent);};
 if(continuity){for(const savedActor of continuity.actors){const n=savedActor.id==='player'?player:actor(savedActor.id);n.root.position.set(...savedActor.position);n.serviceMount=furniture.items.find(s=>s.id===savedActor.mount)||null;}mounted=furniture.items.find(s=>s.id===continuity.mounted)||null;assert(service.restore(continuity.service));assert(employment.restore(continuity.employment));}
 if(hire&&!careers.isHired(role.id)){assert(execute('formal-apply'));assert.equal(careers.workState().tenure,null);assert(execute('formal-review'));assert(careers.isHired(role.id));}
 const total=()=>{const balance=ledger.balances().japan;return balance.cash+balance.bank+balance.held+JAPAN_PERFORMANCE_ACTOR_IDS.reduce((sum,id)=>{const a=economy.account(id);return sum+a.cash+a.bank+a.held;},0);};
 const fund=()=>{
  // Initial fixture funds belong only to the player and have an existing wage
  // journal. NPCs receive money solely after this real service settles.
  assert(ledger.creditWageToBank({amount:80,receiptId:'test-prior-japan-frontdesk-wage',currency:'japan',roleId:'jp-frontdesk-assistant',slotId:'jp-frontdesk',day:0}).ok);
  assert(ledger.withdraw(80,'test-prior-wage-withdrawal','japan').ok);assert(ledger.earn(37,'test-prior-copper').ok);
  const customer=role.id===MAI.id?ICHIRO:MAI,activity=customer.id===MAI.id?'dance':'story',count=role.id===MAI.id?2:1;
  for(let n=0;n<count;n++){go(P.reception);assert(service.request(customer.id,activity,'sake'));until(()=>service.view().order?.status==='accepted');assert(service.confirm());
  mounted=PERFORMANCE_SEATS[0];player.root.position.set(...mounted.anchor);until(()=>!service.active());go(P.reception);until(()=>!service.view().returning);}
  assert(economy.syncIncome().ok);assert.equal(economy.account(customer.id).cash,customer.wage*count);assert.equal(economy.account(RECEPTION.id).cash,4*count);assert.equal(total(),80);
  assert.equal(service.state().history.filter(e=>e.outcome==='act-completed').length,count);assert.equal(service.state().history.filter(e=>e.outcome==='drink-completed').length,count);return actor(customer.id);
 };
 const start=()=>{if(!execute('accept'))return false;go([-1,7.6,-4]);until(()=>employment.state().shift?.ready);go(P.reception);return true;};
 const invite=(activity=role.activity,drink=activity==='drink'?'tea':null)=>{
  const customer=actor(role.id===MAI.id?ICHIRO.id:MAI.id),choice=employment.options(customer).find(c=>c.activity===activity&&c.drink===drink);assert(choice,`no funded demand ${activity}/${drink}`);
  const selected=service.workChoose(customer.station.id,[choice]);assert(selected);assert(employment.invite(customer,selected));until(()=>employment.state().order?.stage==='offered');return customer;
 };
 const accept=()=>{assert(execute('take-invitation'));until(()=>employment.state().order?.stage==='choose');};
 const begin=()=>{if(employment.state().order.activity==='tea')assert(service.furnitureAccess(PERFORMANCE_SEATS[1]),'the employment tea guest must be allowed to use the original artist chair');assert(execute('go-work'));assert(execute('begin'));};
 const capture=()=>({saved:copy(durable),continuity:{time,employment:employment.snapshot(),service:service.snapshot(),actors:[...npcs,player].map(n=>({id:n.station.id,position:n.root.position.toArray(),mount:n.serviceMount?.id||null})),mounted:mounted?.id||null}});
 const done=()=>{employment.dispose();service.dispose({suspend:true});furniture.facilities.dispose();};
 return {role,ledger,careers,service,economy,employment,npcs,player,actor,furniture,navigation,clock,propsLog,notices,writes,go,step,until,execute,fund,start,invite,accept,begin,total,capture,done,get saved(){return copy(durable);},get failure(){return failure;},set failure(value){failure=value;},set busy(value){busy=value;}};
}

for(const role of JAPAN_PERFORMANCE_ROLES){
 const f=fixture(role);for(const id of JAPAN_PERFORMANCE_ACTOR_IDS)assert.deepEqual(f.economy.account(id),{currency:'japan',cash:0,bank:0,held:0});
 assert.equal(f.careers.slotHolder(role.id),'player');assert.equal(f.employment.start(role.id),true);f.step(60);
 assert.equal(f.employment.active(),false);assert.equal(f.ledger.balances().japan.bank,0);assert.equal(f.careers.state().japanPerformanceServices.length,0);
 assert.equal(f.service.request(MAI.id,'dance'),false,'ordinary service cannot compete with the active shift');
 assert.equal(f.employment.forRole(role.id).formal.resign(),false,'active shift must be ended before resignation');
 assert(f.execute('end-shift'));assert(f.careers.isHired(role.id));assert(f.execute('formal-resign'));assert.equal(f.careers.slotHolder(role.id),role.incumbentId);f.done();
}
console.log('PASS three real applications and reviews, finite slot handoff, no opening NPC money or idle wage/XP, active shift/ordinary service exclusion');

for(const [role,activity,drink] of [[RECEPTION,'drink','tea'],[RECEPTION,'drink','sake'],[MAI,'dance',null],[MAI,'tea',null],[ICHIRO,'story',null],[ICHIRO,'tea',null]]){
 const f=fixture(role),customer=f.fund(),before=f.total(),bank=f.ledger.balances().japan.bank,skill=japanPerformanceSkill(activity),xp=f.careers.state().skillXP[skill]||0;
 assert(f.start());f.invite(activity,drink);const invitation=f.employment.state().order,cash=f.economy.account(customer.station.id).cash;
 assert.equal(f.economy.account(customer.station.id).held,0,'an unaccepted invitation cannot charge');
 assert.equal(f.employment.settle(),false);assert.equal(f.ledger.creditWageToBank({amount:invitation.fee,receiptId:invitation.id,currency:'japan',roleId:role.id,slotId:role.slotId,day:1}).ok,false,'a forged bank call cannot bypass physical work');
 f.accept();assert.equal(f.economy.account(customer.station.id).cash,cash-invitation.fee);assert.equal(f.economy.account(customer.station.id).held,invitation.fee);assert.equal(f.employment.accept(),false);
 assert.equal(customer.serviceMount.id,PERFORMANCE_SEATS[0].id);assert.equal(f.furniture.facilities.reservation(TABLE,invitation.id).status,'occupied');
 const premature=f.employment.intent('begin');assert.equal(f.employment.executeIntent(premature),false,'work must begin at its physical point');f.begin();
 if(activity==='drink'){
  f.step(1);assert.equal(f.employment.state().order.stage,'prepare');assert.equal(f.ledger.balances().japan.bank,bank);
  f.until(()=>f.employment.state().order?.stage==='carrying');assert.equal(f.employment.state().order.seconds,2);assert.equal(f.employment.executeIntent(f.employment.intent('deliver')),false,'the original cup must be carried to the guest');
  f.step(5);assert.equal(f.employment.state().order.stage,'carrying');assert.equal(f.employment.state().order.seconds,2);
  assert(f.execute('deliver'));f.until(()=>f.employment.state().order?.stage==='drinking');assert.equal(f.ledger.balances().japan.bank,bank,'delivery without actual drinking is unpaid');
  f.until(()=>f.employment.state().order?.stage==='ready');
  for(const stage of ['carrying','serving','drinking']){const frame=f.propsLog.find(p=>p?.id===invitation.id&&p.drinkStatus===stage);assert(frame,stage);assert.equal(frame.actors.server,'player');assert.equal(frame.actors.player,customer.station.id);assert.equal(frame.drink,drink);}
 }else{
  assert.equal(f.employment.playerAction(),activity==='story'?'read':activity==='tea'?'chair-sit':null);if(activity==='dance')assert(f.employment.playerPose().archery.hands);
  f.step(2);assert(f.employment.state().order.seconds>0);assert.equal(f.ledger.balances().japan.bank,bank);assert.equal(f.careers.state().skillXP[skill]||0,xp);
  f.until(()=>f.employment.state().order?.stage==='ready');
 }
 const ready=f.employment.state().order;assert.equal(ready.seconds,japanPerformanceServiceSeconds(activity));assert.equal(ready.receipt.customerId,customer.station.id);assert.equal(ready.review.positive,true);
 assert.equal(f.employment.cancel(),false,'completed original service must settle rather than refund');assert(f.execute('settle'));assert.equal(f.employment.settle(),false);
 assert.equal(f.ledger.balances().japan.bank,bank+invitation.fee);assert.equal(f.ledger.state().cash,37);assert.equal(f.total(),before);assert.equal(f.economy.hold(invitation.id).status,'settled');
 assert.equal(f.careers.state().skillXP[skill],xp+10);assert.equal(f.careers.state().japanPerformanceServices.length,1);assert.equal(f.employment.state().reviews.length,1);
 assert.equal(f.ledger.history().filter(tx=>tx.requestId===invitation.id&&tx.action==='wage').length,1);f.step();assert.equal(f.service.socialProfile(customer.station.id).current,null);
 const replay=f.ledger.creditWageToBank({amount:invitation.fee,receiptId:invitation.id,currency:'japan',roleId:role.id,slotId:role.slotId,day:1});assert(replay.replayed);assert.equal(f.careers.state().skillXP[skill],xp+10);assert.equal(f.total(),before);
 f.go([-.4,7.6,-7.9]);f.until(()=>!f.employment.state().returns.length);assert.equal(customer.serviceMount,null);assert.equal(f.furniture.facilities.state().find(s=>s.id===TABLE).owner,null);assert(f.execute('end-shift'));f.done();
}
console.log('PASS reception tea/sake, Mai dance/tea and Ichiro story/tea: original funded customer, physical seat/point/props, completed service and one conserved bank-only receipt with exact XP');

{
 const f=fixture(RECEPTION),customer=f.fund();assert(f.start());
 assert.deepEqual(f.employment.options(f.actor(RECEPTION.id)),[],'the replacement incumbent cannot become their own customer');
 assert.deepEqual(f.employment.options(f.actor(ICHIRO.id)),[],'another original resident cannot spend the funded resident’s money');
 customer.ageYears=17;assert.deepEqual(f.employment.options(customer),[]);customer.ageYears=28;
 customer.walking=true;assert.deepEqual(f.employment.options(customer),[]);customer.walking=false;
 assert(holdSocialActors([customer.station.id],'performance-demand'));assert.deepEqual(f.employment.options(customer),[]);releaseSocialActors('performance-demand');
 f.busy=true;assert.deepEqual(f.employment.options(customer),[]);f.busy=false;
 f.until(()=>f.employment.active());const order=f.employment.state().order;
 assert.equal(order.customerId,customer.station.id);assert.equal(f.service.socialProfile(customer.station.id).current.id,order.choice.id);
 assert.equal(order.choice.targetId,'player');assert.equal(f.economy.account(customer.station.id).held,0);
 assert(f.employment.cancel());assert.equal(f.economy.hold(order.id),null);assert.equal(f.economy.account(customer.station.id).cash,8);assert.equal(f.careers.state().japanPerformanceServices.length,0);f.done();
}
console.log('PASS genuine autonomous life decision uses only an eligible original adult with their own earned funds; invitation is optional and unpaid');

{
 const f=fixture(RECEPTION),customer=f.fund();assert(f.start());const choice=f.employment.options(customer)[0],bystander=f.actor(ICHIRO.id);
 for(const point of [P.stage,PERFORMANCE_SEATS[0].anchor,PERFORMANCE_SEATS[1].anchor]){bystander.root.position.set(...point);assert.equal(f.employment.invite(customer,choice),false,'an occupied original work point cannot be double-booked');}bystander.root.position.copy(bystander.home);
 assert(f.furniture.facilities.request(TABLE,'existing-guest'));assert.equal(f.employment.invite(customer,choice),false);assert.equal(f.employment.active(),false);f.furniture.facilities.release(TABLE,'existing-guest');
 f.invite();const original=f.employment.state().order,initial=f.economy.snapshot();
 bystander.root.position.set(...P.stage);assert.equal(f.execute('take-invitation'),false);assert.deepEqual(f.economy.snapshot(),initial);bystander.root.position.copy(bystander.home);
 assert(f.furniture.facilities.request(TABLE,'existing-guest'));assert.equal(f.execute('take-invitation'),false);assert.deepEqual(f.economy.snapshot(),initial);assert.equal(f.employment.state().order.stage,'offered');f.furniture.facilities.release(TABLE,'existing-guest');
 for(const failure of ['employment','throw','async']){f.failure=failure;assert.equal(f.employment.cancel(),false);assert.equal(f.employment.state().order.id,original.id);assert.deepEqual(f.economy.snapshot(),initial);}
 f.failure=null;assert(f.employment.cancel());assert.equal(f.employment.cancel(),false);assert.equal(f.economy.hold(original.id),null);assert.equal(f.economy.account(customer.station.id).cash,8);f.done();
}
{
 const f=fixture(RECEPTION),customer=f.fund();assert(f.start());f.invite();const invitation=f.employment.state().order,initial=f.economy.snapshot();
 for(const failure of ['economy','throw','async']){f.failure=failure;assert.equal(f.execute('take-invitation'),false);assert.equal(f.employment.state().order.stage,'offered');assert.deepEqual(f.economy.snapshot(),initial);assert.equal(f.furniture.facilities.state().find(s=>s.id===TABLE).owner,null);}
 f.failure=null;f.accept();const hold=f.economy.snapshot();f.begin();f.step(.6);
 for(const failure of ['economy','throw','async']){f.failure=failure;assert.equal(f.employment.cancel(),false);assert.equal(f.employment.state().order.id,invitation.id);assert.deepEqual(f.economy.snapshot(),hold);assert.equal(f.furniture.facilities.state().find(s=>s.id===TABLE).owner,invitation.id);}
 f.failure=null;assert(f.employment.cancel());assert.equal(f.economy.hold(invitation.id).status,'refunded');assert.equal(f.economy.account(customer.station.id).cash,8);assert.equal(f.employment.cancel(),false);assert.equal(f.ledger.balances().japan.bank,0);assert.equal(f.careers.state().japanPerformanceServices.length,0);
 const restored=fixture(RECEPTION,f.capture());assert.equal(restored.employment.state().loadError,null);assert.equal(restored.economy.hold(invitation.id).status,'refunded');assert.equal(restored.economy.account(customer.station.id).cash,8);assert.equal(restored.employment.cancel(),false);restored.done();f.done();
}
console.log('PASS occupied table excludes invitations and acceptance; failed/throwing/async saves keep unpaid or paid order intact; cancellation refunds once and survives reload');

for(const [role,activity,drink] of [[RECEPTION,'drink','sake'],[MAI,'dance',null],[ICHIRO,'tea',null]]){
 const f=fixture(role),customer=f.fund();assert(f.start());f.invite(activity,drink);f.accept();f.begin();f.step(.7);
 const original=f.employment.state().order,initial=f.total(),money=f.economy.snapshot();
 for(const id of [customer.station.id,role.incumbentId]){
  const before=f.employment.snapshot(),position=customer.root.position.toArray(),mount=customer.serviceMount;
  assert(holdSocialActors([id],'employment-active-conversation'));f.step(130);
  assert.equal(f.employment.isActing(),false,'social hold must pause the player work pose as well as the timer');assert.equal(f.employment.playerPose(),null);assert.equal(f.employment.playerAction(),null);
  if(activity==='dance')assert.notEqual(f.propsLog.at(-1)?.status,'performing','the hand fan cannot keep dancing while the original work is socially held');
  assert.equal(f.employment.state().order.seconds,before.seconds);assert.equal(f.employment.state().order.wait,before.wait);assert.equal(f.employment.state().order.stage,original.stage);
  assert.deepEqual(customer.root.position.toArray(),position);assert.equal(customer.serviceMount,mount);assert.deepEqual(f.economy.snapshot(),money);releaseSocialActors('employment-active-conversation');
 }
 f.busy=true;const busyAt=f.employment.snapshot();f.step(10);assert.equal(f.employment.snapshot().seconds,busyAt.seconds);assert.equal(f.employment.snapshot().wait,busyAt.wait);f.busy=false;
 f.employment.stopActivity();const paused=f.employment.snapshot();f.step(1);assert.equal(f.employment.snapshot().seconds,paused.seconds);assert.equal(f.employment.isActing(),false);assert(f.employment.workChoices().includes('resume'));if(activity==='dance')assert.notEqual(f.propsLog.at(-1)?.status,'performing','explicit pause also hides the active dance prop');
 const captured=f.capture(),g=fixture(role,captured);f.done();
 assert.equal(g.employment.state().loadError,null);assert.equal(g.employment.state().order.id,original.id);assert.equal(g.employment.snapshot().seconds,paused.seconds);assert.equal(g.employment.snapshot().paused,true);assert.equal(g.total(),initial);assert.equal(g.careers.slotHolder(role.id),'player');
 const replayTime=g.employment.snapshot().seconds;g.step(1);assert.equal(g.employment.snapshot().seconds,replayTime);assert(g.execute('resume'));
 if(activity==='drink'){g.until(()=>g.employment.state().order?.stage==='carrying');assert(g.execute('deliver'));}
 g.until(()=>g.employment.state().order?.stage==='ready');assert(g.execute('settle'));assert.equal(g.careers.state().japanPerformanceServices.length,1);assert.equal(g.total(),initial);assert.equal(g.economy.hold(original.id).status,'settled');g.done();
}
console.log('PASS customer/incumbent chat and busy pause freeze service/mount/payment; explicit pause and saved continuity resume the same paid order without duplicate charge or XP');

{
 const f=fixture(MAI);f.fund();assert(f.start());f.invite('dance');f.accept();f.begin();f.until(()=>f.employment.state().order?.stage==='ready');
 const order=f.employment.state().order,before={saved:f.saved,careers:f.careers.state(),economy:f.economy.snapshot(),ledger:f.ledger.state()},total=f.total();
 for(const failure of ['wage','throw','async']){
  f.failure=failure;assert.equal(f.execute('settle'),false);assert.equal(f.employment.state().order.id,order.id);assert.equal(f.employment.state().order.stage,'ready');
  assert.deepEqual(f.saved,before.saved);assert.deepEqual(f.careers.state(),before.careers);assert.deepEqual(f.economy.snapshot(),before.economy);assert.deepEqual(f.ledger.state(),before.ledger);
 }
 f.failure=null;const g=fixture(MAI,f.capture());f.done();assert.equal(g.employment.state().loadError,null);assert.equal(g.employment.state().order.stage,'ready');assert(g.execute('settle'));assert.equal(g.total(),total);assert.equal(g.ledger.balances().japan.bank,8);assert.equal(g.careers.state().skillXP.art,10);
 const paid=g.capture(),h=fixture(MAI,paid);g.done();assert.equal(h.employment.state().loadError,null);assert.equal(h.economy.loadError,null);assert.equal(h.employment.active(),false);assert.equal(h.ledger.balances().japan.bank,8);assert.equal(h.careers.state().skillXP.art,10);assert.equal(h.employment.state().reviews.length,1);assert.equal(h.employment.settle(),false);assert.equal(h.total(),total);h.step();assert.equal(h.service.socialProfile(order.customerId).current,null);h.done();
}
console.log('PASS failed bank save leaves ready receipt, career XP, economy and currency unchanged; ready and paid reload retain one original payment and one review');

{
 const f=fixture(ICHIRO);f.fund();assert(f.start());f.invite('story');f.accept();const captured=f.capture();
 const wrong=copy(captured.saved);wrong.japanPerformanceEmployment.order.fee++;
 const invalid=fixture(ICHIRO,{saved:wrong});assert.equal(invalid.employment.state().loadError,'invalid-performance-employment');assert.equal(invalid.employment.start(),false);assert.equal(invalid.employment.settle(),false);assert.deepEqual(invalid.saved,wrong);invalid.done();
 const absent=copy(captured.saved);absent.japanPerformanceEmployment.order.id='jp-performance-work-2';absent.japanPerformanceEmployment.serial=2;
 const missing=fixture(ICHIRO,{saved:absent});missing.step();assert.equal(missing.employment.state().loadError,'missing-performance-payment');assert.equal(missing.employment.settle(),false);assert.equal(missing.ledger.balances().japan.bank,0);missing.done();f.done();
}
console.log('PASS invalid saved quote and missing original payment fail closed without bank credit');
