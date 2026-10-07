// Focused process regression: a real order may not advance through a closed
// route/occupied seat, duplicate a place setting, or leave cups after cancel.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three'),{createEgyptMealService}=await import('../source/game/egypt-meal-service.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
const {EGYPT_MEAL:P}=await import('../source/game/egypt-meal-definition.js');
function fixture({player=false,blockedSeat=false,doorWaiting=false,saved={},saveState=()=>true,onMealReceipts=()=>{},onRelationshipEvent=()=>({ok:false}),ledger=null}={}){
 const group=new T.Group(),seat={id:'egypt-seat',kind:'seat',center:P.seatCenter.slice(),anchor:[15.25,0,-9.3],position:[13.95,0,-9.3],seatY:.66,yaw:Math.PI/2};
 const actor=(id,position)=>{const root=new T.Group();root.position.set(...position);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,station:{id,npcLabel:id,npcAction:'read'},characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:2},animate(){}};};
 const npcs=[actor(P.cook,P.prep),actor(P.host,P.hostHome)],person=actor('player',player?seat.anchor:[30,0,30]);let mounted=player?seat:null,wait=doorWaiting,clock=0,seatBlocked=blockedSeat;
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>!seatBlocked,standPoint:()=>seatBlocked?null:new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 const lot={group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},doors={cameraColliders:[],routeStep(route,p){if(wait)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const service=createEgyptMealService({npcs,lot,furniture,doors,planPath:(a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>person,getMounted:()=>mounted,onSeat:item=>{mounted=item;person.root.position.set(...item.anchor);},worldSeed:1,saved,saveState,onMealReceipts,onRelationshipEvent,copperLedger:ledger});
 const tick=(count=1,context={})=>{for(let i=0;i<count;i++){clock+=.1;service.update(.1,clock,context);}};
 const until=(predicate,limit=5000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),'Did not reach expected state: '+JSON.stringify(service.state().order));};
 return {service,npcs,person,seat,tick,until,furniture,setDoor:v=>wait=v,setSeat:v=>seatBlocked=v,leave(){mounted=null;person.root.position.set(15,0,15);service.leaveSeat(seat.id);}};
}
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createDailyNeeds,DAILY_NEEDS_HOUR:H}=await import('../source/game/daily-needs.js');
function account(cash=15){let saved,fail=false;const ledger=createCurrencyLedger({saveState:s=>{if(fail)return false;saved=structuredClone(s);return true;}});if(cash){assert(ledger.creditWageToBank({amount:cash,receiptId:'test-only-egypt-funds',currency:'egypt',roleId:'test-only',slotId:'test-only-1',day:0}).ok);assert(ledger.withdraw(cash,'test-only-withdraw','egypt').ok);}return {ledger,saved:()=>saved,fail:v=>fail=v};}
{
 const a=account(4),f=fixture({ledger:a.ledger});assert.equal(f.service.request(),false);assert.equal(f.service.state().order,null);assert.equal(a.ledger.reservations().length,0);assert.equal(f.person.root.position.x,30);f.service.dispose();
}
{
 let durable,needsDisk,failNeeds=false;const a=account(),clock={seconds:0};const needs=createDailyNeeds({getClock:()=>clock,saveState:s=>{if(failNeeds)return false;needsDisk=structuredClone(s);return true;}});needs.enter('egypt');clock.seconds=26*H;needs.update();
 const f=fixture({player:true,ledger:a.ledger,saveState:s=>{durable=structuredClone(s);return true;},onMealReceipts:r=>needs.egyptMealReceipts(r,a.ledger.reservations())});assert(f.service.request());assert.equal(a.ledger.balances().egypt.cash,10);assert.equal(a.ledger.balances().egypt.held,5);assert.equal(f.service.request(),false);
 f.until(s=>s.order?.stage==='ready');const o=f.service.state().order;assert.equal(o.supplyReceipt,o.id+'-prepared');assert.equal(f.service.state().props.bowlCount,1);assert.equal(needs.hunger('player'),1);assert(f.service.eat());f.tick(110);assert.equal(f.service.state().mealReceipts.length,0);failNeeds=true;f.until(s=>s.order?.stage==='lowering');const receipt=durable.mealReceipts[0];assert.equal(needs.hunger('player'),1);assert.equal(receipt.mealId,o.id+'-dish');f.until(s=>!s.order);f.service.dispose();
 failNeeds=false;const g=fixture({player:true,ledger:a.ledger,saved:durable,onMealReceipts:r=>needs.egyptMealReceipts(r,a.ledger.reservations())});assert.equal(needs.hunger('player'),0);assert.equal(needsDisk.people.player.receipts['egypt-visitor-meal'],receipt.number);assert.equal(needs.egyptMealReceipts([receipt],a.ledger.reservations()),false);clock.seconds+=23.9*H;needs.update();assert(needs.hunger('player')<1);clock.seconds+=.2*H;needs.update();assert.equal(needs.hunger('player'),1);assert.equal(a.ledger.history().filter(t=>t.action==='settle').length,1);assert.equal(needs.mealReceipts([{...receipt,number:2,orderId:'egypt-meal-2'}]),false);g.service.dispose();
}
for(const stage of ['requested','preparing','heating','pickup','carrying','serving','ready','eating']){
 const a=account(),receipts=[],f=fixture({player:true,ledger:a.ledger,onMealReceipts:r=>receipts.push(...r)});assert(f.service.request());f.until(s=>s.order?.stage===(stage==='eating'?'ready':stage));if(stage==='eating'){assert(f.service.eat());f.tick(40);}assert(f.service.cancel());f.until(s=>!s.order);assert.equal(a.ledger.balances().egypt.cash,stage==='eating'?10:15,stage);assert.equal(a.ledger.balances().egypt.held,0);assert.equal(receipts.length,0);f.service.dispose();assert.equal(a.ledger.history().filter(t=>t.action==='refund').length,stage==='eating'?0:1);
}
{
 let durable,fail=false;const a=account(),f=fixture({player:true,ledger:a.ledger,saveState:s=>{if(fail)return false;durable=structuredClone(s);return true;}});fail=true;assert.equal(f.service.request(),false);assert.equal(a.ledger.reservations().length,0);fail=false;assert(f.service.request());f.until(s=>s.order?.stage==='ready');a.fail(true);assert.equal(f.service.eat(),false);assert.equal(a.ledger.reservations()[0].status,'reserved');a.fail(false);assert(f.service.eat());fail=true;f.tick(125);assert.equal(f.service.state().order.stage,'eating');assert.equal(f.service.state().mealReceipts.length,0);fail=false;f.tick();assert.equal(durable.mealReceipts.length,1);f.service.dispose();
}
{
 const a=account(),f=fixture({player:true,ledger:a.ledger});f.service.request();f.until(s=>s.order?.stage==='carrying');const snap=f.service.snapshot(),positions=f.npcs.map(n=>n.root.position.toArray());f.service.dispose({suspend:true});const g=fixture({player:true,ledger:a.ledger,saved:snap});g.npcs.forEach((n,i)=>n.root.position.set(...positions[i]));assert(g.service.restore(snap));assert.equal(g.service.state().order.id,snap.order.id);assert.equal(g.service.state().phase,snap.phase);g.until(s=>s.order?.stage==='ready');a.fail(true);assert(g.service.cancel());assert.equal(a.ledger.balances().egypt.held,5);a.fail(false);g.until(s=>!s.order);assert.equal(a.ledger.balances().egypt.cash,15);g.service.dispose();
}
{
 const a=account(),f=fixture({player:true,ledger:a.ledger,doorWaiting:true});assert(f.service.request());f.tick(100);assert.equal(f.service.state().order.stage,'requested');assert.equal(f.service.state().mealReceipts.length,0);f.service.cancel();assert.equal(a.ledger.balances().egypt.cash,15);f.service.dispose();
}
console.log('PASS Egypt meal: local 5-voucher reservation, same dish through originals, full 12s/24h receipt, low-fund exclusion, 8 cancellation phases, partial meal no relief, save/refund retry, continuity and dedupe');
// Retained UI callbacks must not spend money or cancel a newer order.
{
 const {createEgyptMealUI}=await import('../source/game/egypt-meal-ui.js');
 class E{constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};}append(...els){this.children.push(...els);for(const e of els)e.parent=this;}replaceChildren(...els){this.children=[];this.append(...els);}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}addEventListener(k,f){this.listeners[k]=f;}showModal(){this.open=true;}close(){this.open=false;}querySelectorAll(selector){const key=/^\[([^\]]+)\]$/.exec(selector)?.[1];return walk(this).slice(1).filter(e=>key in e.attrs);}focus(){doc.activeElement=this;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);}}
 const doc={head:new E('head'),body:new E('body'),createElement:tag=>new E(tag)},walk=e=>[e,...e.children.flatMap(walk)];let view={order:null,seated:false,cash:4,price:5,name:P.name,canOrder:false},requests=0,cancels=0;
 const service={view:()=>structuredClone(view),request(){requests++;return true;},cancel(){cancels++;return true;},eat:()=>true},ui=createEgyptMealUI({service,document:doc});const dialog=doc.body.children[0],button=id=>walk(dialog).find(e=>e.attrs['data-eg-meal']===id);
 ui.open();assert.equal(requests,0);assert(button('confirm').disabled);view.cash=15;view.canOrder=true;ui.update();const stale=button('confirm');ui.close();stale.onclick();assert.equal(requests,0);ui.open();const retained=button('confirm');view.cash=0;view.canOrder=false;retained.onclick();assert.equal(requests,0);assert(button('confirm').disabled);
 view.cash=15;view.canOrder=true;ui.update();button('confirm').onclick();assert.equal(requests,1);assert.equal(ui.isOpen(),false);
 ui.open();button('confirm').focus();dialog.querySelectorAll('[data-eg-meal-scroll]')[0].scrollTop=27;view.cash=16;ui.update();assert.equal(doc.activeElement.getAttribute('data-eg-meal'),'confirm');assert.equal(dialog.querySelectorAll('[data-eg-meal-scroll]')[0].scrollTop,27);const liveClose=button('close');view.cash=17;liveClose.onclick();assert.equal(ui.isOpen(),false,'close bypasses changed order signature');view.order={id:'egypt-meal-1',stage:'ready',payment:'reserved'};view.seated=true;view.canOrder=false;ui.open();const oldCancel=button('cancel');view.order={id:'egypt-meal-2',stage:'ready',payment:'reserved'};oldCancel.onclick();assert.equal(cancels,0);ui.dispose();oldCancel.onclick();assert.equal(cancels,0);
 console.log('PASS Egypt menu: read-only open, insufficient funds, stale callbacks, immediate close across unsampled changes, preserved scroll/focus, one confirmation');
}
for(const boundary of ['reserve','settle','refund']){
 const a=account();let durable,fail=false;const f=fixture({player:true,ledger:a.ledger,saveState:s=>{if(fail&&(boundary==='reserve'&&s.order?.stage==='requested'||boundary==='settle'&&s.order?.stage==='eating'||boundary==='refund'&&!s.order))return false;durable=structuredClone(s);return true;}});
 fail=boundary==='reserve';assert(f.service.request());if(boundary==='settle'){f.until(s=>s.order?.stage==='ready');fail=true;assert.equal(f.service.eat(),false);}if(boundary==='refund'){fail=true;assert(f.service.cancel());}
 assert.equal(a.ledger.reservations()[0].status,{reserve:'reserved',settle:'settled',refund:'refunded'}[boundary]);const source=structuredClone(durable);f.service.dispose({suspend:true});const g=fixture({player:true,ledger:a.ledger,saved:source});g.tick();assert.equal(g.service.state().order?.stage,boundary==='reserve'?'requested':boundary==='settle'?'eating':undefined);assert.equal(a.ledger.history().filter(t=>t.action===boundary).length,1);g.service.dispose();
}
{
 const receipt={source:'egypt-visitor-meal',id:'egypt-meal-2-consumed',number:2,actorId:'player',orderId:'egypt-meal-2',mealId:'egypt-meal-2-dish',dishId:P.id,paymentReceipt:'egypt-meal-2',supplyReceipt:'egypt-meal-2-prepared',completed:true};const needs=createDailyNeeds();
 for(const h of[{currency:'france',amount:5,status:'settled'},{currency:'egypt',amount:4,status:'settled'},{currency:'egypt',amount:5,status:'reserved'}])assert.equal(needs.egyptMealReceipts([receipt],[{id:receipt.orderId,...h}]),false);
 assert(needs.egyptMealReceipts([receipt],[{id:receipt.orderId,currency:'egypt',amount:5,status:'settled'}]));assert.equal(needs.egyptMealReceipts([receipt],[{id:receipt.orderId,currency:'egypt',amount:5,status:'settled'}]),false);
}
console.log('PASS interrupted reserve/settle/refund reconcile original ledger once; wrong denomination/amount/unsettled supply cannot feed');
{
 const {createNpcSocial}=await import('../source/game/npc-social.js'),a=account(),f=fixture({player:true,ledger:a.ledger});const host=f.npcs[1];host.root.position.copy(f.person.root.position);host.root.position.x+=.8;const social=createNpcSocial({actors:()=>f.npcs,player:()=>f.person,status:n=>f.service.socialStatus(n)});
 assert.equal(f.service.socialStatus(host).busy,false);assert(social.canPause(host));assert(f.service.request());assert.equal(f.service.socialStatus(host).busy,true);assert.equal(f.service.socialStatus(host).attention,false);assert.equal(social.canPause(host),false);assert.equal(social.reserveMeeting(host,{owner:'test'}),false);assert.equal(social.begin(host).paused,true);assert.equal(social.conversationActorId(),P.host);const before=f.service.snapshot();f.tick(30,{conversationActorId:social.conversationActorId()});assert.deepEqual(f.service.state().order,before.order);assert.equal(f.service.state().phase,before.phase);social.end();f.service.cancel();host.walking=true;assert.equal(f.service.socialStatus(host).busy,false);assert.equal(social.canPause(host),true);social.dispose();f.service.dispose();
 console.log('PASS Egypt duty keeps autonomous invitation/departure restrictions while explicit local chat pauses the original order');
}

