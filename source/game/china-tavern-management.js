// Composition for the original tavern. Each specialist journal remains the
// authority for its own money, employment, material and physical work facts.
import {createChinaTavernHiring,TAVERN_HIRING_ROLES as ROLES,TAVERN_HIRING_BUSINESS_ID as BUSINESS,hiringApplicationFromSnapshot} from './china-tavern-hiring.js';
import {createChinaTavernRecruitment} from './china-tavern-recruitment.js';
import {createChinaTavernBusiness,tavernSalaryTerms,verifySavedTavernBusinessPayment} from './china-tavern-business.js';
import {createChinaTavernStock,TAVERN_STOCK_COSTS as COSTS} from './china-tavern-stock.js';
const NS='chinaTavernManagement',copy=structuredClone,definitions=Object.values(ROLES);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const exact=(x,keys)=>object(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const same=(a,b)=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));
const require=(ok,code)=>{if(!ok)throw Error(code);};
const receipt=e=>{const {sequence,...r}=e;return copy(r);};
const empty=()=>({version:1,businessId:BUSINESS,revision:0,activation:null,purchases:[],contracts:[]});
const ownerValid=o=>exact(o,['ownerId','ownership'])&&['player',...definitions.map(r=>r.originalHolderId)].includes(o.ownerId)&&integer(o.ownership);
const originalOrderProof=p=>exact(p,['id','sourceId','sourceRevision','businessId','order','unprepared'])&&p.sourceId==='chinaTavernServiceWorld'&&integer(p.sourceRevision)&&p.businessId===BUSINESS&&p.unprepared===true&&exact(p.order,['orderId','number','dishId','customerId','customerName'])&&integer(p.order.number)&&p.order.number>0&&p.order.orderId==='cn-tavern-order-'+p.order.number&&p.id==='cn-tavern-stock-reserve:'+p.order.orderId&&Object.hasOwn(COSTS.unitCosts,p.order.dishId)&&text(p.order.customerId)&&text(p.order.customerName);
const assignment=r=>({version:1,roleId:r.roleId,slotId:r.slotId,holderId:r.holderId,revision:r.revision});
const roleDefinition=id=>definitions.find(r=>r.roleId===id);
const body=n=>n?.bodyId||n?.root?.userData?.bodyId||n?.actorId||n?.station?.id;
const bodyRevision=n=>n?.bodyRevision??n?.root?.userData?.bodyRevision??null;
function contractOf(s){return {id:s.id,sourceId:s.applicationId?'chinaTavernHiring':NS,sourceRevision:s.applicationId?s.hiringRevision:s.sourceRevision,
 kind:s.applicationId?'accepted-hiring':'retained-original-incumbent',actorId:s.actor.actorId,bodyId:s.actor.bodyId,
 roleId:s.assignment.roleId,slotId:s.assignment.slotId,holderRevision:s.assignment.revision,activatedSeconds:s.activatedSeconds,
 salary:copy(s.salary),proof:{receiptId:s.id+':activation',sourceId:NS,sourceRevision:s.sourceRevision}};}
