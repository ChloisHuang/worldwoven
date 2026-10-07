import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerConversationLedger} from '../source/game/player-conversation-ledger.js';
import {relationshipInteractionEligible,relationshipInteractionOutcome} from '../source/game/relationship-interactions.js';
import {socialAttentionFactors} from '../source/game/social-attention.js';
import {createLifeDecisions,mergeSocialMemories} from '../source/game/npc-life-decisions.js';
const context={completedCount:7,relation:.5,trust:.3,knownReputation:.4,knownConduct:.2,knownEvidence:true,knownEvidenceId:'service:3',knownFaultId:null,practicalExperience:2,partnerExperience:1,available:true};
function harness(saved){let seconds=saved?.events?.at(-1)?.cooldownUntil||0,fail=false;const c={...context};const ledger=createPlayerConversationLedger({saved,worldSeed:2,getClock:()=>({seconds,day:0}),getContext:()=>c,getProfile:()=>({traits:{sociability:1,quiet:1,curiosity:1},values:{company:1},needs:{social:1,fatigue:0,hunger:0}}),saveState:()=>!fail});function start(topic){for(let i=0;i<100;i++){seconds+=100;const r=ledger.start('cn-minister-works',topic);assert(r.ok,JSON.stringify(r));if(r.event.status==='accepted')return r.event;}throw Error('no reply');}return {ledger,c,start,fail:v=>fail=v,finish:e=>{seconds+=e.duration;return ledger.complete(e.id,{elapsed:e.duration});}};}
test('hidden actions combine actual evidence, current relation, practical skills and symptoms; numbers alone do not grant support',()=>{
 for(const id of ['support-request','trade-advice'])assert(relationshipInteractionEligible(id,context));
 for(const bad of [{knownEvidence:false},{knownReputation:0},{trust:-.2},{boundary:true},{knownConduct:-.4}])assert(!relationshipInteractionEligible('support-request',{...context,...bad}));
 assert(!relationshipInteractionEligible('trade-advice',{...context,practicalExperience:0}));assert(!relationshipInteractionEligible('trade-advice',{...context,partnerExperience:0}));
 assert(!relationshipInteractionEligible('health-concern',context));assert(relationshipInteractionEligible('health-concern',{...context,healthConcern:true}));
 assert.equal(relationshipInteractionOutcome('support-request',{...context,receptivity:.1}).supportStance,'withhold');assert.equal(relationshipInteractionOutcome('support-request',{...context,receptivity:.9}).supportStance,'support');
 assert(!relationshipInteractionEligible('private-company',{...context,interestGiven:true,interestReceived:true,privatePlaceAvailable:true}),'hidden history does not create adult eligibility');
});
test('actual completed support response persists through failure, repeat, compaction and reload; cancellation never creates a supporter',()=>{
 const h=harness(),aborted=h.start('support-request');h.ledger.cancel(aborted.id);assert.equal(h.ledger.supportFor('cn-minister-works'),null);
 const e=h.start('support-request');h.fail(true);assert.equal(h.finish(e).ok,false);assert.equal(h.ledger.supportFor('cn-minister-works'),null);
 const resumed=harness(h.ledger.snapshot());assert.equal(resumed.ledger.loadError,null);assert(resumed.ledger.retryPending().ok);assert.equal(resumed.ledger.supportFor('cn-minister-works').supportStance,'support');const initial=resumed.ledger.supportFor('cn-minister-works');assert(resumed.ledger.complete(e.id).replayed);assert.deepEqual(resumed.ledger.supportFor('cn-minister-works'),initial);
 for(let i=0;i<132;i++)resumed.finish(resumed.start('gratitude'));
 const loaded=harness(resumed.ledger.snapshot());assert.equal(loaded.ledger.loadError,null);assert.deepEqual({...loaded.ledger.supportFor('cn-minister-works'),trust:initial.trust},initial);assert(!loaded.ledger.topicsFor('cn-minister-works').some(x=>x.id==='support-request'));assert(loaded.ledger.topicsFor('cn-minister-works').some(x=>x.id==='reconsider-support'));
});
test('reconsideration reads a new actual fault at completion, not its older favorable invitation',()=>{
 const h=harness();h.finish(h.start('support-request'));const e=h.start('reconsider-support');h.c.knownReputation=-.4;h.c.knownConduct=-.2;h.c.knownEvidenceId='harm:1';h.c.knownFaultId='harm:1';h.c.trust=-.3;
 const done=h.finish(e);assert(done.ok);assert.equal(done.event.result.supportStance,'withhold');assert.equal(done.event.result.supportFaultId,'harm:1');assert.equal(harness(h.ledger.snapshot()).ledger.loadError,null);
});
test('NPC autonomous existing interaction writer records only the real respondent stance in all four country identities',()=>{
 for(const pair of [['cn-minister-works','cn-minister-rites'],['jp-welcome','jp-market-tea'],['france-gardener','france-cafe'],['egypt-papyrus','egypt-royal-dining']]){
 let found=false;
 for(let seed=1;seed<180&&!found;seed++){
 const state=createLifeDecisions({worldSeed:seed,actorIds:pair}).snapshot();
 for(const [i,id]of pair.entries()){const target=pair[1-i],p=state.people[id];p.random=seed;p.needs={social:1,hunger:0,fatigue:0};p.traits={curiosity:1,quiet:1,sociability:1,outdoors:1,appetite:1};p.values={company:1,quiet:1,curiosity:1};p.relations[target]=.5;p.interactions[target]={completedCount:7,trust:.3,lastCompletedId:'prior:1'};p.experiences=[{id:'actual-work',kind:'staff-work',completedAt:0}];}
 const brain=createLifeDecisions({worldSeed:seed,actorIds:pair,saved:state,interactionContext:()=>({...context})});
 const choice=brain.choose(pair[0],[{id:'conversation',experienceId:'actual-work',duration:[9,9],targets:[{id:pair[1]}]}]);if(choice?.interactionKind!=='support-request')continue;
 const e=brain.invite(pair[0],choice);if(e.status!=='accepted')continue;assert(brain.finishConversation(e.id,{elapsed:e.duration,arrived:pair}).ok);
 assert.equal(brain.state(pair[1]).interactions[pair[0]].supportStance,'support');assert.equal(brain.state(pair[0]).interactions[pair[1]].supportStance,undefined);const loaded=createLifeDecisions({actorIds:pair,saved:brain.snapshot()});assert.equal(loaded.state(pair[1]).interactions[pair[0]].supportEventId,e.id);found=true;
 }
 assert(found,'actual invitation should eventually choose support action '+pair);
 }
});

