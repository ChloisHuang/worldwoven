import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRoyalKitchenSlot,royalKitchenHandoffBoundary} from '../source/game/china-royal-kitchen-slot.js';
test('royal slot preserves people and rejects unfinished meals, dead, controlled, and player occupants',()=>{
 const people=new Map(['cn-cooking','cn-replacement','cn-controlled'].map(id=>[id,{station:{id},alive:true}]));let boundary={},stored,fail=false,hired=false;
 const slot=createRoyalKitchenSlot({resolveActor:id=>people.get(id),canAssign:id=>id!=='cn-controlled',canRelease:()=>royalKitchenHandoffBoundary(boundary),isPlayerHired:()=>hired,saveState:s=>{if(fail)return false;stored=structuredClone(s);return true;}});
 assert.equal(slot.resolve().holderId,'cn-cooking');assert.equal(slot.assign('cn-controlled').ok,false);assert.equal(slot.assign('player').ok,false);
 for(const stage of ['ordered','prepared','cooked','carrying','served','eating']){boundary={orders:[{id:'cn-royal-meal-1',workerId:'cn-cooking',mealId:stage==='ordered'?null:'cn-royal-meal-1-meal',stage}]};assert.equal(slot.assign('cn-replacement').code,'handoff-pending');}
 boundary={};people.get('cn-replacement').alive=false;assert.equal(slot.assign('cn-replacement').ok,false);people.get('cn-replacement').alive=true;
 fail=true;assert.equal(slot.assign('cn-replacement').code,'save-failed');assert.equal(slot.state().holderId,'cn-cooking');fail=false;
 assert(slot.assign('cn-replacement').ok);assert.equal(slot.resolve().actor,people.get('cn-replacement'));assert.equal(stored.revision,1);assert.equal(people.get('cn-cooking').alive,true);
 hired=true;assert.equal(slot.assign(null).code,'player-tenure-owns-role');hired=false;assert(slot.assign(null).ok);assert.equal(slot.resolve().status,'vacant');assert.equal(slot.assign('cn-cooking',{expectedRevision:0}).ok,false);assert(slot.assign('cn-cooking').ok);people.get('cn-cooking').alive=false;assert.equal(slot.resolve().status,'inactive');
});
