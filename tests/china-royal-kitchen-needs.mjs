import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from './china-royal-kitchen.mjs';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {ROYAL_KITCHEN_ROLE as R} from '../source/game/china-royal-kitchen-role.js';
test('fresh original Jia earns observed bank income before hunger enrollment; no salary during player control or absence',()=>{
 const economy=createNPCDutyAccount({role:R,namespace:'chinaRoyalKitchenAccounts',saveState:()=>true});let holder={roleId:R.id,slotId:R.slotId,holderId:'cn-cooking',status:'npc',available:true,alive:true,revision:0};
 const f=fixture({clock:{day:0,hour:10,seconds:0}},{npcEconomy:economy,enablePersonalNeeds:true,getHolder:()=>holder});
 f.player.root.position.set(0,0,0);assert.equal(economy.account('cn-cooking').bank,0);assert.equal(f.needs.has('cn-cooking'),false);
 economy.observe({seconds:0,dt:0,coverage:f.service.npcDutyCoverage()});
 for(let i=0;i<6860;i++){f.tick();const minutes=600+f.clock.seconds*.7;f.clock.day=Math.floor(minutes/1440);f.clock.hour=minutes%1440/60;f.needs.update();economy.observe({seconds:f.clock.seconds,dt:.1,coverage:f.service.npcDutyCoverage()});if(i%50===0)economy.checkpoint(f.clock);if(!economy.hasIncome('cn-cooking'))assert.equal(f.needs.has('cn-cooking'),false);}
 assert(economy.checkpoint(f.clock));assert.equal(economy.account('cn-cooking').bank,21);assert.equal(economy.account('cn-cooking').cash,0);f.tick(12);assert(f.needs.has('cn-cooking'));assert.equal(f.needs.status('cn-cooking').seekMeal,false);assert.equal(f.needs.read('cn-cooking').foodStrain,0);
 holder={...holder,holderId:null,status:'vacant',available:false};assert.equal(f.service.npcDutyCoverage().length,0);holder={...holder,holderId:'cn-cooking',status:'npc',available:true};f.jia.alive=false;assert.equal(f.service.npcDutyCoverage().length,0);f.jia.alive=true;f.jia.root.position.set(0,0,0);assert.equal(f.service.npcDutyCoverage().length,0);
});
test('replacement cannot inherit an original prepared dish, and a vacant slot keeps former Jia alive off duty',()=>{
 let holder={roleId:R.id,slotId:R.slotId,holderId:'cn-cooking',status:'npc',available:true,alive:true,revision:0};
 const f=fixture({}, {getHolder:()=>holder});f.player.root.position.set(0,0,0);f.guest.mount=f.seat;const original=f.service.requestMeal({actorId:f.guest.station.id,seatId:f.seat.id});assert(original);f.until(()=>f.service.lookupMeal(original.id,f.guest.station.id).stage==='prepared','prepared original');
 holder={...holder,holderId:f.guest.station.id,revision:1};assert.equal(f.service.rebind(),false);assert.equal(f.service.lookupMeal(original.id,f.guest.station.id).workerId,'cn-cooking');assert.equal(f.service.npcDutyCoverage().length,0);
 assert(f.service.cancelMeal(f.guest.station.id,'test clean boundary'));assert(f.service.rebind());assert.equal(f.service.state().jia.id,f.guest.station.id);assert(f.service.owns(f.jia));assert.equal(f.service.snapshot().personalLives['cn-cooking'].brain.people['cn-cooking']!==undefined,true);
 const next=f.service.requestMeal({actorId:'cn-emperor',seatId:f.seat.id});assert.equal(next.workerId,f.guest.station.id);assert(f.service.cancelMeal('cn-emperor','test vacancy'));
 holder={...holder,holderId:null,status:'vacant',available:false,revision:2};const before=f.guest.root.position.clone();f.tick(30);assert(f.guest.root.position.distanceTo(before)>0);assert.equal(f.service.npcDutyCoverage().length,0);assert.equal(f.service.canRequestMeal('cn-emperor'),false);
});
