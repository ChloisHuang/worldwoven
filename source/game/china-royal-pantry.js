// One finite subdivision of the original 120 portions. No procurement/refill.
export const PANTRY=Object.freeze({id:'cn-royal-kitchen-opening-v1-stored',actorId:'cn-minister-granary',point:[24.15,4.015,-4.5],target:[25.1,5.4,-4.5],desk:[24,.215,32.5],deskTarget:[24,1.235,31.3],duration:4});
const int=n=>Number.isSafeInteger(n)&&n>=0,terminal=o=>['consumed','cancelled'].includes(o.stage);
const released=a=>['released','returned'].includes(a.stage);
export const pantryAllocation=(s,id)=>s.pantry?.allocations.find(a=>a.orderId===id)||null;
export function initializePantry(s){if(s.pantry)return;s.pantry={version:1,id:PANTRY.id,quantity:s.supply.remaining-s.orders.filter(o=>o.stage==='ordered').length,legacyOrderIds:s.orders.map(o=>o.id),legacyReservedIds:s.orders.filter(o=>o.stage==='ordered').map(o=>o.id),returnedLegacyIds:[],counted:null,allocations:[]};}
export function validPantry(s){
 const p=s.pantry;if(p===undefined)return true;
 if(!p||p.version!==1||p.id!==PANTRY.id||!int(p.quantity)||p.quantity>120||!Array.isArray(p.legacyOrderIds)||new Set(p.legacyOrderIds).size!==p.legacyOrderIds.length||!Array.isArray(p.allocations))return false;
 const legacy=new Set(p.legacyOrderIds),ids=new Set(),held=new Set();if([...legacy].some(id=>!s.orders.some(o=>o.id===id)))return false;
 if(!Array.isArray(p.legacyReservedIds)||!Array.isArray(p.returnedLegacyIds)||new Set(p.legacyReservedIds).size!==p.legacyReservedIds.length||new Set(p.returnedLegacyIds).size!==p.returnedLegacyIds.length||p.legacyReservedIds.some(id=>!legacy.has(id))||p.returnedLegacyIds.some(id=>!p.legacyReservedIds.includes(id)||!s.orders.some(o=>o.id===id&&o.stage==='cancelled'&&!o.supplyReceipt)))return false;
 if(p.quantity!==120-s.orders.filter(o=>legacy.has(o.id)&&!p.legacyReservedIds.includes(o.id)&&o.supplyReceipt).length-p.legacyReservedIds.length+p.returnedLegacyIds.length)return false;
 if(p.counted!==null&&(p.counted?.id!==p.id+'-counted'||p.counted.actorId!==PANTRY.actorId||!int(p.counted.quantity)||p.counted.quantity>p.quantity))return false;
 for(const a of p.allocations){const o=s.orders.find(o=>o.id===a.orderId);if(!o||legacy.has(o.id)||ids.has(o.id)||!int(a.unit)||a.unit<1||a.unit>p.quantity||a.itemId!==p.id+'-portion-'+a.unit||!['requested','approved','picked','prepared','return-pending','return-carrying','returned','released'].includes(a.stage))return false;ids.add(o.id);
  if(!released(a)){if(held.has(a.itemId))return false;held.add(a.itemId);}
  if(!['requested','released'].includes(a.stage)&&(!p.counted||a.approvalId!==o.id+'-pantry-approved'))return false;
  if(['picked','prepared','return-pending','return-carrying','returned'].includes(a.stage)&&a.pickupId!==o.id+'-pantry-picked')return false;
  if(a.stage==='prepared'?!o.supplyReceipt:o.supplyReceipt!==null)return false;
  if(['released','returned','return-pending'].includes(a.stage)&&o.stage!=='cancelled'||['requested','approved','picked'].includes(a.stage)&&o.stage!=='ordered')return false;
  if(['return-pending','return-carrying','returned'].includes(a.stage)&&(!Array.isArray(a.returnPoint)||a.returnPoint.length!==3||a.returnPoint.some(n=>!Number.isFinite(n))))return false;
  if(a.stage==='return-carrying'&&!(a.returnHolderId==='player'||/^cn-[a-z0-9-]{1,60}$/.test(a.returnHolderId)))return false;
  if(a.archived!==null&&(!terminal(o)||['return-pending','return-carrying'].includes(a.stage)||a.archived?.id!==o.id+'-pantry-archived'||a.archived.actorId!==PANTRY.actorId||a.archived.itemId!==a.itemId||a.archived.outcome!==(o.supplyReceipt?(o.stage==='consumed'?'consumed':'wasted'):'returned')))return false;
 }
 return s.orders.every(o=>legacy.has(o.id)||ids.has(o.id));
}
export function reservePantry(s,o){const p=s.pantry;if(!p)return true;const used=new Set(p.allocations.filter(a=>!released(a)).map(a=>a.unit));let unit=1;while(used.has(unit))unit++;if(unit>p.quantity)return false;p.allocations.push({orderId:o.id,unit,itemId:p.id+'-portion-'+unit,stage:'requested',approvalId:null,pickupId:null,archived:null});return true;}
export function cancelPantry(s,o,position=null){if(s.pantry?.legacyReservedIds.includes(o.id)&&!o.supplyReceipt&&!s.pantry.returnedLegacyIds.includes(o.id)){s.pantry.quantity++;s.pantry.returnedLegacyIds.push(o.id);}const a=pantryAllocation(s,o.id);if(a){if(a.stage==='picked'){if(!Array.isArray(position)||position.length!==3||position.some(n=>!Number.isFinite(n)))return false;a.returnPoint=position.slice();a.returnHolderId=null;}a.stage=a.stage==='picked'?'return-pending':['requested','approved'].includes(a.stage)?'released':a.stage;}return true;}
export function pantryTask(s,actorId){const p=s.pantry;if(!p||actorId!==PANTRY.actorId)return null;let kind,id,orderId=null;
 if(!p.counted||p.counted.quantity!==p.quantity){kind='count';id=p.id+'-counted';}
 else{const a=p.allocations.find(a=>a.stage==='requested')||p.allocations.find(a=>!a.archived&&!['return-pending','return-carrying'].includes(a.stage)&&terminal(s.orders.find(o=>o.id===a.orderId)));if(!a)return null;kind=a.stage==='requested'?'approve':'archive';orderId=a.orderId;id=orderId+(kind==='approve'?'-pantry-approved':'-pantry-archived');}
 return {id,kind,orderId,point:(kind==='count'?PANTRY.point:PANTRY.desk).slice(),workTarget:(kind==='count'?PANTRY.target:PANTRY.deskTarget).slice(),label:kind==='count'?'赴御膳楼清点原开局储备':kind==='approve'?'核准原膳单领料':'原膳收发凭据归案核销',duration:PANTRY.duration};
}
export function completePantryTask(s,id,proof){const t=pantryTask(s,proof?.actorId);if(!t||t.id!==id||!Array.isArray(proof.position)||proof.position.length!==3||proof.position.some(n=>!Number.isFinite(n))||Math.hypot(proof.position[0]-t.point[0],proof.position[2]-t.point[2])>.2||Math.abs(proof.position[1]-t.point[1])>.2||!Number.isFinite(proof.elapsed)||proof.elapsed<t.duration||proof.duration!==t.duration)return false;
 if(t.kind==='count')s.pantry.counted={id:t.id,actorId:PANTRY.actorId,quantity:s.pantry.quantity};
 else{const a=pantryAllocation(s,t.orderId),o=s.orders.find(o=>o.id===t.orderId);if(t.kind==='approve'){a.stage='approved';a.approvalId=t.id;}else a.archived={id:t.id,actorId:PANTRY.actorId,itemId:a.itemId,outcome:o.supplyReceipt?(o.stage==='consumed'?'consumed':'wasted'):'returned'};}return true;
}
