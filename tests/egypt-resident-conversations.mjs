// Exercise the original three actors, finite resident supply and local duty
// boundaries. Routes are lightweight; eating, props, needs and receipts are real.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNpcSocial} from '../source/game/npc-social.js';
import {createPlayerConversationLedger} from '../source/game/player-conversation-ledger.js';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three');
const {createEgyptMealService}=await import('../source/game/egypt-meal-service.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const {createDailyNeeds,DAILY_NEEDS_HOUR:H}=await import('../source/game/daily-needs.js');
const {EGYPT_MEAL:P}=await import('../source/game/egypt-meal-definition.js');
const {validEgyptResidentSupply,initialEgyptResidentSupply}=await import('../source/game/egypt-resident-supply.js');

const mainSource=readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8'),mainCall=mainSource.match(/const egyptPlayerSocial=npcSocial\?\.state\(\);egyptMeal\?\.update\(dt,t,.*?\);(?=egyptMealUI)/)?.[0];assert(mainCall);
const mainUpdate=new Function('npcSocial','egyptMeal','dt','t','performing','npcs',mainCall);
const GUEST='egypt-papyrus',DUTY='eg-table-service-labor-1',copy=structuredClone;

function fixture({hungry=true,saved={},needsSaved,seconds=0,playerSeated=false,reply=1}={}){
 const group=new T.Group(),seat={id:'egypt-seat',kind:'seat',center:P.seatCenter.slice(),anchor:[15.25,0,-9.3],position:[13.95,0,-9.3],seatY:.66,yaw:Math.PI/2};
 const actor=(id,p)=>{const root=new T.Group();root.position.set(...p);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,home:new T.Vector3(...p),station:{id,npcPosition:p.slice(),npcLabel:id,npcAction:'read'},characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:2},animate(){}};};
 const cook=actor(P.cook,P.prep),host=actor(P.host,P.hostHome),guest=actor(GUEST,[-7.75,0,-1.7]),npcs=[cook,host,guest],person=actor('player',[30,0,30]);
 let mounted=null,blocked=false,doorWaiting=false,rejectState=()=>false,failNeeds=false,durable,needsDisk,elapsed=0,contactSerial=0,contacts=[];
 const clock=()=>{const minutes=600+seconds*.7;return {seconds,day:Math.floor(minutes/1440),hour:minutes%1440/60};};
 const needs=createDailyNeeds({saved:needsSaved||{version:2,people:{[GUEST]:{foodAge:(hungry?25:7)*H,foodBalanceOffset:0,toiletAge:0,receipts:{}}}},getClock:clock,saveState:s=>{if(failNeeds)return false;needsDisk=copy(s);return true;}});needs.enter('egypt',npcs.map(n=>n.station.id));
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>!blocked&&!mounted,standPoint:()=>blocked?null:new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 function playerSeat(value){furniture.releaseActor('player');mounted=value?seat:null;person.root.position.set(...(value?seat.anchor:[30,0,30]));if(value){assert(furniture.facilities.reserve(seat.id,'player'));assert(furniture.facilities.occupy(seat.id,'player'));}}
 if(playerSeated)playerSeat(true);
 const lot={group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},doors={cameraColliders:[],routeStep(route,p){if(doorWaiting)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const brain=createLifeDecisions({worldSeed:42,actorIds:npcs.map(n=>n.station.id)}).snapshot();for(const[id,p]of Object.entries(brain.people)){p.random=id===P.cook?42:reply;p.cooldowns.pause=9999;p.cooldowns.read=9999;}
 const service=createEgyptMealService({npcs,lot,furniture,doors,planPath:(a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>person,getMounted:()=>mounted,getClock:clock,sharedNeeds:needs,worldSeed:42,saved:Object.keys(saved).length?saved:{version:2,supply:initialEgyptResidentSupply(),life:brain},beginInteraction:participants=>({id:'egypt-contact-'+(++contactSerial),participants}),onInteraction:e=>contacts.push(copy(e)),saveState:s=>{if(rejectState(s))return false;durable=copy(s);return true;},onResidentMealReceipts:(receipts,supply)=>needs.egyptResidentMealReceipts(receipts,supply)});
 const tick=(count=1,context={})=>{for(let i=0;i<count;i++){seconds+=.1;elapsed+=.1;needs.update();if(context.social){context.social.update(.1);mainUpdate(context.social,service,.1,elapsed,null,npcs);}else service.update(.1,elapsed,context);}};
 const until=(predicate,label='expected state',limit=5000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),`${label}: ${JSON.stringify({order:service.state().order,duty:service.kitchen.dutyState(),phase:service.state().phase})}`);};
 function checkpoint(){return {saved:service.snapshot(),needsSaved:needs.snapshot(),seconds,actors:npcs.map(n=>({id:n.station.id,position:n.root.position.toArray(),yaw:n.root.rotation.y,mountId:n.serviceMount?.id||null})),player:person.root.position.toArray(),playerYaw:person.root.rotation.y};}
 function restoreActors(c,{skipGuestMount=false}={}){for(const a of c.actors){const n=npcs.find(n=>n.station.id===a.id);n.root.position.set(...a.position);n.root.rotation.y=a.yaw;if(a.mountId&&!(skipGuestMount&&a.id===GUEST)&&furniture.facilities.reserve(a.mountId,n.station.id)&&furniture.facilities.occupy(a.mountId,n.station.id))n.serviceMount=seat;}if(!mounted){person.root.position.set(...c.player);person.root.rotation.y=c.playerYaw||0;}assert(service.restore(c.saved));}
 return {service,contacts,contactSerial:()=>contactSerial,table:service.tableService,kitchen:service.kitchen,needs,npcs,cook,host,guest,person,seat,furniture,clock,tick,until,playerSeat,checkpoint,restoreActors,movePlayer:p=>person.root.position.set(...p),advanceHours:hours=>{seconds+=hours*H;needs.update();},reject:fn=>rejectState=fn,rejectNeeds:value=>failNeeds=value,blockSeat:value=>blocked=value,blockDoor:value=>doorWaiting=value,get durable(){return durable;},get needsDisk(){return needsDisk;},dispose:()=>service.dispose({suspend:true})};
}
function actualPair(f){f.until(s=>!!s.talks.pair,'source meal then autonomous accepted invitation',4000);return f.service.state().talks.pair;}
function claim(f){f.movePlayer(f.table.registry);f.table.requestMeeting(true);f.until(()=>f.table.meetingReady(),'original Dana meeting');assert(f.table.claimDuty(DUTY));f.until(()=>f.table.dutyActive(DUTY),'safe table takeover');f.table.requestMeeting(false);}
function doStage(f,expected,next){const w=f.table.workIntent(DUTY);assert.equal(w?.stage,expected);assert.equal(f.table.executeWork(w,'eg-table-service-labor-999'),false);f.movePlayer(w.position);assert(f.table.executeWork(w,DUTY));f.until(s=>s.order?.stage===next,`${expected} becomes ${next}`);return w;}
function toTray(f){claim(f);f.until(s=>s.order?.stage==='requested');doStage(f,'requested','ticket');doStage(f,'ticket','preparing');f.until(s=>s.order?.stage==='collecting');doStage(f,'collecting','carrying');}


