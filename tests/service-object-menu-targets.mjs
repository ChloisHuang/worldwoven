// Regression for current() moving real meal/ticket entry points to the corner.
// Reuse the real service fixtures without replaying their economic long chains.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createEgyptMealService}=await import('../source/game/egypt-meal-service.js');
const {EGYPT_MEAL}=await import('../source/game/egypt-meal-definition.js');
const {createFranceTeaService,FRANCE_TEA}=await import('../source/game/france-tea-service.js');
const {createEgyptMealUI}=await import('../source/game/egypt-meal-ui.js');
const {createFranceMealUI}=await import('../source/game/france-meal-ui.js');
const {createJapanPlayerServiceUI}=await import('../source/game/japan-player-service-ui.js');
const {createJapanServiceProps}=await import('../source/game/japan-service-props.js');
const {JAPAN_SERVICE_POINTS:P,JAPAN_DINING_MENU,JAPAN_BATH_BLENDS}=await import('../source/game/japan-service-orders.js');
const {createServiceMenuIntents,nearbyInteractions,uniqueInteractionActions}=await import('../source/game/player-interaction-intents.js');
const {createObjectInteractionAnchors,isObjectlessInteraction}=await import('../source/game/object-interaction-anchors.js');
const source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
function originalFixture(country,deps){const source=fs.readFileSync(new URL('./'+country+'-full-meal.mjs',import.meta.url),'utf8'),body=source.slice(source.indexOf('function fixture('),source.indexOf('\nconst {createCurrencyLedger}'));return Function(...Object.keys(deps),body+'\nreturn fixture;')(...Object.values(deps));}
class E{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.open=false;}
 append(...els){this.children.push(...els);for(const e of els)e.parent=this;}replaceChildren(...els){this.children=[];this.append(...els);}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}addEventListener(k,f){this.listeners[k]=f;}showModal(){this.open=true;}close(){this.open=false;}querySelectorAll(){return [];}remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);}
}
const document=()=>({head:new E('head'),body:new E('body'),createElement:tag=>new E(tag)});
const contexts=[];
for(const [country,create,definition,uiFactory]of [['egypt',createEgyptMealService,EGYPT_MEAL,createEgyptMealUI],['france',createFranceTeaService,FRANCE_TEA,createFranceMealUI]]){
 const fixture=originalFixture(country,{T,assert,createFacilityQueue,P:definition,[country==='egypt'?'createEgyptMealService':'createFranceTeaService']:create});
 const ledger=createCurrencyLedger({saveState:()=>true});assert(ledger.creditWageToBank({amount:15,receiptId:'fixture-'+country,currency:country,roleId:'fixture',slotId:'fixture',day:0}).ok);assert(ledger.withdraw(15,'fixture-withdraw-'+country,country).ok);
 const outside=fixture({ledger}),f=fixture({player:true,ledger});assert.equal(outside.service.menuTarget(),null,'ordinary counter keeps original entry');outside.service.dispose({suspend:true});
 const doc=document(),ui=uiFactory({service:f.service,document:doc}),menus=createServiceMenuIntents(),anchors=createObjectInteractionAnchors({furniture:f.furniture});menus.register(country,{target:()=>f.service.menuTarget(),open:()=>ui.open()});
 const seated=menus.intent(country);assert(seated);assert(!isObjectlessInteraction(seated));assert.deepEqual(seated.position,f.seat.anchor);assert.deepEqual(anchors.resolve(seated).point,country==='france'?[definition.table[0],definition.table[1]+.2,definition.table[2]]:definition.table);
 const before=JSON.stringify(ledger.state());assert(menus.executeIntent(seated));assert(ui.isOpen());ui.close();assert(!ui.isOpen());assert(menus.executeIntent(seated));ui.close();assert.equal(JSON.stringify(ledger.state()),before,'view/close/reopen never charges');
 assert(f.service.request(country==='france'?'country-soup-bread':undefined));const original=f.service.snapshot(),order=original.order;assert(order);assert.equal(menus.resolveIntent(seated),null,'old menu cannot operate on newly ordered meal');
 const pending=menus.intent(country);const paid=JSON.stringify(ledger.state());
 for(const stage of ['preparing',country==='france'?'carrying':'serving','ready',country==='france'?'drinking':'eating','clearing']){
  const saved=structuredClone(original);if(country==='egypt')saved.revision=f.service.snapshot().revision+1;saved.order.stage=stage;saved.order.holder=['ready','drinking','eating','clearing'].includes(stage)?'table':'kitchen';assert(f.service.restore(saved));
  const live=menus.intent(country);assert(live);assert(!isObjectlessInteraction(live));assert.deepEqual(anchors.resolve(live).point,country==='france'?[definition.table[0],definition.table[1]+.2,definition.table[2]]:definition.table);assert.deepEqual(live.position,f.seat.anchor);assert.equal(menus.resolveIntent(pending),null,'stage transition invalidates old table menu');
  assert(menus.executeIntent(live));ui.close();assert.equal(JSON.stringify(ledger.state()),paid,'browsing/restore presentation never edits funds');
 }
 const old=menus.intent(country);const cancelled=structuredClone(original);if(country==='egypt')cancelled.revision=f.service.snapshot().revision+1;cancelled.order.cancelled=true;assert(f.service.restore(cancelled));assert.equal(menus.resolveIntent(old),null);assert(menus.intent(country),'cleanup still belongs to original table');
 assert(f.service.restore({...original,...(country==='egypt'?{revision:f.service.snapshot().revision+1}:{})}));assert.equal(menus.intent(country).intentKey,pending.intentKey,'same restored order resolves original place');
 contexts.push({country,f,ui});
 console.log('PASS '+country+': actual seated/ordered/waiting/ready/eating/cleanup targets, stale stage/cancel, original restored seat, read-only open/close/reopen');
}
// France's distinct pre-order walk, and its guest-only seat, retain identity.
{
 const fixture=originalFixture('france',{T,assert,createFacilityQueue,P:FRANCE_TEA,createFranceTeaService}),f=fixture();const before=f.service.snapshot();assert(f.service.restore({...before,intent:true}));const target=f.service.menuTarget();assert(target);assert.deepEqual(target.position,f.seat.position);assert(!target.continuation);assert(f.service.restore({...before,intent:false,order:{id:'france-tea-90',customer:'guest',seatId:f.seat.id,stage:'requested'}}));assert.equal(f.service.menuTarget(),null,'guest order does not become player continuation');f.service.dispose({suspend:true});
}
// Actual Japan objects, with the same visit-owned token that the renderer uses.
const root=new T.Group(),player={root:new T.Group()},props=createJapanServiceProps(root);root.add(player.root);player.root.position.set(-8,3.8,6);player.root.userData.hands=[new T.Object3D(),new T.Object3D()];player.root.add(...player.root.userData.hands);
let visit=null,activity=null,mounted=null,mutations=0;
const bench={id:'rest-bench',kind:'seat',center:[-7.7,3.8,7.55],position:[-7.7,3.8,6.61],anchor:[-7.7,3.8,7.39],seatY:4.25};
const otherBench={...bench,id:'other-bench',center:[-10.2,3.8,7.55],position:[-10.2,3.8,6.61],anchor:[-10.2,3.8,7.39]};
const sushi={id:'sushi-stool',kind:'seat',diningKind:'sushi',center:[-6,0,-.5],position:[-6,0,.1],anchor:[-6,0,-.2],seatY:.7},ramen={...sushi,id:'ramen-stool',diningKind:'ramen',center:[4.1,0,5.3],position:[4.1,0,6],anchor:[4.1,0,5.5]};
const furniture={items:[bench,otherBench,sushi,ramen]},service={blends:JAPAN_BATH_BLENDS,menu:JAPAN_DINING_MENU,state:()=>({visit:structuredClone(visit),activity,cash:36,progress:{blend:{code:'queued'},meal:{code:'queued'}}}),cancel(){mutations++;visit=null;},stopActivity(){mutations++;activity=null;}};
const ui=createJapanPlayerServiceUI({service,furniture,getPlayer:()=>player,getMounted:()=>mounted,getServiceAnchor:id=>props.itemAnchor(id),document:document()}),menus=createServiceMenuIntents(),anchors=createObjectInteractionAnchors({furniture});menus.register('japan',{target:()=>ui.menuTarget(),open:()=>ui.open()});
assert.equal(menus.intent('japan'),null);
visit={id:'player-visit',number:1,side:'men',stage:'check-in',restSeatId:bench.id,blendId:JAPAN_BATH_BLENDS[0].id};
assert.deepEqual(menus.intent('japan').visualAnchor.point,P.receptionLedger);assert.deepEqual(menus.intent('japan').position,P.playerReception);assert(!menus.intent('japan').continuation);
const front=menus.intent('japan');visit.tokenId=visit.id+':token';visit.stage='changing';
const token={id:visit.tokenId,kind:'token',visitId:visit.id,location:{type:'guest',id:visit.id}},render=()=>props.update({visits:[visit],items:[token]},new Map([[visit.id,player]]));render();
const issued=menus.intent('japan');assert.equal(menus.resolveIntent(front),null);assert(!issued.continuation);assert.equal(issued.visualAnchor.id,'jp-service-item:'+visit.tokenId);assert.deepEqual(issued.visualAnchor.point,props.itemAnchor(visit.tokenId).point);assert.deepEqual(issued.position,player.root.position.toArray());
const x=issued.visualAnchor.point[0];player.root.position.x+=.25;render();assert.equal(menus.intent('japan').visualAnchor.point[0],x+.25,'issued token follows its real rendered object');
for(const side of ['men','women'])for(const stage of ['changing','washing','waiting-bath','bathing','drying','checkout','checkout-ready']){
 visit.side=side;visit.stage=stage;const live=menus.intent('japan');assert(!live.continuation);assert.equal(live.visualAnchor.id,issued.visualAnchor.id);assert(menus.executeIntent(live));ui.close();assert.equal(mutations,0,'opening ticket does not interrupt current service');
}
visit.stage='resting';mounted=otherBench;let target=menus.intent('japan');assert.equal(anchors.resolve(target).furniture,otherBench,'unbound rest meal uses actual mounted bench');assert.equal(ui.currentIntent().visualAnchor.furnitureId,otherBench.id,'real meal action shares the same selected bench');const otherSeatTarget=target;mounted=bench;assert.equal(menus.resolveIntent(otherSeatTarget),null);
for(const [dish,item,point]of [['sushi',sushi,[-6,1.17,-1.09]],['ramen',ramen,[4.1,1.09,4.52]],['bath',bench,[-7.15,4.285,7.55]]]){
 mounted=item;visit={...visit,id:'meal-'+dish,orderKind:dish==='bath'?undefined:'dining',dishId:dish==='bath'?'ramen':dish,restSeatId:item.id,mealPoint:point,diningPoint:item.anchor,mealRequested:true};
 for(const stage of ['waiting-meal','meal-ready','eating']){visit.stage=stage;target=menus.intent('japan');assert(!target.continuation);assert.equal(target.targetKey,item.id);assert.deepEqual(anchors.resolve(target).point,point);assert.deepEqual(target.position,item.anchor);}
 const previous=menus.intent('japan');const saved=structuredClone(visit);visit=null;assert.equal(menus.resolveIntent(previous),null);visit=saved;assert.equal(menus.intent('japan').intentKey,previous.intentKey,'restored meal retains same target and stage');
}
visit={...visit,restSeatId:'missing-stool'};assert(menus.intent('japan').continuation,'missing dining seat cannot route to bath reception');
// Object unavailability must not manufacture a distant counter or lose cancel.
mounted=null;visit={id:'lost-token',number:4,stage:'washing',side:'women',tokenId:'not-rendered',restSeatId:bench.id};assert(menus.intent('japan').continuation);props.dispose();assert.equal(props.itemAnchor(token.id),null);ui.dispose();assert.equal(menus.intent('japan'),null);
console.log('PASS Japan: real token/ledger identity, moving object, both bath sides, all nonmeal stages, sushi/ramen/bath meal, chosen/restored bench, unavailable object safety and dispose');
// Exercise the actual registry, de-duplication and preserved continuations.
let japanTarget=null,stay={bookingId:'room-1',stage:'staying',inRoom:true};
const adapter={serviceMenus:createServiceMenuIntents(),lot:{stations:[{id:'egypt-royal-dining',position:[0,0,0]},{id:'france-cafe',position:[0,0,0]}]},player,chinaConsortUI:null,chinaTavernUI:null,chinaLodgingUI:{menuContext:()=>stay,open(){}},chinaSalonUI:{open(){}},chinaSalon:{active:()=>true},egyptMeal:contexts[0].f.service,egyptMealUI:contexts[0].ui,franceTea:contexts[1].f.service,franceMealUI:contexts[1].ui,franceLabor:{active:()=>true,menuContext:()=>({available:true}),open(){}},japanServiceUI:{menuTarget:()=>japanTarget,hasVisit:()=>!!japanTarget,open(){}},japanPerformanceUI:{open(){}},japanPerformance:{active:()=>true}};
vm.createContext(adapter);vm.runInContext(source.slice(source.indexOf('function configureContextualServices()'),source.indexOf('function currentControl()')),adapter);adapter.configureContextualServices();
for(const id of ['egypt-meal','france-meal']){const a=adapter.serviceMenus.intent(id);assert(a.visualAnchor);assert(!a.continuation);assert(adapter.serviceMenus.executeIntent(a));}
for(const id of ['china-stay','china-salon','france-labor','japan-performance'])assert(adapter.serviceMenus.intent(id).continuation,'necessary ongoing controls remain carried: '+id);
const fr=adapter.serviceMenus.intent('france-meal'),legacy={id:'france-tea-service',franceTea:true,priority:50,position:fr.position};const chosen=uniqueInteractionActions(nearbyInteractions([legacy,fr],{x:fr.position[0],y:fr.position[1],z:fr.position[2]}).map(adapter.contextualTarget));assert.equal(chosen.length,1);assert.equal(chosen[0].menuId,'france-meal','legacy menu cannot shadow exact table and fresh intent');
japanTarget={...fr,id:'japan-target'};const jp=adapter.serviceMenus.intent('japan-visit');const jpLegacy={id:'jp-player-service',playerService:true,serviceStep:{kind:'wait'},priority:50,position:jp.position};assert.equal(uniqueInteractionActions(nearbyInteractions([jpLegacy,jp],{x:jp.position[0],y:jp.position[1],z:jp.position[2]}).map(adapter.contextualTarget))[0].menuId,'japan-visit');
assert.equal(adapter.serviceMenus.intent('china-meal'),null,'China adapter is not replaced');adapter.serviceMenus.clear();assert.equal(adapter.serviceMenus.executeIntent(fr),false);
for(const {f,ui}of contexts){ui.dispose();f.service.dispose({suspend:true});assert.equal(f.service.menuTarget(),null);}
console.log('PASS production registry: correct providers, live order keys, high-priority physical entries, preserved stay/salon/work/performance, country cleanup');
