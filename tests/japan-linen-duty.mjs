// Explicit one-dirty-towel fixture isolates physical timers, ownership and
// interruption. Production-main separately proves natural guest demand.
import assert from 'node:assert/strict';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanLinenDuty} from '../source/game/japan-linen-duty.js';
const vec=a=>({x:a[0],y:a[1],z:a[2],toArray(){return [this.x,this.y,this.z]},set(...p){[this.x,this.y,this.z]=p;}}),actor=(id,p)=>({station:{id},root:{position:vec(p),rotation:{y:0}},route:[],walking:false});
const seed=createJapanServiceOrders();const v=seed.spawn({side:'women',name:'原客',appearance:{},restPoint:[0,3.8,7],diningPoint:[0,3.8,7]});const s=seed.state();s.visits[0].stage='changing';let board=createJapanServiceOrders({saved:s});assert(board.guestStep(v.id,'changed',{position:P.womenChanging}));assert(board.cancel(v.id));
const npc=actor('jp-rest',[6.2,11.4,4.2]),player=actor('player',[5,11.4,3.9]),tasks=new Map(),life={recall:()=>true,canWork:()=>true,state:()=>({active:null})};
const duty=createJapanLinenDuty({board,actors:new Map([['jp-rest',npc]]),assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>life,getPlayer:()=>player});
// NPC first uses the original dirty towel, never receives an invented order.
for(const expected of ['collected','wet','drying']){duty.update(.1);const t=tasks.get('jp-rest');assert(t?.linenWork);npc.root.position.set(...t.to);assert.notEqual(t.onDone(),false);tasks.delete('jp-rest');assert.equal(board.linenWork()[0].stage,expected);}
assert.equal(board.linenWork()[0].carryOwner,null);duty.requestMeeting(true);npc.root.position.set(6.2,11.4,4.2);duty.update(.1);assert(duty.meetingReady());const receipt='jp-linen-labor-1';assert(duty.claimDuty(receipt));duty.update(.1);assert(duty.dutyActive(receipt));duty.requestMeeting(false);assert.equal(duty.holdsHost(),false,'active player coverage lets Yuki take original needs');assert.equal(duty.blocksWorker('jp-rest'),false,'original bath relief remains available');
assert.equal(duty.workChoices(receipt).length,0,'cannot take wet linen early');for(let i=0;i<90;i++)duty.update(.1);
for(const kind of ['take','fold','restock']){const w=duty.workIntent(receipt);assert.equal(w.kind,kind);player.root.position.set(...w.position);assert(duty.executeWork(w,receipt));duty.update(.1);assert(duty.isActing(),'a click does not complete timed work');for(let i=0;i<45;i++)duty.update(.1);assert.equal(duty.isActing(),false);}
assert.equal(board.linenWork()[0].stage,'clean');assert.equal(board.linenReceipts(receipt).length,1);assert.equal(duty.held(),false);assert(duty.canEndDuty(receipt));assert(duty.releaseDuty(receipt));assert(duty.releaseDuty(receipt),'released handoff retries after later save failure');assert.equal(board.linenWork().length,6);
console.log('PASS linen original NPC timers/carry, safe handoff, real drying, manual tool stages, unique receipt and finite stock');
// Use the real employment + formal ledgers: a successful physical release
// followed by a rejected write must remain a retryable end/cancel handoff.
const {createFormalCareers}=await import('../source/game/formal-careers.js'),{careerInterviewRoll}=await import('../source/game/career-applications.js'),{createJapanLinenEmployment}=await import('../source/game/japan-linen-employment.js');
for(const handoff of ['end','cancel'])for(const failure of ['second-flush','formal-event','job-save']){
 let rejectFormal=false,write=0,rejectAt=failure==='second-flush'?2:failure==='job-save'?3:0;const clock={day:0,hour:6,seconds:0},role='jp-linen-service';let worldSeed=1;while(careerInterviewRoll(worldSeed,role,0)>=.2)worldSeed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.ritual=1;const careers=createFormalCareers({saved:initial,worldSeed,getClock:()=>clock,saveState:()=>!rejectFormal});assert(careers.apply(role,{ageYears:18}).ok);assert(careers.reviewApplication(role,{ageYears:18,applicationId:careers.applicationResult(role).id}).ok);assert(careers.beginDuty({receiptId:receipt}).ok);
 board=createJapanServiceOrders();tasks.clear();npc.root.position.set(6.2,11.4,4.2);player.root.position.set(5,11.4,3.9);
 const d=createJapanLinenDuty({board,actors:new Map([['jp-rest',npc]]),assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>life,getPlayer:()=>player});
 const employment=createJapanLinenEmployment({linen:d,careers,getPlayer:()=>player,getClock:()=>clock,saved:{version:1,serial:1,job:{receiptId:receipt,formalRoleId:role,day:0,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0,reviewIds:[],handoff}},saveState:()=>++write!==rejectAt});
 rejectFormal=failure==='formal-event';employment.update(0);assert(employment.state().job?.handoff,'failed post-release write preserves pending handoff');assert.equal(d.dutyState().receiptId,null);rejectFormal=false;rejectAt=0;employment.update(0);assert(handoff==='end'?employment.state().job?.stage==='ready':employment.state().job===null,`${handoff}/${failure} retries`);employment.dispose();d.dispose();
}
console.log('PASS end/cancel physical handoff retries after second flush, formal event, and final job-save rejection');
