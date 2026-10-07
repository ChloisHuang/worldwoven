import {isSociallyHeld} from './npc-social-ownership.js';
import {PHARMACY_ASSISTANT_ROLE,CLINIC_PHYSICIAN_ROLE} from './formal-careers.js';
import {clinicNPCWageReceipt} from './china-clinic-npc-economy.js';
import {CHINA_CLINIC as C} from './china-clinic.js';
import {GAME_MINUTES_PER_SECOND as RATE} from './simulation-clock.js';
const roles=[CLINIC_PHYSICIAN_ROLE,PHARMACY_ASSISTANT_ROLE],copy=structuredClone;
const key=(id,role,day)=>JSON.stringify([id,role,day]);
const minute=seconds=>600+seconds*RATE;
const validHolder=(r,role,n)=>r?.roleId===role.id&&r.slotId===role.slotId&&r.status==='npc'&&r.holderId===n?.station?.id&&r.available===true&&r.alive===true&&Number.isSafeInteger(r.revision)&&r.revision>=0&&n.alive!==false;
// Read-only: a resolver naming another person never grants control of them.
export function clinicNPCCoverage({doctor,assistant,getHolder,isPlayerHired,conversationActorId=null,order=null,meeting=false,hasActor=()=>true}){
 return roles.flatMap((role,i)=>{
  const n=i?assistant:doctor,r=getHolder?.(role.id),p=n?.root?.position;
  if(!n||!hasActor(n)||!validHolder(r,role,n)||isPlayerHired?.(role.id)||isSociallyHeld(n.station.id,conversationActorId)||!p)return [];
  const inside=p.x>=C.bounds.minX&&p.x<=C.bounds.maxX&&p.z>=C.bounds.minZ&&p.z<=C.bounds.maxZ&&p.y>=C.floorY-.3&&p.y<=C.clinicFloorY+.4;
  const home=i?C.points.assistant:meeting?C.points.doctorHandoff:C.points.doctor;
  const atPost=Math.hypot(p.x-home[0],p.z-home[2])<.15&&Math.abs(p.y-home[1])<.3;
  const working=order&&!['complete','cancelled'].includes(order.stage)&&(i?order.worker!=='player':order.physician!=='player');
  if(!inside||!atPost&&!working)return [];
  return [{actorId:r.holderId,roleId:role.id,slotId:role.slotId,holderRevision:r.revision}];
 });
}
// This observer does not settle money or start a clock. Only adjacent loaded
// simulation samples can add coverage; snapshots intentionally omit anchors.
export function createClinicNPCDutyObserver({saved,saveState=()=>false}={}){
 let rows=[],last=null,loadError=null,dirty=false;
 try{if(saved!=null){if(saved.version!==1||!Array.isArray(saved.rows))throw Error('invalid-clinic-duty-observer');rows=copy(saved.rows);const seen=new Set();for(const r of rows){const role=roles.find(v=>v.id===r.roleId),id=key(r.actorId,r.roleId,r.day);if(!role||r.kind!=='clinic-npc-duty'||r.slotId!==role.slotId||!/^cn-[a-z0-9-]{1,60}$/.test(r.actorId)||!Number.isSafeInteger(r.day)||r.day<0||typeof r.closed!=='boolean'||seen.has(id)||!Array.isArray(r.segments)||!r.segments.length||!Array.isArray(r.reviews))throw Error('invalid-clinic-duty-observer');seen.add(id);let end=6;for(const s of r.segments){if(!Number.isFinite(s.startHour)||!Number.isFinite(s.endHour)||s.startHour<end||s.endHour<=s.startHour||s.endHour>18||!Number.isSafeInteger(s.holderRevision)||s.holderRevision<0)throw Error('invalid-clinic-duty-observer');end=s.endHour;}clinicNPCWageReceipt({...r,closed:true});}}}catch(e){rows=[];loadError=e.message;}
 let rowIndex=new Map(),openRows=new Set();const reindex=()=>{rowIndex=new Map(rows.map(r=>[key(r.actorId,r.roleId,r.day),r]));openRows=new Set(rows.filter(r=>!r.closed));};reindex();
 const snapshot=()=>({version:1,rows:copy(rows)});
 function persist(next){try{const result=saveState({version:1,rows:copy(next)});return result!==false&&result?.ok!==false&&!result?.then;}catch{return false;}}
 return {get loadError(){return loadError;},snapshot,
  observe({seconds,dt,coverage=[]}){
   if(loadError)return false;
   const now=Number.isFinite(seconds)&&seconds>=0?seconds:null;
   const valid=coverage.filter(v=>roles.some(r=>v.roleId===r.id&&v.slotId===r.slotId)&&/^cn-[a-z0-9-]{1,60}$/.test(v.actorId)&&Number.isSafeInteger(v.holderRevision)&&v.holderRevision>=0);
   const previous=last;last=now===null?null:{seconds:now,coverage:copy(valid)};
   if(!previous||now===null||!Number.isFinite(dt)||dt<=0||dt>.25||Math.abs(now-previous.seconds-dt)>1e-7)return false;
   for(const c of valid){if(!previous.coverage.some(p=>JSON.stringify(p)===JSON.stringify(c)))continue;
    const start=minute(previous.seconds),finish=minute(now);
    for(let day=Math.floor(start/1440);day<=Math.floor(finish/1440);day++){
     const a=Math.max(start,day*1440+360),b=Math.min(finish,day*1440+1080);if(b<=a)continue;
     let row=rowIndex.get(key(c.actorId,c.roleId,day));if(row?.closed)continue;
     row??=(()=>{const r={kind:'clinic-npc-duty',closed:false,actorId:c.actorId,roleId:c.roleId,slotId:c.slotId,day,segments:[],reviews:[]};rows.push(r);rowIndex.set(key(r.actorId,r.roleId,r.day),r);openRows.add(r);return r;})();
     const s={startHour:(a-day*1440)/60,endHour:(b-day*1440)/60,holderRevision:c.holderRevision},tail=row.segments.at(-1);
     if(tail&&tail.holderRevision===s.holderRevision&&Math.abs(tail.endHour-s.startHour)<1e-9)tail.endHour=s.endHour;else row.segments.push(s);dirty=true;
    }
   }return true;
  },
  recordPatient(receipt){
   if(loadError)return false;const row=rowIndex.get(key(receipt?.actorId,receipt?.roleId,receipt?.day));if(!row)return false;
   const old=row.reviews.find(r=>r.orderId===receipt.orderId);let verified;
   try{verified=clinicNPCWageReceipt({...row,closed:true,reviews:[receipt]}).evidence.reviews[0];}catch{return false;}
   if(old)return JSON.stringify(old)===JSON.stringify(verified);if(row.closed)return false;
   const next=copy(rows),target=next.find(r=>key(r.actorId,r.roleId,r.day)===key(row.actorId,row.roleId,row.day));target.reviews.push(verified);
   if(!persist(next))return false;rows=next;reindex();dirty=false;return true;
  },
  dutyClosed:r=>rowIndex.get(key(r?.actorId,r?.roleId,r?.day))?.closed===true,hasDuty:r=>rowIndex.has(key(r?.actorId,r?.roleId,r?.day)),openDuties:()=>[...openRows].map(r=>({actorId:r.actorId,roleId:r.roleId,day:r.day})),closedDuties:()=>rows.filter(r=>r.closed).map(r=>copy(r)),
  suspend(){last=null;},flush(){if(!dirty)return true;if(!persist(rows))return false;dirty=false;return true;},
  // A caller must first reconcile every original pending patient order. This
  // deliberately has no automatic day-rollover payout while evidence is open.
  seal({actorId,roleId,day,currentDay,currentHour=0,pendingOrders=true}){
   if(loadError||pendingOrders||!Number.isSafeInteger(currentDay)||(day>currentDay||day===currentDay&&currentHour<18))return null;
   const row=rowIndex.get(key(actorId,roleId,day));if(!row)return null;if(row.closed)return copy(row);
   const next=copy(rows),target=next.find(r=>key(r.actorId,r.roleId,r.day)===key(actorId,roleId,day));target.closed=true;if(!persist(next))return null;rows=next;reindex();dirty=false;return copy(target);
  }
 };
}
