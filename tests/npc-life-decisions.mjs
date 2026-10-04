import test from 'node:test';
import assert from 'node:assert/strict';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
const choices=[{id:'read',base:.2,traits:{curiosity:.8},duration:[8,12],cooldown:40},{id:'rest',base:.05,needs:{fatigue:3},relief:{fatigue:-.6},duration:[12,18],cooldown:45},{id:'visit',base:.1,needs:{social:2},duration:[7,12],cooldown:40}];
test('a commitment survives ticks and saves without rerolling; cooldown prevents a loop',()=>{
 const first=createLifeDecisions({worldSeed:42,actorIds:['royal']});const pick=first.choose('royal',choices);const before=first.state('royal');first.tick(20);
 assert.equal(first.choose('royal',choices).id,pick.id);assert.equal(first.state('royal').random,before.random);assert.equal(first.state('royal').choices,1);
 const restored=createLifeDecisions({worldSeed:42,actorIds:['royal'],saved:first.snapshot()});assert.deepEqual(restored.choose('royal',choices),first.choose('royal',choices));
 first.complete('royal',pick);restored.complete('royal',pick);const a=first.choose('royal',choices),b=restored.choose('royal',choices);assert.deepEqual(a,b);assert.notEqual(a.id,pick.id);
});
test('needs change selection probabilities; blocked facilities never become a choice',()=>{
 let tiredRest=0,freshRest=0;for(let seed=1;seed<=120;seed++){
  const init=createLifeDecisions({worldSeed:seed,actorIds:['royal']}).snapshot();
  for(const tired of[false,true]){const saved=structuredClone(init);saved.people.royal.needs.fatigue=tired?.95:.01;const brain=createLifeDecisions({actorIds:['royal'],saved});const c=brain.choose('royal',[...choices.map(x=>x.id==='visit'?{...x,available:false}:x)]);assert.notEqual(c.id,'visit');if(c.id==='rest'){if(tired)tiredRest++;else freshRest++;}}
 }assert(tiredRest>freshRest+35,{tiredRest,freshRest});
});

test('familiarity is saved only after a completed visit to the actual person',()=>{
 const brain=createLifeDecisions({worldSeed:42,actorIds:['royal']}),visit={id:'visit',relationship:{target:'cn-tea',gain:.08,weight:.6},duration:[8,8]};
 brain.choose('royal',[visit]);brain.complete('royal',visit,{fulfilled:false});assert.equal(brain.state('royal').relations['cn-tea'],undefined);brain.tick(50);brain.choose('royal',[visit]);brain.complete('royal',visit);assert.equal(brain.state('royal').relations['cn-tea'],.08);
 const restored=createLifeDecisions({actorIds:['royal'],saved:brain.snapshot()});assert.equal(restored.state('royal').relations['cn-tea'],.08);
});