function validateManagement(s){
 require(exact(s,['version','businessId','revision','activation','purchases','contracts'])&&s.version===1&&s.businessId===BUSINESS&&integer(s.revision)&&Array.isArray(s.purchases)&&Array.isArray(s.contracts),'invalid-management-state');
 const revisions=new Set(),ids=new Set();
 const revision=n=>{require(integer(n)&&n>0&&n<=s.revision&&!revisions.has(n),'invalid-management-source');revisions.add(n);};
 if(s.activation){const a=s.activation,p=a.proof;require(exact(a,['proof','owner','worldRevision'])&&ownerValid(a.owner)&&integer(a.worldRevision)&&exact(p,['id','sourceId','sourceRevision','businessId','serial'])&&p.id==='cn-tavern-stock-activation'&&p.sourceId===NS&&p.businessId===BUSINESS&&integer(p.serial),'invalid-management-activation');revision(p.sourceRevision);}
 for(const p of s.purchases){const q=p.proof;require((p.owner?.ownerId==='player'?exact(p,['operationId','owner','proof']):exact(p,['operationId','owner','proof','orderProof'])&&originalOrderProof(p.orderProof)&&p.operationId==='cn-tavern-npc-supply:'+p.orderProof.order.orderId&&q.quantity===1&&q.dishId===p.orderProof.order.dishId&&!!s.activation&&p.orderProof.order.number>s.activation.proof.serial)&&text(p.operationId)&&!ids.has(p.operationId)&&ownerValid(p.owner)&&exact(q,['id','sourceId','sourceRevision','businessId','dishId','quantity','unitCost','costVersion','accepted'])&&q.id===p.operationId&&q.sourceId===NS&&q.businessId===BUSINESS&&Object.hasOwn(COSTS.unitCosts,q.dishId)&&integer(q.quantity)&&q.quantity>0&&q.quantity<=1000000&&q.unitCost===COSTS.unitCosts[q.dishId]&&q.costVersion===COSTS.version&&q.accepted===true,'invalid-management-purchase');ids.add(p.operationId);revision(q.sourceRevision);}
 for(const c of s.contracts){const d=roleDefinition(c?.assignment?.roleId);require(exact(c,['id','sourceRevision','activatedSeconds','actor','assignment','applicationId','hiringRevision','salary'])&&text(c.id)&&!ids.has(c.id)&&Number.isFinite(c.activatedSeconds)&&c.activatedSeconds>=0&&exact(c.actor,['actorId','bodyId','bodyRevision'])&&text(c.actor.actorId)&&text(c.actor.bodyId)&&(c.actor.bodyRevision===null||integer(c.actor.bodyRevision))&&exact(c.assignment,['version','roleId','slotId','holderId','revision'])&&c.assignment.version===1&&!!d&&c.assignment.slotId===d.slotId&&c.assignment.holderId===c.actor.actorId&&integer(c.assignment.revision)&&(c.applicationId===null?c.hiringRevision===null&&c.actor.actorId===d.originalHolderId:text(c.applicationId)&&integer(c.hiringRevision))&&same(c.salary,tavernSalaryTerms(d.roleId,c.salary?.excludedTrial)),'invalid-management-contract');ids.add(c.id);revision(c.sourceRevision);}
 require(revisions.size===s.revision,'management-source-gap');return s;
}

/** saved is the full world root. saveFullWorld(patch) must synchronously persist
 * the complete current world with this patch and return strict true. sourceLinks
 * is mutable so property can be constructed first with lazy business/stock reads.
 * Scene facts come from getScene(); main supplies profiles, formal tenure,
 * player posture/LOS and prepareRoleAssignment/prepareRoleDismissal candidates.
 * No callback here invents willingness, attendance, qualification or work.
 */
