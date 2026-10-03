// Durable visit/order ledger. Walking, animation, elapsed work and seat locks
// belong to the scene adapter; a timer alone can never deliver an order here.
export const JAPAN_SERVICE_POINTS = Object.freeze({
 arrival:[0,0,35], departure:[0,0,36.5],
 reception:[-4.22,0,5.7], registrar:[-5.4,0,5.7], tokenTray:[-5.65,1.17,6.48],
 apothecary:[-5.25,11.4,-1.6], apothecaryPickup:[-4.35,11.4,-2.6], mixtureTray:[-5.0,12.60,-2.15],
 blendWork:[-5.20,12.60,-2.10],
 kitchen:[2.1,0,-12.15], kitchenPickup:[3.35,0,-12.15], mealTray:[3.35,1.20,-13.4],
 menService:[-4.2,3.8,-2.16], womenService:[1.35,3.8,-2.16],
 menChanging:[-9.92,3.8,2.4], womenChanging:[5.15,3.8,2.4],
 menWashing:[-9.15,3.8,-3.7], womenWashing:[3,3.8,-4.4],
});
// These are invented bathhouse blends, with no medical claims or real recipes.
export const JAPAN_BATH_BLENDS = Object.freeze([
 {id:'cloud-leaf',name:'云叶浴包',color:0x819c76},
 {id:'lantern-petal',name:'灯花浴包',color:0xc79080},
]);
export const JAPAN_SERVICE_WORKERS = Object.freeze({
 register:['jp-welcome'], prepare:['jp-incense'],
 deliverMix:['jp-onsen','jp-women-onsen'], cook:['jp-ramen'],
 serve:['jp-sushi'], checkout:['jp-welcome'],
});
const clone=value=>JSON.parse(JSON.stringify(value));
const active=v=>!['departed','cancelled'].includes(v.stage);
const near=(p,q,r=.34)=>Array.isArray(p)&&Array.isArray(q)&&p.length===3&&p.every(Number.isFinite)&&Math.hypot(p[0]-q[0],p[2]-q[2])<=r&&Math.abs(p[1]-q[1])<.4;
const service=v=>v.side==='men'?'menService':'womenService';
const sourceOf=kind=>kind==='mixture'?'apothecaryPickup':kind==='meal'?'kitchenPickup':'reception';

