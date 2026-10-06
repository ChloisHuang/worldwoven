// Maintenance proof is issued only after work on the original garden plants
// and the physical return of the borrowed tool. It never represents a sale.
export const GARDEN_MAINTENANCE_TARGETS=Object.freeze({
 water:Object.freeze(['west-nursery-rose-a','west-nursery-rose-b']),
 prune:Object.freeze(['west-parterre-east-hedge']),
});
const RECEIPT_FIELDS=Object.freeze(['id','number','kind','workReceiptId','day','targetIds','completed','returned']);
const serial=value=>Number.isSafeInteger(value)&&value>0;
export function validGardenMaintenanceReceipt(receipt){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||Object.keys(receipt).length!==RECEIPT_FIELDS.length||
  !RECEIPT_FIELDS.every(key=>Object.hasOwn(receipt,key))||typeof receipt.kind!=='string'||!Object.hasOwn(GARDEN_MAINTENANCE_TARGETS,receipt.kind)||
  !serial(receipt.number)||receipt.id!==`fr-garden-maintenance-${receipt.kind}-${receipt.number}`||
  !Number.isSafeInteger(receipt.day)||receipt.day<0||receipt.completed!==true||receipt.returned!==true)return false;
 const work=typeof receipt.workReceiptId==='string'&&/^fr-garden-labor-([1-9][0-9]*)$/.exec(receipt.workReceiptId);
 const targets=GARDEN_MAINTENANCE_TARGETS[receipt.kind];
 return !!work&&serial(Number(work[1]))&&Array.isArray(receipt.targetIds)&&receipt.targetIds.length===targets.length&&
  targets.every((target,index)=>receipt.targetIds[index]===target);
}
export const sameGardenMaintenanceReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>key==='targetIds'?
 Array.isArray(a?.targetIds)&&Array.isArray(b?.targetIds)&&a.targetIds.length===b.targetIds.length&&a.targetIds.every((id,index)=>id===b.targetIds[index]):a?.[key]===b?.[key]);
