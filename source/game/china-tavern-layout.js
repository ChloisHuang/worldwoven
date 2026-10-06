// Spatial revision only: business identities, ledgers and completed work are
// unchanged when the public hall moves north and the dining room grows.
export const TAVERN_LAYOUT_VERSION=1;
export const TAVERN_HALL_DZ=-5;
export const TAVERN_DINING_DZ=-1.9;
export const TAVERN_DINING_Z=16.2;
export const tavernSeatSide=seat=>seat?.id?.endsWith('--1')?-1:seat?.id?.endsWith('-1')?1:(seat?.center?.[2]??TAVERN_DINING_Z)<TAVERN_DINING_Z?-1:1;
export function tavernTablePlace(id,side=-1){const x=id==='west'?18.1:23.9,inward=id==='west'?1:-1;return {tableId:id,servePoint:[x+inward*1.2,.215,+(TAVERN_DINING_Z+side*.24).toFixed(8)],mealPoint:[x+inward*.36,1.21,+(TAVERN_DINING_Z+side*.27).toFixed(8)]};}
const shifted=(p,dz)=>Array.isArray(p)&&p.length===3?[p[0],p[1],+(p[2]+dz).toFixed(8)]:p;
// Called on detached snapshots before each restore. No actors are relocated,
// no stages are completed, and the caller retains the original durable revision.
export function normalizeTavernWorld(snapshot,furniture){
 const world=JSON.parse(JSON.stringify(snapshot)),moved=world.layoutVersion!==TAVERN_LAYOUT_VERSION;
 for(const order of world.orders||[]){
  const seat=furniture.items.find(s=>s.id===order.seatId),side=tavernSeatSide(seat||{id:order.seatId});
  if(seat)order.seatAnchor=seat.anchor.slice();else if(moved)order.seatAnchor=shifted(order.seatAnchor,TAVERN_DINING_DZ);
  Object.assign(order,tavernTablePlace(order.tableId,side));
  if(moved){
   if(order.passPoint)order.passPoint=shifted(order.passPoint,TAVERN_HALL_DZ);
   if(order.placedMealPoint)order.placedMealPoint=shifted(order.placedMealPoint,TAVERN_DINING_DZ);
   // A held bowl stays with its actual owner. The return gesture is recomputed
   // only after the diner has physically reached the same moved seat.
   if(order.customerId==='player'&&!order.cancelled&&!['dirty','return','wash','done'].includes(order.stage))order.layoutAwaitingSeat=true;
  }
 }
 world.layoutVersion=TAVERN_LAYOUT_VERSION;
 return {world,moved};
}
