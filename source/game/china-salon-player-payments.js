// Player work is a separate, full-fee earned-income destination. It never
// changes the original artists' 50:50 agreement or the spendable tavern till.
import {salonCareerRole} from './china-salon-career-role.js';
import {salonServiceProofValid} from './china-salon-career-services.js';
export const PLAYER_SALON_POLICY=Object.freeze({version:2,performerShareBps:10000,rounding:'floor',recipient:'player-bank'});
export function playerSalonEvidence(e,r){
 const o=e?.service,role=salonCareerRole(o?.roleId);
 if(e?.kind!=='player-salon-service'||e.completed!==true||!role||o.stage!=='ready'||o.id!==r.orderId||o.customerId!==r.actorId||o.fee!==r.amount||role.activity!==r.activity||o.customerKind!=='official'||!salonServiceProofValid(o,role))return null;
 if(role.activity==='poetry'&&o.recitedSeconds!==8||role.activity==='story'&&o.narratedSeconds!==8||role.activity==='music'&&o.performedSeconds!==o.beats.reduce((s,b)=>s+(b==='long'?2:1),0))return null;
 return {kind:'player-salon-service',completed:true,service:JSON.parse(JSON.stringify(o))};
}
