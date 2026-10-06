import assert from 'node:assert/strict';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
import {createChinaGardenPersonalLife} from '../source/game/china-garden-personal-life.js';
import {createChinaScribePersonalLife} from '../source/game/china-scribe-personal-life.js';
import {ROYAL_KITCHEN_ROLE as ROYAL} from '../source/game/china-royal-kitchen-role.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
import {fixture as royalFixture} from './china-royal-kitchen.mjs';
const copy=structuredClone;
function funds(id,hours=1.5){
 const royal=createNPCDutyAccount({role:ROYAL,namespace:'chinaRoyalKitchenAccounts',saveState:()=>true}),guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saveState:()=>true});
 for(const [economy,role,day,actorId] of [[royal,ROYAL,1,id],[guard,GUARD,2,id],[royal,ROYAL,3,'cn-unrelated-worker'],[guard,GUARD,4,'cn-unrelated-worker']]){
  const coverage=[{actorId,roleId:role.id,slotId:role.slotId,holderRevision:day}];let t=(day*1440+6*60-600)/RATE,end=t+hours*60/RATE;economy.observe({seconds:t,dt:.25,coverage});while(t<end){const dt=Math.min(.25,end-t);t+=dt;economy.observe({seconds:t,dt,coverage});}assert(economy.checkpoint({day,hour:18}));
 }
 return {royal,guard,aggregate:createNPCGuestAccounts([{id:'china-royal-kitchen-accounts',economy:royal},{id:'china-guard-accounts',economy:guard}],{saveState:()=>true})};
}
const tavern={publicToiletRoute:()=>[[16.9,.215,9.1]],guestMeal:()=>null,registerGuestPerson:()=>true,requestGuestMeal:()=>false};
const toilet={publicIntent:()=>({position:[16.9,4.015,10]})};
for(const [id,home,create] of [['cn-garden',[.8,.295,-18.7],createChinaGardenPersonalLife],['cn-calligraphy',[5.2,4.215,-27.68],createChinaScribePersonalLife]]){
 for(const affordable of [false,true]){
  const f=funds(id,affordable?1.5:1),snapshots=[f.royal.snapshot(),f.guard.snapshot()],actor=actorId=>({station:{id:actorId},alive:true,home:{toArray:()=>home.slice()},root:{position:{x:home[0],y:home[1],z:home[2]}},route:[],phase:0,animate(){}}),holder=actor(id),other=actor('cn-unrelated-worker'),registrations=[];
  // Employment ownership is deliberately narrower than aggregate affordability.
  const employer={hasIncome:()=>false,account:()=>({cash:0,bank:0})};
  const life=create({npcs:[other,holder],getHolder:()=>holder,getHome:()=>home,canStart:()=>true,canControl:()=>true,economy:employer,mealFunds:f.aggregate,sharedNeeds:{has:()=>false,register:id=>registrations.push(id),status:()=>({seekMeal:true,seekToilet:false})},getTavern:()=>tavern,getToilet:()=>toilet,getPlayer:()=>null,doors:{routeStep:()=>({waypoint:null,phase:'walking'})},planPath:()=>[],moveActor:()=>{},poseContext:()=>({}),saveState:()=>true});
  life.update(1,1);
  if(affordable){assert.equal(life.state().actorId,id);assert.equal(life.state().phase,'go-meal');assert.deepEqual(registrations,[id]);}
  else{assert.equal(life.state(),null);assert.deepEqual(registrations,[]);}
  assert.equal(life.owns(other),false,'aggregate funds never grant control of unrelated worker');assert.deepEqual([f.royal.snapshot(),f.guard.snapshot()],snapshots,'checking and departing do not grant or move funds');life.dispose({suspend:true});
 }
}
const royal=funds('cn-cooking');
const f=royalFixture({needs:{version:2,registeredPeople:['cn-cooking'],people:{'cn-cooking':{foodAge:25*60/.7,toiletAge:0,receipts:{}}}}},{npcEconomy:royal.aggregate,enablePersonalNeeds:true,getTavern:()=>tavern,getToilet:()=>toilet});
f.player.root.position.set(0,0,0);f.tick();assert.equal(f.service.personalNeedsState()?.actorId,'cn-cooking');assert.equal(f.service.personalNeedsState()?.phase,'go-meal');assert.equal(royal.royal.account('cn-cooking').bank,4);assert.equal(royal.guard.account('cn-cooking').bank,3);
console.log('PASS actual royal personal-trip controller and garden/scribe wrappers depart on real 4+3 funds, refuse insufficient total, preserve employer ownership and all money; direct route fixtures, not production long routes');
