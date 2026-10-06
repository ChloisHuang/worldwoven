import {PALACE_HERALD_ROLE as R} from './china-palace-herald-role.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const deliverySteps=()=>({collectedSeconds:0,approvalSeconds:0,sealedSeconds:0,readingSeconds:0,responseSeconds:0,handoffSeconds:0,received:false});
export function heraldContract(identity,actorId,holderRevision,authorId,authorRevision,recipientId,recipientRevision,emperorId){return {kind:'npc-edict-delivery-piecework',version:1,actorId,roleId:R.id,slotId:R.slotId,holderRevision,documentId:identity.id,audienceId:identity.audienceId,day:identity.day,amount:R.amount,contractVersion:R.contractVersion,steps:deliverySteps(),authorId,authorRevision,recipientId,recipientRevision,emperorId,approvedBy:null,sealedBy:null,holder:'scribe-desk'};}
export function deliveryBase(p){return {...p,steps:deliverySteps(),approvedBy:null,sealedBy:null,holder:'scribe-desk'};}
export function validDeliveryCheckpoint(ledger,runtime,order){
 const p=order.heraldPiecework,c=ledger.heraldContract;if(p==null)return c==null;
 const expected=heraldContract(order,runtime.heraldId||'cn-palace-herald',runtime.heraldRevision??0,runtime.scribeId||'cn-calligraphy',runtime.scribeRevision??0,runtime.recipientId||'cn-garden',runtime.holderRevision??0,runtime.emperorId||'cn-emperor');
 if(order.heraldId!==expected.actorId||order.heraldRevision!==expected.holderRevision)return false;
 if(!same(c,expected)||!same(deliveryBase(p),c))return false;
 const stages=['preparing','drafting','await-pickup','scribe-handoff','to-approval','approval','to-seal','seal-place','sealing','seal-pickup','to-recipient','await-recipient','reading','response','recipient-handoff','to-work','file-receipt','to-sweep','sweeping','returning'];
 const i=stages.indexOf(order.stage),elapsed=runtime.phaseTime;if(i<0||!Number.isFinite(elapsed)||elapsed<0)return false;
 const seconds=(stage,max)=>i>stages.indexOf(stage)?max:order.stage===stage?Math.min(max,elapsed):0;
 const steps={collectedSeconds:seconds('scribe-handoff',2),approvalSeconds:seconds('approval',4),sealedSeconds:seconds('sealing',2.2),readingSeconds:seconds('reading',6),responseSeconds:seconds('response',3),handoffSeconds:seconds('recipient-handoff',1.3),received:i>=15};
 const approved=i>=6?c.emperorId:null,sealed=i>=9?c.actorId:null;
 // The fee's delivery proof stops with the original recipient; later filing
 // moves the physical paper into its basket without rewriting paid evidence.
 const physicalHolder=i<=2?'scribe-desk':i===3||i===14?'transfer':i===8||i===9?'seal-stand':i>=17?'basket':i>=15?'recipient':'herald';
 if(order.holder!==physicalHolder)return false;
 const holder=i>=15?'recipient':order.holder;
 return same(p.steps,steps)&&p.approvedBy===approved&&p.sealedBy===sealed&&p.holder===holder&&order.approvedBy===(approved||undefined)&&order.sealed===(i>=9);
}
