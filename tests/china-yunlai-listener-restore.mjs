// YL02: furniture references resolve by stable ID, but old saved numeric paths
// and mounted stages still need to approach the chair at its new location.
// Controller-only fixture: no route/collision or paid-service completion claim.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
const {createChinaOfficialLife}=await load('game/china-official-life.js');
const {createLifeDecisions}=await load('game/npc-life-decisions.js');
const {createFacilityQueue}=await load('game/npc-facilities.js');
const {TAVERN_LAYOUT_VERSION}=await load('game/china-tavern-layout.js');
const T=await load('vendor/three/build/three.module.js');
const copy=structuredClone,id='cn-minister-works';
function fixture({seatId='china-tavern-listening-17.5',mounted=true,owner=null,layoutVersion=2}={}){
 const east=seatId.endsWith('20.65'),oldPoint=[east?20.65:17.5,7.815,17.94],oldBody=[east?20.65:17.5,7.815,mounted?17.125:16.1];
 const chair={id:seatId,kind:'seat',position:[east?19.65:17.35,7.815,east?15.44:14.54],anchor:[east?19.65:17.35,7.815,east?14.625:13.725],yaw:0,seatY:8.475};
 const root=new T.Group(),body=owner==='salon'?[24.35,4.015,18.25]:owner==='meal'?[23,.215,18.695]:oldBody;root.position.set(...body);
 const existingMount=owner?{id:'original-'+owner+'-mount'}:null,actor={station:{id},root,home:root.position.clone(),phase:0,route:[],walking:false,serviceMount:existingMount,animate(){}};
 const decisions=createLifeDecisions({worldSeed:42,actorIds:[id]}).snapshot();decisions.people[id].current={id:owner==='meal'?'meal':owner==='salon'?'paid-salon':'listen',duration:18,startedAt:1};
 const reference={$worldRef:'furniture',id:seatId},stage={label:'原免费听席',path:[oldPoint],index:mounted?1:0,arrived:mounted,planned:true,stalled:0,waiting:0,elapsed:9,duration:18,mount:mounted&&owner!=='meal'?reference:null,mountTarget:reference,choice:{id:decisions.people[id].current.id,point:oldPoint,facilityId:seatId,duration:18,relief:{social:-.5}},...(owner==='meal'?{borrowed:true}:{})};
 const saved={version:1,...(layoutVersion==null?{}:{layoutVersion}),decisions,positions:{[id]:owner==='salon'?oldBody:body},duties:{},unpaidDuties:[],runtime:{time:13,conversation:null,stages:[[id,stage]]}};
 let movements=0,transactions=0;
 const flow=createChinaOfficialLife({officials:[actor],npcs:[actor],lot:{colliders:[],walkableSurfaces:[.215,4.015,7.815].map(y=>({minX:16,maxX:26,minZ:3,maxZ:21,y})),bounds:{minX:0,maxX:30,minZ:0,maxZ:40}},furniture:{items:[chair],facilities:createFacilityQueue(),canSit:()=>true,standPoint:()=>new T.Vector3(...chair.position)},doors:{},planPath:(_,p)=>[p],poseContext:()=>({}),safety:()=>[],travel(){movements++;},saved,
  getTavern:()=>owner==='meal'?{officialMeal:()=>({id:'original-prepaid-order',actorId:id})}:null,
  getSalon:()=>owner==='salon'?{ownsNPCCustomer:()=>true}:null,
  economy:{account:()=>({cash:0,bank:0}),prepareMealPayment(){transactions++;throw Error('migration must not charge');},prepareSalonReserve(){transactions++;throw Error('migration must not reserve');}}});
 return {flow,actor,saved,chair,oldPoint,body,existingMount,stats:()=>({movements,transactions})};
}
let cases=0;
for(const seatId of ['china-tavern-listening-17.5','china-tavern-listening-20.65'])for(const mounted of [false,true])for(const layoutVersion of [null,1,2]){
 const f=fixture({seatId,mounted,layoutVersion}),result=copy(f.flow.snapshot()),s=result.runtime.stages[0][1];
 assert.deepEqual(f.actor.root.position.toArray(),f.body,'migration leaves original physical body in place');
 assert.equal(result.layoutVersion,TAVERN_LAYOUT_VERSION);assert.equal(s.mount,null);assert.equal(s.mountTarget.id,seatId);assert.equal(f.actor.serviceMount,null);
 assert.deepEqual(s.choice.point,f.chair.position);assert.deepEqual(s.path,[f.chair.position]);assert.equal(s.index,0);assert.equal(s.arrived,false);assert.equal(s.planned,false);assert.equal(s.waiting,0);
 assert.equal(s.elapsed,9);assert.equal(s.duration,18);assert.deepEqual(result.decisions,f.saved.decisions,'same personality, choices, needs and pending decision');
 assert.deepEqual(f.stats(),{movements:0,transactions:0});assert(f.flow.restore(result));assert.deepEqual(copy(f.flow.snapshot()),result,'already rebound listener is idempotent');f.flow.dispose({suspend:true});cases++;
}
for(const owner of ['meal','salon']){
 const f=fixture({owner}),result=copy(f.flow.snapshot()),s=result.runtime.stages[0][1];
 assert.deepEqual(f.actor.root.position.toArray(),f.body,'live paid owner keeps its actual body');assert.equal(f.actor.serviceMount,f.existingMount,'same paid-owner mount object');
 assert.deepEqual(s.path,[f.oldPoint],'layout migration does not take over borrowed route');assert.deepEqual(s.choice.point,f.oldPoint);assert.equal(s.elapsed,9);assert.deepEqual(result.decisions,f.saved.decisions);assert.deepEqual(f.stats(),{movements:0,transactions:0});
 if(owner==='salon'){assert(s.borrowedSalon);assert.equal(s.mount,null);assert.equal(s.mountTarget,null,'existing salon ownership guard releases stale free chair');}else assert(s.borrowed);
 f.flow.dispose({suspend:true});cases++;
}
console.log(JSON.stringify({status:'PASS',cases,scope:'Both moved free-listening IDs, approaching and mounted legacy/revision-1/revision-2 snapshots, exact body/elapsed/brain preservation, idempotency, and paid meal/salon ownership exclusions; lightweight controller fixture'}));
