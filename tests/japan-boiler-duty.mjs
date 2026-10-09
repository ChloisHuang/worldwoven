// Small physical-controller fixture: original host, real admitted bath event,
// ordered timed contact, drain-before-handoff and relief coverage boundaries.
import assert from 'node:assert/strict';
import {createJapanServiceOrders} from '../source/game/japan-service-orders.js';
import {createJapanBoilerDuty,JAPAN_BOILER_POINTS as P} from '../source/game/japan-boiler-duty.js';
const vec=a=>({x:a[0],y:a[1],z:a[2],toArray(){return [this.x,this.y,this.z]},set(...a){[this.x,this.y,this.z]=a;}}),actor=(id,p)=>({station:{id},root:{position:vec(p),rotation:{y:0}},walking:false,route:[]});
const seed=createJapanServiceOrders(),v=seed.spawn({side:'men',name:'原客',appearance:{},restPoint:[0,3.8,7],diningPoint:[0,3.8,7]}),saved=seed.state();
saved.visits[0].stage='waiting-bath';saved.visits[0].mixtureId=v.id+':mixture';saved.items.push({id:v.id+':mixture',visitId:v.id,kind:'mixture',location:{type:'point',id:'menService'}});
let reject=true;const board=createJapanServiceOrders({saved,saveState:()=>!reject});
const admission={poolId:v.poolId,seatId:v.poolId+'-seat-1'};
assert.equal(board.guestStep(v.id,'bath-mounted',admission),false);assert.equal(board.boiler.work().length,0);assert.equal(board.getVisit(v.id).stage,'waiting-bath');reject=false;assert(board.guestStep(v.id,'bath-mounted',admission));assert.equal(board.boiler.work().length,1);
const npc=actor('jp-steam',[6.05,11.4,-11.6]),player=actor('player',[4.1,11.4,-10.8]),tasks=new Map();let relief=null;
const life={recall:()=>true,canWork:()=>true,state:()=>({active:relief})};
const duty=createJapanBoilerDuty({board,actors:new Map([['jp-steam',npc]]),assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>life,getPlayer:()=>player});
function npcStep(){duty.update(.1);const task=tasks.get('jp-steam');assert(task?.boilerWork);npc.root.position.set(...task.to);assert(task.onArrive());assert(task.onDone());tasks.delete('jp-steam');}
npcStep();assert.equal(board.boiler.work()[0].stage,'adjust');duty.requestMeeting(true);assert(duty.claimDuty('jp-boiler-labor-1'));for(let i=0;i<3;i++)npcStep();assert.equal(board.boiler.receipts().length,0);assert.equal(board.boiler.work().length,0);npc.root.position.set(5.3,11.4,-10.8);duty.update(.1);assert(duty.dutyActive('jp-boiler-labor-1'));duty.requestMeeting(false);
assert.equal(duty.coversWorker('jp-steam','deliverMix'),false);assert(duty.coversWorker('jp-steam','boiler'));assert.equal(duty.blocksWorker('jp-steam'),false);relief={id:'jp-onsen',reliefId:'jp-steam',externalCoverage:false};assert.equal(duty.idlePoint('jp-steam'),null);relief=null;
// Independent admitted identity is an explicit small fixture; main covers natural arrivals.
assert(board.boiler.observeBath({visitId:'jp-visitor-1-2',poolId:v.poolId,customerName:'下一位原客'}));
for(const kind of ['read','adjust','return','verify']){const w=duty.workIntent('jp-boiler-labor-1');assert.equal(w.kind,kind);assert.equal(duty.executeWork(w,'jp-boiler-labor-1'),false,'far click');player.root.position.set(...w.position);assert(duty.executeWork(w,'jp-boiler-labor-1'));duty.update(.1);assert(duty.isActing());for(let i=0;i<35;i++)duty.update(.1);assert(!duty.isActing());assert.equal(duty.executeWork(w,'jp-boiler-labor-1'),false,'stale step');}
assert.equal(board.boiler.receipts('jp-boiler-labor-1').length,1);assert.equal(board.boiler.work().length,0);assert(duty.releaseDuty('jp-boiler-labor-1'));assert(duty.releaseDuty('jp-boiler-labor-1'));duty.dispose();
console.log('PASS bath admission/maintenance atomic rollback, original host drains before meeting, precise relief coverage, four timed physical steps and stale intent rejection');
