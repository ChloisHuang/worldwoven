import {regionalTellerRole,validateRegionalTellerAuditProof} from './regional-teller-audit-proof.js';

const fields=Object.freeze(['version','id','roleId','slotId','day','amount','currency','proof','completedAt']);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const sameTellerAuditReceipt=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
// The proof protects all four original currency rows, even when there was no
// activity. The live controller still has to certify physical completion and
// consume the shared daily source before this receipt can enter a bank save.
export function validTellerAuditReceipt(receipt){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||Object.keys(receipt).length!==fields.length||!fields.every(key=>Object.hasOwn(receipt,key)))return false;
 const role=regionalTellerRole(receipt.roleId),proof=receipt.proof;
 if(!role||receipt.roleId!==role.id||![1,2].includes(receipt.version)||receipt.slotId!==role.slotId||receipt.amount!==(receipt.version===1?8:0)||receipt.currency!==role.currency||
   !Number.isSafeInteger(receipt.day)||receipt.day<0||!Number.isFinite(receipt.completedAt)||receipt.completedAt<0||
   receipt.id!==`regional-teller-audit:${receipt.day}`||!proof||proof.actorId!=='player'||proof.orderId!==receipt.id||
   proof.country!==role.country||proof.roleId!==role.id||proof.slotId!==role.slotId||proof.day!==receipt.day||
   proof.contractVersion!==receipt.version||proof.amount!==receipt.amount||proof.currency!==receipt.currency)return false;
 try{return !!validateRegionalTellerAuditProof(proof);}catch{return false;}
}
export function tellerAuditReview(receipt){
 if(!receipt)return null;
 const role=regionalTellerRole(receipt.roleId);
 return {id:receipt.id,roleId:receipt.roleId,day:receipt.day,score:1,positive:true,amount:receipt.amount,currency:receipt.currency,skill:'writing',
   evaluatorId:role?.supervisorId,reasonCode:'regional-teller-original-audit-completed',
   reason:'四币原账逐项核验、拨算并记账，归还原工具后验收 +1'};
}
