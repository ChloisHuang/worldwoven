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

// Reproduce list-size/order bias without loading a scene or drawing frames.
test('action mass and actor RNG are independent of population, target count and enumeration order',()=>{
 const options=[{id:'read',base:1,duration:[3,6]},{id:'tea',base:2,duration:[3,6],targets:[{id:'table-a',base:1},{id:'table-b',base:3}]}];
 const expanded=[options[1],options[0],{...options[1]}].map(c=>c.targets?{...c,targets:[...c.targets.slice().reverse(),{...c.targets[0]},{id:'table-c',base:5}]}:c);
 const a=createLifeDecisions({worldSeed:71,actorIds:['actor']}),b=createLifeDecisions({worldSeed:71,actorIds:['irrelevant','actor']});
 const mass=model=>model.map(({id,probability})=>({id,probability}));
 assert.deepEqual(mass(a.distribution('actor',options)),mass(b.distribution('actor',expanded)));
 assert.deepEqual(a.distribution('actor',options),b.distribution('actor',[options[1],options[0]].map(c=>c.targets?{...c,targets:[...c.targets.slice().reverse(),{...c.targets[0]}]}:c)));
 for(let i=0;i<30;i++){
  b.choose('irrelevant',[{id:'elsewhere'}]);const x=a.choose('actor',options),y=b.choose('actor',expanded);
  assert.equal(x.id,y.id);assert.equal(x.duration,y.duration);assert.equal(a.state('actor').random,b.state('actor').random);
  a.complete('actor',x);b.complete('actor',y);a.tick(60);b.tick(60);
 }
 const one=createLifeDecisions({worldSeed:71,actorIds:['actor']}),shuffled=createLifeDecisions({worldSeed:71,actorIds:['actor']});
 assert.deepEqual(one.choose('actor',options),shuffled.choose('actor',[options[1],options[0]].map(c=>c.targets?{...c,targets:c.targets.slice().reverse()}:c)));
});

test('traits change action odds while relationship changes only conditional target odds',()=>{
 const seed=createLifeDecisions({worldSeed:71,actorIds:['actor']}).snapshot();
 const options=[{id:'read',base:.2,traits:{quiet:2}},{id:'visit',base:.2,traits:{sociability:2},targets:[{id:'friend',relationship:{target:'friend',weight:2}},{id:'stranger',relationship:{target:'stranger',weight:2}}]}];
 const a=structuredClone(seed),b=structuredClone(seed);a.people.actor.traits.quiet=1;a.people.actor.traits.sociability=0;b.people.actor.traits.quiet=0;b.people.actor.traits.sociability=1;b.people.actor.relations.friend=.8;
 const quiet=createLifeDecisions({actorIds:['actor'],saved:a}),social=createLifeDecisions({actorIds:['actor'],saved:b});
 const q=quiet.distribution('actor',options),s=social.distribution('actor',options);
 assert(q.find(x=>x.id==='read').probability>.8);assert(s.find(x=>x.id==='visit').probability>.8);
 const targets=s.find(x=>x.id==='visit').targets;assert(targets[0].probability>targets[1].probability);
 b.people.actor.relations.friend=0;const unfamiliar=createLifeDecisions({actorIds:['actor'],saved:b}).distribution('actor',options);
 assert.equal(s.find(x=>x.id==='visit').probability,unfamiliar.find(x=>x.id==='visit').probability);
});

test('empty/unreachable target pools make no draws; a saved target never changes during a commitment',()=>{
 const model=createLifeDecisions({actorIds:['actor']});const empty=[{id:'visit',targets:[]},{id:'rest',available:false},{id:'tea',targets:[{id:'blocked',reachable:false}]}];
 const before=model.state('actor');for(let frame=0;frame<20;frame++){assert.equal(model.choose('actor',empty),null);model.tick(.01);}
 assert.equal(model.state('actor').random,before.random);assert.equal(model.state('actor').choices,0);
 const options=[{id:'visit',targets:[{id:'a'},{id:'b'}]}];assert.equal(model.choose('actor',options),null,'The per-actor retry clock prevents a frame lottery');model.tick(6);
 const selected=model.choose('actor',options),saved=model.snapshot(),restored=createLifeDecisions({actorIds:['actor'],saved});
 assert.equal(restored.choose('actor',[{...options[0],targets:options[0].targets.slice().reverse()}]).targetId,selected.targetId);
 assert.equal(restored.state('actor').random,saved.people.actor.random);
 const unavailable=[{id:'visit',targets:options[0].targets.map(t=>({...t,available:false}))}];assert.equal(restored.choose('actor',unavailable),null);
 assert.equal(restored.state('actor').choices,1);assert.equal(restored.state('actor').random,saved.people.actor.random);
});

test('only informed observers evaluate a completed conversation, individually and once',()=>{
 const ids=['speaker','sociable','private','uninformed','familiar'];
 const saved=createLifeDecisions({actorIds:ids}).snapshot();
 for(const id of ['sociable','familiar'])saved.people[id].values={company:1,quiet:0};
 saved.people.private.values={company:0,quiet:1};saved.people.familiar.relations.speaker=1;
 const model=createLifeDecisions({actorIds:ids,saved}),conversation={id:'visit',targets:[{id:'sociable'}],socialEvent:{values:{company:1,quiet:-1},strength:.1}};
 const choice=model.choose('speaker',[conversation]),observers=[{id:'sociable',knowledge:'participant'},{id:'private',knowledge:'witness'},{id:'familiar',knowledge:'told'},{id:'uninformed'}];
 model.observe('speaker',choice,{observers});const observed=model.snapshot();
 assert(model.state('sociable').opinions.speaker>0);assert(model.state('private').opinions.speaker<0);
 assert(model.state('familiar').opinions.speaker>model.state('sociable').opinions.speaker);
 assert.equal(model.state('uninformed').opinions.speaker,undefined);assert.deepEqual(model.state('speaker').opinions,{});
 const restored=createLifeDecisions({actorIds:ids,saved:observed});restored.observe('speaker',choice,{observers});assert.deepEqual(restored.snapshot(),observed);
 model.complete('speaker',choice,{observers});assert.deepEqual(model.state('sociable').opinions,observed.people.sociable.opinions);
 model.tick(50);const next=model.choose('speaker',[conversation]);model.complete('speaker',next,{fulfilled:false,observers});assert.deepEqual(model.state('private').opinions,observed.people.private.opinions);
});
