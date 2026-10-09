import {createJapanBedding} from './japan-bedding.js';
import {createJapanBoilerMaintenance} from './japan-boiler-maintenance.js';
import {JAPAN_TABLE_SERVICE_TIMELY_SECONDS} from './japan-table-service-role.js';
import {JAPAN_KITCHEN_TIMELY_SECONDS} from './japan-kitchen-role.js';
import {JAPAN_BATH_MIXING_TIMELY_SECONDS} from './japan-bath-mixing-role.js';
import {JAPAN_BATH_DELIVERY_TIMELY_SECONDS} from './japan-bath-delivery-role.js';
// Durable visit/order ledger. Walking, animation, elapsed work and seat locks
// belong to the scene adapter; a timer alone can never deliver an order here.
export const JAPAN_SERVICE_POINTS = Object.freeze({
 arrival:[0,0,35], departure:[0,0,36.5],
 reception:[-4.22,0,5.7], registrar:[-5.4,0,5.7], tokenTray:[-5.65,1.17,6.48],
 receptionLedger:[-5.39,1.191,6.37],
 playerReception:[-4.2,0,4.8],
 apothecary:[-5.25,11.4,-1.6], apothecaryPickup:[-4.35,11.4,-2.6], mixtureTray:[-5.0,12.60,-2.15],
 blendWork:[-5.20,12.60,-2.10],
 kitchen:[2.1,0,-12.15], kitchenPickup:[3.35,0,-12.15], mealTray:[3.35,1.20,-13.4],
 sushiKitchen:[-6.6,0,-12.15], sushiPickup:[-5.35,0,-12.15], sushiTray:[-5.35,1.20,-13.65],
 sushiCounter:[-6,0,-.25], ramenCounter:[4.1,0,5.7],
 menService:[-4.2,3.8,-2.16], womenService:[1.35,3.8,-2.16],
 menReceive:[-3.3,3.8,-2.16], womenReceive:[2.25,3.8,-2.16],
 menChanging:[-9.92,3.8,2.4], womenChanging:[5.15,3.8,2.4],
 menWashing:[-9.15,3.8,-3.7], womenWashing:[3,3.8,-4.4],
});
export const JAPAN_LINEN_POINTS=Object.freeze({
 wash:[4.3,11.4,5.95],hang:[5.2,11.4,2.4],take:[5.2,11.4,2.4],
 fold:[8.6,11.4,3.85],restock:[8.6,11.4,3.85],registry:[5,11.4,3.9],host:[6.2,11.4,4.2],
});
export const JAPAN_LINEN_DRY_SECONDS=8;
const LINEN_STAGES=['clean','issued','dirty','collected','wet','drying','dry','folded'];
const newLinen=n=>({id:`jp-linen-${n}`,cycle:0,stage:'clean',visitId:null,customerName:null,side:null,location:{type:'point',id:'restock'},carryOwner:null,dryingElapsed:0});
export const JAPAN_RECEPTION_RADIUS=.34;
// These are invented bathhouse blends, with no medical claims or real recipes.
export const JAPAN_BATH_BLENDS = Object.freeze([
 {id:'cloud-leaf',name:'云叶浴包',color:0x819c76},
 {id:'lantern-petal',name:'灯花浴包',color:0xc79080},
]);
export const JAPAN_DINING_MENU=Object.freeze([
 {id:'sushi',name:'寿司拼盘',price:8,currency:'japan',counter:'sushiCounter'},
 {id:'ramen',name:'热汤拉面',price:6,currency:'japan',counter:'ramenCounter'},
]);
// Bath duty follows the assigned service side, not a resident's appearance.
export const JAPAN_BATH_CREWS = Object.freeze({men:['jp-onsen','jp-steam'],women:['jp-women-onsen','jp-rest']});
export const JAPAN_SERVICE_WORKERS = Object.freeze({
 register:['jp-welcome','jp-market-tea'], prepare:['jp-incense','jp-herb-workshop'],
 deliverMix:Object.values(JAPAN_BATH_CREWS).flat(), cook:['jp-ramen','jp-sushi'],
 serve:['jp-sushi','jp-ramen'], wash:['jp-sushi','jp-ramen'], checkout:['jp-welcome','jp-market-tea'],
});
// These residents share staff facilities, never customer-order permissions.
export const JAPAN_LOCAL_WORKERS=Object.freeze(['jp-omamori','jp-garden-onsen','jp-tea','jp-balcony']);
export const JAPAN_STAFF_CREW=Object.freeze(['jp-ramen','jp-sushi','jp-welcome','jp-market-tea','jp-incense','jp-herb-workshop','jp-onsen','jp-steam','jp-women-onsen','jp-rest',...JAPAN_LOCAL_WORKERS]);
const STAFF_MEALS=JAPAN_STAFF_CREW;
// One bounded role map gates existing jobs; it never creates a second queue.
export const JAPAN_PLAYER_DUTIES=Object.freeze({
 tableService:{kinds:['serve','wash'],workers:['jp-ramen','jp-sushi'],receiptPrefix:'jp-table-service-labor-'},
 kitchen:{kinds:['cook'],workers:['jp-sushi','jp-ramen'],receiptPrefix:'jp-kitchen-labor-'},
 mixing:{kinds:['prepare'],workers:['jp-incense','jp-herb-workshop'],receiptPrefix:'jp-bath-mixing-labor-'},
 reception:{kinds:['register','checkout'],workers:['jp-welcome','jp-market-tea'],receiptPrefix:'jp-reception-labor-'},
 menDelivery:{kinds:['deliverMix'],side:'men',workers:JAPAN_BATH_CREWS.men,receiptPrefix:'jp-bath-delivery-labor-'},
 womenDelivery:{kinds:['deliverMix'],side:'women',workers:JAPAN_BATH_CREWS.women,receiptPrefix:'jp-women-bath-delivery-labor-'},
});
const clone=value=>JSON.parse(JSON.stringify(value));
const active=v=>!['departed','cancelled'].includes(v.stage);
const near=(p,q,r=.34)=>Array.isArray(p)&&Array.isArray(q)&&p.length===3&&p.every(Number.isFinite)&&Math.hypot(p[0]-q[0],p[2]-q[2])<=r&&Math.abs(p[1]-q[1])<.4;
const service=v=>v.side==='men'?'menService':'womenService';
// Menu arrival, registration and the registrar's physical handover agree on
// this legal counter area; a visitor must never need a second centimetre-step.
export function japanReceptionReady(position,customerType='player') {
 const p=Array.isArray(position)?position:position&&[position.x,position.y,position.z];
 return near(p,JAPAN_SERVICE_POINTS[customerType==='player'?'playerReception':'reception'],JAPAN_RECEPTION_RADIUS);
}
const mealSource=v=>v.dishId==='sushi'?'sushiPickup':'kitchenPickup';
const sourceOf=item=>item.dirty?'dining':item.kind==='mixture'?'apothecaryPickup':item.kind==='meal'?mealSource(item):'reception';

