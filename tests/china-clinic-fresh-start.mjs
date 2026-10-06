import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from './china-clinic-employment.mjs';
import {PHARMACY_ASSISTANT_ROLE as R} from '../source/game/formal-careers.js';
import {CHINA_CLINIC as C} from '../source/game/china-clinic.js';
test('fresh clinic people earn their first real observed shift before their first due meal, without seeded money or overdue needs',async()=>{
 const {createDailyNeeds}=await import('../source/game/daily-needs.js'),{createClinicNPCEconomy}=await import('../source/game/china-clinic-npc-economy.js'),{createClinicNPCDutyObserver}=await import('../source/game/china-clinic-npc-duty.js'),{createClinicNPCPayroll}=await import('../source/game/china-clinic-npc-payroll.js'),{fixture:tavernFixture}=await import('./china-host-needs.mjs');
 let f,tavern;const clock=()=>f?.clock||{seconds:0,day:0,hour:10},needs=createDailyNeeds({getClock:clock,saveState:()=>true}),economy=createClinicNPCEconomy({saveState:(s,_r,patch={})=>{Object.assign(tavern.game,structuredClone(patch),{chinaClinicNPCEconomy:structuredClone(s)});return true;}});
 const holders={'cn-clinic-physician':{roleId:'cn-clinic-physician',slotId:'cn-clinic-physician-1',holderId:'cn-clinic-physician',status:'npc',available:true,alive:true,revision:0},[R.id]:{roleId:R.id,slotId:R.slotId,holderId:'cn-pharmacy-assistant',status:'npc',available:true,alive:true,revision:0}};
 f=fixture({clock:{seconds:0,day:0,hour:10}}, {getNPCHolder:id=>holders[id],personalOptions:{sharedNeeds:needs,npcEconomy:economy,getTavern:()=>tavern?.scene,getToilet:()=>tavern?.toilet,enablePersonalNeeds:true,enableNeedsEnrollment:true}});f.player.root.position.set(0,0,0);
 tavern=tavernFixture(null,{extraActors:[f.doctor,f.assistant],needsController:needs,sceneOptions:{clinicEconomy:economy,canBorrowClinic:id=>f.clinic.canBorrowMeal(id)}});needs.enter('china',[f.doctor.station.id,f.assistant.station.id]);
 const observer=createClinicNPCDutyObserver({saveState:()=>true}),payroll=createClinicNPCPayroll({clinic:f.clinic,observer,economy,getClock:clock});payroll.update(0);
 const step=()=>{f.tick();const minutes=600+f.clock.seconds*.7;f.clock.day=Math.floor(minutes/1440);f.clock.hour=minutes%1440/60;needs.update();payroll.update(.1);};
 assert.equal(economy.account(f.doctor.station.id).bank,0);assert.equal(economy.account(f.assistant.station.id).bank,0);
 for(let i=0;i<7000&&f.clock.hour<18;i++){step();assert.equal(f.clinic.personalNeedsState().task,null);assert.equal(needs.read(f.doctor.station.id)?.foodStrain||0,0);assert.equal(needs.read(f.assistant.station.id)?.foodStrain||0,0);}
 assert(payroll.checkpoint());assert.equal(economy.snapshot().receipts.length,2);for(const n of[f.doctor,f.assistant]){assert(economy.account(n.station.id).bank>=6);assert.equal(economy.account(n.station.id).cash,0);assert.equal(needs.status(n.station.id).seekMeal,false);assert(n.root.position.distanceTo({x:(n===f.doctor?C.points.doctor:C.points.assistant)[0],y:(n===f.doctor?C.points.doctor:C.points.assistant)[1],z:(n===f.doctor?C.points.doctor:C.points.assistant)[2]})<.1);}
 assert.equal(economy.account(f.doctor.station.id).bank,20);assert.equal(economy.account(f.assistant.station.id).bank,8);const firstPay=economy.account(f.doctor.station.id).bank;
 for(let i=0;i<8000&&!f.clinic.personalNeedsState().task;i++)step();assert(f.clinic.personalNeedsState().task,'ordinary loaded hunger becomes due after first pay');assert(needs.status(f.doctor.station.id).seekMeal);assert.equal(needs.read(f.doctor.station.id).foodStrain,0);
 for(let i=0;i<2600&&economy.account(f.doctor.station.id).bank===firstPay;i++){tavern.tick();step();}assert.equal(economy.account(f.doctor.station.id).bank,firstPay-6);assert.equal(economy.snapshot().mealTransfers.filter(r=>r.actorId===f.doctor.station.id&&r.kind==='meal-payment').length,1);
 assert.equal(needs.read(f.doctor.station.id).foodStrain,0);assert.equal(needs.read(f.assistant.station.id).foodStrain,0);
 holders['cn-clinic-physician'].status='player';holders['cn-clinic-physician'].holderId='player';const position=f.doctor.root.position.clone(),route=f.doctor.route;for(let i=0;i<10;i++)f.clinic.update(.1,f.clock.seconds,{player:f.player});assert(f.doctor.root.position.equals(position),'player tenure must not pull the former NPC out of their original personal meal');assert.equal(f.doctor.route,route);
});
