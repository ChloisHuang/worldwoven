// Registration waits are cancellable requests, never jobs, wages or permission
// to talk through a wall. The actual career eligibility rules stay in their core.
import assert from 'node:assert/strict';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createChinaTavernEmployment} from '../source/game/china-tavern-employment.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
const player={walking:false,ageYears:26,root:{position:{x:21.65,y:.215,z:11.7},rotation:{y:0}}},host={walking:false,root:{position:{x:24.35,y:.215,z:11.19}},station:{npcPosition:[24.1,.215,11.4]}};
let labor,visible=true,mounted=null,roleWrites=0,jobs=0,formalAttempts=0,formalPanels=0;
const ledger=createCurrencyLedger({saveState:()=>{}}),employment=createChinaTavernEmployment({saveState:()=>{roleWrites++;},meetHost:()=>labor.meetRegistrationHost(),getJob:()=>labor.view().job});
const careers={isHired:()=>false,state:()=>({revision:0,skills:{ritual:0},tenure:null}),apply:()=>{formalAttempts++;return {ok:false,reasons:['ritual-required']};}};
labor=createChinaTavernLabor({getPlayer:()=>player,getMounted:()=>mounted,host,employment,careers,copperLedger:ledger,saveState:()=>{jobs++;},canSee:()=>visible,openRegistration:()=>{formalPanels++;},document:null});
assert.equal(labor.intent().kind,'view');assert.equal(labor.intent('view').executionRadius,.9);assert.equal(labor.intent('accept'),null);
const apply=labor.intent('apply');visible=false;assert(!labor.executeIntent(apply));assert.equal(labor.view().waitingRegistration,null);visible=true;
player.root.position.y=4.015;assert(!labor.executeIntent(apply));player.root.position.y=.215;
player.root.position.x=21.3;assert(!labor.executeIntent(apply));player.root.position.x=21.65;
mounted={id:'chair'};assert(!labor.executeIntent(apply));mounted=null;
assert(labor.executeIntent(apply));assert.equal(labor.view().waitingRegistration,'apply');assert(!employment.isHired());assert.equal(jobs,0);
labor.cancelRegistration();host.root.position.x=24.1;host.root.position.z=11.4;labor.update(.1);assert(!employment.isHired());
host.root.position.x=24.35;host.root.position.z=11.19;assert(labor.executeIntent(apply));player.root.position.x=21.3;labor.update(.1);host.root.position.x=24.1;host.root.position.z=11.4;labor.update(.1);assert(!employment.isHired());assert.equal(labor.view().waitingRegistration,null);
player.root.position.x=21.65;host.root.position.x=24.35;host.root.position.z=11.19;assert(labor.executeIntent(apply));visible=false;labor.update(.1);assert.equal(labor.view().waitingRegistration,null);visible=true;
assert(labor.executeIntent(apply));host.root.position.x=24.1;host.root.position.z=11.4;labor.update(.1);labor.update(.1);assert(employment.isHired());assert.equal(roleWrites,1);assert.equal(jobs,0);assert.equal(labor.view().job,null);assert.equal(labor.intent().kind,'view');assert(!labor.executeIntent(apply),'stale application cannot repeat');
host.root.position.x=24.35;host.root.position.z=11.19;assert(labor.executeIntent(labor.intent('formal-apply')));assert.equal(formalAttempts,0);host.root.position.x=24.1;host.root.position.z=11.4;labor.update(.1);labor.update(.1);assert.equal(formalAttempts,1);assert.equal(formalPanels,1);assert.equal(labor.view().formalHired,false);assert.equal(jobs,0);assert.equal(ledger.state().cash,0);assert.equal(ledger.state().bank,0);
console.log('PASS registration conversation radius, floor/LOS/mount gates, explicit wait/cancel/leave, one registration, formal rejection and no automatic work');
