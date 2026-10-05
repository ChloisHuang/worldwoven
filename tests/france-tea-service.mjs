// Focused process regression: a real order may not advance through a closed
// route/occupied seat, duplicate a place setting, or leave cups after cancel.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three'),{createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
function fixture({player=false,blockedSeat=false,doorWaiting=false,saved={}}={}){
 const group=new T.Group(),seat={id:'real-loggia-south',kind:'seat',center:[6.6,.16,12.5],anchor:[6.6,.16,12.21],position:[5.37,.16,12.5],seatY:.9535,yaw:Math.PI};
 const actor=(id,position)=>{const root=new T.Group();root.position.set(...position);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,station:{id,npcLabel:id,npcAction:'read'},characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:2},animate(){}};};
 const npcs=[actor(P.cook,P.cookAside),actor(P.host,P.hostHome),actor(P.guest,P.guestHome)],person=actor('player',player?seat.anchor:[30,0,30]);let mounted=player?seat:null,wait=doorWaiting,clock=0,seatBlocked=blockedSeat;
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>!seatBlocked,standPoint:()=>seatBlocked?null:new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 const lot={group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},doors={cameraColliders:[],routeStep(route,p){if(wait)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const service=createFranceTeaService({npcs,lot,furniture,doors,planPath:(a,b)=>[...(b.z < -8.3&&a.x > -5.4?[new T.Vector3(-5.0,b.y,-8.5)]:[]),new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>person,getMounted:()=>mounted,onSeat:item=>{mounted=item;person.root.position.set(...item.anchor);},worldSeed:1,saved});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock+=.1;service.update(.1,clock);}};
 const until=(predicate,limit=5000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),'Did not reach expected state: '+JSON.stringify(service.state().order));};
 return {service,npcs,person,seat,tick,until,furniture,setDoor:v=>wait=v,setSeat:v=>seatBlocked=v,leave(){mounted=null;person.root.position.set(15,0,15);service.leaveSeat(seat.id);}};
}
{
 const f=fixture();f.until(s=>s.order?.stage==='drinking');assert.equal(f.service.state().order.customer,'guest');assert.equal(f.npcs[2].serviceMount.id,f.seat.id);assert.equal(f.service.request(),false,'one bounded guest order rejects player duplication');f.until(s=>s.history.some(e=>e.event==='complete'));const s=f.service.state();for(const event of['guest-seated','chef-received-order','tray-received','tea-delivered','tea-finished','table-cleared','cups-cleaned','complete'])assert(s.history.some(e=>e.event===event),event);assert.equal(s.props.trayCount,0);assert.equal(f.npcs[2].serviceMount,null);assert.equal(f.furniture.facilities.reservation(f.seat.id,P.guest),null);f.service.dispose();
}
{
 const f=fixture({player:true,doorWaiting:true});assert(f.service.request());f.tick(150);assert.equal(f.service.state().order.stage,'requested','door wait cannot act as arrival');f.setDoor(false);f.until(s=>s.order?.stage==='ready');assert.equal(f.service.state().props.cupCount,1);assert(f.service.drink());f.until(s=>s.history.some(e=>e.event==='complete'));assert.equal(f.service.state().props.cupCount,0);f.service.dispose();
}
for(const stage of['requested','preparing','pickup','carrying','serving','ready','drinking','lowering']){
 const f=fixture({player:true});f.service.request();f.until(s=>s.order?.stage===stage||(stage==='drinking'||stage==='lowering')&&s.order?.stage==='ready');if(stage==='drinking'||stage==='lowering'){f.service.drink();f.until(s=>s.order?.stage===stage);}f.tick(3);f.leave();f.until(s=>!s.order);assert.equal(f.service.state().props.trayCount,0,'cancel '+stage);assert.equal(f.service.state().props.cupCount,0,'cancel '+stage);assert(!f.service.state().history.some(e=>e.event==='complete'),'cancel must not award completion');f.service.dispose();
}
{
 const f=fixture({blockedSeat:true});f.until(s=>s.order?.stage==='seating');f.tick(300);assert.equal(f.service.state().order.stage,'seating');assert.equal(f.npcs[2].serviceMount,undefined);f.setSeat(false);f.until(s=>s.order?.stage==='ready');f.service.dispose();assert.equal(f.furniture.facilities.reservation(f.seat.id,P.guest),null);
}
console.log('PASS France tea (kitchen reporting aisle included): guest/player complete, one order, door wait, occupied seat, eight cancellation phases, unload release');

{
 const f=fixture({player:true});f.service.request();f.until(s=>s.order?.stage==='brewing'&&s.phase>.7);const checkpoint=JSON.parse(JSON.stringify(f.service.snapshot())),positions=f.npcs.map(n=>n.root.position.toArray());f.service.dispose({suspend:true});const g=fixture({player:true,saved:{continuity:checkpoint}});g.npcs.forEach((n,i)=>n.root.position.set(...positions[i]));assert(g.service.restore(checkpoint));assert.equal(g.service.state().phase,checkpoint.phase);assert.equal(g.service.state().order.trayId,checkpoint.order.trayId);g.until(s=>s.order?.stage==='ready');g.service.drink();g.until(s=>!s.order);assert.equal(g.service.state().history.filter(h=>h.event==='tea-delivered').length,1);g.service.dispose();console.log('PASS France tea keeps brewing progress and tray identity; one delivery/completion');
}
