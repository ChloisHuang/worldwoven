export const SALON_ROOMS=Object.freeze([
 {id:'tavern-guest-lan',name:'兰房',minX:16,maxX:21,minZ:15.2,maxZ:21,y:4.015,actor:[19.35,4.015,18.25],player:[20.3,4.015,18.25]},
 {id:'tavern-guest-zhu',name:'竹房',minX:21,maxX:26,minZ:15.2,maxZ:21,y:4.015,actor:[24.35,4.015,18.25],player:[25.3,4.015,18.25]}
]);
export const inSalonRoom=(room,p)=>!!p&&Math.abs(p.y-room.y)<.45&&p.x>room.minX+.15&&p.x<room.maxX-.15&&p.z>room.minZ+.15&&p.z<room.maxZ-.15;
// Claims are scene-local. Physical visitors still keep a released room busy
// until they walk out, including after a cancellation.
export function createSalonRoomLedger({rooms=SALON_ROOMS,occupants=()=>[]}={}){
 const claims=new Map();
 const busy=(room,ignore=[])=>occupants().some(o=>!ignore.includes(o.id)&&inSalonRoom(room,o.position));
 return {
  available(room,ignore=[]){return !claims.has(room.id)&&!busy(room,ignore);},
  reserve(roomId,owner,ignore=[]){const r=rooms.find(r=>r.id===roomId);if(!r||claims.has(roomId)||[...claims.values()].some(c=>c.owner===owner)||busy(r,ignore))return false;claims.set(roomId,{owner,status:'reserved'});return true;},
  occupy(roomId,owner){const c=claims.get(roomId);if(!c||c.owner!==owner)return false;c.status='occupied';return true;},
  release(owner){for(const[id,c]of claims)if(c.owner===owner)claims.delete(id);},
  claim:roomId=>claims.get(roomId)||null,
  state:()=>rooms.map(r=>({id:r.id,name:r.name,claim:claims.has(r.id)?{...claims.get(r.id)}:null,physicallyOccupied:busy(r)})),
  clear:()=>claims.clear()
 };
}
