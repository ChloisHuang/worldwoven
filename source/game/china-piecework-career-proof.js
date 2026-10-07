import {PALACE_TEA_ROLE} from './china-palace-tea-role.js';
import {ARCHIVE_ROLE} from './china-archive-role.js';
import {validatePalaceTeaPlayerProof} from './china-palace-tea-proof.js';
import {validateArchivePlayerProof} from './china-archive-catalogue.js';

export const CHINA_PIECEWORK_ROLES=Object.freeze([PALACE_TEA_ROLE,ARCHIVE_ROLE]);
export const chinaPieceworkRole=id=>CHINA_PIECEWORK_ROLES.find(role=>role.id===id)||null;
export const chinaPieceworkSkill=id=>id===PALACE_TEA_ROLE.id?'ritual':id===ARCHIVE_ROLE.id?'writing':null;
const fields=Object.freeze(['version','id','roleId','slotId','day','amount','currency','proof','completedAt']);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const sameChinaPieceworkReceipt=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
// Source proofs certify the original physical cup/tray or six catalogue volumes.
// Structural validity alone is not permission to pay: the live service verifies
// its completed source order and joins this candidate to the atomic bank save.
export function validChinaPieceworkReceipt(receipt){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||Object.keys(receipt).length!==fields.length||!fields.every(key=>Object.hasOwn(receipt,key)))return false;
 const role=chinaPieceworkRole(receipt.roleId),proof=receipt.proof;
 if(!role||receipt.version!==1||receipt.slotId!==role.slotId||receipt.amount!==8||receipt.amount!==role.amount||receipt.currency!=='copper'||
   !Number.isSafeInteger(receipt.day)||receipt.day<0||!Number.isFinite(receipt.completedAt)||receipt.completedAt<0||
   !proof||proof.actorId!=='player'||proof.roleId!==role.id||proof.slotId!==role.slotId||proof.day!==receipt.day||proof.amount!==receipt.amount)return false;
 try{return receipt.id===(role.id===PALACE_TEA_ROLE.id?proof.requestId:proof.orderId)&&!!(role.id===PALACE_TEA_ROLE.id?validatePalaceTeaPlayerProof(proof):validateArchivePlayerProof(proof));}catch{return false;}
}
export function chinaPieceworkReview(receipt){
 if(!receipt)return null;
 const tea=receipt.roleId===PALACE_TEA_ROLE.id;
 return {id:receipt.id,roleId:receipt.roleId,day:receipt.day,score:1,positive:true,amount:receipt.amount,skill:chinaPieceworkSkill(receipt.roleId),
   reasonCode:tea?'palace-tea-original-completed':'archive-original-completed',
   reason:tea?'同号原茶已奉到本人、用毕并收洗归还，原单验收 +1':'六册原藏书逐册查验、整理并放回原位，回案验收 +1'};
}
