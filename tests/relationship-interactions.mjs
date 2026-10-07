import test from 'node:test';
import assert from 'node:assert/strict';
import {relationshipStage, relationshipInteractionOptions, relationshipInteractionEligible, RELATIONSHIP_INTERACTIONS} from '../source/game/relationship-interactions.js';
import {createPlayerConversationLedger} from '../source/game/player-conversation-ledger.js';
const clone = x => JSON.parse(JSON.stringify(x));
const context = {completedCount: 7, relation: .4, trust: .3, age: 25, selfAge: 24, lastCompletedId: 'real-memory', faultEventId: 'real-fault', privatePlaceAvailable: true};
function harness(saved) {
  let seconds = saved?.events?.at(-1)?.cooldownUntil || 100, fail = false;
  const c = {...context};
  const settings = {saved, worldSeed: 2, getContext: () => c, getClock: () => ({seconds,day:0}),
    getProfile: () => ({traits:{sociability:1,curiosity:1,quiet:1},needs:{social:1,fatigue:0,hunger:0}}),
    saveState: () => !fail};
  const ledger = createPlayerConversationLedger(settings);
  const run = (id, options={}) => {
    for (let tries=0; tries<100; tries++) {
      seconds += 100;
      const start = ledger.start('listener',id,options);
      assert.equal(start.ok,true,JSON.stringify(start));
      if (start.event.status === 'declined') continue;
      seconds += start.event.duration;
      return ledger.complete(start.event.id,{elapsed:start.event.duration});
    }
    throw Error('no acceptance');
  };
  return {ledger,c,run,fail:v=>{fail=v;},advance:()=>{seconds+=100;}};
}
test('stages expose finite multiple actual actions and require real memory/fault and recorded adult ages',()=>{
  assert.equal(relationshipStage({}),'stranger');
  assert.equal(relationshipStage({completedCount:1}),'acquainted');
  assert.equal(relationshipStage({completedCount:3}),'familiar');
  assert.equal(relationshipStage(context),'trusted');
  assert.ok(relationshipInteractionOptions(context).length >= 7);
  assert.equal(relationshipInteractionEligible('apology',{...context,faultEventId:null}),false);
  assert.equal(relationshipInteractionEligible('shared-memory',{...context,lastCompletedId:null}),false);
  for (const age of [undefined,17]) assert.equal(relationshipInteractionEligible('express-interest',{...context,age}),false);
  assert.equal(relationshipInteractionEligible('private-company',{...context,interestGiven:true,interestReceived:true,privatePlaceAvailable:false}),false);
  assert.ok(RELATIONSHIP_INTERACTIONS.every(a=>a.duration>=6&&a.duration<=10));
});
test('real reciprocal expressions, per-occasion consent, boundary, and directed effects survive reload',()=>{
  const h=harness();
  assert.equal(h.ledger.start('listener','private-company',{explicitConsent:true}).reason,'interaction-unavailable');
  h.run('express-interest');
  assert.equal(h.ledger.relationshipFor('listener').interestGiven,true);
  assert.equal(h.ledger.relationshipFor('listener').interestReceived,false);
  h.run('respond-interest',{initiator:'npc'});
  assert.equal(h.ledger.relationshipFor('listener').stage,'affection');
  h.advance();
  assert.equal(h.ledger.start('listener','private-company').reason,'explicit-consent-required');
  const result=h.run('private-company',{explicitConsent:true});
  assert.equal(result.event.result.explicitConsent,true);
  assert.ok(h.ledger.relationshipFor('listener').playerRelation>0);
  const loaded=harness(h.ledger.snapshot());
  assert.equal(loaded.ledger.loadError,null);
  assert.equal(loaded.ledger.relationshipFor('listener').stage,'affection');
  loaded.advance();
  assert.equal(loaded.ledger.start('listener','private-company').reason,'explicit-consent-required');
  loaded.run('boundary');
  assert.equal(loaded.ledger.topicsFor('listener').some(a=>a.romantic),false);
});
test('failed actual completion exposes no reward, reload retries once, rejects fabricated new-kind results',()=>{
  const h=harness(); h.advance();
  let start=h.ledger.start('listener','gratitude');
  while(start.event.status==='declined'){h.advance();start=h.ledger.start('listener','gratitude');}
  h.fail(true); h.advance();
  const failed=h.ledger.complete(start.event.id,{elapsed:start.event.duration});
  assert.equal(failed.reason,'save-failed');
  assert.equal(h.ledger.relationFor('listener'),0);
  const saved=h.ledger.snapshot(), loaded=harness(saved);
  assert.equal(loaded.ledger.retryPending().ok,true);
  assert.equal(loaded.ledger.relationFor('listener'),failed.event.result.relation);
  loaded.ledger.complete(start.event.id);
  assert.equal(loaded.ledger.relationFor('listener'),failed.event.result.relation);
  const malformed=clone(saved); malformed.events.at(-1).result.trust=1;
  assert.equal(harness(malformed).ledger.loadError,'invalid-saved-state');
});
test('private availability is checked again at completion; cancellation has no romantic result',()=>{
  const h=harness(); h.run('express-interest');h.run('respond-interest',{initiator:'npc'});h.advance();
  let start=h.ledger.start('listener','private-company',{explicitConsent:true});
  while(start.event.status==='declined'){h.advance();start=h.ledger.start('listener','private-company',{explicitConsent:true});}
  const before=h.ledger.relationFor('listener');h.c.privatePlaceAvailable=false;h.advance();
  const end=h.ledger.complete(start.event.id,{elapsed:start.event.duration});
  assert.equal(end.event.status,'cancelled');assert.equal(end.event.result,undefined);assert.equal(h.ledger.relationFor('listener'),before);
});
test('compaction retains directional interest, boundary and repaired evidence without duplicate completion',()=>{
  const h=harness();h.run('express-interest');h.run('respond-interest',{initiator:'npc'});
  const apology=h.run('apology');assert.equal(h.ledger.topicsFor('listener').some(a=>a.id==='apology'),false);
  for(let i=0;i<135;i++)h.run('gratitude');
  const saved=h.ledger.snapshot();assert.ok(saved.archive.throughSerial>0);
  const loaded=harness(saved);assert.equal(loaded.ledger.loadError,null);
  assert.equal(loaded.ledger.relationshipFor('listener').stage,'affection');
  assert.equal(loaded.ledger.topicsFor('listener').some(a=>a.id==='apology'),false);
  assert.equal(loaded.ledger.complete(apology.event.id).reason,'unknown-event');
});

