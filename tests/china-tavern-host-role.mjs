import assert from 'node:assert/strict';
import {createTavernHostRole,TAVERN_HOST_SLOT_ID} from '../source/game/china-tavern-host-role.js';
const actors=new Map(['cn-tavern-host','cn-resident-next'].map((id,i)=>[id,{station:{id},ageYears:40+i,funds:480-i*470,alive:true}])),player={id:'player',ageYears:24};let saved=null,reject=false;
const options={resolveActor:id=>actors.get(id),getPlayer:()=>player,saveState:s=>{if(reject)return false;saved=s;return true;}},role=createTavernHostRole(options);
assert.equal(role.resolve().holderId,'cn-tavern-host');assert.equal(role.resolve().slotId,TAVERN_HOST_SLOT_ID);assert(role.assign('cn-resident-next').ok);assert.equal(role.resolve().actor,actors.get('cn-resident-next'));assert.equal(role.resolve().actor.funds,10);assert.equal(actors.get('cn-tavern-host').funds,480);assert.equal(role.resolve().actor.ageYears,41);
assert(!role.assign('cn-tavern-host',{expectedRevision:0}).ok);reject=true;assert(!role.assign(null).ok);assert.equal(role.resolve().holderId,'cn-resident-next');reject=false;assert(role.assign(null).ok);assert.equal(createTavernHostRole({...options,saved}).resolve().status,'vacant');
assert(role.assign('player').ok);assert(role.resolve().isPlayer);assert.equal(role.resolve().actor,player);assert(role.assign(null).ok);assert.equal(role.resolve().actor,null,'player departure never silently restores former NPC');
assert(role.assign('cn-resident-next').ok);actors.get('cn-resident-next').alive=false;assert.equal(role.resolve().status,'inactive');const reload=createTavernHostRole({...options,saved});assert.equal(reload.resolve().holderId,'cn-resident-next');assert(!reload.resolve().alive);assert(!reload.assign('cn-resident-next').ok);actors.delete('cn-resident-next');assert.equal(reload.resolve().status,'unloaded');assert(!createTavernHostRole({...options,saved:{}}).resolve().available);
console.log('PASS stable host slot, personal identity/funds/age, atomic assignment, persistent vacancy, manual player holder and injected death/unload boundaries; no mortality simulation');
// Hiring and assignment must share the one world write. A refusal cannot make
// the new actor visible, and reentrant assignment cannot escape the held lease.
{
 const first={station:{id:'cn-tavern-host'},alive:true},next={station:{id:'cn-resident-next'},alive:true};
 const pair=new Map([[first.station.id,first],[next.station.id,next]]);let unsafe=false;
 const r=createTavernHostRole({resolveActor:id=>pair.get(id),canRelease:()=>!unsafe});
 let p=r.prepareAssignment(next.station.id);assert(p.ok&&p.valid());assert(p.lock());
 assert.equal(r.assign(null).code,'assignment-busy');assert(!p.save(()=>false));assert(!p.committed());assert.equal(r.state().holderId,first.station.id);p.release();
 p=r.prepareAssignment(next.station.id);unsafe=true;assert(!p.valid());assert(!p.lock());unsafe=false;
 p=r.prepareAssignment(next.station.id);assert(p.lock());let world;
 assert(p.save(({assignment})=>{assert.equal(r.state().holderId,first.station.id);assert.equal(r.assign(null).code,'assignment-busy');world={chinaTavernHostRole:assignment,hiring:{status:'assigned'}};return true;}));
 assert.equal(r.state().holderId,first.station.id);assert(p.committed());assert(p.committed());p.release();
 assert.equal(r.state().revision,1);assert.equal(createTavernHostRole({saved:world.chinaTavernHostRole,resolveActor:id=>pair.get(id)}).resolve().actor,next);
}

{const actor={station:{id:'cn-tavern-host'},alive:true};const cold=createTavernHostRole({saved:createTavernHostRole().state(),resolveActor:()=>actor});const p=cold.prepareAssignment(null);assert(p.ok);assert.deepEqual(Object.keys(p.assignment).sort(),['holderId','revision','roleId','slotId','version'].sort(),'historical state display fields cannot pollute a cold hiring transaction');assert.equal(p.assignment.revision,1);}

// One resolve is one live eligibility read, not two copies of all controllers.
{
 const actor={station:{id:'cn-tavern-host'},alive:true};let reads=0,allowed=true;
 const role=createTavernHostRole({resolveActor:()=>actor,canAssign:()=>{reads++;return allowed;}});
 for(const value of [true,false,true]){allowed=value;const before=reads,r=role.resolve();assert.equal(reads,before+1);assert.equal(r.available,value);assert.equal(r.status,value?'npc':'busy');}
 actor.alive=false;const before=reads;assert.equal(role.resolve().status,'inactive');assert.equal(reads,before);
}
