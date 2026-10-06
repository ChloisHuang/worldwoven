import {PALACE_TEA_ROLE as ROLE} from './china-palace-tea-role.js';
import {PALACE_TEA_GUESTS,PALACE_TEA_STEPS,palaceTeaRequestId} from './china-palace-tea-orders.js';

// Strictly separate from edict proofs: a conversation, generic sip animation,
// decorative tea set or old audience document can never certify this service.
export function validatePalaceTeaProof(input,role=ROLE){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,person=id=>typeof id==='string'&&/^cn-[a-z0-9-]{1,60}$/.test(id);
 if(role.id!==ROLE.id||role.slotId!==ROLE.slotId||role.amount!==ROLE.amount||role.contractVersion!==ROLE.contractVersion||role.employer!==ROLE.employer||role.currency!==ROLE.currency||!input||input.kind!=='npc-palace-tea-piecework'||input.version!==1||!person(input.actorId)||input.roleId!==ROLE.id||input.slotId!==ROLE.slotId||!integer(input.holderRevision)||!integer(input.day)||!PALACE_TEA_GUESTS.includes(input.guestId)||input.requestId!==palaceTeaRequestId(input.guestId,input.day)||typeof input.visitId!=='string'||!input.visitId||input.visitId.length>160||input.cupId!==input.requestId+':cup'||input.trayId!==input.requestId+':tray'||input.amount!==ROLE.amount||input.contractVersion!==ROLE.contractVersion||!Array.isArray(input.steps)||input.steps.length!==PALACE_TEA_STEPS.length||!input.steps.every((step,i)=>step===PALACE_TEA_STEPS[i])||Object.keys(input).sort().join(',')!=='actorId,amount,contractVersion,cupId,day,guestId,holderRevision,kind,requestId,roleId,slotId,steps,trayId,version,visitId')throw Error('invalid-npc-palace-tea-proof');
 return structuredClone(input);
}
