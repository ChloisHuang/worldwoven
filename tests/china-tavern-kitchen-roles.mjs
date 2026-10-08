import assert from 'node:assert/strict';
import {createTavernKitchenRoles,kitchenHandoffBoundary} from '../source/game/china-tavern-kitchen-roles.js';
import {fixture} from './china-host-needs.mjs';
const copy=structuredClone;
const actors=new Map(['cn-tavern-cook','cn-tavern-assistant','cn-resident-next','cn-tavern-reciter'].map((id,i)=>[id,{station:{id},alive:true,ageYears:30+i,funds:240+i*10}]));
const player={id:'player',alive:true};let saved=null,reject=false,tenure=null,blocked=true,external=false;
const options={resolveActor:id=>actors.get(id),getPlayer:()=>player,getTenureRoleId:()=>tenure,canAssign:(role,id)=>!external&&id!=='cn-tavern-reciter',canRelease:()=>({ok:!blocked,blockers:blocked?[{kind:'held-item',orderId:'cn-tavern-order-1'}]:[]}),saveState:s=>{if(reject)return false;saved=copy(s);return true;}};
const roles=createTavernKitchenRoles(options);
assert.equal(roles.resolve('chef').holderId,'cn-tavern-cook');assert.equal(roles.resolve('assistant').holderId,'cn-tavern-assistant');
assert.equal(roles.assign('chef','cn-resident-next').code,'handoff-pending');assert.equal(saved,null);
blocked=false;assert.equal(roles.assign('chef','cn-tavern-assistant').code,'holder-unavailable');assert.equal(roles.assign('chef','cn-tavern-reciter').code,'holder-unavailable');
reject=true;assert.equal(roles.assign('chef','cn-resident-next').code,'save-failed');assert.equal(roles.resolve('chef').holderId,'cn-tavern-cook');reject=false;
assert(roles.assign('chef','cn-resident-next').ok);assert.equal(roles.resolve('chef').actor,actors.get('cn-resident-next'));assert.equal(roles.resolve('chef').actor.funds,260);assert.equal(actors.get('cn-tavern-cook').funds,240);
assert.equal(roles.assign('chef',null,{expectedRevision:0}).code,'stale-chef-assignment');assert(roles.assign('chef',null).ok);
assert.equal(createTavernKitchenRoles({...options,saved}).resolve('chef').status,'vacant');
assert.equal(createTavernKitchenRoles({...options,saved:{version:1,assistant:saved.assistant}}).resolve('chef').status,'invalid');
assert.equal(createTavernKitchenRoles({...options,saved:{version:88}}).resolve('chef').status,'invalid');
assert.equal(roles.assign('chef','player').code,'use-formal-career');
tenure='cn-tavern-chef';assert.equal(roles.resolve('chef').actor,player);assert.equal(roles.resolve('chef').source,'formal-career');assert.equal(roles.assign('chef',null).code,'player-tenure-owns-role');
tenure=null;assert.equal(roles.resolve('chef').status,'vacant','ending tenure never fills explicit vacancy');assert(roles.assign('chef','cn-resident-next').ok);
actors.get('cn-resident-next').alive=false;assert.equal(roles.resolve('chef').status,'inactive');actors.delete('cn-resident-next');assert.equal(roles.resolve('chef').status,'unloaded');external=true;assert.equal(roles.resolve('assistant').status,'busy');external=false;
for(const [role,stage,holder]of [['chef','cooked','cook'],['assistant','carrying','assistant'],['assistant','return','assistant'],['assistant','wrong','assistant']])assert(!kitchenHandoffBoundary(role,{orders:[{id:'o',stage,holder}]}).ok);
for(const [role,stage]of [['chef','paid'],['chef','prepared'],['assistant','pass'],['assistant','dirty']]){
 const state={orders:[{id:'o',stage,payment:'reserved',customerId:'player'}],phases:[]},before=copy(state);
 assert(kitchenHandoffBoundary(role,state).ok);assert.deepEqual(state,before,'queued paid customer state stays untouched');state.phases=[['o',.1]];assert(!kitchenHandoffBoundary(role,state).ok);
}
assert(!kitchenHandoffBoundary('assistant',{phases:[['clean-west',.1]]}).ok);assert(!kitchenHandoffBoundary('assistant',{heldTrayId:'o'}).ok);assert(!kitchenHandoffBoundary('chef',{activity:{kind:'heat',orderId:'o'}}).ok);
// Actual existing scene, same tickets and payment ledger: exercise its timer and
// held-tray view rather than claiming mock state proves physical handoff.
const f=fixture();f.hungry(false);
f.until(()=>!f.scene.kitchenHandoff('chef').ok,'real partial kitchen work blocks reassignment');
let before=copy(f.scene.snapshot()),wallet=f.property.npcAccount('cn-tavern-cook').total;
for(let i=0;i<100;i++)assert(!f.scene.kitchenHandoff('chef').ok);
assert.deepEqual(copy(f.scene.snapshot()),before);assert.equal(f.property.npcAccount('cn-tavern-cook').total,wallet);
f.until(()=>f.scene.snapshot().orders.some(o=>o.holder==='assistant'&&o.stage==='carrying'),'actual assistant carries original tray');
assert(!f.scene.kitchenHandoff('assistant').ok);before=copy(f.scene.snapshot());
const heldRoles=createTavernKitchenRoles({...options,canRelease:r=>f.scene.kitchenHandoff(r)});assert.equal(heldRoles.assign('assistant',null).code,'handoff-pending');assert.deepEqual(copy(f.scene.snapshot()),before);
f.until(()=>f.scene.snapshot().orders.every(o=>o.stage==='done')&&f.scene.kitchenHandoff('assistant').ok,'same original orders genuinely finish and clear');
assert(heldRoles.assign('assistant',null).ok);assert.equal(heldRoles.resolve('assistant').status,'vacant');
console.log('PASS kitchen identity, funds isolation, fail-closed assignment, atomic saves, tenure/vacancy, actual partial work and held-tray release boundary; needs and runtime role substitution not enabled');
// The composite snapshot must not overwrite a simultaneous other-slot change.
{
 const a=new Map(['cn-tavern-cook','cn-tavern-assistant','cn-resident-next'].map(id=>[id,{station:{id},alive:true}]));let tenure=null;
 const r=createTavernKitchenRoles({resolveActor:id=>a.get(id),canAssign:()=>true,canRelease:()=>true,getTenureRoleId:()=>tenure});
 const stale=r.prepareAssignment('chef',null);assert(r.assign('assistant',null).ok);assert(!stale.valid());assert(!stale.lock());
 const p=r.prepareAssignment('chef','cn-resident-next');assert(p.ok&&p.lock());assert.equal(r.assign('assistant','cn-tavern-assistant').code,'assignment-busy');
 assert(!p.save(()=>false));assert.equal(r.resolve('chef').holderId,'cn-tavern-cook');p.release();
 const q=r.prepareAssignment('chef','cn-resident-next');tenure='cn-tavern-chef';assert(!q.valid());assert(!q.lock());tenure=null;
 const end=r.prepareAssignment('chef','cn-resident-next');assert(end.lock());assert(end.save(()=>true));assert(end.committed());end.release();assert.equal(r.resolve('chef').holderId,'cn-resident-next');assert.equal(r.resolve('assistant').status,'vacant');
}
