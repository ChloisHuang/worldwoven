// CR05/ST05: the market's external transaction participant must not detach
// finite evidence ownership from its cash save or invent witnesses to a sale.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrimeConsequences} from '../source/game/crime-consequences.js';
import {createCrimeRuntime} from '../source/game/crime-runtime.js';
import {createRelationshipEvents} from '../source/game/relationship-events.js';
import {holdSocialActors,resetSocialHolds} from '../source/game/npc-social-ownership.js';

const p=(x=0,y=0,z=0)=>({x,y,z});
const itemId='sealed-patrol-token',requestId='market-fence:1';
function fixture({saved}={}){
 const actor=(id,x)=>({id,key:id+'@life-1',countryId:'china',sceneId:'china',position:p(x),alive:true,available:true,adult:true});
 const seller=actor('player',0),buyer=actor('merchant',30),witness=actor('bystander',40),guard=actor('guard',80),actors=[seller,buyer,witness],writes=[],blocked=new Set();
 const jail={countryId:'china',sceneId:'china',entry:p(30),cell:p(30,-4),release:p(28)};
 const model=createCrimeConsequences({saved,actors:()=>actors,guards:()=>[guard],items:[{id:itemId,ownerId:'guard-post',countryId:'china',position:p()}],jail:()=>jail,persist:(next,events)=>{writes.push({next,events});return true;},hasLineOfSight:(a,b)=>!blocked.has(a.key+'>'+b.key)});
 const take=()=>{assert.equal(model.take(seller.key,itemId).ok,true);buyer.position=p(.75);witness.position=p(2);};
 const prepare=()=>model.prepareFence(seller.key,buyer.key,itemId,requestId);
 return {model,seller,buyer,witness,guard,actors,writes,blocked,jail,take,prepare};
}
function accept(participant){assert.equal(participant.ok,true);assert.equal(participant.lock(),true);assert.equal(participant.committed(),true);participant.release();}

test('entering a market is not an offense; only a real held item can be fenced',()=>{
 const f=fixture();f.buyer.position=p(.75);f.model.update(10);assert.equal(f.model.snapshot().cases.length,0);
 assert.equal(f.prepare().reason,'not-item-holder');assert.equal(f.writes.length,0);
 f.take();assert.equal(f.model.returnItem(f.seller.key,itemId).ok,true);assert.equal(f.prepare().reason,'not-item-holder');
});

test('fencing prepare and abort do not persist, pay or transfer anything; acceptance is exactly once',()=>{
 const f=fixture();f.take();const before=f.model.snapshot(),writes=f.writes.length,tx=f.prepare();
 assert.equal(tx.ok,true);assert.deepEqual(f.model.snapshot(),before);assert.equal(f.writes.length,writes);
 assert.equal(tx.engine.items[itemId].holderKey,f.buyer.key);assert.equal(tx.committed(),false,'cannot accept without the storage owner lock');
 assert.equal(tx.lock(),true);assert.equal(f.model.returnItem(f.seller.key,itemId).reason,'crime-busy');assert.equal(f.model.update(1).reason,'crime-busy');
 assert.equal(f.prepare().reason,'crime-busy');tx.release();assert.deepEqual(f.model.snapshot(),before,'failed external currency save just releases its participant');
 assert.equal(tx.lock(),true);assert.equal(tx.committed(),true);tx.release();assert.equal(tx.committed(),true);assert.equal(tx.lock(),false);
 const after=f.model.snapshot();assert.equal(after.items[itemId].holderKey,f.buyer.key);assert.equal(after.items[itemId].ownerId,'guard-post');assert.equal(after.items[itemId].transfers,2);assert.equal(after.cases.length,3);assert.deepEqual(after.cases[0],before.cases[0]);assert.equal(f.writes.length,writes);
 assert.deepEqual(after.items[itemId].fence,tx.receipt);assert.equal(f.model.returnItem(f.seller.key,itemId).reason,'not-item-holder');
 assert.equal(f.model.verifyFenceReceipt({requestId,itemId}),true);assert.equal(f.model.verifyFenceReceipt({requestId,itemId,buyerKey:'another-life'}),false);
});