test('real resident meal produces individual facts and a physical two-person conversation without employment',()=>{
 const f=fixture();f.until(s=>s.order?.stage==='eating');assert.equal(f.service.state().life.people[GUEST].experiences.length,0);const pair=actualPair(f),before=f.service.state().life.people;
 assert.equal(f.service.state().order,null);assert.equal(f.service.state().duty,null);assert.equal(f.service.state().tableDuty,null);assert.equal(f.service.state().supply.remaining,23);assert(Object.values(before).every(p=>p.experiences.length===1));assert.equal(f.contacts.length,0);
 f.until(s=>s.life.conversations.some(e=>e.status==='completed'),'actual participants talk after walking');const s=f.service.state(),event=s.life.conversations.find(e=>e.status==='completed');assert.equal(event.results.length,2);for(const id of Object.keys(before))if(!pair.participants.includes(id)){assert.deepEqual(s.life.people[id].relations,before[id].relations);assert.deepEqual(s.life.people[id].opinions,before[id].opinions);}assert.equal(f.contactSerial(),1);assert.equal(f.contacts.at(-1).duration,event.duration);assert.equal(f.furniture.facilities.state().filter(x=>x.id.startsWith('egypt-meal-talk-')&&x.reservations.length).length,0);
 console.log('EGYPT STORY',JSON.stringify(event));f.dispose();
});
test('refusal keeps one reply roll, no contact or relation, and a cooldown',()=>{
 const f=fixture({reply:15872});f.until(s=>s.life.conversations.length>0);const s=f.service.state(),event=s.life.conversations[0];assert.equal(event.status,'declined');assert.equal(f.contactSerial(),0);assert.notEqual(s.talks.pair?.id,event.id);assert(!s.talks.pair?.participants.includes(P.cook));assert(Object.values(s.life.people).every(p=>Object.keys(p.relations).length===0));const choices=s.life.people[P.cook].choices;f.tick(20);assert.equal(f.service.state().life.people[P.cook].choices,choices);f.dispose();
});
test('actual talk checkpoint preserves token and the same event across failing final save and recovery',()=>{
 const f=fixture();actualPair(f);f.until(s=>s.talks.pair?.elapsed>1);const c=f.checkpoint(),before=copy(c.saved.life.people),token=c.saved.talks.pair.interaction.id;f.dispose();const g=fixture(c);g.restoreActors(c);assert.equal(g.service.state().talks.pair.id,c.saved.talks.pair.id);g.tick();assert.equal(g.contactSerial(),0);assert.equal(g.contacts.at(-1).id,token);
 g.reject(s=>s.life.conversations.some(e=>e.status==='completed'));g.tick(800);assert(g.service.state().talks.pair);for(const id of Object.keys(before))assert.deepEqual(g.service.state().life.people[id].relations,before[id].relations);const contacts=g.contacts.length;g.reject(()=>false);g.tick();assert.equal(g.contacts.length,contacts);assert.equal(g.service.state().talks.pair,null);assert.equal(g.service.state().life.conversations.filter(e=>e.status==='completed').length,1);const done=g.checkpoint();g.dispose();const h=fixture(done);h.restoreActors(done);h.tick();for(const id of Object.keys(before)){assert.deepEqual(h.service.state().life.people[id].relations,g.service.state().life.people[id].relations);assert.deepEqual(h.service.state().life.people[id].opinions,g.service.state().life.people[id].opinions);}h.dispose();
});
test('new work and true player conversation release both places without rewards',()=>{
 for(const mode of ['kitchen-meeting','table-meeting','social']){const f=fixture(),pair=actualPair(f);if(mode==='kitchen-meeting')f.kitchen.requestMeeting(true);else if(mode==='table-meeting')f.table.requestMeeting(true);else f.tick(1,{playerSocialActorId:pair.participants[0]});assert.equal(f.service.state().talks.pair,null);assert.equal(f.service.state().life.conversations.at(-1).status,'cancelled');assert.equal(f.contactSerial(),0);assert(Object.values(f.service.state().life.people).every(p=>Object.keys(p.relations).length===0));assert.equal(f.furniture.facilities.state().filter(x=>x.id.startsWith('egypt-meal-talk-')&&x.reservations.length).length,0);f.dispose();}
});
test('player table work cannot become Dana service experience',()=>{
 const f=fixture();toTray(f);doStage(f,'carrying','eating');f.until(s=>s.order?.stage==='clearing');doStage(f,'clearing','returning');doStage(f,'returning','leaving');f.until(s=>!s.order);const p=f.service.state().life.people;assert.equal(p[P.host].experiences.length,0);assert.equal(p[P.cook].experiences.length,1);assert.equal(p[GUEST].experiences.length,1);f.dispose();
});