test('observer-specific receptivity distinguishes clarification and heard-but-not-forgiven apology', async()=>{
  const {relationshipInteractionOutcome}=await import('../source/game/relationship-interactions.js');
  const low=relationshipInteractionOutcome('apology',{...context,receptivity:.1});
  const high=relationshipInteractionOutcome('apology',{...context,receptivity:.9});
  assert.equal(low.forgiven,false);assert.equal(low.repairedEventId,undefined);assert.equal(high.forgiven,true);
  assert.equal(relationshipInteractionOutcome('argument',{receptivity:.9}).feeling,'neutral');
  assert.equal(relationshipInteractionOutcome('argument',{receptivity:.1}).feeling,'mismatched');
  assert.notEqual(low.relation,high.relation);
});

test('private offer records only NPC willingness; confirmation keeps ID/roll through failed saves and reload',()=>{
  const h=harness();h.run('express-interest');h.run('respond-interest',{initiator:'npc'});h.advance();
  let proposed=h.ledger.offer('listener','private-company');
  while(proposed.event.status==='declined'){h.advance();proposed=h.ledger.offer('listener','private-company');}
  const offer=proposed.event;
  assert.equal(offer.status,'offered');assert.equal(offer.interactionContext.explicitConsent,false);
  assert.equal(h.ledger.progress(offer.id,10).elapsed,0);
  assert.equal(h.ledger.complete(offer.id,{elapsed:10}).reason,'not-accepted');
  const loaded=harness(h.ledger.snapshot());assert.equal(loaded.ledger.loadError,null);
  loaded.fail(true);assert.equal(loaded.ledger.confirm(offer.id).reason,'save-failed');assert.equal(loaded.ledger.active().status,'offered');
  loaded.fail(false);const confirmed=loaded.ledger.confirm(offer.id);
  assert.equal(confirmed.event.id,offer.id);assert.equal(confirmed.event.roll,offer.roll);assert.equal(confirmed.event.status,'accepted');
  assert.equal(confirmed.event.interactionContext.explicitConsent,true);
  assert.equal(loaded.ledger.confirm(offer.id).replayed,true);
  const resumed=harness(loaded.ledger.snapshot());assert.equal(resumed.ledger.loadError,null);
  const finished=resumed.ledger.complete(offer.id,{elapsed:10});assert.equal(finished.ok,true);assert.equal(finished.event.result.explicitConsent,true);
});
test('private offer withdrawal and lost privacy cancel without results and reload cleanly',()=>{
  for(const lost of [false,true]){
    const h=harness();h.run('express-interest');h.run('respond-interest',{initiator:'npc'});h.advance();
    let proposal=h.ledger.offer('listener','private-company');
    while(proposal.event.status==='declined'){h.advance();proposal=h.ledger.offer('listener','private-company');}
    h.advance();h.c.privatePlaceAvailable=!lost;
    const result=lost?h.ledger.confirm(proposal.event.id):h.ledger.cancel(proposal.event.id,'player-declined');
    assert.equal(result.event.status,'cancelled');assert.equal(result.event.result,undefined);assert.equal(harness(h.ledger.snapshot()).ledger.loadError,null);
  }
});

test('historical reciprocal interest never overrides current distrust or per-occasion consent', async()=>{
 const {relationshipInteractionOutcome}=await import('../source/game/relationship-interactions.js');
 const past={...context,interestGiven:true,interestReceived:true};
 for(const bad of [{trust:-.3},{relation:-.4},{opinion:-.4},{aversion:.4}])for(const id of ['flirt','private-company','public-invitation'])assert.equal(relationshipInteractionEligible(id,{...past,...bad}),false);
 assert.equal(relationshipInteractionOutcome('private-company',{...past,explicitConsent:false}),null);
 const h=harness();h.run('express-interest');h.run('respond-interest',{initiator:'npc'});const done=h.run('private-company',{explicitConsent:true}),bad=clone(h.ledger.snapshot());bad.events.find(e=>e.id===done.event.id).interactionContext.explicitConsent=false;
 assert.equal(harness(bad).ledger.loadError,'invalid-saved-state');
});