test('range, wall, scene, life, sleeping, adult, busy and detained gates fail closed',()=>{
 for(const change of [
  f=>{f.buyer.position=p(3);},f=>{f.buyer.position=p(.75,-4);},f=>{f.blocked.add(f.seller.key+'>'+f.buyer.key);},f=>{f.blocked.add(f.buyer.key+'>'+f.seller.key);},
  f=>{f.buyer.sceneId='other';},f=>{f.buyer.alive=false;},f=>{f.buyer.present=false;},f=>{f.buyer.awake=false;},f=>{f.buyer.available=false;},f=>{f.buyer.busy=true;},f=>{f.buyer.adult=false;},f=>{f.buyer.detained=true;},
  f=>{f.seller.alive=false;},f=>{f.seller.awake=false;},f=>{f.seller.available=false;},f=>{f.seller.busy=true;},f=>{f.seller.detained=true;},f=>{f.seller.key='player@life-2';}
 ]){const f=fixture();f.take();change(f);const before=f.model.snapshot();assert.equal(f.prepare().ok,false);assert.deepEqual(f.model.snapshot(),before);}
 const f=fixture();f.take();assert.equal(f.model.prepareFence(f.seller.key,f.seller.key,itemId,requestId).ok,false);assert.equal(f.model.prepareFence(f.seller.key,f.buyer.key,itemId,'').ok,false);
});

test('a stale participant cannot overwrite a later return, movement or changed eyewitness',()=>{
 for(const change of [f=>f.model.returnItem(f.seller.key,itemId),f=>{f.buyer.position=p(9);},f=>{f.witness.position=p(40);},f=>{f.blocked.add(f.witness.key+'>'+f.buyer.key);}]){
  const f=fixture();f.take();const tx=f.prepare();assert.equal(tx.ok,true);change(f);assert.equal(tx.valid(),false);assert.equal(tx.lock(),false);assert.equal(tx.committed(),false);
 }
});

test('only a third party seeing both sides identifies each offender; mere proximity and collusion cannot report',()=>{
 const f=fixture();f.take();accept(f.prepare());const cases=f.model.snapshot().cases.filter(c=>c.kind==='fencing');
 assert.deepEqual(cases.map(c=>[c.role,c.subjectKey]),[['seller',f.seller.key],['buyer',f.buyer.key]]);
 for(const c of cases){assert.deepEqual(c.evidence.map(e=>e.witnessKey),[f.witness.key]);assert.equal(c.theftCaseId,f.model.snapshot().cases[0].id);assert.equal(f.model.report(f.seller.key,c.id).reason,'not-witness');assert.equal(f.model.report(f.buyer.key,c.id).reason,'not-witness');}
 for(const change of [g=>{g.blocked.add(g.witness.key+'>'+g.buyer.key);},g=>{g.blocked.add(g.witness.key+'>'+g.seller.key);},g=>{g.witness.awake=false;},g=>{g.witness.position=p(2,-8);},g=>{g.actors.splice(g.actors.indexOf(g.witness),1);}]){
  const g=fixture();g.take();change(g);accept(g.prepare());for(const c of g.model.snapshot().cases.filter(c=>c.kind==='fencing'))assert.equal(c.evidence.length,0);
 }
});

test('original guards physically escort both parties; seller custody cannot confiscate the buyer-held unique object',()=>{
 const f=fixture();f.take();accept(f.prepare());const originalTheft=f.model.snapshot().cases[0].id;
 f.guard.position=p(.5);f.model.update(.1);assert.equal(f.model.orders().subjectKey,f.seller.key);f.model.update(.1);assert.equal(f.model.orders().status,'escort');
 function cell(subject){subject.position={...f.jail.entry};f.guard.position={...f.jail.entry};f.model.update(.1);subject.position={...f.jail.cell};f.guard.position={...f.jail.cell};f.model.update(.1);assert.equal(f.model.orders().status,'custody');}
 cell(f.seller);assert.equal(f.model.snapshot().items[itemId].holderKey,f.buyer.key);f.model.update(45);f.seller.position={...f.jail.release};f.model.update(.1);
 assert.equal(f.model.orders().subjectKey,f.buyer.key);f.guard.position=p(.5);f.model.update(.1);assert.equal(f.model.orders().status,'escort');cell(f.buyer);
 const s=f.model.snapshot();assert.equal(s.items[itemId].holderKey,null);assert.equal(s.items[itemId].transfers,3);assert.equal(s.cases.find(c=>c.kind==='fencing'&&c.role==='buyer').confiscated,true);assert.equal(s.cases.find(c=>c.id===originalTheft).kind,'theft');assert.equal(s.cases.find(c=>c.id===originalTheft).status,'undiscovered');
});