test('production main protects choosing/talking while a busy greeting leaves original NPC talk running',()=>{
 const f=fixture();actualPair(f);f.until(s=>s.talks.pair?.elapsed>.3);const pair=f.service.state().talks.pair,n=f.npcs.find(n=>n.station.id===pair.participants[0]);f.person.root.position.copy(n.root.position).add(new T.Vector3(0,0,.8));
 const ledger=createPlayerConversationLedger({worldSeed:42,getProfile:id=>f.service.socialProfile(id),getClock:()=>({day:1,seconds:200}),saveState:()=>true});
 const social=createNpcSocial({actors:()=>f.npcs,player:()=>f.person,ledger,status:n=>f.service.socialStatus(n),getCountry:()=> 'egypt'});assert.equal(social.begin(n).stage,'greeting');f.tick(10,{social});assert.equal(f.service.state().talks.pair.id,pair.id);assert(f.service.state().talks.pair.elapsed>pair.elapsed+.9);assert.equal(ledger.snapshot().events.length,0);social.dispose();f.dispose();
 const g=fixture({hungry:false}),host=g.host;g.person.root.position.copy(host.root.position).add(new T.Vector3(0,0,.8));const otherLedger=createPlayerConversationLedger({worldSeed:5,getProfile:id=>g.service.socialProfile(id),getClock:()=>({day:1,seconds:200}),saveState:()=>true}),other=createNpcSocial({actors:()=>g.npcs,player:()=>g.person,ledger:otherLedger,status:n=>g.service.socialStatus(n),getCountry:()=> 'egypt',beginInteraction:participants=>({id:'player-contact',participants})});assert.equal(other.begin(host).stage,'choosing');g.tick(5,{social:other});assert.equal(other.state().stage,'choosing');assert.equal(g.service.socialProfile(P.host).current,null);assert.equal(other.choose('art').event.status,'accepted');g.tick(5,{social:other});assert.equal(other.state().stage,'talking');assert.equal(g.service.socialProfile(P.host).current,null);other.dispose();g.dispose();
});
test('Samira finished meal return is ordinary walking and preserves the remaining real route on pause',()=>{
 const f=fixture();f.until(s=>s.order?.stage==='leaving');f.tick();assert.equal(f.service.socialStatus(f.guest).canPause,true);assert.equal(f.guest.walking,true);const pos=f.guest.root.position.toArray(),route=f.guest.route.map(p=>p.toArray());f.tick(10,{playerSocialActorId:GUEST});assert.deepEqual(f.guest.root.position.toArray(),pos);assert.deepEqual(f.guest.route.map(p=>p.toArray()),route);assert.equal(f.service.state().order.stage,'leaving');f.tick();assert.notDeepEqual(f.guest.root.position.toArray(),pos);f.dispose();
});