export function createChinaTavernManagement(options={}){
 const sourceLinks=options.sourceLinks||{},property=options.property;
 let roots=copy(options.saved||{}),current=empty(),invalidSnapshot=null,loadError=null,lastError=null,busy=false,saving=false,pendingSource=null;
 let hiring=null,recruitment=null,business=null,stock=null,stockCandidate=null,disposed=false,lastSettlement=null;
 const scene=()=>options.getScene?.()||null;
 const getClock=()=>options.getClock?.()||null;
 const fail=code=>(lastError=code,{ok:false,code});
 const call=(fn,...args)=>{require(typeof fn==='function','missing-management-source');const r=fn(...args);if(r?.then){Promise.resolve(r).catch(()=>{});throw Error('async-source-unsupported');}return r;};
 const world=()=>scene()?.snapshot?.()||roots.chinaServiceWorld||null;
 const source=()=>pendingSource||current;
 const root=name=>name==='chinaTavernHiring'?(hiring?.snapshot()||roots[name]):name==='chinaTavernRecruitment'?(recruitment?.snapshot()||roots[name]):name==='chinaTavernBusiness'?(business?.snapshot()||roots[name]):name==='chinaTavernStock'?(stock?.snapshot()||roots[name]):roots[name];
 const historicalApplication=id=>hiringApplicationFromSnapshot(root('chinaTavernHiring'),id);
 const readOwner=()=>{const p=options.getOwner?.()||property?.state?.();return p?{ownerId:p.ownerId,ownership:p.ownership}:null;};
 const readRole=id=>{const r=options.getRole?.(id);return typeof r?.resolve==='function'?r.resolve():r;};
 function readSlot(id){const r=readRole(id);if(!r)return null;return {roleId:r.roleId,slotId:r.slotId,revision:r.revision,holderId:r.holderId,tenureHolderId:r.tenureHolderId??(options.getTenureRoleId?.()===id?'player':null)};}
 function readCandidate(id){const p=options.getNPCProfile?.(id);if(!p)return null;return {...p,...(recruitment?.willingness(id)||{willing:false,willingness:null})};}
 function snapshot(){return {[NS]:copy(invalidSnapshot||current),...(recruitment?{chinaTavernRecruitment:recruitment.snapshot()}:{}),...(hiring?{chinaTavernHiring:hiring.snapshot()}:{}),...(business?{chinaTavernBusiness:business.snapshot()}:{}),...(stock?{chinaTavernStock:stock.snapshot()}: {})};}
 function save(patch={}){if(pendingSource){const s=pendingSource.contracts.at(-1),r=readRole(s.assignment.roleId),n=options.getActor?.(s.actor.actorId);if(!r||!same(assignment(r),s.assignment)||r.alive!==true||r.available!==true||body(n)!==s.actor.bodyId||bodyRevision(n)!==s.actor.bodyRevision||getClock()?.seconds!==s.activatedSeconds)return false;}const full={...snapshot(),...copy(patch),...(pendingSource?{[NS]:copy(pendingSource)}:{})};if(saving)return false;saving=true;try{const result=call(options.saveFullWorld,full);if(result!==true)return false;roots={...roots,...copy(full)};return true;}finally{saving=false;}}
 const sourceSave=next=>{validateManagement(next);if(!save({[NS]:next}))return false;current=next;return true;};
 try{if(roots[NS]!=null){invalidSnapshot=copy(roots[NS]);current=validateManagement(copy(roots[NS]));}invalidSnapshot=null;}catch(e){loadError=e.message;}
 const trialWork=(proof,a)=>{
  const s=root('chinaTavernRecruitment'),found=s?.sources?.find(e=>e.kind==='trial-work'&&same(e.receipt,proof));
  if(!found||proof.applicationId!==a?.id||proof.actorId!==a.actor?.actorId||proof.bodyId!==a.actor?.bodyId)return false;
  return proof.steps.every(step=>{const work=s.sources.find(e=>e.kind==='table-work'&&e.receipt.id===step.id)?.receipt;return !!work&&call(options.verifySavedTrialTableWork||sourceLinks.verifySavedTrialTableWork,world(),copy(work))===true;});
 };
 function verifyContract(c){try{const s=source().contracts.find(r=>r.id===c?.id);if(!s||!same(c,contractOf(s)))return false;
  if(!s.applicationId)return s.actor.actorId===roleDefinition(s.assignment.roleId)?.originalHolderId;
  const a=historicalApplication(s.applicationId),e=root('chinaTavernHiring')?.events?.find(e=>e.applicationId===s.applicationId&&e.kind==='assigned');
  return a?.status==='assigned'&&e?.sequence===s.hiringRevision&&same(s.assignment,a.handoff.assignment)&&same(s.salary,a.decision.salary)&&s.actor.actorId===a.actor.actorId&&s.actor.bodyId===a.actor.bodyId&&s.actor.bodyRevision===a.actor.bodyRevision;
 }catch{return false;}}
 function verifyPurchase(p){const a=source().purchases.find(a=>a.operationId===p?.id);return !!a&&same(a.proof,p);}
 function verifyStockReceipt(r){try{
  if(stockCandidate&&same(stockCandidate,r))return verifyPurchase(r.proof)&&same(source().purchases.find(a=>a.operationId===r.proof.id)?.owner,r.owner);
  const s=root('chinaTavernStock'),e=s?.events?.find(e=>e.proof.id===r?.proof?.id);if(!e||!same(receipt(e),r))return false;
  if(r.kind==='activation')return same(r.proof,source().activation?.proof)&&same(r.owner,source().activation?.owner)&&r.allocation===null;
  if(r.kind==='purchase'){const a=source().purchases.find(a=>a.operationId===r.proof.id),b=root('chinaTavernBusiness')?.receipts?.find(b=>b.id==='tavern-stock-purchase:'+r.proof.id);return !!a&&same(a.proof,r.proof)&&same(a.owner,r.owner)&&same(b?.proof?.sourcePatch?.receipt,r)&&property.snapshot().events.some(e=>e.kind==='operating-expense'&&same(e.receipt,b));}
  return call(options.verifySavedStockReceipt||sourceLinks.verifySavedStockReceipt,world(),copy(r))===true;
 }catch{return false;}}
 const businessSources={verifyContract,verifyStockReceipt,
  verifyTrialRequest:(r,o)=>{try{const a=historicalApplication(r.applicationId);return !!a?.trial.request&&same(a.owner,o)&&same(r,{applicationId:a.id,trialId:a.trial.request.id,actorId:a.actor.actorId,bodyId:a.actor.bodyId,remunerationId:a.trial.request.remuneration.id,tableIds:a.trial.request.tableIds});}catch{return false;}},
  verifyTrialWork:(p,r)=>{try{return trialWork(p,historicalApplication(r.applicationId));}catch{return false;}},
  verifyTrialCancellation:(p,r)=>{try{const s=root('chinaTavernHiring'),a=historicalApplication(r.applicationId),e=s.events.find(e=>e.sequence===p?.sourceRevision);return !!e&&['rejected','cancelled'].includes(e.kind)&&a&&!a.trial.work&&p.id===a.id+':cancelled-trial'&&p.sourceId==='chinaTavernHiring'&&same(p.event,e)&&!root('chinaTavernRecruitment')?.sources?.some(e=>e.kind==='trial-work'&&e.receipt.applicationId===a.id);}catch{return false;}},
  verifyCoverage:(v,c)=>{const now=coverage(c);return !!now&&same(v,now);},
 };
 function verifyPayment(p,a){if(business)return business.verifyTrialReceipt('payment',p,a);return verifySavedTavernBusinessPayment({...businessSources,saved:roots.chinaTavernBusiness,property:property.snapshot(),proof:p,application:a});}
 const sceneCall=(name,...args)=>call(scene()?.[name]?.bind(scene()),...args);
 const runtimeOptions={saved:roots.chinaTavernRecruitment,getClock,getHiring:()=>hiring,readOwner,readSlot,readCandidate,readActor:id=>options.getActor?.(id),
  readActorState:(id,c)=>{const s=sceneCall('recruitmentActorState',id,c);return options.readActorState?options.readActorState(id,c,s):s;},
  readPlayerState:()=>call(options.readPlayerState||options.getPlayerState),canSeeOwner:(id,c)=>call(options.canSeeOwner,id,c),
  releaseCustomer:(...a)=>sceneCall('releaseRecruitmentCustomer',...a),returnCustomer:(...a)=>sceneCall('returnRecruitmentCustomer',...a),
  resolveMeetingPoint:(...a)=>sceneCall('resolveRecruitmentMeetingPoint',...a),moveTo:(...a)=>sceneCall('moveRecruitmentActor',...a),stopMove:(...a)=>sceneCall('stopRecruitmentMove',...a),
  claimTable:(...a)=>sceneCall('claimRecruitmentTable',...a),tableClaimValid:(...a)=>sceneCall('recruitmentTableClaimValid',...a),releaseTable:(...a)=>sceneCall('releaseRecruitmentTable',...a),
  canWorkTable:(...a)=>sceneCall('canRecruitmentWorkTable',...a),faceWorkTarget:(...a)=>sceneCall('faceRecruitmentWork',...a),
  onInspect:(a,c)=>options.onInspect?.(a,c),saveState:s=>save({chinaTavernRecruitment:s}),
  verifyTableWork:p=>call(options.verifySavedTrialTableWork||sourceLinks.verifySavedTrialTableWork,world(),copy(p))===true,
  commitTableWork(proof,c,next){const p=sceneCall('prepareRecruitmentTableWork',{proof,candidate:c});if(!p?.ok||!p.lock?.())return false;try{return p.save(patch=>save({...patch,chinaTavernRecruitment:next}),next)===true&&p.committed()===true;}finally{p.release?.();}},
  reserveTrial(a){const p=business.prepareTrialReservation({application:a});if(!p.ok)return null;const r=p.commit();return r.ok?r.receipt:null;},
  payTrial(a,reservation,work){if(!reservation)return null;const p=business.prepareTrialPayment({reservationId:reservation.id,workProof:work});if(!p.ok)return null;const r=p.commit();return r.ok?r.receipt.proof.payment:null;},
  verifyMoneyReceipt:(kind,p,a)=>business?.verifyTrialReceipt(kind,p,a)===true,
  releaseTrialReservation(a,r){const e=hiring.snapshot().events.findLast(e=>e.applicationId===a?.id&&['cancelled','rejected'].includes(e.kind));if(!e)return false;const p=business.prepareTrialRelease({reservationId:r.id,cancellationProof:{id:a.id+':cancelled-trial',sourceId:'chinaTavernHiring',sourceRevision:e.sequence,event:copy(e)}});return p.ok&&p.commit().ok;},
 };
 recruitment=createChinaTavernRecruitment(runtimeOptions);
 hiring=createChinaTavernHiring({saved:roots.chinaTavernHiring,readOwner,readSlot,readCandidate,
  saveState:s=>save({chinaTavernHiring:s}),verifyQualification:(p,a)=>call(options.verifyQualification,p,a)===true,
  verifyTrialReceipt:(kind,p,a)=>kind==='payment'?verifyPayment(p,a):trialWork(p,a),readSafeHandoff:a=>call(options.readSafeHandoff,a)});
 business=createChinaTavernBusiness({saved:roots.chinaTavernBusiness,getProperty:()=>property,getClock,...businessSources,saveState:(_s,_r,patch)=>save(patch)});
 sourceLinks.business=business;sourceLinks.getBusinessAccount=()=>business;
 stock=createChinaTavernStock({saved:roots.chinaTavernStock,readOwner,readBusinessBudget:()=>property.businessBudget(),verifyPurchaseSource:p=>verifyPurchase(p)&&same(source().purchases.find(a=>a.operationId===p.id)?.owner,readOwner()),
  verifyActivationSource:p=>same(p,source().activation?.proof),verifyHistoricalReceipt:verifyStockReceipt,
  verifyOrderSource:(kind,p)=>call(options.verifyOrderSource||sourceLinks.verifyOrderSource||scene()?.verifyStockOrderSource?.bind(scene()),kind,p)===true});
 sourceLinks.stock=stock;sourceLinks.getStock=()=>stock;
 function error(){return loadError||hiring.loadError||recruitment.state().loadError||business.loadError||stock.loadError||property?.state?.().loadError||null;}
 function guarded(fn){if(disposed||busy||saving||error())return fail(error()||(disposed?'management-suspended':'management-busy'));busy=true;try{lastError=null;return fn();}catch(e){return fail(e.message);}finally{busy=false;}}
 function activateStock(){if(!current.activation&&readOwner()?.ownerId!=='player')return {ok:true,dormant:true};if(stock.summary()?.active)return {ok:true,replayed:true};if(!current.activation){const w=world();require(integer(w?.serial)&&integer(w.revision??0),'tavern-world-unavailable');const next=copy(current),revision=++next.revision;next.activation={proof:{id:'cn-tavern-stock-activation',sourceId:NS,sourceRevision:revision,businessId:BUSINESS,serial:w.serial},owner:readOwner(),worldRevision:w.revision??0};if(!sourceSave(next))return fail('save-failed');}
  const p=stock.prepareActivation({expectedRevision:stock.snapshot().revision,expectedOwner:readOwner(),proof:current.activation.proof});if(!p.ok||p.replayed)return p;
  if(!p.lock())return fail('stale-stock-activation');const next=copy(current);next.activation.owner=readOwner();try{if(!p.save(b=>save({...b.patch,[NS]:next})))return fail('save-failed');if(!p.committed())return fail('stock-adoption-failed');current=next;return {ok:true};}finally{p.release();}}
 function purchaseRequest({dishId,quantity,operationId,orderProof=null}={}){
  require(text(operationId)&&integer(quantity)&&quantity>0&&Object.hasOwn(COSTS.unitCosts,dishId),'invalid-purchase-request');
  let authorization=current.purchases.find(a=>a.operationId===operationId);const owner=readOwner();
  require(orderProof?ownerValid(owner)&&owner.ownerId!=='player':owner?.ownerId==='player','player-owner-required');
  if(authorization){require(same(authorization.owner,owner)&&authorization.proof.dishId===dishId&&authorization.proof.quantity===quantity&&same(authorization.orderProof||null,orderProof),'purchase-operation-conflict');}
  else{const next=copy(current);authorization={operationId,owner,proof:{id:operationId,sourceId:NS,sourceRevision:++next.revision,businessId:BUSINESS,dishId,quantity,unitCost:COSTS.unitCosts[dishId],costVersion:COSTS.version,accepted:true},...(orderProof?{orderProof:copy(orderProof)}:{})};next.purchases.push(authorization);if(!sourceSave(next))return fail('save-failed');}
  const active=activateStock();if(!active.ok)return active;
  const p=stock.preparePurchase({expectedRevision:stock.snapshot().revision,expectedOwner:owner,proof:authorization.proof});if(!p.ok||p.replayed)return p;
  stockCandidate=copy(p.sourcePatch.receipt);try{const b=business.prepareStockPurchase({stockParticipant:p});return b.ok?b.commit():b;}finally{stockCandidate=null;}
 }
 const purchase=input=>guarded(()=>purchaseRequest(input));
 function stockAdmission(dishId){const owner=readOwner(),problem=error(),enabled=!!current.activation||owner?.ownerId==='player'||!!problem;
  if(!enabled)return {enabled:false,ready:!problem,available:!problem,canPurchase:false,...(problem?{code:problem}:{})};
  const summary=stock.summary(),ready=!problem&&summary?.active===true,available=ready&&(summary.inventory[dishId]?.available||0)>0;
  const canPurchase=ready&&ownerValid(owner)&&owner.ownerId!=='player'&&Object.hasOwn(COSTS.unitCosts,dishId)&&(property.businessBudget()?.balance||0)>=COSTS.unitCosts[dishId];
  return {enabled:true,ready,available,canPurchase,...(!ready?{code:problem||'stock-inactive'}:!available&&!canPurchase?{code:'insufficient-stock'}:{})};
 }
 function supplyForOrder(proof){return guarded(()=>{
  require(originalOrderProof(proof),'invalid-npc-supply-order');const admission=stockAdmission(proof.order.dishId);
  require(admission.enabled&&admission.ready&&readOwner()?.ownerId!=='player','npc-supply-unavailable');
  require(proof.order.number>stock.summary().cutoff,'legacy-order-supply-unavailable');
  require(call(options.verifyOrderSource||sourceLinks.verifyOrderSource||scene()?.verifyStockOrderSource?.bind(scene()),'reserve',copy(proof))===true,'unverified-npc-supply-order');
  if(admission.available)return {ok:true,replayed:true};require(admission.canPurchase,'insufficient-business-funds');
  return purchaseRequest({dishId:proof.order.dishId,quantity:1,operationId:'cn-tavern-npc-supply:'+proof.order.orderId,orderProof:proof});
 });}
 function saveStockWorld(patch){if(disposed||saving||error())return false;try{
  require(exact(patch,['chinaServiceWorld','chinaTavernStock']),'invalid-stock-world-patch');
  const before=stock.snapshot(),next=patch.chinaTavernStock,oldWorld=world(),nextWorld=patch.chinaServiceWorld,e=next?.events?.at(-1);
  require(next?.revision===before.revision+1&&same({...next,revision:before.revision,events:next.events.slice(0,-1)},before)&&['reserve','consume','cancel'].includes(e?.kind),'invalid-stock-world-patch');
  const r=receipt(e),prior=oldWorld?.stockReceipts||[],history=nextWorld?.stockReceipts;
  require(nextWorld?.revision===(oldWorld?.revision||0)+1&&r.proof.sourceRevision===nextWorld.revision&&same(r.owner,readOwner())&&Array.isArray(history)&&history.length===prior.length+1&&same(history.slice(0,-1),prior)&&same(history.at(-1),r),'invalid-stock-world-source');
  require(call(options.verifySavedStockReceipt||sourceLinks.verifySavedStockReceipt,nextWorld,copy(r))===true&&call(options.verifyOrderSource||sourceLinks.verifyOrderSource||scene()?.verifyStockOrderSource?.bind(scene()),r.kind,copy(r.proof))===true,'unverified-stock-world-source');
  return save(patch);
 }catch(e){lastError=e.message;return false;}}
 function synchronizeContracts(){for(const d of definitions){const r=readRole(d.roleId),n=r?.actor||options.getActor?.(r?.holderId);if(!r||r.holderId==='player'||r.alive!==true||r.available!==true||!n||body(n)!==body(options.getActor?.(r.holderId)))continue;
  const a=hiring.applications().find(a=>a.status==='assigned'&&same(a.handoff.assignment,assignment(r))),existing=current.contracts.find(c=>same(c.assignment,assignment(r))&&c.actor.bodyId===body(n));
  if(existing||!a&&r.holderId!==d.originalHolderId)continue;
  const now=getClock();if(!Number.isFinite(now?.seconds)||now.seconds<0)continue;
  const next=copy(current),e=a&&hiring.snapshot().events.find(e=>e.kind==='assigned'&&e.applicationId===a.id),s={id:a?'tavern-hiring-contract:'+a.id:`tavern-incumbent-contract:${d.roleId}:${r.revision}:${body(n)}`,sourceRevision:++next.revision,activatedSeconds:now.seconds,actor:{actorId:r.holderId,bodyId:body(n),bodyRevision:bodyRevision(n)},assignment:assignment(r),applicationId:a?.id||null,hiringRevision:e?.sequence??null,salary:a?copy(a.decision.salary):tavernSalaryTerms(d.roleId)};next.contracts.push(s);validateManagement(next);pendingSource=next;
  try{const result=business.acceptContract(contractOf(s));if(result.ok)current=next;else lastError=result.code;}finally{pendingSource=null;}
 }}
 function coverage(c){const r=readRole(c.roleId),n=options.getActor?.(c.actorId);if(!r||r.holderId!==c.actorId||r.revision!==c.holderRevision||r.alive!==true||r.available!==true||!n||body(n)!==c.bodyId||recruitment.owns(c.actorId))return null;
  const proof=(options.readTavernCoverage||options.readCoverage)?.(copy(c))||scene()?.readTavernCoverage?.(copy(c));if(!proof)return null;return copy(proof);}
 function tryAssign(id){return guarded(()=>{const a=hiring.application(id);if(!a)return fail('unknown-application');const h=hiring.prepareHandoff({applicationId:id,expectedRevision:hiring.snapshot().revision,by:'player'});if(!h.ok)return h;
  const r=call(options.prepareRoleAssignment,copy(a),copy(h.assignment)),q=recruitment.prepareAssigned(id);if(!r?.ok||!q.ok)return r?.ok?q:r;
  require(same(r.assignment,h.assignment),'role-assignment-mismatch');const all=[h,r,q],locked=[];
  try{for(const p of all){if(!p.valid?.()||!p.lock?.())return fail('stale-hiring-handoff');locked.push(p);}const patch=Object.assign({},...all.map(p=>p.patch||{}));
   let commit=()=>save(patch);for(const p of all.filter(p=>typeof p.save==='function').reverse()){const inner=commit;commit=()=>p.save(()=>inner());}
   if(commit()!==true)return fail('save-failed');for(const p of all)if(p.committed?.()!==true)return fail('hiring-adoption-failed');return {ok:true,application:hiring.application(id)};
  }finally{for(const p of locked.reverse())p.release?.();}
 });}
 function dismiss(roleId){return guarded(()=>{require(readOwner()?.ownerId==='player','player-owner-required');const checkpoint=business.checkpoint();if(!checkpoint.ok)return checkpoint;business.suspend();const p=call(options.prepareRoleDismissal,roleId);if(!p?.ok||!p.lock?.())return p||fail('dismissal-unsafe');try{if(p.save(b=>save(b.patch))!==true)return fail('save-failed');return p.committed()===true?{ok:true}:fail('dismissal-adoption-failed');}finally{p.release?.();}});}
 function prepareStockTransition(kind,proof){if(error()||disposed||saving)return fail(error()||'management-suspended');const method={reserve:'prepareReserve',consume:'prepareConsume',cancel:'prepareCancel'}[kind];return method?stock[method]({expectedRevision:stock.snapshot().revision,expectedOwner:readOwner(),proof}):fail('invalid-stock-transition');}
 function update(dt){if(disposed||busy||saving||error()||!Number.isFinite(dt)||dt<=0||dt>.25){business.suspend();return false;}const active=guarded(()=>{const r=activateStock();if(!r.ok||r.dormant)return r;synchronizeContracts();return {ok:true};});if(!active.ok)return false;if(active.dormant){business.suspend();return true;}
  recruitment.update(dt);
  for(const e of recruitment.snapshot().sources.filter(e=>e.kind==='trial-work')){const a=hiring.application(e.receipt.applicationId),r=business.trialReservation(a?.id);if(r)business.recordTrialWork({reservationId:r.id,workProof:e.receipt});}
  for(const a of hiring.applications().filter(a=>a.status==='pending-safe-handoff'))tryAssign(a.id);
  const now=getClock();business.observe({seconds:now?.seconds,dt,coverage:business.snapshot().contracts.map(coverage).filter(Boolean)});
  const marker=now?`${now.day}:${now.hour>=18}:${property.snapshot().revision}:${property.businessBudget()?.balance}`:null;if(marker!==lastSettlement){business.checkpoint();business.settleDue();lastSettlement=marker;}return true;
 }
 function view(){const p=property.state();return {owner:readOwner(),roles:definitions.map(d=>({...d,...readSlot(d.roleId)})),applications:hiring.applications(),recruitment:recruitment.state(),business:business.state(),stock:stock.summary(),property:p,purchases:copy(current.purchases),purchaseOperationPrefix:`cn-tavern-owner-purchase:${p.ownership}:${current.revision+1}`,loadError:error(),lastError};}
 return {hiring,recruitment,business,stock,view,snapshot,update,purchase,dismiss,tryAssign,prepareStockTransition,saveStockWorld,stockAdmission,supplyForOrder,activate:()=>guarded(activateStock),
  executeIntent:i=>!error()&&!busy&&!saving&&!disposed&&recruitment.executeIntent(i),intents:()=>error()||disposed?[]:recruitment.intents(),
  reviewApplication(id,accept){if(error()||busy||saving||disposed)return false;const i=recruitment.intent(id,accept?'approve':'reject');return i?recruitment.executeIntent(i):false;},
  suspend(){business.suspend();business.checkpoint();recruitment.dispose({suspend:true});disposed=true;},
  get loadError(){return error();},get lastError(){return lastError;}};
}
