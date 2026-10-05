// Payment and participation boundaries that can regress independently of art.
import assert from 'node:assert/strict';
import {createJapanPerformanceService} from '../source/game/japan-performance-service.js';
import {PERFORMANCE_CAST,PERFORMANCE_SEATS,PERFORMANCE_POINTS as P} from '../source/game/japan-performance-cast.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {createCopperLedger} from '../source/game/copper-ledger.js';
class V{constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}clone(){return new V(this.x,this.y,this.z);}copy(p){return this.set(p.x,p.y,p.z);}toArray(){return [this.x,this.y,this.z];}distanceToSquared(p){return (this.x-p.x)**2+(this.y-p.y)**2+(this.z-p.z)**2;}}
function fixture({wallet,saved,saveWallet=()=>{}}={}){
 const make=(p,station)=>({station,ageYears:station.ageYears,root:{position:new V(...p),rotation:{y:0},userData:{}},home:new V(...p),locomotion:{walkSpeed:5},animate(){}});
 const npcs=PERFORMANCE_CAST.map(a=>make(a.position,{id:a.id,npcName:a.name,ageYears:a.ageYears,performance:{...a}}));
 const player=make(P.reception,{id:'player',ageYears:24});let mounted=null,snapshot;
 const copperLedger=createCopperLedger({saved:wallet,saveState:saveWallet});if(!wallet)copperLedger.earn(80,'test-completed-labor');
 const navigation={legacyGround:false,surfaces:[{minX:-12,maxX:12,minZ:-15,maxZ:9,y:7.6}]};
 const furniture={items:PERFORMANCE_SEATS,facilities:createFacilityQueue(),canSit:nav=>{assert.equal(nav,navigation,'Mount retains the provided multi-floor navigation');return true;},standPoint:(nav,extra,seat)=>{assert.equal(nav,navigation,'Unmount retains the same multi-floor navigation');return new V(...seat.position);}};
 const service=createJapanPerformanceService({npcs,furniture,navigation,doors:{routeStep(path,p){while(path.length&&p.distanceToSquared(path[0])<.008)path.shift();return {waypoint:path[0]};}},planPath:(a,b)=>[new V(b.x,b.y,b.z)],moveActor:(a,x,z)=>{a.root.position.x+=x;a.root.position.z+=z;},poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>mounted,copperLedger,saved,saveState:s=>snapshot=s});
 let time=0;
 const step=(seconds=.1)=>{for(let i=0;i<Math.ceil(seconds/.1);i++){time+=.1;service.update(.1,time);}};
 const until=(fn,max=500)=>{for(let i=0;i<max&&!fn();i++)step();assert(fn(),JSON.stringify(service.state()));};
 return {service,npcs,player,copperLedger,furniture,step,until,snapshot:()=>snapshot,sit(){mounted=PERFORMANCE_SEATS[0];player.root.position.set(...mounted.anchor);},stand(){mounted=null;service.leaveSeat(PERFORMANCE_SEATS[0].id);},request(activity='dance',drink=null,id='jp-salon-mai'){assert(service.request(id,activity,drink));until(()=>service.view().order?.status==='accepted'||!service.active());},confirm(){assert(service.confirm());},done(){service.dispose();furniture.facilities.dispose();}};
}
{
 const f=fixture();f.request('tea','tea');assert.equal(f.copperLedger.state().cash,80,'Acceptance alone never takes money');f.confirm();assert.equal(f.copperLedger.state().cash,72);assert.equal(f.service.confirm(),false,'Repeated confirm never charges twice');f.sit();f.until(()=>!f.service.active());
 const s=f.service.state();assert.equal(f.copperLedger.state().cash,72);assert(s.history.some(e=>e.outcome==='act-completed'));assert(s.history.some(e=>e.outcome==='drink-completed'));assert(s.history.some(e=>e.outcome==='completed'));
 assert(s.life.people['jp-salon-mai'].opinions.player>0,'Actual shared tea produces a participant observation');assert.equal(s.life.people['jp-salon-ichiro'].opinions.player,undefined,'Uninvolved artist does not learn unknown events');
 assert.equal(new Set(s.history.map(e=>e.eventId)).size,s.history.length);f.until(()=>!f.service.view().returning);assert(f.npcs.every(n=>!n.serviceMount));assert(!f.furniture.facilities.state().find(s=>s.owner));f.done();
}
{
 const f=fixture();f.request('tea');f.confirm();f.until(()=>!!f.npcs[1].serviceMount);const arrived=f.npcs[1].root.position.toArray();f.step(3);assert.deepEqual(f.npcs[1].root.position.toArray(),arrived,'Artist remains at the reserved seat while player approaches');f.sit();f.until(()=>f.service.view().order?.status==='performing');f.service.cancel();f.done();
}
{
 const f=fixture();f.request('story');assert(!f.service.active());assert.equal(f.service.view().lastReply.willing,false);assert(f.service.state().history.some(e=>e.outcome==='refused'));assert.equal(f.copperLedger.state().cash,80);f.done();
}
{
 const f=fixture();f.request('dance','sake');f.confirm();assert.equal(f.copperLedger.state().cash,68);assert(f.service.cancel());assert.equal(f.copperLedger.state().cash,80);assert.equal(f.service.cancel(),false);assert.equal(f.copperLedger.state().cash,80);f.done();
}
{
 const f=fixture();f.request('dance','tea');f.confirm();f.sit();f.until(()=>f.service.view().order?.drinkComplete);assert.equal(f.service.view().order.actComplete,false);assert(f.service.cancel());assert.equal(f.copperLedger.state().cash,78,'Consumed drink settles; uncompleted act refunds');f.done();
}
{
 const f=fixture();f.npcs[2].root.position.set(...P.stage);assert.equal(f.service.request('jp-salon-mai','dance'),false);assert.equal(f.copperLedger.state().cash,80);f.done();
}
{
 const f=fixture();f.player.ageYears=17;assert.deepEqual(f.service.view().candidates,[]);assert.equal(f.service.request('jp-salon-mai','dance'),false);f.player.ageYears=24;f.request();f.npcs[1].ageYears=17;assert.equal(f.service.confirm(),false);f.step();assert(!f.service.active());assert.equal(f.copperLedger.state().cash,80);f.done();
}
{
 const f=fixture();f.request();f.confirm();const wallet=f.copperLedger.state(),saved=f.snapshot();const next=fixture({wallet,saved});assert.equal(next.copperLedger.state().cash,80,'Reload recovers unfinished service hold');next.service.recoverPayments();assert.equal(next.copperLedger.state().cash,80);assert(!next.service.active());next.done();f.done();
}
{
 let reject=false;const f=fixture({saveWallet:()=>!reject});f.request();f.confirm();reject=true;assert.equal(f.service.cancel(),false);assert.equal(f.service.view().order.status,'refund-pending');assert.equal(f.copperLedger.state().cash,72);reject=false;f.service.recoverPayments();assert(!f.service.active());assert.equal(f.copperLedger.state().cash,80);f.done();
}
console.log('PASS: accepted tea + drink, personal refusal, cancel/partial/reload/refund retry, occupied capacity, adult execution and participant-only observations');

{
 const f=fixture();f.request('dance','tea');f.confirm();f.sit();f.until(()=>f.service.view().order?.status==='performing');f.step(.7);const checkpoint=JSON.parse(JSON.stringify(f.service.snapshot())),positions=f.npcs.map(n=>n.root.position.toArray()),wallet=f.copperLedger.state(),paid=wallet.cash;f.service.dispose({suspend:true});
 const g=fixture({wallet,saved:{...f.snapshot(),continuity:checkpoint}});g.sit();g.npcs.forEach((n,i)=>n.root.position.set(...positions[i]));assert(g.service.restore(checkpoint));assert.equal(g.copperLedger.state().cash,paid,'reload keeps reservation, never refunds/recharges');assert.equal(g.service.snapshot().phase,checkpoint.phase);assert.equal(g.service.view().order.id,checkpoint.order.id);g.until(()=>!g.service.active());assert.equal(g.service.state().history.filter(e=>e.outcome==='act-completed').length,1);assert.equal(g.service.state().history.filter(e=>e.outcome==='drink-completed').length,1);assert.equal(g.copperLedger.state().cash,paid);g.done();console.log('PASS interrupted paid performance resumes same order/timers and settles each part once');
}