export function createJapanServiceOrders({saved={},worldSeed=1,saveState=()=>{},capacity=2,preservePhysical=false,onRelationshipEvent=()=>false,getRelationshipTime=()=>0}={}) {
 const state={version:1,worldSeed:worldSeed>>>0,nextVisit:1,completed:0,cancelled:0,visits:[],items:[],diningReceipts:[],playerMealReceipts:[],receptionReceipts:[],receptionWaits:{},deliveryReceipts:[],deliveryWaits:{},mixingReceipts:[],mixingWaits:{},kitchenReceipts:[],kitchenWaits:{},tableReceipts:[],tableWaits:{},linens:Array.from({length:6},(_,n)=>newLinen(n+1)),linenReceipts:[],relationshipEvents:[]};
 if(saved?.version===1&&saved.worldSeed===(worldSeed>>>0)) {
  state.relationshipEvents=clone(saved.relationshipEvents||[]);
  state.linenReceipts=clone((saved.linenReceipts||[]).slice(-240));
  for(let n=0;n<6;n++){
   const old=(saved.linens||[]).find(l=>l.id===`jp-linen-${n+1}`);
   if(old&&LINEN_STAGES.includes(old.stage)&&Number.isSafeInteger(old.cycle)&&old.cycle>=0){
    const linen=clone(old);linen.dryingElapsed=Math.max(0,Math.min(JAPAN_LINEN_DRY_SECONDS,Number(linen.dryingElapsed)||0));
    if(!preservePhysical){linen.carryOwner=null;if(linen.location?.type==='worker')linen.location={type:'point',id:linen.station||'restock'};}
    state.linens[n]=linen;
   }
  }
  state.nextVisit=Math.max(1,Number.isSafeInteger(saved.nextVisit)?saved.nextVisit:1);
  state.completed=Math.max(0,saved.completed|0);state.cancelled=Math.max(0,saved.cancelled|0);
  state.diningReceipts=clone((saved.diningReceipts||[]).slice(-24));
  state.playerMealReceipts=clone((saved.playerMealReceipts||[]).slice(-1));
  state.tableReceipts=clone((saved.tableReceipts||[]).slice(-240));state.tableWaits=clone(saved.tableWaits||{});
  state.kitchenReceipts=clone((saved.kitchenReceipts||[]).slice(-240));state.kitchenWaits=clone(saved.kitchenWaits||{});
  state.mixingReceipts=clone((saved.mixingReceipts||[]).slice(-240));state.mixingWaits=clone(saved.mixingWaits||{});
  state.deliveryReceipts=clone((saved.deliveryReceipts||[]).slice(-240));state.deliveryWaits=clone(saved.deliveryWaits||{});
  state.receptionReceipts=clone((saved.receptionReceipts||[]).slice(-240));state.receptionWaits=clone(saved.receptionWaits||{});
  state.visits=clone((saved.visits||[]).filter(v=>(active(v)||v.mealConsumed&&!v.mealWashed)&&typeof v.id==='string'));
  const ids=new Set(state.visits.map(v=>v.id));
  state.items=clone((saved.items||[]).filter(i=>ids.has(i.visitId)));
  // A carrier and a bath reservation are scene-local. Restore the exact same
  // visit and order, returning an interrupted carried tray to its source.
  for(const item of state.items)if(!preservePhysical&&item.location?.type==='worker')item.location={type:'point',id:sourceOf(item)};
  for(const v of state.visits) {
   if(!preservePhysical&&v.stage==='bathing')v.stage='waiting-bath';
   if(!preservePhysical){if(v.customerType==='player')v.present=false;v.seatId=null;}
   state.nextVisit=Math.max(state.nextVisit,(v.number||0)+1);
  }
 }
 // A separate stable taste draw is independent of appearance and bath side.
 const diningTaste=id=>{let h=2166136261;for(const c of `japan-meal-taste:${state.worldSeed}:${id}`)h=Math.imul(h^c.charCodeAt(0),16777619);const sushi=((h>>>0)+.5)/4294967296;return {sushi,ramen:1-sushi};};
 const visits=new Map(state.visits.map(v=>[v.id,v])),items=new Map(state.items.map(i=>[i.id,i]));
 const claims=new Map(),workers=new Map(),resources=new Map(),staffResources=new Map();
 let disposed=false;const staffDuties=new Map();
 const dutyKey=job=>Object.keys(JAPAN_PLAYER_DUTIES).find(key=>{const spec=JAPAN_PLAYER_DUTIES[key];return spec.kinds.includes(job.kind)&&(!spec.side||spec.side===job.side);});
 const matchesDuty=(job,key)=>dutyKey(job)===key;
 const snapshot=()=>({...clone(state),claims:[...claims.values()].map(clone),staffDuties:Object.fromEntries(staffDuties)});
 // Pending events are saved with their source mutation before delivery. A failed
 // receiver remains in the outbox; a successful receiver deduplicates replay by id.
 const acknowledged=new Set();
 const replayRelationships=()=>{for(const event of state.relationshipEvents)if(!acknowledged.has(event.id)){try{const result=onRelationshipEvent(clone(event));if(result?.ok===true&&!result?.then)acknowledged.add(event.id);}catch{}}};
 const persist=()=>{state.relationshipEvents=state.relationshipEvents.filter(e=>!acknowledged.has(e.id));try{const result=saveState(snapshot());if(result===false||result?.then)return false;replayRelationships();return true;}catch{return false;}};
 const relationship=(v,kind,actorId,participants,outcome='completed',suffix='')=>{
  const id=`japan-service:${v.id}:${kind}:${outcome}${suffix}`;
  if(!state.relationshipEvents.some(e=>e.id===id))state.relationshipEvents.push({id,source:'japan-service',outcome,actorId,participants:[...new Set([actorId,...participants])],kind:'service',serviceKind:kind,...(kind==='wrong-table'?{fault:true}:{}),at:Math.max(0,Number(getRelationshipTime())||0)});
 };
 const boiler=createJapanBoilerMaintenance({saved:saved?.version===1&&saved.worldSeed===(worldSeed>>>0)?saved.boilerMaintenance:null,saveState:next=>{const prior=state.boilerMaintenance;state.boilerMaintenance=next;if(persist())return true;state.boilerMaintenance=prior;return false;}});
 state.boilerMaintenance=boiler.snapshot();
 const bedding=createJapanBedding({worldSeed,saved:saved?.version===1&&saved.worldSeed===(worldSeed>>>0)?saved.bedding:null,authorized:(actor,evidence)=>linenAuthorized(actor,evidence),saveState:next=>{const prior=state.bedding;state.bedding=next;if(persist())return true;state.bedding=prior;return false;}});
 state.bedding=bedding.snapshot();
 replayRelationships();
 const receptionKind=kind=>['register','checkout'].includes(kind);
 const receptionReceipt=(job,v,outcome)=>{
  const workReceiptId=staffDuties.get('reception')?.receiptId;if(!workReceiptId||v.customerType==='player')return;
  const id=`${v.id}-${job.kind}-${workReceiptId}`;if(state.receptionReceipts.some(r=>r.id===id))return;
  const waitSeconds=state.receptionWaits[job.id]||0,completed=outcome!=='handoff';
  state.receptionReceipts.push({source:'japan-reception',id,workReceiptId,visitId:v.id,number:v.number,customerId:v.id,customerName:v.name,kind:job.kind,tokenId:v.tokenId||`${v.id}:token`,outcome:completed?(waitSeconds<=60?'completed':'late'):'handoff',waitSeconds,completed,accurate:completed,timely:waitSeconds<=60});
  state.receptionReceipts=state.receptionReceipts.slice(-240);
 };
 const deliveryReceipt=(job,v,outcome)=>{
  const workReceiptId=staffDuties.get(dutyKey(job))?.receiptId;if(!workReceiptId||v.customerType==='player')return;
  const id=`${v.id}-deliverMix-${workReceiptId}`;if(state.deliveryReceipts.some(r=>r.id===id))return;
  const waitSeconds=state.deliveryWaits[job.id]||0,completed=outcome!=='handoff',timely=waitSeconds<=JAPAN_BATH_DELIVERY_TIMELY_SECONDS;
  state.deliveryReceipts.push({source:'japan-bath-delivery',id,workReceiptId,visitId:v.id,number:v.number,customerId:v.id,customerName:v.name,kind:'deliverMix',tokenId:v.tokenId,itemId:job.itemId,side:v.side,outcome:completed?(timely?'completed':'late'):'handoff',waitSeconds,completed,accurate:completed,timely});
  state.deliveryReceipts=state.deliveryReceipts.slice(-240);
 };
 const mixingReceipt=(job,v,outcome)=>{
  const workReceiptId=staffDuties.get('mixing')?.receiptId;if(!workReceiptId||v.customerType==='player')return;
  const id=`${v.id}-prepare-${workReceiptId}`;if(state.mixingReceipts.some(r=>r.id===id))return;
  const waitSeconds=state.mixingWaits[job.id]||0,completed=outcome!=='handoff',timely=waitSeconds<=JAPAN_BATH_MIXING_TIMELY_SECONDS;
  state.mixingReceipts.push({source:'japan-bath-mixing',id,workReceiptId,visitId:v.id,number:v.number,customerId:v.id,customerName:v.name,kind:'prepare',tokenId:v.tokenId,itemId:`${v.id}:mixture`,blendId:v.blendId,side:v.side,outcome:completed?(timely?'completed':'late'):'handoff',waitSeconds,completed,accurate:completed,timely});state.mixingReceipts=state.mixingReceipts.slice(-240);
 };
 const kitchenReceipt=(job,v,outcome)=>{
  const workReceiptId=staffDuties.get('kitchen')?.receiptId;if(!workReceiptId||v.customerType==='player')return;
  const id=`${v.id}-cook-${workReceiptId}`;if(state.kitchenReceipts.some(r=>r.id===id))return;
  const waitSeconds=state.kitchenWaits[job.id]||0,completed=outcome!=='handoff',timely=waitSeconds<=JAPAN_KITCHEN_TIMELY_SECONDS;
  state.kitchenReceipts.push({source:'japan-kitchen',id,workReceiptId,visitId:v.id,number:v.number,customerId:v.id,customerName:v.name,kind:'cook',tokenId:v.tokenId,itemId:`${v.id}:meal`,dishId:v.dishId||'ramen',outcome:completed?(timely?'completed':'late'):'handoff',waitSeconds,completed,accurate:completed,timely});state.kitchenReceipts=state.kitchenReceipts.slice(-240);
 };
 const tableReceipt=(job,v,outcome,target=v)=>{
  const workReceiptId=staffDuties.get('tableService')?.receiptId;if(!workReceiptId||v.customerType==='player'||outcome==='completed'&&v.servedWorkReceiptId!==workReceiptId)return;
  const complaint=outcome==='rejected',attempt=complaint?(v.tableAttempts||0)+1:undefined;
  const id=complaint?`${v.id}-complaint-${attempt}-${workReceiptId}`:`${v.id}-serve-${workReceiptId}`;
  if(state.tableReceipts.some(r=>r.id===id))return;
  const waitSeconds=state.tableWaits[v.id+':serve']||0,completed=!complaint&&outcome!=='handoff',timely=waitSeconds<=JAPAN_TABLE_SERVICE_TIMELY_SECONDS;
  state.tableReceipts.push({source:'japan-table-service',id,workReceiptId,visitId:v.id,number:v.number,customerId:v.id,customerName:complaint?target.name:v.name,kind:complaint?'complaint':'serve',tokenId:v.tokenId,itemId:v.mealId||`${v.id}:meal`,dishId:v.dishId||'ramen',targetVisitId:target.id,...(complaint?{attempt,reasonCode:target.dishId!==v.dishId?'wrong-dish':'wrong-table'}:{}),outcome:complaint?'rejected':completed?(timely?'completed':'late'):'handoff',waitSeconds,completed,accurate:completed,timely});
  if(complaint)v.tableAttempts=attempt;state.tableReceipts=state.tableReceipts.slice(-240);
 };
 const playerReceipt=(job,v,outcome)=>matchesDuty(job,'tableService')?(job.kind==='wash'||outcome==='handoff'?tableReceipt(job,v,outcome):null):matchesDuty(job,'kitchen')?kitchenReceipt(job,v,outcome):matchesDuty(job,'reception')?receptionReceipt(job,v,outcome):['menDelivery','womenDelivery'].includes(dutyKey(job))?deliveryReceipt(job,v,outcome):matchesDuty(job,'mixing')?mixingReceipt(job,v,outcome):null;
 function transaction(change){
  const prior=clone(state),leases=[...claims].map(([k,v])=>[k,clone(v)]),workerLeases=[...workers],resourceLeases=[...resources],duties=[...staffDuties];
  change();if(persist())return true;restoreBoard(prior);claims.clear();for(const [k,v]of leases)claims.set(k,v);workers.clear();for(const [k,v]of workerLeases)workers.set(k,v);resources.clear();for(const [k,v]of resourceLeases)resources.set(k,v);staffDuties.clear();for(const [k,v]of duties)staffDuties.set(k,v);return false;
 }
 function setStaffDuty(key,receiptId,status='draining'){
  const spec=JAPAN_PLAYER_DUTIES[key],prior=staffDuties.get(key);
  if(disposed||!spec||typeof receiptId!=='string'||!receiptId.startsWith(spec.receiptPrefix)||!(/^[1-9][0-9]*$/).test(receiptId.slice(spec.receiptPrefix.length))||!['draining','active'].includes(status)||prior&&prior.receiptId!==receiptId||[...staffDuties.keys()].some(k=>k!==key))return false;
  if(status==='active'&&[...claims.values()].some(j=>matchesDuty(j,key)&&j.workerId!=='player'))return false;
  staffDuties.set(key,{receiptId,status});return true;
 }
 function releaseStaffDuty(key,receiptId,{evaluate=false}={}){
  const duty=staffDuties.get(key);if(!duty||duty.receiptId!==receiptId)return true;
  return transaction(()=>{if(evaluate)for(const job of jobs().filter(j=>matchesDuty(j,key)))playerReceipt(job,visit(job.visitId),'handoff');dropClaim(workers.get('player'));staffDuties.delete(key);});
 }
 function tickStaffDuty(key,dt){if(staffDuties.get(key)?.status==='active')for(const j of jobs().filter(j=>matchesDuty(j,key)&&visit(j.visitId)?.customerType!=='player')){const waits=key==='reception'?state.receptionWaits:key==='mixing'?state.mixingWaits:key==='kitchen'?state.kitchenWaits:key==='tableService'?state.tableWaits:state.deliveryWaits;waits[j.id]=(waits[j.id]||0)+Math.max(0,Math.min(.1,dt));}}
 function restoreBoard(prior){Object.assign(state,prior);boiler.restore(prior.boilerMaintenance,{preserveDuty:true});bedding.restore(prior.bedding);visits.clear();for(const v of state.visits)visits.set(v.id,v);items.clear();for(const i of state.items)items.set(i.id,i);}
 const visit=id=>visits.get(id);
 const item=id=>items.get(id);
 const addItem=(v,kind,location)=>{
  const result={id:`${v.id}:${kind}`,visitId:v.id,tokenId:v.tokenId,kind,blendId:v.blendId,dishId:v.dishId||'ramen',location};
  items.set(result.id,result);state.items.push(result);return result;
 };
 const descriptor=(v,kind,from,to,resource,extra={})=>({id:`${v.id}:${kind}`,visitId:v.id,kind,from,to,resource,...extra});
 function jobs() {
  const result=[];
  for(const v of state.visits)if((active(v)||v.mealConsumed&&!v.mealWashed)&&v.present!==false) {
   if(v.stage==='check-in')result.push(descriptor(v,'register','registrar','registrar','reception'));
   if(v.tokenId&&!v.mixtureId)result.push(descriptor(v,'prepare','apothecary','apothecary','apothecary'));
   const mix=item(v.mixtureId);
   // The small apothecary has one dispatch corner. A second carrier remains at
   // their own post until the first successful pickup releases that workspace.
   if(mix&&mix.location.id!==service(v)&&mix.location.type!=='used')result.push(descriptor(v,'deliverMix','apothecaryPickup',service(v),'apothecary-dispatch',{itemId:mix.id,tokenId:v.tokenId,side:v.side}));
   if(v.mealRequested&&!v.mealId){const kitchen=v.dishId==='sushi'?'sushiKitchen':'kitchen';result.push(descriptor(v,'cook',kitchen,kitchen,'kitchen'));}
   const meal=item(v.mealId);
   if(meal?.dirty&&!v.mealWashed)result.push(descriptor(v,'wash','dining','kitchenPickup',null,{itemId:meal.id,tokenId:v.tokenId}));
   if(meal&&!meal.dirty&&['point','worker'].includes(meal.location.type)&&meal.location.id!=='dining'&&(v.customerType!=='player'||v.diningPresent))result.push(descriptor(v,'serve',mealSource(v),'dining',null,{itemId:meal.id,tokenId:v.tokenId}));
   if(v.stage==='checkout-ready')result.push(descriptor(v,'checkout','registrar','registrar','reception'));
  }
  return result;
 }
 function dropClaim(id) {
  const job=claims.get(id);if(!job)return false;
  const carried=item(job.itemId);
  if(carried?.location.type==='worker'&&carried.location.id===job.workerId)carried.location={type:'point',id:job.from};
  claims.delete(id);workers.delete(job.workerId);
  if(job.resource&&resources.get(job.resource)===id)resources.delete(job.resource);
  return true;
 }
 function claim(jobId,workerId) {
  if(disposed)return null;
  const prior=claims.get(jobId);
  if(prior)return prior.workerId===workerId?clone(prior):null;
  const job=jobs().find(j=>j.id===jobId);
  if(!job||workers.has(workerId)||staffResources.has(workerId))return null;
  if(workerId==='player'){const duty=staffDuties.get(dutyKey(job)),held=item(job.itemId)?.location;if(!duty||duty.status!=='active'&&!(held?.type==='worker'&&held.id==='player')||visit(job.visitId)?.customerType==='player')return null;}
  else if(!JAPAN_SERVICE_WORKERS[job.kind].includes(workerId)||staffDuties.has(dutyKey(job))&&staffDuties.get(dutyKey(job)).status!=='paused')return null;
  if(job.kind==='deliverMix'&&workerId!=='player'&&!JAPAN_BATH_CREWS[job.side]?.includes(workerId))return null;
  const resource=job.kind==='deliverMix'&&item(job.itemId)?.location.type==='worker'?null:job.resource;
  if(resource&&resources.has(resource))return null;
  const claimed={...job,resource,workerId};claims.set(job.id,claimed);workers.set(workerId,job.id);
  if(resource)resources.set(resource,job.id);
  return clone(claimed);
 }
 function pointFor(v,key){return key==='dining'?v.servePoint:key==='wrong-table'?visit(item(v.mealId)?.location.targetVisitId)?.servePoint:JAPAN_SERVICE_POINTS[key];}
 function complete(jobId,workerId,evidence={}) {
  if(disposed)return false;
  const job=claims.get(jobId),v=job&&visit(job.visitId);
  if(!job||job.workerId!==workerId||!v||!jobs().some(j=>j.id===jobId))return false;
  const duty=staffDuties.get(dutyKey(job));
  if(workerId==='player'&&(!duty||duty.status!=='active'||evidence.receiptId!==duty.receiptId||evidence.visitId!==v.id||evidence.number!==v.number||evidence.tokenId!==(v.tokenId||`${v.id}:token`)))return false;
  if(!near(evidence.position,workerId==='player'&&job.kind==='cook'?JAPAN_SERVICE_POINTS[mealSource(v)]:workerId==='player'&&job.kind==='prepare'?JAPAN_SERVICE_POINTS.apothecaryPickup:pointFor(v,job.to)))return false;
  if(workerId==='player'&&job.kind==='prepare'&&(v.preparation?.phase!=='sealed'||v.preparation.workReceiptId!==duty.receiptId||evidence.itemId!==`${v.id}:mixture`||evidence.blendId!==v.blendId))return false;
  if(workerId==='player'&&job.kind==='cook'&&(v.cooking?.phase!=='plated'||v.cooking.workReceiptId!==duty.receiptId||evidence.itemId!==`${v.id}:meal`||evidence.dishId!==(v.dishId||'ramen')))return false;
  if(['register','checkout'].includes(job.kind)&&!japanReceptionReady(evidence.guestPosition,v.customerType))return false;
  const prior=clone(state);
  if(job.kind==='register') {
   v.tokenId=`${v.id}:token`;addItem(v,'token',{type:'guest',id:v.id});v.stage='changing';
  }else if(job.kind==='prepare') {
   const mixture=item(`${v.id}:mixture`)||addItem(v,'mixture',{type:'point',id:'apothecaryPickup'});mixture.location={type:'point',id:'apothecaryPickup'};delete mixture.preparation;v.mixtureId=mixture.id;delete v.preparation;
  }else if(job.kind==='deliverMix'||job.kind==='serve') {
   const cargo=item(job.itemId);
   if(!cargo||cargo.visitId!==v.id||evidence.itemId!==cargo.id||evidence.tokenId!==v.tokenId||cargo.tokenId!==v.tokenId||cargo.location.type!=='worker'||cargo.location.id!==workerId)return false;
   if(workerId==='player'&&job.kind==='deliverMix'&&(v.stage!=='waiting-bath'||item(v.tokenId)?.location.type!=='guest'||item(v.tokenId)?.location.id!==v.id||!near(evidence.guestPosition,JAPAN_SERVICE_POINTS[v.side+'Receive'])))return false;
   if(job.kind==='serve'&&(v.stage!=='waiting-meal'||!near(evidence.guestPosition,v.diningPoint,.8)))return false;
   cargo.location={type:'point',id:job.to};
   if(job.kind==='serve'){v.stage=v.customerType==='player'?'meal-ready':'eating';v.servedBy=workerId;if(workerId==='player')v.servedWorkReceiptId=duty.receiptId;}
  }else if(job.kind==='wash') {
   const cargo=item(job.itemId);if(!v.mealConsumed||v.mealWashed||!cargo?.dirty||cargo.location.type!=='worker'||cargo.location.id!==workerId||evidence.itemId!==cargo.id)return false;
   cargo.location={type:'used',id:'kitchenPickup'};v.mealWashed=true;
  }else if(job.kind==='cook') {
   const meal=item(`${v.id}:meal`)||addItem(v,'meal',{type:'point',id:mealSource(v)});meal.location={type:'point',id:mealSource(v)};delete meal.preparation;v.mealId=meal.id;delete v.cooking;
  }else if(job.kind==='checkout') {
   if(evidence.tokenId!==v.tokenId||item(v.tokenId)?.location.type!=='guest')return false;
   item(v.tokenId).location={type:'point',id:'reception'};v.stage=v.customerType==='player'?'departed':'leaving';if(v.customerType==='player')state.completed++;
  }
  if(['register','checkout','serve'].includes(job.kind)||job.kind==='deliverMix'&&near(evidence.guestPosition,JAPAN_SERVICE_POINTS[v.side+'Receive']))relationship(v,job.kind,workerId,[v.customerType==='player'?'player':v.id]);
  if(v.orderKind==='dining'){v.participants??={};v.participants[job.kind]=workerId;}
  if(workerId==='player')playerReceipt(job,v,'completed');const lease=clone(job);dropClaim(jobId);if(!persist()){restoreBoard(prior);claims.set(jobId,lease);workers.set(workerId,jobId);if(job.resource)resources.set(job.resource,jobId);return false;}return true;
 }
 function receipt(v,outcome){if(v.orderKind!=='dining'||state.diningReceipts.some(r=>r.id===v.id))return;state.diningReceipts.push({id:v.id,dishId:v.dishId,price:v.price,...(v.currency?{currency:v.currency}:{}),paymentId:v.paymentId,participants:clone(v.participants||{}),outcome});state.diningReceipts=state.diningReceipts.slice(-24);}
 function guestStep(id,event,evidence={}) {
  if(disposed)return false;
  const v=visit(id);if(!v||!active(v))return false;
  const prior=clone(state);const key=v.side==='men'?'men':'women';let next;
  if(event==='arrived'&&v.stage==='arriving'&&japanReceptionReady(evidence.position,v.customerType))next='check-in';
  if(event==='changed'&&v.stage==='changing'&&near(evidence.position,JAPAN_SERVICE_POINTS[key+'Changing'])){
   if(v.customerType!=='player'){
    const linen=state.linens.find(l=>l.stage==='clean'&&l.cycle<Number.MAX_SAFE_INTEGER);if(!linen)return false;
    Object.assign(linen,{cycle:linen.cycle+1,stage:'issued',visitId:v.id,customerName:v.name,side:v.side,location:{type:'guest',id:v.id},station:key+'Changing',carryOwner:null,dryingElapsed:0,used:true});v.linenId=linen.id;
   }next='washing';
  }
  if(event==='washed'&&v.stage==='washing'&&near(evidence.position,JAPAN_SERVICE_POINTS[key+'Washing']))next='waiting-bath';
  if(event==='collect-blend'&&v.customerType==='player'&&v.stage==='waiting-bath'&&near(evidence.position,JAPAN_SERVICE_POINTS[v.side+'Receive'])&&item(v.mixtureId)?.location.id===service(v)){next='waiting-bath';v.blendReceived=true;}
  if(event==='bath-mounted'&&v.stage==='waiting-bath'&&(v.customerType!=='player'||v.blendReceived)&&item(v.mixtureId)?.location.id===service(v)&&evidence.poolId===v.poolId&&typeof evidence.seatId==='string'&&evidence.seatId.startsWith(v.poolId+'-seat-')){next='bathing';v.seatId=evidence.seatId;}
  if(event==='bath-interrupted'&&v.customerType==='player'&&v.stage==='bathing'&&evidence.seatId===v.seatId){next='waiting-bath';v.seatId=null;}
  if(event==='bathed'&&v.stage==='bathing'&&evidence.seatId===v.seatId){next='drying';item(v.mixtureId).location={type:'used',id:v.poolId};v.seatId=null;}
  if(event==='dried'&&v.stage==='drying'&&near(evidence.position,JAPAN_SERVICE_POINTS[key+'Changing'])){
   if(v.customerType!=='player'){
    const linen=state.linens.find(l=>l.id===v.linenId&&l.visitId===v.id&&l.stage==='issued');
    // Legacy visits already in the bath had no issued towel. They finish without
    // manufacturing one; the next real changing event joins the bounded cycle.
    if(linen){linen.stage='dirty';linen.station=key+'Changing';linen.location={type:'point',id:linen.station};linen.carryOwner=null;}
   }next='resting';
  }
  if(event==='rested'&&v.stage==='resting'&&near(evidence.position,v.restPoint,.8)) {next='dining';v.mealRequested=true;if(v.customerType!=='player'){v.diningTaste??=diningTaste(v.id);v.dishId??=v.diningTaste.sushi>v.diningTaste.ramen?'sushi':'ramen';}}
  if(event==='sat-to-eat'&&v.stage==='dining'&&near(evidence.position,v.diningPoint,.8))next='waiting-meal';
  if(event==='begin-eating'&&v.customerType==='player'&&v.stage==='meal-ready'&&near(evidence.position,v.diningPoint,.8))next='eating';
  if(event==='eating-interrupted'&&v.customerType==='player'&&v.stage==='eating')next='meal-ready';
  if(event==='ate'&&v.stage==='eating'&&item(v.mealId)?.location.id==='dining'&&near(evidence.position,v.diningPoint,.8)) {next=v.orderKind==='dining'?'departed':'checkout';item(v.mealId).location=v.customerType==='player'?{type:'used',id:v.id}:{type:'point',id:'dining'};if(v.customerType!=='player'){v.mealConsumed=true;item(v.mealId).dirty=true;}if(v.orderKind==='dining'){state.completed++;receipt(v,'ate');}
   // The existing six-second player eating action reaches this actual item
   // boundary. Keep its supply receipt after checkout/forgetFinished/reload.
   if(v.customerType==='player')state.playerMealReceipts=[{source:'japan-player-meal',id:v.id+'-consumed',number:v.number,actorId:'player',orderId:v.id,mealId:v.mealId,dishId:v.dishId||'ramen',supplyKind:v.orderKind==='dining'?'paid-dining':'bath-meal',paymentReceipt:v.paymentId||v.tokenId,completed:true}];
  }
  if(event==='returned-to-desk'&&v.stage==='checkout'&&japanReceptionReady(evidence.position,v.customerType))next='checkout-ready';
  if(event==='left'&&v.stage==='leaving'&&near(evidence.position,JAPAN_SERVICE_POINTS.departure)){next='departed';state.completed++;}
  if(!next)return false;
  if(event==='bath-mounted'){boiler.observeBath({visitId:v.id,poolId:v.poolId,customerName:v.name},{persist:false});state.boilerMaintenance=boiler.snapshot();}
  v.stage=next;if(evidence.position)v.position=evidence.position.slice();if(!persist()){restoreBoard(prior);return false;}return true;
 }
 const linenPoint=key=>JAPAN_LINEN_POINTS[key]||JAPAN_SERVICE_POINTS[key];
 const linenAuthorized=(actorId,evidence={})=>actorId==='player'?staffDuties.get('linen')?.status==='active'&&staffDuties.get('linen').receiptId===evidence.receiptId:actorId==='jp-rest'&&(!staffDuties.has('linen')||staffDuties.get('linen').status==='paused'||staffDuties.get('linen').status==='draining'&&[...state.linens,...bedding.work()].some(l=>l.carryOwner===actorId));
 function setLinenDuty(receiptId,status='draining'){
  const prior=staffDuties.get('linen');
  if(disposed||!/^jp-linen-labor-[1-9][0-9]*$/.test(receiptId)||!['active','draining','paused'].includes(status)||prior&&prior.receiptId!==receiptId||[...staffDuties.keys()].some(k=>k!=='linen'))return false;
  if(status==='active'&&[...state.linens,...bedding.work()].some(l=>l.carryOwner==='jp-rest'))return false;
  staffDuties.set('linen',{receiptId,status});return true;
 }
 function linenAdvance(linenId,expectedStage,actorId,evidence={}){
  const linen=state.linens.find(l=>l.id===linenId),next={dirty:'collected',collected:'wet',wet:'drying',drying:'dry',dry:'folded',folded:'clean'}[expectedStage];
  if(disposed||!linen||linen.stage!==expectedStage||!next||evidence.nextStage!==next||evidence.expectedCycle!==linen.cycle||!linenAuthorized(actorId,evidence)||linen.carryOwner&&linen.carryOwner!==actorId||state.linens.some(l=>l.id!==linenId&&l.carryOwner===actorId))return false;
  const station={dirty:linen.side+'Changing',collected:'wash',wet:'hang',drying:'take',dry:'fold',folded:'restock'}[expectedStage];
  if(['collected','wet','dry','folded'].includes(expectedStage)&&linen.carryOwner!==actorId)return false;
  if(!near(evidence.position,linenPoint(station),.45)||expectedStage==='drying'&&linen.dryingElapsed<JAPAN_LINEN_DRY_SECONDS)return false;
  return transaction(()=>{
   linen.stage=next;linen.station=station;linen.carryOwner=['collected','wet','dry','folded'].includes(next)?actorId:null;
   linen.location=linen.carryOwner?{type:'worker',id:actorId}:{type:'point',id:station};
   if(next==='drying')linen.dryingElapsed=0;
   if(next==='clean'){
    if(actorId==='player'){
     const workReceiptId=evidence.receiptId,id=`${linen.id}-cycle-${linen.cycle}-${workReceiptId}`;
     if(!state.linenReceipts.some(r=>r.id===id))state.linenReceipts.push({source:'japan-linen',id,workReceiptId,linenId:linen.id,cycle:linen.cycle,visitId:linen.visitId,customerId:linen.visitId,customerName:linen.customerName,completed:true,accurate:true,outcome:'completed'});
     state.linenReceipts=state.linenReceipts.slice(-240);
    }
    linen.used=false;
   }
  });
 }
 function releaseLinenCarrier(actorId){for(const linen of state.linens)if(linen.carryOwner===actorId){linen.carryOwner=null;linen.location={type:'point',id:linen.station};}}
 return {
  bedding,
  linenWork:()=>state.linens.map(l=>({...clone(l),position:clone(linenPoint(l.station||'restock'))})),linenAdvance,setLinenDuty,
  pauseLinenDuty(receiptId){const duty=staffDuties.get('linen');if(disposed||duty?.receiptId!==receiptId)return false;return transaction(()=>staffDuties.set('linen',{receiptId,status:'paused'}));},
  linenClaim(linenId,actorId,evidence={}){
   const linen=state.linens.find(l=>l.id===linenId);
   if(disposed||!linen||!['collected','wet','dry','folded'].includes(linen.stage)||linen.carryOwner||evidence.expectedCycle!==linen.cycle||!linenAuthorized(actorId,evidence)||state.linens.some(l=>l.carryOwner===actorId)||!near(evidence.position,linenPoint(linen.station),.45))return false;
   return transaction(()=>{linen.carryOwner=actorId;linen.location={type:'worker',id:actorId};});
  },
  linenReleaseCarrier(actorId){if(!['player','jp-rest'].includes(actorId))return false;if(bedding.work().some(l=>l.carryOwner===actorId)&&!bedding.releaseCarrier(actorId))return false;return transaction(()=>releaseLinenCarrier(actorId));},
  linenDuty:()=>staffDuties.has('linen')?clone(staffDuties.get('linen')):null,
  linenReceipts:receiptId=>[...clone(state.linenReceipts.filter(r=>!receiptId||r.workReceiptId===receiptId)),...bedding.receipts(receiptId)],
  linenTick(dt){if(disposed||!Number.isFinite(dt)||dt<=0||!state.linens.some(l=>l.stage==='drying'&&l.dryingElapsed<JAPAN_LINEN_DRY_SECONDS))return false;return transaction(()=>{for(const l of state.linens)if(l.stage==='drying')l.dryingElapsed=Math.min(JAPAN_LINEN_DRY_SECONDS,l.dryingElapsed+Math.min(.1,dt));});},
  releaseLinenDuty(receiptId){if(staffDuties.has('linen')&&staffDuties.get('linen').receiptId!==receiptId)return false;if(bedding.work().some(l=>l.carryOwner==='player')&&!bedding.releaseCarrier('player'))return false;return transaction(()=>{releaseLinenCarrier('player');staffDuties.delete('linen');});},
  releaseLinenWorker(actorId){if(!['player','jp-rest'].includes(actorId))return false;if(bedding.work().some(l=>l.carryOwner===actorId)&&!bedding.releaseCarrier(actorId))return false;return transaction(()=>releaseLinenCarrier(actorId));},
  spawnDining({appearance,dishId,position,restPoint,diningPoint,servePoint,mealPoint,restSeatId,paymentId,currency='japan',price}={}) {
   const dish=JAPAN_DINING_MENU.find(d=>d.id===dishId),points=[position,restPoint,diningPoint,servePoint,mealPoint];
   price??=dish?.price;if(!['japan','copper'].includes(currency)||!Number.isSafeInteger(price)||price<1)return null;
   if(disposed||state.visits.some(v=>active(v)&&v.customerType==='player'))return null;
   if(!dish||!appearance||typeof paymentId!=='string'||!paymentId.startsWith('jp-dining-')||typeof restSeatId!=='string'||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))return null;
   const number=state.nextVisit++,id=`jp-player-dining-${state.worldSeed}-${number}`;
   const v={id,number,name:'你',appearance:clone(appearance),customerType:'player',orderKind:'dining',present:true,dishId,price,currency,paymentId,participants:{},stage:'waiting-meal',position:position.slice(),restPoint:restPoint.slice(),diningPoint:diningPoint.slice(),servePoint:servePoint.slice(),mealPoint:mealPoint.slice(),restSeatId,tokenId:null,mixtureId:null,mealRequested:true,mealId:null,seatId:null,diningPresent:false};
   visits.set(id,v);state.visits.push(v);persist();return clone(v);
  },
  spawn({side,appearance,name,restPoint,diningPoint,servePoint,restSeatId,blendId,customerType='npc',position=JAPAN_SERVICE_POINTS.arrival}={}) {
   customerType=customerType==='player'?'player':'npc';
   if(disposed||state.visits.filter(v=>active(v)&&(v.customerType||'npc')===customerType).length>=(customerType==='player'?1:capacity))return null;
   if(!['men','women'].includes(side)||!appearance||!restPoint||!diningPoint)throw new TypeError('A visit requires identity, bath side and actual rest/dining anchors');
   if(blendId&&!JAPAN_BATH_BLENDS.some(b=>b.id===blendId))throw new TypeError('Unknown fictional bath blend');
   const number=state.nextVisit++,id=`${customerType==='player'?'jp-player-service':'jp-visitor'}-${state.worldSeed}-${number}`;
   const v={id,number,name,appearance:clone(appearance),customerType,...(customerType==='npc'?{diningTaste:diningTaste(id)}:{}),present:true,side,poolId:`japan-furniture-bath-${side==='men'?1:2}`,blendId:blendId||JAPAN_BATH_BLENDS[(number-1)%JAPAN_BATH_BLENDS.length].id,stage:'arriving',position:position.slice(),restPoint:restPoint.slice(),diningPoint:diningPoint.slice(),servePoint:(servePoint||[diningPoint[0]+.7,diningPoint[1],diningPoint[2]-.85]).slice(),restSeatId,tokenId:null,mixtureId:null,mealRequested:false,mealId:null,seatId:null};
   visits.set(id,v);state.visits.push(v);persist();return clone(v);
  },
  bindPlayerDining(id,{restPoint,diningPoint,servePoint,mealPoint,restSeatId}) {
   const v=visit(id),points=[restPoint,diningPoint,servePoint,mealPoint];
   if(disposed||v?.customerType!=='player'||v.stage!=='resting'||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))return false;
   Object.assign(v,{restPoint:restPoint.slice(),diningPoint:diningPoint.slice(),servePoint:servePoint.slice(),mealPoint:mealPoint.slice(),restSeatId,diningPresent:true});persist();return true;
  },
  setPlayerDiningPresent(id,present) {
   const v=visit(id);if(disposed||v?.customerType!=='player'||!active(v)||v.diningPresent===!!present)return false;
   v.diningPresent=!!present;
   if(!present)for(const job of [...claims.values()])if(job.visitId===id&&job.kind==='serve')dropClaim(job.id);
   persist();return true;
  },
  setPlayerPresent(id,present) {
   const v=visit(id);if(disposed||v?.customerType!=='player'||!active(v))return false;
   v.present=!!present;
   if(!present){
    for(const job of [...claims.values()])if(job.visitId===id)dropClaim(job.id);
    const safe={'check-in':'arriving','checkout-ready':'checkout',bathing:'waiting-bath',eating:'meal-ready'};v.stage=safe[v.stage]||v.stage;v.seatId=null;v.diningPresent=false;
   }
   persist();return true;
  },
  setStaffDuty,releaseStaffDuty,tickStaffDuty,
  pauseStaffDuty(key,receiptId){const duty=staffDuties.get(key);if(!duty||duty.receiptId!==receiptId)return false;return transaction(()=>staffDuties.set(key,{receiptId,status:'paused'}));},
  staffDuty:key=>staffDuties.has(key)?clone(staffDuties.get(key)):null,
  staffReceipts:(key,receiptId)=>clone((key==='reception'?state.receptionReceipts:key==='mixing'?state.mixingReceipts:key==='kitchen'?state.kitchenReceipts:key==='tableService'?state.tableReceipts:state.deliveryReceipts).filter(r=>r.workReceiptId===receiptId)),
  setReceptionDuty:(receiptId,status)=>setStaffDuty('reception',receiptId,status),
  releaseReceptionDuty:(receiptId,options)=>releaseStaffDuty('reception',receiptId,options),
  tickReception:dt=>tickStaffDuty('reception',dt),
  receptionDuty:()=>staffDuties.has('reception')?clone(staffDuties.get('reception')):null,
  receptionReceipts:receiptId=>clone(state.receptionReceipts.filter(r=>r.workReceiptId===receiptId)),
  nextIdentity:()=>({id:`jp-visitor-${state.worldSeed}-${state.nextVisit}`,number:state.nextVisit}),
  // Read-only social eligibility; avoid copying the full order ledger for a look.
  workerBusy:workerId=>workers.has(workerId)||state.items.some(i=>i.location?.type==='worker'&&i.location.id===workerId),
  jobs:()=>jobs().map(j=>({...clone(j),workerId:claims.get(j.id)?.workerId||null})),claim,
  pickup(jobId,workerId,evidence={}) {
   const job=claims.get(jobId),v=job&&visit(job.visitId),cargo=item(job?.itemId);
   if(disposed||!job||job.workerId!==workerId||!v||!cargo||!near(evidence.position,pointFor(v,cargo?.location.id==='wrong-table'?'wrong-table':job.from))||cargo.location.type!=='point'||![job.from,'wrong-table'].includes(cargo.location.id))return false;
   if(workerId==='player'){const duty=staffDuties.get(dutyKey(job));if(duty?.status!=='active'||evidence.receiptId!==duty.receiptId||evidence.itemId!==cargo.id||evidence.visitId!==v.id||evidence.number!==v.number||cargo.visitId!==v.id||cargo.tokenId!==v.tokenId||evidence.tokenId!==v.tokenId)return false;return transaction(()=>{cargo.location={type:'worker',id:workerId};if(job.kind==='deliverMix'&&resources.get(job.resource)===job.id){resources.delete(job.resource);job.resource=null;}});}
   cargo.location={type:'worker',id:workerId};if(job.kind==='deliverMix'&&resources.get(job.resource)===job.id){resources.delete(job.resource);job.resource=null;}persist();return true;
  },
  rejectTableDelivery(jobId,evidence={}) {
   const job=claims.get(jobId),v=job&&visit(job.visitId),target=visit(evidence.targetVisitId),cargo=item(job?.itemId),duty=staffDuties.get('tableService');
   if(disposed||job?.kind!=='serve'||job.workerId!=='player'||duty?.status!=='active'||evidence.receiptId!==duty.receiptId||!v||!target||target.id===v.id||target.customerType==='player'||!['waiting-meal','eating'].includes(target.stage)||cargo?.location.type!=='worker'||cargo.location.id!=='player'||evidence.itemId!==cargo.id||evidence.tokenId!==v.tokenId||evidence.visitId!==v.id||evidence.number!==v.number||!near(evidence.position,target.servePoint)||!near(evidence.guestPosition,target.diningPoint,.8))return false;
   return transaction(()=>{tableReceipt(job,v,'rejected',target);relationship(v,'wrong-table', 'player',[target.id],'failed',':'+target.id);cargo.location={type:'point',id:'wrong-table',targetVisitId:target.id};});
  },
  prepareWork(jobId,workerId,phase,evidence={}) {
   const job=claims.get(jobId),v=job&&visit(job.visitId),duty=staffDuties.get('mixing');
   if(disposed||workerId!=='player'||job?.workerId!==workerId||job.kind!=='prepare'||!v||!active(v)||v.mixtureId||duty?.status!=='active'||evidence.receiptId!==duty.receiptId||evidence.visitId!==v.id||evidence.number!==v.number||evidence.tokenId!==v.tokenId||evidence.blendId!==v.blendId||!near(evidence.position,JAPAN_SERVICE_POINTS.apothecary))return false;
   const current=v.preparation?.phase||'pending',expected=v.preparation?.workReceiptId&&v.preparation.workReceiptId!==duty.receiptId?'checked':{pending:'checked',checked:'mixed',mixed:'sealed'}[current];if(phase!==expected)return false;
   if(phase==='checked'&&current!=='pending')phase=current;
   return transaction(()=>{v.preparation={phase,workReceiptId:duty.receiptId,tokenId:v.tokenId,blendId:v.blendId};if(phase!=='checked'){const mixture=item(`${v.id}:mixture`)||addItem(v,'mixture',{type:'point',id:'apothecaryWork'});mixture.preparation=phase;}});
  },
  cookWork(jobId,workerId,phase,evidence={}) {
   const job=claims.get(jobId),v=job&&visit(job.visitId),duty=staffDuties.get('kitchen');
   if(disposed||workerId!=='player'||job?.workerId!==workerId||job.kind!=='cook'||!v||!active(v)||v.mealId||duty?.status!=='active'||evidence.receiptId!==duty.receiptId||evidence.visitId!==v.id||evidence.number!==v.number||evidence.tokenId!==v.tokenId||evidence.itemId!==`${v.id}:meal`||evidence.dishId!==(v.dishId||'ramen')||!near(evidence.position,JAPAN_SERVICE_POINTS[job.to]))return false;
   const current=v.cooking?.phase||'pending',expected=v.cooking?.workReceiptId&&v.cooking.workReceiptId!==duty.receiptId?'checked':{pending:'checked',checked:'cooked',cooked:'plated'}[current];if(phase!==expected)return false;
   if(phase==='checked'&&current!=='pending')phase=current;
   return transaction(()=>{v.cooking={phase,workReceiptId:duty.receiptId,tokenId:v.tokenId,dishId:v.dishId||'ramen'};if(phase!=='checked'){const meal=item(`${v.id}:meal`)||addItem(v,'meal',{type:'point',id:v.dishId==='sushi'?'sushiWork':'kitchenWork'});meal.preparation=phase;}});
  },
  tableWork:()=>({visits:clone(state.visits.filter(v=>v.customerType!=='player')),items:clone(state.items.filter(i=>i.kind==='meal')),claims:[...claims.values()].filter(j=>['serve','wash'].includes(j.kind)).map(clone),jobs:jobs().filter(j=>['serve','wash'].includes(j.kind)).map(j=>({...clone(j),workerId:claims.get(j.id)?.workerId||null}))}),
  kitchenWork:()=>({jobs:jobs().filter(j=>j.kind==='cook').map(j=>({...clone(j),workerId:claims.get(j.id)?.workerId||null,visit:clone(visit(j.visitId))})),claims:[...claims.values()].filter(j=>j.kind==='cook').map(clone)}),
  mixingWork:()=>({jobs:jobs().filter(j=>j.kind==='prepare').map(j=>({...clone(j),workerId:claims.get(j.id)?.workerId||null,visit:clone(visit(j.visitId))})),claims:[...claims.values()].filter(j=>j.kind==='prepare').map(clone)}),
  complete,guestStep,boiler,
  // A staff meal uses the same kitchen as orders. A pending break reserves it
  // after its current cook finishes, so a stream of visitors cannot starve it.
  holdWorkplace(resource,workerId) {
   // Trained non-kitchen staff may serve themselves from the existing pot; this does
   // not make them eligible to claim customer cooking or delivery orders.
   if(disposed||resource!=='kitchen'||!STAFF_MEALS.includes(workerId)||workers.has(workerId))return false;
   const key='staff:'+workerId;if(resources.has(resource)&&resources.get(resource)!==key)return false;
   resources.set(resource,key);staffResources.set(workerId,resource);return true;
  },
  releaseWorkplace(workerId) {const resource=staffResources.get(workerId);if(resource&&resources.get(resource)==='staff:'+workerId)resources.delete(resource);staffResources.delete(workerId);},
  releaseWorker(workerId) {if(workerId==='player')return workers.has(workerId)&&transaction(()=>dropClaim(workers.get(workerId)));const released=dropClaim(workers.get(workerId));if(released)persist();return released;},
  cancel(id,reason='visit-cancelled') {
   const v=visit(id);if(disposed||!v||!active(v))return false;
   return transaction(()=>{
   for(const linen of state.linens)if(linen.visitId===id&&linen.stage==='issued'){linen.stage=linen.used?'dirty':'clean';linen.station=linen.used?v.side+'Changing':'restock';linen.location={type:'point',id:linen.station};linen.carryOwner=null;}
   for(const job of [...claims.values()])if(job.visitId===id)dropClaim(job.id);
   for(const cargo of state.items)if(cargo.visitId===id)cargo.location={type:'cancelled',id};
   v.stage='cancelled';v.cancelReason=reason;v.seatId=null;state.cancelled++;receipt(v,reason);});
  },
  forgetFinished(visitIds=null) {
   const finished=new Set(state.visits.filter(v=>!active(v)&&(!v.mealConsumed||v.mealWashed)&&!state.items.some(i=>i.location.targetVisitId===v.id)&&(!visitIds||visitIds.includes(v.id))).map(v=>v.id));
   for(const id of finished)visits.delete(id);
   for(const cargo of state.items)if(finished.has(cargo.visitId))items.delete(cargo.id);
   state.visits=state.visits.filter(v=>!finished.has(v.id));state.items=state.items.filter(i=>!finished.has(i.visitId));persist();
  },
  // Save safe walking positions periodically, not per rendered frame. No locks.
  checkpoint(positions={}) {for(const v of state.visits)if(active(v)&&Array.isArray(positions[v.id])&&positions[v.id].length===3&&positions[v.id].every(Number.isFinite))v.position=positions[v.id].slice();persist();},
  getVisit:id=>visit(id)?clone(visit(id)):null,
  restoreClaims(savedClaims=[]){for(const savedClaim of savedClaims)claim(savedClaim.id,savedClaim.workerId);},
  state:snapshot,
  dispose({suspend=false}={}) {if(disposed)return;for(const id of [...claims.keys()])dropClaim(id);resources.clear();staffResources.clear();if(!suspend)persist();disposed=true;},
 };
}