export function createJapanServiceOrders({saved={},worldSeed=1,saveState=()=>{},capacity=2}={}) {
 const state={version:1,worldSeed:worldSeed>>>0,nextVisit:1,completed:0,cancelled:0,visits:[],items:[]};
 if(saved?.version===1&&saved.worldSeed===(worldSeed>>>0)) {
  state.nextVisit=Math.max(1,Number.isSafeInteger(saved.nextVisit)?saved.nextVisit:1);
  state.completed=Math.max(0,saved.completed|0);state.cancelled=Math.max(0,saved.cancelled|0);
  state.visits=clone((saved.visits||[]).filter(v=>active(v)&&typeof v.id==='string'));
  const ids=new Set(state.visits.map(v=>v.id));
  state.items=clone((saved.items||[]).filter(i=>ids.has(i.visitId)));
  // A carrier and a bath reservation are scene-local. Restore the exact same
  // visit and order, returning an interrupted carried tray to its source.
  for(const item of state.items)if(item.location?.type==='worker')item.location={type:'point',id:sourceOf(item.kind)};
  for(const v of state.visits) {
   if(v.stage==='bathing')v.stage='waiting-bath';
   v.seatId=null;
   state.nextVisit=Math.max(state.nextVisit,(v.number||0)+1);
  }
 }
 const visits=new Map(state.visits.map(v=>[v.id,v])),items=new Map(state.items.map(i=>[i.id,i]));
 const claims=new Map(),workers=new Map(),resources=new Map();
 let disposed=false;
 const persist=()=>saveState(clone(state));
 const visit=id=>visits.get(id);
 const item=id=>items.get(id);
 const addItem=(v,kind,location)=>{
  const result={id:`${v.id}:${kind}`,visitId:v.id,tokenId:v.tokenId,kind,blendId:v.blendId,location};
  items.set(result.id,result);state.items.push(result);return result;
 };
 const descriptor=(v,kind,from,to,resource,extra={})=>({id:`${v.id}:${kind}`,visitId:v.id,kind,from,to,resource,...extra});
 function jobs() {
  const result=[];
  for(const v of state.visits)if(active(v)) {
   if(v.stage==='check-in')result.push(descriptor(v,'register','registrar','registrar','reception'));
   if(v.tokenId&&!v.mixtureId)result.push(descriptor(v,'prepare','apothecary','apothecary','apothecary'));
   const mix=item(v.mixtureId);
   // The small apothecary has one dispatch corner. A second carrier remains at
   // their own post until the first complete dispatch releases that workspace.
   if(mix&&mix.location.id!==service(v)&&mix.location.type!=='used')result.push(descriptor(v,'deliverMix','apothecaryPickup',service(v),'apothecary-dispatch',{itemId:mix.id,tokenId:v.tokenId,side:v.side}));
   if(v.mealRequested&&!v.mealId)result.push(descriptor(v,'cook','kitchen','kitchen','kitchen'));
   const meal=item(v.mealId);
   if(meal&&['point','worker'].includes(meal.location.type)&&meal.location.id!=='dining')result.push(descriptor(v,'serve','kitchenPickup','dining',null,{itemId:meal.id,tokenId:v.tokenId}));
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
  if(!job||workers.has(workerId)||!JAPAN_SERVICE_WORKERS[job.kind].includes(workerId))return null;
  if(job.kind==='deliverMix'&&workerId!==(job.side==='men'?'jp-onsen':'jp-women-onsen'))return null;
  if(job.resource&&resources.has(job.resource))return null;
  const claimed={...job,workerId};claims.set(job.id,claimed);workers.set(workerId,job.id);
  if(job.resource)resources.set(job.resource,job.id);
  return clone(claimed);
 }
 function pointFor(v,key){return key==='dining'?v.servePoint:JAPAN_SERVICE_POINTS[key];}
 function complete(jobId,workerId,evidence={}) {
  if(disposed)return false;
  const job=claims.get(jobId),v=job&&visit(job.visitId);
  if(!job||job.workerId!==workerId||!v||!active(v)||!jobs().some(j=>j.id===jobId))return false;
  if(!near(evidence.position,pointFor(v,job.to)))return false;
  if(['register','checkout'].includes(job.kind)&&!near(evidence.guestPosition,JAPAN_SERVICE_POINTS.reception))return false;
  if(job.kind==='register') {
   v.tokenId=`${v.id}:token`;addItem(v,'token',{type:'guest',id:v.id});v.stage='changing';
  }else if(job.kind==='prepare') {
   v.mixtureId=addItem(v,'mixture',{type:'point',id:'apothecaryPickup'}).id;
  }else if(job.kind==='deliverMix'||job.kind==='serve') {
   const cargo=item(job.itemId);
   if(!cargo||evidence.itemId!==cargo.id||evidence.tokenId!==v.tokenId||cargo.tokenId!==v.tokenId||cargo.location.type!=='worker'||cargo.location.id!==workerId)return false;
   if(job.kind==='serve'&&(v.stage!=='waiting-meal'||!near(evidence.guestPosition,v.diningPoint,.8)))return false;
   cargo.location={type:'point',id:job.to};
   if(job.kind==='serve')v.stage='eating';
  }else if(job.kind==='cook') {
   v.mealId=addItem(v,'meal',{type:'point',id:'kitchenPickup'}).id;
  }else if(job.kind==='checkout') {
   if(evidence.tokenId!==v.tokenId||item(v.tokenId)?.location.type!=='guest')return false;
   item(v.tokenId).location={type:'point',id:'reception'};v.stage='leaving';
  }
  dropClaim(jobId);persist();return true;
 }
 function guestStep(id,event,evidence={}) {
  if(disposed)return false;
  const v=visit(id);if(!v||!active(v))return false;
  const key=v.side==='men'?'men':'women';let next;
  if(event==='arrived'&&v.stage==='arriving'&&near(evidence.position,JAPAN_SERVICE_POINTS.reception))next='check-in';
  if(event==='changed'&&v.stage==='changing'&&near(evidence.position,JAPAN_SERVICE_POINTS[key+'Changing']))next='washing';
  if(event==='washed'&&v.stage==='washing'&&near(evidence.position,JAPAN_SERVICE_POINTS[key+'Washing']))next='waiting-bath';
  if(event==='bath-mounted'&&v.stage==='waiting-bath'&&item(v.mixtureId)?.location.id===service(v)&&evidence.poolId===v.poolId&&typeof evidence.seatId==='string'&&evidence.seatId.startsWith(v.poolId+'-seat-')){next='bathing';v.seatId=evidence.seatId;}
  if(event==='bathed'&&v.stage==='bathing'&&evidence.seatId===v.seatId){next='drying';item(v.mixtureId).location={type:'used',id:v.poolId};v.seatId=null;}
  if(event==='dried'&&v.stage==='drying'&&near(evidence.position,JAPAN_SERVICE_POINTS[key+'Changing']))next='resting';
  if(event==='rested'&&v.stage==='resting'&&near(evidence.position,v.restPoint,.8)) {next='dining';v.mealRequested=true;}
  if(event==='sat-to-eat'&&v.stage==='dining'&&near(evidence.position,v.diningPoint,.8))next='waiting-meal';
  if(event==='ate'&&v.stage==='eating'&&item(v.mealId)?.location.id==='dining'&&near(evidence.position,v.diningPoint,.8)) {next='checkout';item(v.mealId).location={type:'used',id:v.id};}
  if(event==='returned-to-desk'&&v.stage==='checkout'&&near(evidence.position,JAPAN_SERVICE_POINTS.reception))next='checkout-ready';
  if(event==='left'&&v.stage==='leaving'&&near(evidence.position,JAPAN_SERVICE_POINTS.departure)){next='departed';state.completed++;}
  if(!next)return false;
  v.stage=next;if(evidence.position)v.position=evidence.position.slice();persist();return true;
 }
 return {
  spawn({side,appearance,name,restPoint,diningPoint,servePoint,restSeatId,position=JAPAN_SERVICE_POINTS.arrival}={}) {
   if(disposed||state.visits.filter(active).length>=capacity)return null;
   if(!['men','women'].includes(side)||!appearance||!restPoint||!diningPoint)throw new TypeError('A visit requires identity, bath side and actual rest/dining anchors');
   const number=state.nextVisit++,id=`jp-visitor-${state.worldSeed}-${number}`;
   const v={id,number,name,appearance:clone(appearance),side,poolId:`japan-furniture-bath-${side==='men'?1:2}`,blendId:JAPAN_BATH_BLENDS[(number-1)%JAPAN_BATH_BLENDS.length].id,stage:'arriving',position:position.slice(),restPoint:restPoint.slice(),diningPoint:diningPoint.slice(),servePoint:(servePoint||[diningPoint[0]+.7,diningPoint[1],diningPoint[2]-.85]).slice(),restSeatId,tokenId:null,mixtureId:null,mealRequested:false,mealId:null,seatId:null};
   visits.set(id,v);state.visits.push(v);persist();return clone(v);
  },
  nextIdentity:()=>({id:`jp-visitor-${state.worldSeed}-${state.nextVisit}`,number:state.nextVisit}),
  jobs:()=>jobs().map(j=>({...clone(j),workerId:claims.get(j.id)?.workerId||null})),claim,
  pickup(jobId,workerId,evidence={}) {
   const job=claims.get(jobId),v=job&&visit(job.visitId),cargo=item(job?.itemId);
   if(disposed||!job||job.workerId!==workerId||!v||!cargo||!near(evidence.position,pointFor(v,job.from))||cargo.location.type!=='point'||cargo.location.id!==job.from)return false;
   cargo.location={type:'worker',id:workerId};persist();return true;
  },
  complete,guestStep,
  releaseWorker(workerId) {const released=dropClaim(workers.get(workerId));if(released)persist();return released;},
  cancel(id,reason='visit-cancelled') {
   const v=visit(id);if(disposed||!v||!active(v))return false;
   for(const job of [...claims.values()])if(job.visitId===id)dropClaim(job.id);
   for(const cargo of state.items)if(cargo.visitId===id)cargo.location={type:'cancelled',id};
   v.stage='cancelled';v.cancelReason=reason;v.seatId=null;state.cancelled++;persist();return true;
  },
  forgetFinished(visitIds=null) {
   const finished=new Set(state.visits.filter(v=>!active(v)&&(!visitIds||visitIds.includes(v.id))).map(v=>v.id));
   for(const id of finished)visits.delete(id);
   for(const cargo of state.items)if(finished.has(cargo.visitId))items.delete(cargo.id);
   state.visits=state.visits.filter(active);state.items=state.items.filter(i=>!finished.has(i.visitId));persist();
  },
  // Save safe walking positions periodically, not per rendered frame. No locks.
  checkpoint(positions={}) {for(const v of state.visits)if(active(v)&&Array.isArray(positions[v.id])&&positions[v.id].length===3&&positions[v.id].every(Number.isFinite))v.position=positions[v.id].slice();persist();},
  getVisit:id=>visit(id)?clone(visit(id)):null,
  state:()=>({...clone(state),claims:[...claims.values()].map(clone)}),
  dispose() {if(disposed)return;for(const id of [...claims.keys()])dropClaim(id);persist();disposed=true;},
 };
}
