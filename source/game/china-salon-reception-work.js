import {SALON_RECEPTION_ROLE as ROLE} from './china-salon-reception-role.js';
import {validateReceptionProof} from './china-salon-reception-proof.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const names=['register','reserve','close'];
// This state belongs to the original session, not a second service controller.
// The live salon supplies physical presence/pose and original phase evidence.
export function createReceptionWork(session,assignment){
 if(assignment?.holderId!==ROLE.incumbentId||!Number.isSafeInteger(assignment.revision)||assignment.revision<0||assignment.available!==true||assignment.alive!==true)return null;
 return {version:1,sessionId:session.id,actorId:assignment.holderId,holderRevision:assignment.revision,roleId:ROLE.id,slotId:ROLE.slotId,contractVersion:ROLE.contractVersion,amount:ROLE.amount,customerId:session.customerId||'player',artistId:session.actorId,activity:session.activity,fee:session.fee,cardId:'salon-reception-card:'+session.id,roomId:null,phase:'register',seconds:0,steps:{registerSeconds:0,reserveSeconds:0,closeSeconds:0}};
}
export function receptionWorkValid(work,session){
 if(!work||work.version!==1||work.sessionId!==session.id||work.actorId!==ROLE.incumbentId||work.roleId!==ROLE.id||work.slotId!==ROLE.slotId||work.contractVersion!==ROLE.contractVersion||work.amount!==ROLE.amount||!Number.isSafeInteger(work.holderRevision)||work.holderRevision<0||work.customerId!==(session.customerId||'player')||work.artistId!==session.actorId||work.activity!==session.activity||work.fee!==session.fee||work.cardId!=='salon-reception-card:'+session.id||work.roomId!==(work.steps?.reserveSeconds===2?session.roomId:null)||!['register','reserve','close','completed'].includes(work.phase)||!Number.isFinite(work.seconds)||work.seconds<0||work.seconds>2||!work.steps||Object.keys(work.steps).length!==3)return false;
 for(const k of names)if(![0,2].includes(work.steps[k+'Seconds']))return false;
 if(session.stage){const registered=work.steps.registerSeconds===2,reserved=work.steps.reserveSeconds===2,closed=work.steps.closeSeconds===2;if(session.stage==='invited'&&(reserved||closed)||session.stage==='reply'&&(!registered||reserved||closed)||session.stage==='accepted'&&(!registered||closed)||['escort','entering'].includes(session.stage)&&(!registered||!reserved||closed)||session.stage==='fade'&&(!registered||!reserved)||session.stage==='visiting'&&(!registered||!reserved||!closed))return false;}
 const done=names.filter(k=>work.steps[k+'Seconds']===2).length;
 return names.every((k,i)=>(work.steps[k+'Seconds']===2)===(i<done))&&work.phase===(names[done]||'completed')&&(work.phase!=='completed'||work.seconds===0);
}
export function advanceReceptionWork(work,session,kind,dt,{present=false,posed=false,assignment=null,sourceValid=false}={}){
 if(!receptionWorkValid(work,session)||work.phase!==kind||!present||!posed||!sourceValid||assignment?.holderId!==work.actorId||assignment.revision!==work.holderRevision||assignment.available!==true||assignment.alive!==true||!Number.isFinite(dt)||dt<=0)return false;
 work.seconds=Math.min(2,work.seconds+Math.min(.1,dt));
 if(work.seconds<2-1e-9)return false;
 work.steps[kind+'Seconds']=2;work.seconds=0;
 if(kind==='reserve')work.roomId=session.roomId;
 work.phase=names[names.indexOf(kind)+1]||'completed';return true;
}
export function receptionWorkProof(work,session){
 if(!receptionWorkValid(work,session)||work.phase!=='completed')return null;
 try{return validateReceptionProof({kind:'salon-reception-work',version:1,sessionId:session.id,actorId:work.actorId,roleId:work.roleId,slotId:work.slotId,holderRevision:work.holderRevision,contractVersion:work.contractVersion,amount:work.amount,customerId:work.customerId,artistId:work.artistId,activity:work.activity,fee:work.fee,roomId:work.roomId,steps:copy(work.steps),completed:true});}catch{return null;}
}