test('different original NPC controllers preserve the latest world-clock stance while merging memories',()=>{
 const first={p:{completedCount:2,supportStance:'support',supportEventId:'first',supportAt:50}},newer={p:{completedCount:1,supportStance:'withhold',supportEventId:'later',supportAt:70}};
 for(const merged of [mergeSocialMemories(first,newer),mergeSocialMemories(newer,first)]){assert.equal(merged.p.supportStance,'withhold');assert.equal(merged.p.supportEventId,'later');assert.equal(merged.p.completedCount,3);}
});

test('appearance cannot offset a source-confirmed unresolved fault even when older reputation was positive',()=>{
 const factors=socialAttentionFactors({observer:{ageYears:30,reputationForTarget:.8},target:{id:'player',ageYears:24},appearanceAffinity:1,situation:{unresolvedFault:true}});assert(factors.distrust);assert.equal(factors.acceptanceAppearance,0);assert.equal(factors.attraction,0);
});
test('production main combines individual support and unresolved evidence at the existing decision boundary',async()=>{
 const {readFileSync}=await import('node:fs'),main=readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
 const body=main.slice(main.indexOf('function socialFactorsFor('),main.indexOf('\nfunction relationshipMemory('));
 let fault=null,repair=null,active=false,reads=0;const actor={station:{id:'france-gardener',ageYears:35},root:{userData:{}}};
 const factors=new Function('npcs','player','saved','playerSocialContext','getNPCProfile','relationshipEvents','playerConversations','socialAttentionFactors','individualAppearanceAffinity',body+';return socialFactorsFor;')([actor],{}, {playerProfile:{ageYears:24},appearance:{seed:1,player:{shapeTraits:{}}}},null,()=>({traits:{sociability:.5}}),{knownReputation:()=>.1,knownConduct:()=>({lastFault:fault}),stanceFor:()=>{reads++;return {active};}}, {repairFor:()=>repair},socialAttentionFactors,()=>1);
 const before=factors('france-gardener');active=true;const supported=factors('france-gardener');assert.equal(reads,2);assert.equal(supported.acceptanceContext-before.acceptanceContext,.02);
 fault={id:'actual-harm'};active=false;const broken=factors('france-gardener');assert.equal(broken.acceptanceAppearance,0);assert.equal(broken.attraction,0);repair='actual-harm';assert.equal(factors('france-gardener').acceptanceAppearance,.04);
});
