// Real authored furniture and life controllers; instant-route doubles isolate
// duplicate sleeping anchors, player eviction and exact-berth reload failures.
// This is not navigation or visual pose acceptance.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three');
const {buildChina}=await import('../source/game/regions-east.js');
const {createFurnitureInteractions}=await import('../source/game/furniture-interactions.js');
const {createChinaOfficialLife}=await import('../source/game/china-official-life.js');
const {createChinaPalaceLife,CHINA_PALACE_ROLES}=await import('../source/game/china-palace-life.js');
const {CHINA_OFFICIAL_BUREAU:B}=await import('../source/game/china-official-bureau.js');
const {createLifeDecisions}=await import('../source/game/npc-life-decisions.js');
const {palaceResidentSave}=await import('../source/game/china-palace-residents.js');
const {createJapanStaffLife,JAPAN_STAFF_CREW}=await import('../source/game/japan-staff-life.js');
const {createJapanServiceOrders}=await import('../source/game/japan-service-orders.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const lot=buildChina(),furniture=createFurnitureInteractions(lot,'china');
// Keep production reservation and authored berth APIs; movement is a double.
const fixtures={...furniture,canUse:()=>true,canSit:()=>true,standPoint:(_,__,item)=>new T.Vector3(...item.position)};
const actor=(station,p)=>{const root=new T.Group(),head=new T.Group();root.add(head);root.userData.head=head;root.position.set(...p);return {station,root,home:root.position.clone(),route:[],phase:0,breakAt:10,locomotion:{walkSpeed:1.4},walking:false,animate(t,walking,action,context){this.pose={action,...context};}};};
const ids=['cn-minister-works','cn-minister-granary','cn-official-rites','cn-official-personnel','cn-official-justice','cn-official-records'];
{
 const officials=ids.map((id,i)=>actor({id},B.offices[i])),bed=furniture.items.find(b=>b.id===B.beds[0]);
 const player=furniture.resolveBed(bed,'player');assert(player);assert(furniture.occupyBed(player,'player'));
 const seed=createLifeDecisions({worldSeed:42,actorIds:ids}).snapshot();for(const id of ids)seed.people[id].current={id:'rest',duration:1000,startedAt:0};
 const life=createChinaOfficialLife({officials,npcs:officials,lot,furniture:fixtures,doors:{},planPath:(_,p)=>[p],poseContext:()=>({visualFloorOffset:0}),safety:()=>[],travel(n,s){n.root.position.set(...s.path.at(-1));s.arrived=true;},worldSeed:42,saved:{decisions:seed}});
 const tick=()=>{life.tick(.1,{hour:22,facilityId:bed.id});for(const n of officials)life.update(n,.1,1);};tick();
 const sleeper=life.mountForActor(officials[0]);assert(sleeper);assert.notEqual(sleeper.berthId,player.berthId);assert.notDeepEqual(sleeper.anchor,player.anchor);assert.equal(sleeper.id,bed.id);assert.equal(officials[0].pose.liePillowZ,sleeper.liePillowZ);
 assert.equal(furniture.facilities.reservation(bed.id,ids[0]).status,'occupied');
 life.playerRequest(bed.id);tick();assert.equal(life.mountForActor(officials[0]),sleeper,'player request keeps sleeping official mounted');
 const saved=copy(life.snapshot());assert.equal(saved.runtime.stages[0][1].mount.berthId,sleeper.berthId);furniture.releaseActor(ids[0]);assert(life.restore(saved));assert.equal(life.mountForActor(officials[0]).berthId,sleeper.berthId);assert.equal(furniture.facilities.reservation(bed.id,'player').seatId,player.berthId);
 furniture.releaseActor(ids[0]);const taken=furniture.resolveBed(sleeper,'other-sleeper',b=>b.berthId===sleeper.berthId);assert(taken);furniture.occupyBed(taken,'other-sleeper');officials[0].root.position.set(...bed.position);assert(life.restore(saved));assert.equal(life.mountForActor(officials[0]),null,'restore cannot steal the exact saved berth');assert.equal(furniture.facilities.reservation(bed.id,'other-sleeper').seatId,sleeper.berthId);furniture.releaseActor('other-sleeper');
 furniture.facilities.release(B.privateRoomIds[0],ids[0]);furniture.facilities.reserve(B.privateRoomIds[0],'room-holder');assert(life.restore(saved));assert.equal(life.mountForActor(officials[0]),null,'restoring a berth cannot bypass its existing private-room claim');furniture.releaseActor('room-holder');
 life.dispose();assert.equal(furniture.facilities.reservation(bed.id,ids[0]),null);assert.equal(furniture.facilities.reservation(bed.id,'player').seatId,player.berthId);furniture.releaseActor('player');
}
{
 const npcs=[...CHINA_PALACE_ROLES,{id:'cn-tea',npcPosition:[2.9,.815,-29.68]}].map(s=>actor(s,s.npcPosition)),resident=npcs[1],bed=furniture.items.find(b=>b.id===resident.station.privateBedId),player=furniture.resolveBed(bed,'player');assert(player);furniture.occupyBed(player,'player');
 const seed=palaceResidentSave({worldSeed:42,actorIds:npcs.map(n=>n.station.id)});for(const n of npcs)seed.people[n.station.id].current={id:n===resident?'rest':'read',duration:1000,startedAt:0};
 const life=createChinaPalaceLife({npcs,lot,furniture:fixtures,doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:(_,p)=>[p],moveActor(){},poseContext:()=>({visualFloorOffset:0}),worldSeed:42,saved:seed});
 const tick=()=>{for(const n of npcs)if(n.route.length)n.root.position.copy(n.route.at(-1));life.update(.1,1,{hour:22,facilityId:bed.id});};for(let i=0;i<30&&!life.mountForActor(resident);i++)tick();const sleeper=life.mountForActor(resident);assert(sleeper);assert.notEqual(sleeper.berthId,player.berthId);assert.equal(resident.pose.liePillowZ,sleeper.liePillowZ);life.playerRequest(bed.id);tick();assert.equal(life.mountForActor(resident),sleeper,'player request keeps palace sleeper and commitment');
 const saved=copy(life.snapshot());furniture.releaseActor(resident.station.id);assert(life.restore(saved));assert.equal(life.mountForActor(resident).berthId,sleeper.berthId);
 furniture.releaseActor(resident.station.id);const taken=furniture.resolveBed(sleeper,'other-sleeper',b=>b.berthId===sleeper.berthId);assert(taken);furniture.occupyBed(taken,'other-sleeper');resident.root.position.set(...bed.position);assert(life.restore(saved));assert.equal(life.mountForActor(resident),null);assert.equal(furniture.facilities.reservation(bed.id,'other-sleeper').seatId,sleeper.berthId);life.dispose();furniture.releaseActor('other-sleeper');furniture.releaseActor('player');
}
{
 // Staff's real single bunk cannot be reassigned by player clicks. A small
 // queue fixture covers decision/continuity without rebuilding the Japan lot.
 const actors=new Map(JAPAN_STAFF_CREW.slice(0,4).map((id,i)=>[id,actor({id,npcName:id},[i,0,0])])),tasks=new Map(),facilities=createFacilityQueue(),board=createJapanServiceOrders();
 const bed={id:'staff-bed',kind:'bed',center:[-4.3,11.4,-11.5],position:[-4.3,11.4,-9.18],anchor:[-4.3,11.4,-11.5],yaw:0},berth={...bed,bedId:bed.id,berthId:bed.id+'-berth-1'};bed.berths=[berth];facilities.define(bed.id,[berth.berthId]);
 const fixture={items:[{id:'staff-seat',kind:'seat',center:[-6.8,11.4,-7.45],position:[-6.8,11.4,-8.39]},bed],facilities,releaseActor:id=>facilities.releaseActor(id),resolveBed:(item,id,eligible)=>{const r=facilities.reserve(bed.id,id,{eligible:()=>eligible(berth)});return r&&eligible(berth)?berth:null;}};
 const life=createJapanStaffLife({actors,board,furniture:fixture,assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:n=>{n.serviceMount=null;return true;},taskOf:n=>tasks.get(n.station.id),saved:{version:5,next:1,dueIn:0}});
 const update=()=>life.update(.1,{night:true}),done=id=>{const t=tasks.get(id);assert(t);assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);};update();const active=life.state().active;done(active.id);done(active.reliefId);update();assert.equal(life.state().active.choice.id,'rest');const task=tasks.get(active.id);assert.equal(task.mount.berthId,berth.berthId);actors.get(active.id).serviceMount=task.mount;facilities.occupy(bed.id,active.id);life.playerRequest(bed.id);assert.equal(life.state().active.phase,'sleep');assert.equal(actors.get(active.id).serviceMount,berth);assert.equal(facilities.reserve(bed.id,'player'),null);facilities.releaseActor('player');const saved=copy(life.continuity());assert.equal(saved.active.choice.berthId,berth.berthId);facilities.releaseActor(active.id);assert(life.restore(saved));assert.equal(facilities.reservation(bed.id,active.id).seatId,berth.berthId);life.dispose();board.dispose();facilities.dispose();
}
{
 const {buildJapan}=await import('../source/game/japan-bathhouse.js'),{createJapanBathhouseOperations}=await import('../source/game/japan-bathhouse-operations.js');
 const japan=buildJapan(),f=createFurnitureInteractions(japan,'japan'),bed=f.items.find(i=>i.kind==='bed'&&i.center[1]===11.4),npcs=japan.stations.filter(s=>s.npcPosition).map(s=>actor(s,s.npcPosition));
 for(const n of npcs)n.root.userData.appearance={};
 const sleeping=npcs.find(n=>n.station.id==='jp-sushi');sleeping.root.position.set(...bed.position);
 const operations=createJapanBathhouseOperations({npcs,lot:japan,furniture:{...f,canUse:()=>true,canSit:()=>true,standPoint:(_,__,item)=>new T.Vector3(...item.position)},doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:(_,p)=>[p],moveActor(){},poseContext:()=>({visualFloorOffset:0}),changeWardrobe(){},createVisitor(){throw Error('No visitor should spawn during scoped bed restore');},removeVisitor(){}});
 const snapshot=operations.snapshot();snapshot.nextArrival=1000;snapshot.staffRuntime={...snapshot.staffRuntime,active:{id:'jp-sushi',reliefId:'jp-ramen',phase:'sleep',choice:{id:'rest',facilityId:bed.id,berthId:bed.berths[0].berthId,duration:100,relief:{}},wait:0},night:true};assert(operations.restore(snapshot));operations.update(.1,1,{night:true});assert.equal(sleeping.serviceMount?.berthId,bed.berths[0].berthId);assert.equal(f.facilities.reservation(bed.id,'jp-sushi').status,'occupied');assert.equal(sleeping.pose.liePillowZ,bed.berths[0].liePillowZ);
 const live=copy(operations.snapshot()),task=live.tasks.find(t=>t.id==='jp-sushi');assert.equal(task.mountBerthId,bed.berths[0].berthId);assert(task.arrived);operations.playerRequest(bed.id);assert.equal(sleeping.serviceMount.berthId,task.mountBerthId);assert.equal(operations.isYieldingFor(bed.id),false);assert.equal(f.resolveBed(bed,'player'),null);f.releaseActor('player');f.releaseActor('jp-sushi');assert(operations.restore(live));assert.equal(f.facilities.reservation(bed.id,'jp-sushi').seatId,task.mountBerthId);operations.update(.1,2,{night:true});assert.equal(sleeping.serviceMount.berthId,task.mountBerthId);assert(operations.snapshot().tasks.find(t=>t.id==='jp-sushi').elapsed>task.elapsed);operations.dispose();f.dispose();
}
furniture.dispose();
console.log('PASS NPC sleep: shared real berths, stable parent IDs, player no-eviction, exact-slot restore without stealing, private room ownership, pillow context and single staff bunk');