test('buyer restitution does not forgive the seller and the original object can never be fenced twice',()=>{
 const f=fixture();f.take();f.witness.position=p(40);accept(f.prepare());assert.equal(f.model.returnItem(f.buyer.key,itemId).ok,true);
 const s=f.model.snapshot();assert.equal(s.cases[0].status,'undiscovered');assert.equal(s.cases.find(c=>c.kind==='fencing'&&c.role==='seller').status,'undiscovered');assert.equal(s.cases.find(c=>c.kind==='fencing'&&c.role==='buyer').status,'repaired');
 assert.equal(f.model.verifyFenceReceipt({requestId,itemId}),true,'receipt stays after restitution');
 const restored=fixture({saved:s});assert.equal(restored.model.status(restored.seller.key).ok,true);assert.equal(restored.model.verifyFenceReceipt({requestId,itemId}),true);
 assert.equal(restored.model.take(restored.seller.key,itemId).reason,'item-case-open');
 const later=structuredClone(s);for(const c of later.cases)c.status='closed';const g=fixture({saved:later});g.buyer.position=p(.75);assert.equal(g.model.take(g.seller.key,itemId).ok,true);assert.equal(g.prepare().reason,'item-already-fenced');
});

test('version-one theft saves migrate without new receipts; corrupted or detached fencing provenance is read-only',()=>{
 const f=fixture();f.take();const legacy=f.model.snapshot(),old=fixture({saved:legacy});assert.equal(old.model.status(old.seller.key).ok,true);assert.equal(old.model.verifyFenceReceipt({requestId,itemId}),false);accept(f.prepare());
 const valid=f.model.snapshot();assert.deepEqual(fixture({saved:valid}).model.snapshot(),valid);
 for(const corrupt of [
  s=>{delete s.items[itemId].fence;},s=>{s.items[itemId].fence.buyerKey='another-life';},s=>{s.items[itemId].fence.theftCaseId='absent';},s=>{s.items[itemId].fence.requestId='';},
  s=>{s.cases.find(c=>c.kind==='fencing').role='owner';},s=>{s.cases.find(c=>c.kind==='fencing').itemId='fake-item';},s=>{s.cases.find(c=>c.kind==='fencing').requestId='different';},
  s=>{s.cases.find(c=>c.kind==='fencing').evidence[0].witnessKey=f.buyer.key;},s=>{s.cases=s.cases.filter(c=>c.kind!=='theft');}
 ]){const broken=structuredClone(valid);corrupt(broken);const g=fixture({saved:broken});assert.equal(g.model.status(g.seller.key).reason,'invalid-crime-save');assert.equal(g.prepare().reason,'invalid-crime-save');assert.equal(g.model.verifyFenceReceipt({requestId,itemId}),false);assert.deepEqual(g.model.snapshot(),broken);assert.equal(g.writes.length,0);}
});

function runtimeFixture({saved={},marketPermission=true}={}){
 resetSocialHolds();let writes=0,time=100,mode='leave';const conduct=[],observed=[];
 const actor=(id,x)=>({actorId:id,lifeId:'life-1',station:{id,npcName:id,ageYears:25},root:{position:{...p(x),toArray(){return[this.x,this.y,this.z];}},rotation:{y:0}},route:[],alive:true,animate(){}});
 const seller=actor('player',0),buyer=actor('merchant',30),witness=actor('bystander',40),actors=[seller,buyer,witness];
 const lot={holdingCell:{intake:[30,0,0],detention:[30,-4,0],release:[28,0,0],evidence:{itemId,owner:'guard-post',position:[0,0,0]},setLocked(){},setEvidencePresent(){}}};
 const rt=createCrimeRuntime({country:'china',lot,getActors:()=>actors,getPlayer:()=>seller,getClock:()=>({seconds:time}),getProfile:()=>({}),getRelation:()=>null,getMode:()=>mode,getGuards:()=>[],guardResumed(){},planPath:()=>[],moveActor(){},doors:{},poseContext:()=>({}),canSee:()=>true,isAdult:()=>true,playerAvailable:()=>true,stopPlayer(){},saved,saveState(){writes++;return true;},applyInjury:()=>({ok:true}),recordRelationship:()=>({ok:true}),recordPersonalConduct:e=>{conduct.push(e);return{ok:false};},observeCrimeEvidence:e=>{observed.push(e);return{ok:false};},canFenceActor:(n,role)=>marketPermission&&role==='buyer'&&n===buyer});
 const prepare=()=>rt.prepareFence('player@life-1','merchant@life-1',itemId,requestId);
 const take=()=>{assert.equal(rt.interact({kind:'take',itemId}),true);buyer.root.position.x=.75;witness.root.position.x=2;};
 return {rt,seller,buyer,witness,actors,take,prepare,conduct,observed,writes:()=>writes,setMode:x=>mode=x,step(){time+=.5;rt.update(.5,time);}};
}

