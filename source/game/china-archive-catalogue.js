import {ARCHIVE_ROLE as ROLE} from './china-archive-role.js';
// The existing six table volumes, not a claim that lesson IDs were physical books.
export const ARCHIVE_HOME=Object.freeze([-2.3,7.615,-28.7]);
export const ARCHIVE_BOOKS=Object.freeze([[-2.7,-30.2],[-1.6,-30.2],[-.5,-30.2],[4.7,-28],[5.8,-28],[6.9,-28]].map(([x,z],i)=>Object.freeze({id:`cn-archive-volume-${i+1}`,position:Object.freeze([x,8.53,z]),stand:Object.freeze([x,7.615,z+1.35])})));
export const archiveOrderId=day=>`cn-archive-inspection:${day}`;
export const archiveSteps=()=>ARCHIVE_BOOKS.map(b=>({bookId:b.id,checkedSeconds:2,tidiedSeconds:1,returned:true}));
export const archiveContract=(day,actorId,holderRevision)=>({kind:'npc-archive-inspection',version:1,actorId,roleId:ROLE.id,slotId:ROLE.slotId,holderRevision,orderId:archiveOrderId(day),day,amount:ROLE.amount,contractVersion:ROLE.contractVersion,bookIds:ARCHIVE_BOOKS.map(b=>b.id)});
export const archiveSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateArchiveContract(p){
 if(!p||!/^cn-[a-z0-9-]{1,60}$/.test(p.actorId||'')||!Number.isSafeInteger(p.day)||p.day<0||!Number.isSafeInteger(p.holderRevision)||p.holderRevision<0)return false;
 return archiveSame(p,archiveContract(p.day,p.actorId,p.holderRevision));
}
export function archiveProof(contract){return {...structuredClone(contract),steps:archiveSteps(),returnedHome:true};}
export function validateArchiveProof(p){if(!p)return false;const {steps,returnedHome,...contract}=p;return validateArchiveContract(contract)&&archiveSame(p,archiveProof(contract));}
