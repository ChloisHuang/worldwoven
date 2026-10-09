import assert from 'node:assert/strict';
import {createCrimeConsequences} from '../source/game/crime-consequences.js';
import {createChinaCriminalCases} from '../source/game/china-criminal-cases.js';
// Protect against false convictions, stale-lifetime receipts and partial saves
// using actual crime-engine cases rather than fabricated criminal work orders.
const position={x:0,y:0,z:0};
const actor=(id,key=id)=>({id,key,countryId:'china',sceneId:'china',position:{...position},alive:true,awake:true});
function setup(witnesses=2){
 const people=[actor('suspect','suspect:1'),...Array.from({length:witnesses},(_,i)=>actor(`witness${i}`,`witness${i}:1`))];
 const guard=actor('guard','guard:1');
 const crime=createCrimeConsequences({actors:()=>people,guards:()=>[guard],items:[{id:'item',ownerId:'owner',countryId:'china',position}],hasLineOfSight:()=>true,persist:()=>true});
 assert.equal(crime.take('suspect:1','item').ok,true);
 const id=crime.snapshot().cases[0].id;
 for(let i=0;i<witnesses;i++)assert.equal(crime.report(`witness${i}:1`,id).ok,true);
 return {crime,id,people,guard};
}
function proof(view,stage=view.stage,recorded=false){
 const p={actorId:'player',actorKey:'player:1',sourceRevision:view.sourceRevision,elapsed:2,position:{...position},targetPosition:{...position},clear:true,standing:true,targetId:view.targetId};
 if(stage==='intake'||stage==='review'){p.targetId='cn-official-justice';p.recipientId='cn-official-justice';p.recipientBodyId='cn-official-justice:1';}
 if(stage==='scene'){p.targetId=`case-scene:${view.id}`;p.targetPosition={...view.scenePosition};p.position={...view.scenePosition};}
 if(stage==='witness'){const e=view.evidence.find(e=>recorded?e.deliveredTo.length:e.kind!=='confession');p.witnessKey=e.witnessKey;p.targetId=recorded?'cn-justice-case-desk':e.witnessKey;p.recipientBodyId=e.witnessKey;if(recorded)p.witnessUnavailable=true;}
 if(stage==='archive')p.targetId='cn-justice-case-desk';
 return p;
}
function finish(review,id,recorded=false){for(const stage of ['intake','scene','witness','review','archive']){const v=review.view(id);assert.equal(v.stage,stage);assert.equal(review.act(id,stage,proof(v,stage,recorded)).ok,true,stage);}}
{
 const {crime,id}=setup(),before=crime.snapshot();let stored,writes=0;
 const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:s=>{stored=s;writes++;return true;}});
 const v=review.view(id),p=proof(v);
 assert.equal(review.act(id,'scene',proof(v,'scene')).reason,'case-stage-order');
 assert.equal(review.act(id,'intake',{...p,elapsed:0}).ok,false);
 assert.equal(review.act(id,'intake',p).ok,true);
 assert.equal(review.act(id,'intake',p).replayed,true);assert.equal(writes,1);
 for(const stage of ['scene','witness','review','archive'])assert.equal(review.act(id,stage,proof(review.view(id))).ok,true);
 assert.equal(review.view(id).outcome.code,'reviewed-referral');
 assert.equal(review.view(id).outcome.sentenceApplied,false);
 assert.deepEqual(crime.snapshot(),before);
 const restored=createChinaCriminalCases({saved:stored,getCrime:()=>crime.snapshot(),persist:()=>true});assert.equal(restored.view(id).stage,'archived');
 const copy=restored.snapshot();copy.cases[0].steps[0].proof.actorKey='forged';assert.equal(createChinaCriminalCases({saved:copy,getCrime:()=>crime.snapshot()}).status().ok,false);
 assert.equal(crime.returnItem('suspect:1','item').ok,true);assert.equal(review.view(id).stale,true);assert.equal(review.view(id).stage,'intake');
 assert.equal(review.act(id,'intake',p).ok,false);finish(review,id);assert.equal(review.view(id).history.length,1);
}
{
 const {crime,id}=setup();const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>false});const before=review.snapshot();assert.equal(review.act(id,'intake',proof(review.view(id))).reason,'save-failed');assert.deepEqual(review.snapshot(),before);
 const asyncReview=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>Promise.resolve(true)});assert.equal(asyncReview.act(id,'intake',proof(asyncReview.view(id))).reason,'save-failed');assert.equal(asyncReview.view(id).stage,'intake');
}
{
 const {crime,id}=setup();const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>true});finish(review,id,true);assert.equal(review.view(id).outcome.code,'insufficient-evidence');assert.equal(review.view(id).outcome.recordedStatement,true);
}
{
 // No witnesses, including no officer in the scene: hidden theft and silent
 // restitution must never be discovered by the case-review ledger.
 const people=[actor('suspect','suspect:1')];const crime=createCrimeConsequences({actors:()=>people,items:[{id:'item',ownerId:'owner',countryId:'china',position}],hasLineOfSight:()=>true,persist:()=>true});
 crime.take('suspect:1','item');const review=createChinaCriminalCases({getCrime:()=>crime.snapshot()});assert.equal(review.list().length,0);crime.returnItem('suspect:1','item');assert.equal(review.list().length,0);
}
{
 const {crime,id,people}=setup();const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>true});review.act(id,'intake',proof(review.view(id)));const rev=review.view(id).sourceRevision;
 // Guard remains available; a later movement updates remembered sightings,
 // but no extra delivered report here means the existing proof is stable.
 people[0].position={x:0.1,y:0,z:0};crime.update(.1,{guards:[]});assert.equal(review.view(id).sourceRevision,rev);assert.equal(review.view(id).stage,'scene');
 assert.equal(review.act(id,'scene',{...proof(review.view(id)),actorKey:'player:2'}).reason,'case-actor-life-changed');
 review.act(id,'scene',proof(review.view(id)));review.act(id,'witness',proof(review.view(id)));assert.equal(review.act(id,'review',{...proof(review.view(id)),recipientBodyId:'cn-official-justice:2'}).reason,'justice-life-changed');
}
{
 const bad={version:1,cases:[{id:'made-up',source:{},steps:[],history:[]}]};const review=createChinaCriminalCases({saved:bad,getCrime:()=>setup().crime.snapshot(),persist:()=>true});assert.equal(review.list().length,0);assert.equal(review.act('made-up','intake',{}).reason,'invalid-case-review-save');assert.deepEqual(review.snapshot(),bad);
}
{
 const {crime,id}=setup(0);const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>true});assert.equal(review.list().length,0);crime.report('guard:1',id);assert.equal(review.list().length,1);finish(review,id);assert.equal(review.view(id).outcome.code,'insufficient-evidence');
}
{
 const {crime,people,guard}=setup();people.push(actor('victim','victim:1'),actor('buyer','buyer:1'));
 const h=crime.harm('suspect:1','victim:1');assert.equal(h.ok,true);crime.report('victim:1',h.caseId);
 const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>true});assert.equal(review.view(h.caseId).kind,'harm');finish(review,h.caseId);
 const fence=crime.prepareFence('suspect:1','buyer:1','item','sale-1');assert.equal(fence.ok,true);assert.equal(fence.lock(),true);assert.equal(fence.committed(),true);fence.release();
 for(const id of [fence.receipt.sellerCaseId,fence.receipt.buyerCaseId]){crime.report('witness0:1',id);assert.equal(review.view(id).kind,'fencing');finish(review,id);assert.equal(review.view(id).outcome.sentenceApplied,false);}
}
{
 const {crime,id,people}=setup();people[0].alive=false;crime.update(.1);const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>true});assert.equal(review.view(id).source.status,'closed');finish(review,id,true);assert.equal(review.view(id).outcome.code,'source-closed');const before=crime.snapshot();assert.equal(review.act(id,'archive',proof(review.view(id),'archive')).replayed,true);assert.deepEqual(crime.snapshot(),before);
}
{
 const people=[actor('suspect','suspect:1'),actor('public','public:1'),actor('hidden','hidden:1')],guard=actor('guard','guard:1');
 const crime=createCrimeConsequences({actors:()=>people,guards:()=>[guard],items:[{id:'item',ownerId:'owner',countryId:'china',position}],hasLineOfSight:()=>true,persist:()=>true});crime.take('suspect:1','item');const id=crime.snapshot().cases[0].id;crime.report('public:1',id);
 const review=createChinaCriminalCases({getCrime:()=>crime.snapshot(),persist:()=>true});assert.equal(crime.snapshot().cases[0].evidence.length,3);assert.deepEqual(review.view(id).evidence.map(e=>e.witnessKey),['public:1']);assert.equal(JSON.stringify(review.list()).includes('hidden:1'),false);finish(review,id);assert.equal(review.view(id).outcome.code,'insufficient-evidence');
 crime.report('hidden:1',id);assert.equal(review.view(id).stale,true);finish(review,id);assert.equal(review.view(id).outcome.code,'reviewed-referral');
}
console.log('china-criminal-cases: evidence, ordering, replay, lifetime, stale review, save refusal and hidden-case checks passed');

// Repeated harm retains its case number but the actual latest incident location.
{
 const victim=actor('victim','victim:1'),suspect=actor('suspect','suspect:1'),witness=actor('witness','witness:1'),guard=actor('guard','guard:1');
 const crime=createCrimeConsequences({actors:()=>[suspect,victim,witness],guards:()=>[guard],hasLineOfSight:()=>true,persist:()=>true});
 const first=crime.harm(suspect.key,victim.key);assert(first.ok);crime.update(61);
 suspect.position.x=2;victim.position.x=2;witness.position.x=2;const again=crime.harm(suspect.key,victim.key);assert(again.ok);assert.equal(again.caseId,first.caseId);assert(crime.report(witness.key,again.caseId).ok);
 const cases=createChinaCriminalCases({getCrime:()=>crime.snapshot()});assert.equal(cases.view(first.caseId).scenePosition.x,2);assert.equal(cases.view(first.caseId).source.incidentCount,2);
}