test('runtime packages engine, leases and durable social evidence in the currency save with no independent write',()=>{
 const f=runtimeFixture();f.take();const before=f.rt.snapshot(),writes=f.writes(),seen=f.observed.length,tx=f.prepare();assert.equal(tx.ok,true);assert.deepEqual(f.rt.snapshot(),before);assert.equal(f.writes(),writes);
 assert.equal(tx.crime.socialPending.filter(p=>p.event.id.includes(':personal')).length,3,'theft and each side of the sale have durable conduct receipts');assert.equal(tx.crime.socialPending.filter(p=>!p.personal).length,2,'only the independent present witness gets sale evidence');
 const relationships=createRelationshipEvents({saveState:()=>true});for(const entry of tx.crime.socialPending){assert.equal(entry.event.kind,'property-theft');assert.equal((entry.personal?relationships.recordPersonal:relationships.observeWitness)(entry.event).ok,true);}assert(relationships.conductFor('player').integrity<0);assert(relationships.conductFor('merchant').integrity<0);assert.equal(relationships.conductFor('merchant').care,0,'fencing cannot fabricate physical harm');assert.deepEqual(tx.crime.engine.effects,[]);
 assert.equal(tx.lock(),true);f.step();assert.equal(f.rt.interact({kind:'return',itemId}),false);assert.equal(f.rt.beginHarm('player','merchant'),false);assert.equal(f.writes(),writes);assert.equal(f.observed.length,seen);
 tx.release();assert.deepEqual(f.rt.snapshot(),before,'failed common save keeps pending social evidence and inventory unchanged');assert.equal(tx.lock(),true);const disk=structuredClone(tx.crime);assert.equal(tx.committed(),true);tx.release();assert.deepEqual(f.rt.snapshot(),disk);assert.equal(f.writes(),writes);assert.equal(f.observed.length,seen);assert.equal(f.rt.verifyFenceReceipt({requestId,itemId}),true);f.rt.dispose();
 const reloaded=runtimeFixture({saved:disk});assert.equal(reloaded.rt.verifyFenceReceipt({requestId,itemId}),true);reloaded.step();assert.equal(reloaded.observed.length,2);assert(reloaded.observed.every(e=>e.participants.includes('bystander')));reloaded.rt.dispose();
});

test('only an explicitly verified market-held buyer can bypass its routine lease, never mounted, detained or another life',()=>{
 const f=runtimeFixture();f.take();assert.equal(holdSocialActors(['merchant'],'market'),true);f.setMode(null);assert.equal(f.prepare().ok,true);
 for(const change of [()=>{f.buyer.serviceMount={kind:'chair'};},()=>{f.buyer.bathTransition={};},()=>{f.buyer.busy=true;},()=>{f.buyer.socialPrivateFade=true;},()=>{f.buyer.lifeId='life-2';}]){
  const previous={serviceMount:f.buyer.serviceMount,bathTransition:f.buyer.bathTransition,busy:f.buyer.busy,socialPrivateFade:f.buyer.socialPrivateFade,lifeId:f.buyer.lifeId};change();assert.equal(f.prepare().ok,false);Object.assign(f.buyer,previous);
 }
 f.rt.dispose();const g=runtimeFixture({marketPermission:false});g.take();holdSocialActors(['merchant'],'another-owner');assert.equal(g.prepare().ok,false);g.rt.dispose();
});

test('malformed runtime leases or social outbox block the transaction without erasing the source save',()=>{
 const f=runtimeFixture();f.take();accept(f.prepare());const valid=f.rt.snapshot();f.rt.dispose();
 for(const corrupt of [s=>{s.leases=[];},s=>{s.leases.merchant={target:{x:1,y:null,z:0}};},s=>{s.socialPending={};},s=>{s.socialPending.push({personal:true,event:{id:'forged'}});}]){
  const broken=structuredClone(valid);corrupt(broken);const g=runtimeFixture({saved:broken});assert.equal(g.prepare().reason,'invalid-crime-runtime-save');assert.equal(g.rt.status().ok,false);assert.equal(g.rt.verifyFenceReceipt({requestId,itemId}),false);assert.deepEqual(g.rt.choices(),[]);g.step();assert.equal(g.writes(),0);assert.deepEqual(g.rt.snapshot(),broken);g.rt.dispose();
 }
});