test('failed invitation storage retries the same personal intention and reply random state',()=>{
 const f=fixture();f.reject(s=>s.life.conversations.some(e=>e.status==='accepted'));f.until(s=>!!s.pendingTalk,'real source then failed invitation');const s=f.service.state(),pending=copy(s.pendingTalk),random=Object.fromEntries(Object.entries(s.life.people).map(([id,p])=>[id,[p.random,p.choices]]));f.tick(20);assert.deepEqual(f.service.state().pendingTalk,pending);for(const[id,p]of Object.entries(f.service.state().life.people))assert.deepEqual([p.random,p.choices],random[id]);assert.equal(f.contactSerial(),0);assert.equal(f.service.state().talks.pair,null);f.reject(()=>false);f.tick();assert.equal(f.service.state().talks.pair.participants[0],pending.actorId);assert.equal(f.service.state().talks.pair.participants[1],pending.choice.targetId);f.dispose();
});
test('unfinished source writes keep the original cleaned order for retry without phantom experience',()=>{
 const f=fixture();f.reject(s=>Object.values(s.life.people).some(p=>p.experiences.length));f.until(s=>s.order?.stage==='leaving');f.tick(500);let s=f.service.state();assert.equal(s.order.stage,'leaving');assert.equal(s.supply.remaining,23);assert.equal(s.supply.consumed.length,1);assert(Object.values(s.life.people).every(p=>p.experiences.length===0));assert.equal(s.talks.pair,null);f.reject(()=>false);actualPair(f);s=f.service.state();assert.equal(s.supply.remaining,23);assert(Object.values(s.life.people).every(p=>p.experiences.length===1));f.dispose();
});