{
 const a=account(),attempts=[];let durable,accept=false;
 const f=fixture({player:true,ledger:a.ledger,saveState:s=>{durable=structuredClone(s);return true;},onRelationshipEvent:e=>{attempts.push(e);return {ok:accept};}});
 assert(f.service.request());f.until(s=>s.order?.stage==='ready');assert.equal(attempts.length,0);assert(f.service.eat());f.until(s=>s.order?.finished);
 assert.equal(attempts.length,2);const event=attempts.find(e=>e.source==='egypt-meal');assert.deepEqual(attempts.find(e=>e.source==='egypt-kitchen').participants,[P.cook,P.host]);assert.equal(event.actorId,P.host);assert.deepEqual(event.participants,[P.host,'player']);assert.equal(event.outcome,'completed');assert(durable.relationshipEvents.some(e=>e.id===event.id));
 f.service.dispose({suspend:true});accept=true;const g=fixture({player:true,ledger:a.ledger,saved:durable,onRelationshipEvent:e=>{assert(durable.relationshipEvents.some(row=>row.id===e.id));attempts.push(e);return {ok:true};}});g.tick(100);assert.equal(attempts.length,4,'failed relationship write replays once with stable source ID');g.service.dispose({suspend:true});
 console.log('PASS Egypt relationship boundary: actual host and diner, durable pending event, failed callback reload replay and acknowledgement');
}

