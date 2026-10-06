import {SALON_RECEPTION_ROLE as ROLE} from './china-salon-reception-role.js';
import {SALON_ARTISTS} from './china-tavern-salon-artists.js';
import {CHINA_OFFICIAL_IDS} from './china-official-economy.js';
import {SALON_ROOMS} from './china-tavern-salon-rooms.js';
import {validSalonFee,SALON_QUOTE_VERSION} from './china-salon-pricing.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateReceptionProof(input){
 const r=ROLE,p=input;
 if(!object(p)||p.kind!=='salon-reception-work'||p.version!==1||!/^cn-salon-(?:[1-9][0-9]*-[1-9][0-9]*|npc-[1-9][0-9]*)$/.test(p.sessionId||'')||p.actorId!==r.incumbentId||p.roleId!==r.id||p.slotId!==r.slotId||!Number.isSafeInteger(p.holderRevision)||p.holderRevision<0||p.contractVersion!==r.contractVersion||p.amount!==r.amount||!['player',...CHINA_OFFICIAL_IDS].includes(p.customerId)||!SALON_ARTISTS.some(a=>a.id===p.artistId&&a.activity===p.activity)||!validSalonFee(p.fee,SALON_QUOTE_VERSION)||!SALON_ROOMS.some(room=>room.id===p.roomId)||p.completed!==true)throw Error('invalid-salon-reception-proof');
 if(p.sessionId.startsWith('cn-salon-npc-')===(p.customerId==='player'))throw Error('invalid-salon-reception-customer');
 const expected={kind:'salon-reception-work',version:1,sessionId:p.sessionId,actorId:p.actorId,roleId:r.id,slotId:r.slotId,holderRevision:p.holderRevision,contractVersion:r.contractVersion,amount:r.amount,customerId:p.customerId,artistId:p.artistId,activity:p.activity,fee:p.fee,roomId:p.roomId,steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:2},completed:true};
 if(Object.keys(p).length!==Object.keys(expected).length||Object.keys(expected).some(k=>!same(p[k],expected[k])))throw Error('invalid-salon-reception-proof');
 return copy(expected);
}
export function receptionProofMatchesSession(proof,session){
 try{const p=validateReceptionProof(proof);return p.sessionId===session.id&&p.customerId===(session.customerId||'player')&&p.artistId===session.actorId&&p.activity===session.activity&&p.fee===session.fee&&p.roomId===session.roomId;}catch{return false;}
}
