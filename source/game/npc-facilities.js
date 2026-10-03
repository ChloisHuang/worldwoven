// Local actor ownership only. Never persists a live lock across region loads.
// The player has first refusal; NPC waiters are FIFO and must release on cancel.
export function createFacilityQueue() {
 const facilities=new Map();let disposed=false;
 const slot=id=>{if(!facilities.has(id))facilities.set(id,{owner:null,queue:[],player:false});return facilities.get(id);};
 return {
  request(id,actor){if(disposed)return false;const f=slot(id);if(f.owner===actor&&!f.player)return true;if(!f.queue.includes(actor))f.queue.push(actor);if(f.player||f.owner||f.queue[0]!==actor)return false;f.owner=f.queue.shift();return true;},
  release(id,actor){const f=facilities.get(id);if(!f)return;f.queue=f.queue.filter(a=>a!==actor);if(f.owner===actor)f.owner=null;},
  releaseActor(actor){for(const f of facilities.values()){f.queue=f.queue.filter(a=>a!==actor);if(f.owner===actor)f.owner=null;}},
  prioritize(id,active=true){if(disposed)return null;const f=slot(id),previous=active?f.owner:null;f.player=active;if(active)f.owner=null;return previous;},
  state(){return [...facilities].map(([id,f])=>({id,...f,queue:f.queue.slice()}));},
  dispose(){disposed=true;facilities.clear();}
 };
}