// R179: a stationary worker previously kept producing and handing over in chat.
{
 const {holdSocialActors,releaseSocialActors}=await import('../source/game/npc-social-ownership.js');
 for(const [stage,id]of [['accepted',P.host],['heating',P.cook],['pickup',P.host],['carrying',P.host],['serving',P.host],['washing',P.host]]){
  const a=account(),f=fixture({player:true,ledger:a.ledger});assert(f.service.request());f.until(s=>s.order?.stage===(stage==='washing'?'ready':stage));if(stage==='washing'){assert(f.service.eat());f.until(s=>s.order?.stage==='washing');}
  const before=f.service.snapshot(),wallet=a.ledger.state(),actor=f.npcs.find(n=>n.station.id===id),position=actor.root.position.toArray(),route=actor.route;
  assert(holdSocialActors([id],'egypt-work-pause'));f.tick(160);
  const after=f.service.snapshot();assert.deepEqual(after.order,before.order,stage);assert.equal(after.phase,before.phase,stage);assert.deepEqual(actor.root.position.toArray(),position,stage);assert.equal(actor.route,route,stage);assert.deepEqual(a.ledger.state(),wallet,stage);assert.deepEqual(after.workReceipts,before.workReceipts,stage);assert.deepEqual(after.tableReceipts,before.tableReceipts,stage);
  releaseSocialActors('egypt-work-pause');if(stage!=='washing'){f.until(s=>s.order?.stage==='ready');assert(f.service.eat());}f.until(s=>!s.order);assert.equal(f.service.state().mealReceipts.length,1);f.service.dispose();
 }
 const a=account(),f=fixture({player:true,ledger:a.ledger});assert(f.service.request());f.until(s=>s.order?.stage==='heating'&&s.phase>.3);const phase=f.service.state().phase;f.tick(80,{conversationActorId:P.cook});assert.equal(f.service.state().phase,phase);f.until(s=>s.order?.stage==='plating');f.service.dispose();
 console.log('PASS Egypt working chat freezes hearing, cooking, original tray pickup/delivery/cleanup and receipts; legacy player chat resumes same progress');
}
