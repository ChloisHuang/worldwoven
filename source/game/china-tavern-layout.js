// Spatial revision only: business identities, ledgers and completed work are
// unchanged when the public hall moves north and the dining room grows.
export const TAVERN_LAYOUT_VERSION=3;
export const TAVERN_HALL_DZ=-5;
export const TAVERN_DINING_DZ=-1.9;
export const TAVERN_DINING_Z=16.2; // legacy row, retained only for old saves
// Stable table and seat identities do not encode their current physical position.
export const TAVERN_TABLE_LAYOUT=Object.freeze([
 Object.freeze({id:'west',seatKey:18.1,x:19,z:13.65}),
 Object.freeze({id:'east',seatKey:23.9,x:23,z:17.65})
]);
// One authored cleaning approach for the player's original two-table job and
// NPC trials. Both bodies stand in the existing aisle, outside the 1.45m table;
// the work target remains on its original top, within hand reach.
export const TAVERN_TABLE_CLEANING_POINTS=Object.freeze(TAVERN_TABLE_LAYOUT.map(({id,x,z})=>{
 const inward=id==='west'?1:-1;
 return Object.freeze({id:'cn-tavern-labor-'+id,name:(id==='west'?'西窗':'东窗')+'餐桌 · 靠过道一侧',
  position:Object.freeze([+(x+inward*1.2).toFixed(8),.215,z]),workTarget:Object.freeze([+(x+inward*.65).toFixed(8),1.19,z])});
}));
export const tavernSeatSide=seat=>seat?.id?.endsWith('--1')?-1:seat?.id?.endsWith('-1')?1:(seat?.center?.[2]??TAVERN_DINING_Z)<TAVERN_DINING_Z?-1:1;
export function tavernTablePlace(id,side=-1){const {x,z}=TAVERN_TABLE_LAYOUT.find(t=>t.id===id)||TAVERN_TABLE_LAYOUT[0],inward=id==='west'?1:-1;return {tableId:id,servePoint:[x+inward*1.2,.215,+(z+side*.24).toFixed(8)],mealPoint:[x+inward*.36,1.21,+(z+side*.27).toFixed(8)]};}
const shifted=(p,dz)=>Array.isArray(p)&&p.length===3?[p[0],p[1],+(p[2]+dz).toFixed(8)]:p;
// Called on detached snapshots before each restore. No actors are relocated,
// no stages are completed, and the caller retains the original durable revision.
export function normalizeTavernWorld(snapshot,furniture){
 const world=JSON.parse(JSON.stringify(snapshot)),moved=world.layoutVersion!==TAVERN_LAYOUT_VERSION,legacyHall=!world.layoutVersion;
 for(const order of world.orders||[]){
  const seat=furniture.items.find(s=>s.id===order.seatId),side=tavernSeatSide(seat||{id:order.seatId});
  if(seat)order.seatAnchor=seat.anchor.slice();else if(moved&&Array.isArray(order.seatAnchor)){
   const table=TAVERN_TABLE_LAYOUT.find(t=>t.id===order.tableId);
   if(table)order.seatAnchor=[table.x,order.seatAnchor[1],+(table.z+side*1.045).toFixed(8)];
  }
  Object.assign(order,tavernTablePlace(order.tableId,side));
  if(moved){
   if(legacyHall&&order.passPoint)order.passPoint=shifted(order.passPoint,TAVERN_HALL_DZ);
   if(order.placedMealPoint)order.placedMealPoint=tavernTablePlace(order.placedTableId||order.tableId,side).mealPoint;
   // A held bowl stays with its actual owner. The return gesture is recomputed
   // only after the diner has physically reached the same moved seat.
   if(order.customerId==='player'&&!order.cancelled&&!['dirty','return','wash','done'].includes(order.stage))order.layoutAwaitingSeat=true;
  }
 }
 world.layoutVersion=TAVERN_LAYOUT_VERSION;
 return {world,moved};
}
