import assert from 'node:assert/strict';
import {createJapanServiceOrders} from '../source/game/japan-service-orders.js';
import {createJapanBoilerDuty} from '../source/game/japan-boiler-duty.js';
const vec=a=>({x:a[0],y:a[1],z:a[2],toArray(){return [this.x,this.y,this.z]},set(...p){[this.x,this.y,this.z]=p;}}),actor=(id,p)=>({station:{id},root:{position:vec(p),rotation:{y:0}},route:[],walking:false});
const npc=actor('jp-steam',[5.3,11.4,-10.8]),player=actor('player',[4.1,11.4,-10.8]),tasks=new Map(),life={recall:()=>true,canWork:()=>true,state:()=>({active:null})},receipt='jp-boiler-labor-1';let board;
// Use the real employment + formal ledgers: a successful physical release
// followed by a rejected write must remain a retryable end/cancel handoff.
const {createFormalCareers}=await import('../source/game/formal-careers.js'),{careerInterviewRoll}=await import('../source/game/career-applications.js'),{createJapanBoilerEmployment}=await import('../source/game/japan-boiler-employment.js');
for(const handoff of ['end','cancel'])for(const failure of ['second-flush','formal-event','job-save']){
 let rejectFormal=false,write=0,rejectAt=failure==='second-flush'?2:failure==='job-save'?3:0;const clock={day:0,hour:6,seconds:0},role='jp-boiler-service';let worldSeed=1;while(careerInterviewRoll(worldSeed,role,0)>=.2)worldSeed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.care=1;initial.skills.writing=1;const careers=createFormalCareers({saved:initial,worldSeed,getClock:()=>clock,saveState:()=>!rejectFormal});assert(careers.apply(role,{ageYears:18}).ok);assert(careers.reviewApplication(role,{ageYears:18,applicationId:careers.applicationResult(role).id}).ok);assert(careers.beginDuty({receiptId:receipt}).ok);
 board=createJapanServiceOrders();tasks.clear();npc.root.position.set(5.3,11.4,-10.8);player.root.position.set(4.1,11.4,-10.8);
 const d=createJapanBoilerDuty({board,actors:new Map([['jp-steam',npc]]),assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>life,getPlayer:()=>player});
 const employment=createJapanBoilerEmployment({boiler:d,careers,getPlayer:()=>player,getClock:()=>clock,saved:{version:1,serial:1,job:{receiptId:receipt,formalRoleId:role,day:0,stage:'working',shiftKind:'continuous',coveredSeconds:0,completedTasks:0,reviewIds:[],handoff}},saveState:()=>++write!==rejectAt});
 rejectFormal=failure==='formal-event';employment.update(0);assert(employment.state().job?.handoff,'failed post-release write preserves pending handoff');assert.equal(d.dutyState().receiptId,null);rejectFormal=false;rejectAt=0;employment.update(0);assert(handoff==='end'?employment.state().job?.stage==='ready':employment.state().job===null,`${handoff}/${failure} retries`);employment.dispose();d.dispose();
}
console.log('PASS end/cancel physical handoff retries after second flush, formal event, and final job-save rejection');
const {createObjectInteractionAnchors}=await import('../source/game/object-interaction-anchors.js');
const anchors=createObjectInteractionAnchors({actors:()=>[npc]});anchors.refresh();
assert.equal(anchors.resolve({id:'boiler-review',provider:'japan-boiler-employment',kind:'formal-review',position:[4.1,11.4,-10.8]}).actor,npc);
console.log('PASS boiler hiring anchor resolves the original Nagi actor');
