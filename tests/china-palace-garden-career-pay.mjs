// Fixed government payroll follows the existing palace duty bank path. Failure
// leaves earned salary pending; no invented finite fund and no NPC piecework.
import assert from 'node:assert/strict';
import {createFormalCareers,PALACE_GARDEN_CAREER_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
const copy=structuredClone,work=ROLE.workSource+'-1';
const receipt={source:'china-palace-garden',id:'cn-edict-east-shore:0-'+work,workReceiptId:work,documentId:'cn-edict-east-shore:0',audienceId:'cn-morning-audience:0',day:0,holderRevision:1,completed:true,accurate:true,proof:{version:1,actorId:'player',documentId:'cn-edict-east-shore:0',audienceId:'cn-morning-audience:0',day:0,holderRevision:1,received:true,filed:true,sweepSeconds:7,returned:true}};
function setup(input){
 const clock={day:0,hour:6,seconds:0};let durable=copy(input),saveOK=true,bankOK=true;
 const seed=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();
 let saved=copy(input||{formalCareers:{...seed,skills:{...seed.skills,ritual:1},tenure:{roleId:ROLE.id,slotId:ROLE.slotId,sinceDay:0,sinceHour:6}}});
 const bank=createGameCurrencyLedger({saved,getClock:()=>clock,storage:{setItem(k,v){if(!bankOK)return false;durable=JSON.parse(v);return true;}}});
 const careers=createFormalCareers({saved:saved.formalCareers,getClock:()=>clock,creditWageToBank:bank.creditWageToBank,saveState:next=>{if(!saveOK)return false;saved.formalCareers=copy(next);durable=copy(saved);return true;}});
 return {clock,bank,careers,get saved(){return copy(durable);},save:ok=>saveOK=ok,pay:ok=>bankOK=ok};
}
const f=setup();assert(f.careers.beginDuty({receiptId:work}).ok);f.save(false);assert(!f.careers.recordPalaceGardenReview(receipt).ok);assert.equal(f.careers.state().skillXP.gardening,0);f.save(true);assert.equal(f.careers.recordPalaceGardenReview(receipt).xpGained,10);assert(f.careers.recordPalaceGardenReview(receipt).replayed);assert(!f.careers.recordPalaceGardenReview({...receipt,proof:{...receipt.proof,sweepSeconds:8}}).ok);assert.equal(f.bank.state().bank,0);
f.clock.hour=12;f.clock.seconds=6*60/.7;const event={roleId:ROLE.id,receiptId:work,coveredSeconds:f.clock.seconds,completedTasks:1};assert(f.careers.laborEvent('completed',event).ok);assert(f.careers.laborEvent('inspected',event).ok);assert.equal(f.careers.state().lastDuty.wage,8);f.pay(false);assert(!f.careers.settle().ok);assert.equal(f.careers.state().lastDuty.stage,'ready');assert.equal(f.bank.state().bank,0);const deferred=setup(f.saved);assert.equal(deferred.careers.state().lastDuty.wage,8);deferred.pay(true);const paid=deferred.careers.settle();assert(paid.ok);assert.equal(deferred.bank.state().bank,8);assert.equal(deferred.bank.state().cash,0);assert(deferred.bank.creditWageToBank(paid.deposit).replayed);assert.equal(deferred.bank.state().bank,8);const restored=setup(deferred.saved);assert.equal(restored.careers.state().lastDuty.stage,'paid');assert.equal(restored.careers.state().skillXP.gardening,10);assert(!restored.careers.settle().ok);assert.equal(restored.bank.state().bank,8);console.log('PASS fixed16/half8 bank pay, failed credit stays owed across reload, unique wage and 10XP receipt, no per-order pay');
