// Scene-local reservations. A shared facility owns physical slots, never one
// whole-pool lock. Actor IDs also work for future visiting customers; no live
// reservation survives a region unload or gets written into a save.
export function createFacilityQueue() {
 const facilities=new Map();let disposed=false;
 const facility=id=>{if(!facilities.has(id))facilities.set(id,{slots:[id],reservations:new Map(),queue:[],player:false});return facilities.get(id);};
 function reserve(id,actor,{eligible=()=>true,purpose='use'}={}){
  if(disposed)return null;const f=facility(id),existing=[...f.reservations.values()].find(r=>r.actor===actor);if(existing)return {...existing};
  if(!f.queue.includes(actor))f.queue.push(actor);
  if(f.player||f.queue[0]!==actor)return null;
  const seatId=f.slots.find(s=>!f.reservations.has(s)&&eligible(s));if(!seatId)return null;
  const reservation={facilityId:id,seatId,actor,purpose,status:'reserved'};f.reservations.set(seatId,reservation);f.queue.shift();return {...reservation};
 }
 return {
  define(id,slots){if(disposed)return;const f=facility(id);if(f.reservations.size||f.queue.length)throw Error('Cannot resize an active facility');f.slots=[...new Set(slots)];},
  reserve,
  request(id,actor){return !!reserve(id,actor);},
  occupy(id,actor){const f=facilities.get(id),r=f&&[...f.reservations.values()].find(r=>r.actor===actor);if(!r)return false;r.status='occupied';return true;},
  reservation(id,actor){const f=facilities.get(id),r=f&&[...f.reservations.values()].find(r=>r.actor===actor);return r?{...r}:null;},
  release(id,actor){const f=facilities.get(id);if(!f)return;f.queue=f.queue.filter(a=>a!==actor);for(const [seat,r]of f.reservations)if(r.actor===actor)f.reservations.delete(seat);},
  releaseActor(actor){for(const [id]of facilities)this.release(id,actor);},
  // Used only inside a synchronous manual recovery transaction. Preserve exact
  // slot and queue order if its single full-world save is rejected.
  prepareReleaseActor(actor){const before=[...facilities].map(([id,f])=>({id,reservations:[...f.reservations].filter(([,r])=>r.actor===actor),queueIndex:f.queue.indexOf(actor)}));
   return {apply:()=>{for(const {id}of before)this.release(id,actor);},rollback:()=>{for(const {id,reservations,queueIndex}of before){const f=facilities.get(id);for(const [seat,r]of reservations)f.reservations.set(seat,r);if(queueIndex>=0&&!f.queue.includes(actor))f.queue.splice(queueIndex,0,actor);}}};
  },
  // Retained for single-user chairs/changing places. Shared pools cannot evict
  // their bathers when the player requests a different empty slot.
  prioritize(id,active=true){if(disposed)return null;const f=facility(id);if(f.slots.length>1)return null;const previous=active?[...f.reservations.values()][0]?.actor||null:null;f.player=active;if(active)f.reservations.clear();return previous;},
  state(){return [...facilities].map(([id,f])=>({id,capacity:f.slots.length,owner:f.slots.length===1?[...f.reservations.values()][0]?.actor||null:null,player:f.player,slots:f.slots.slice(),reservations:[...f.reservations.values()].map(r=>({...r})),queue:f.queue.slice()}));},
  dispose(){disposed=true;facilities.clear();}
 };
}
