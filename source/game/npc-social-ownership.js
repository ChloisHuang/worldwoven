// Transient, actor-local leases: controllers retain their routes and elapsed
// work while a public NPC conversation owns movement. Never persisted.
const owners=new Map(),actors=new Map();
export function holdSocialActors(ids,owner){
 if(!owner||!Array.isArray(ids)||!ids.length)return false;
 const unique=[...new Set(ids)];
 if(unique.some(id=>typeof id!=='string'||!id||id==='player'||actors.has(id)&&actors.get(id)!==owner))return false;
 // Replace this owner's lease atomically; another owner's actors are untouched.
 releaseSocialActors(owner);
 owners.set(owner,new Set(unique));for(const id of unique)actors.set(id,owner);
 return true;
}
export function releaseSocialActors(owner){
 const held=owners.get(owner);if(!held)return false;
 for(const id of held)if(actors.get(id)===owner)actors.delete(id);
 owners.delete(owner);return true;
}
export function isSociallyHeld(id,legacyPlayerId=null){return !!id&&(id===legacyPlayerId||actors.has(id));}
export function resetSocialHolds(){owners.clear();actors.clear();}
export function socialHoldOwner(id){return actors.get(id)||null;}
