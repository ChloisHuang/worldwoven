// Focused regression: saved thresholds and elapsed-time contact accumulation
// must not become frame roulette, remote contagion or replayable clinic rewards.
// Actual interaction IDs and progress survive reload; the clock owns recovery.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHealth} from '../source/game/game-health.js';

const make=(saved,actorIds=['source','visitor'])=>createGameHealth({worldSeed:24,actorIds,saved});
const condition=(model,id,name='mistbell')=>model.snapshot().people[id].conditions[name];
const person=(id,extra={})=>({id,sceneId:'china-clinic',position:{x:id==='source'?0:.5,y:0,z:0},...extra});
const encounter=(extra={})=>({actors:[person('source'),person('visitor')],interactions:[{source:'conversation',id:'conversation-1',number:1,participants:['source','visitor']}],...extra});
function advance(model,dt,{interactions=[],...context}={}){
 const progress=model.snapshot().interactionProgress;
 model.tick(dt,{...context,interactions:interactions.map(event=>({...event,duration:(progress[event.source]&&progress[event.source].number===event.number?progress[event.source].duration:0)+dt}))});
}
function sourceSave(name='mistbell'){
 const saved=make().snapshot();Object.assign(saved.people.source.conditions[name],{stage:'ill',remaining:240});return saved;
}
function nearEqual(actual,expected,path='snapshot'){
 if(typeof actual==='number'){assert(Math.abs(actual-expected)<1e-8,`${path}: ${actual} != ${expected}`);return;}
 if(actual&&typeof actual==='object'){assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(actual))nearEqual(actual[key],expected[key],path+'.'+key);return;}
 assert.equal(actual,expected,path);
}

test('elapsed-time equivalence crosses onset, stages, care expiry and immunity without frame rolls',()=>{
 const saved=sourceSave(),whole=make(saved),parts=make(saved);
 for(const model of[whole,parts])assert(model.applyCare('visitor',{providerId:'clinic-fixture',receiptNumber:1}));
 const context=encounter({actors:[person('source'),person('visitor',{needs:{fatigue:.7,hunger:.4},exertion:.9})]});
 advance(whole,1500,context);for(let i=0;i<600;i++)advance(parts,2.5,context);
 nearEqual(whole.snapshot(),parts.snapshot());
 assert.equal(condition(whole,'source').stage,'well');
});

test('healthy defaults stay healthy; other-scene and undocumented contacts add no exposure',()=>{
 const healthy=make();advance(healthy,10000,encounter());
 for(const id of['source','visitor'])assert.deepEqual(healthy.status(id),{symptoms:[],restRecommended:false,absenceRecommended:false,careStatus:'none'});
 const saved=sourceSave();
 for(const context of[
  encounter({interactions:[{participants:['source','visitor']}]}),
  encounter({actors:[person('source'),person('visitor',{sceneId:'japan'})]}),
  encounter({actors:[person('source')]}),
  encounter({interactions:[]})
 ]){const model=make(saved);advance(model,100,context);assert.equal(condition(model,'visitor').dose,0);assert.equal(condition(model,'visitor').stage,'well');}
 // Remote population, ordering and duplicate pair descriptions do not bias risk.
 const ordinary=make(saved),expanded=make(saved,['remote','visitor','source']);
 advance(ordinary,20,encounter());advance(expanded,20,encounter({actors:[person('remote',{sceneId:'egypt'}),person('visitor'),person('source')],interactions:[{source:'conversation',id:'conversation-1',number:1,participants:['visitor','source']},{source:'conversation',id:'conversation-1',number:1,participants:['source','visitor']}]}));
 assert.deepEqual(expanded.snapshot().people.visitor,ordinary.snapshot().people.visitor);
});

test('only the invented contagious condition transmits; exertion weariness needs personal exertion',()=>{
 const noninfectious=make(sourceSave('ember-weariness'));advance(noninfectious,200,encounter());
 assert.equal(condition(noninfectious,'visitor').dose,0);assert.equal(condition(noninfectious,'visitor','ember-weariness').dose,0);
 const contact=make(sourceSave());advance(contact,20,encounter());assert(condition(contact,'visitor').dose>0);
 const exerting=make();advance(exerting,160,{actors:[person('visitor',{exertion:1,needs:{fatigue:1,hunger:.7},hygiene:.3})]});
 assert.notEqual(condition(exerting,'visitor','ember-weariness').stage,'well');assert.equal(condition(exerting,'visitor').dose,0);
});

test('contact duration accumulates risk; protection and healthier inputs lower the same seeded exposure',()=>{
 const saved=sourceSave(),brief=make(saved),long=make(saved),protectedModel=make(saved),burdened=make(saved);
 advance(brief,5,encounter());advance(long,20,encounter());
 advance(protectedModel,20,encounter({interactions:[{source:'conversation',id:'conversation-1',number:1,participants:['source','visitor'],protection:.8}]}));
 advance(burdened,20,encounter({actors:[person('source'),person('visitor',{needs:{fatigue:.9,hunger:.8},hygiene:.2})]}));
 assert(condition(long,'visitor').dose>condition(brief,'visitor').dose);
 assert(condition(protectedModel,'visitor').dose<condition(long,'visitor').dose);
 assert(condition(burdened,'visitor').dose>condition(long,'visitor').dose);
 assert.equal(condition(brief,'visitor').stage,'well','one brief contact is not a guaranteed illness');
 const frailSave=structuredClone(saved),sturdySave=structuredClone(saved);
 frailSave.people.visitor.constitution=0;sturdySave.people.visitor.constitution=1;
 const frail=make(frailSave),sturdy=make(sturdySave);advance(frail,20,encounter());advance(sturdy,20,encounter());
 assert(condition(frail,'visitor').dose>condition(sturdy,'visitor').dose);
});

test('a saved contact continues identically, including hidden incubation and condition-specific immunity',()=>{
 const live=make(sourceSave());advance(live,50,encounter());
 const restored=make(JSON.parse(JSON.stringify(live.snapshot())));
 advance(live,220,encounter());advance(restored,220,encounter());assert.deepEqual(restored.snapshot(),live.snapshot());
 const seeded=sourceSave();Object.assign(seeded.people.visitor.conditions.mistbell,{stage:'incubating',remaining:5});
 const phases=make(seeded);assert.deepEqual(phases.status('visitor').symptoms,[]);advance(phases,5);assert(phases.status('visitor').absenceRecommended);
 advance(phases,500);assert.equal(condition(phases,'visitor').stage,'well');assert(condition(phases,'visitor').immuneFor>0);
 assert.equal(condition(phases,'visitor','ember-weariness').immuneFor,0);
 const immune=phases.snapshot();Object.assign(immune.people.source.conditions.mistbell,{stage:'ill',remaining:240,immuneFor:0});
 const protectedByHistory=make(immune);advance(protectedByHistory,100,encounter());assert.equal(condition(protectedByHistory,'visitor').dose,0);
});

test('rest, nutrition, hygiene and idempotent saved care support recovery without an instant cure',()=>{
 const saved=sourceSave('ember-weariness'),ordinary=make(saved),supported=make(saved),rested=make(saved),fed=make(saved),clean=make(saved);
 assert(supported.applyCare('source',{providerId:'china-clinic',receiptNumber:7}));
 assert.equal(condition(supported,'source','ember-weariness').remaining,240);
 assert.equal(supported.status('source').careStatus,'support-active');
 const poor={needs:{fatigue:.8,hunger:.8},hygiene:.2};
 advance(ordinary,60,{actors:[person('source',poor)]});advance(supported,60,{actors:[person('source',poor)]});
 advance(rested,60,{actors:[person('source',{...poor,resting:true})]});
 advance(fed,60,{actors:[person('source',{...poor,nutrition:1})]});
 advance(clean,60,{actors:[person('source',{...poor,hygiene:1})]});
 for(const model of[supported,rested,fed,clean])assert(condition(model,'source','ember-weariness').remaining<condition(ordinary,'source','ember-weariness').remaining);
 const restored=make(JSON.parse(JSON.stringify(supported.snapshot()))),before=restored.snapshot();
 assert.equal(restored.applyCare('source',{providerId:'china-clinic',receiptNumber:7}),false);
 assert.equal(restored.applyCare('source',{providerId:'china-clinic',receiptNumber:6}),false);assert.deepEqual(restored.snapshot(),before);
 advance(supported,60);advance(restored,60);assert.deepEqual(restored.snapshot(),supported.snapshot());
 advance(restored,500,{actors:[person('source',{resting:true})]});assert.equal(condition(restored,'source','ember-weariness').stage,'well');
 assert.equal(restored.status('source').absenceRecommended,false);assert.equal(restored.status('source').careStatus,'none');
});


test('same event progress, old events and changed participants cannot replay after reload',()=>{
 const model=make(sourceSave(),['source','visitor','bystander']),context=encounter();
 const event={...context.interactions[0],duration:20};model.tick(20,{actors:context.actors,interactions:[event,event]});
 const saved=model.snapshot(),replay=make(saved,['source','visitor','bystander']),clockOnly=make(saved,['source','visitor','bystander']);
 replay.tick(20,{actors:context.actors,interactions:[event,{...event,participants:['source','bystander'],duration:40}]});clockOnly.tick(20,{actors:context.actors});
 assert.deepEqual(replay.snapshot(),clockOnly.snapshot());assert.equal(condition(replay,'bystander').dose,0);
 const next={...event,id:'conversation-2',number:2,duration:1};replay.tick(1,{actors:context.actors,interactions:[next]});
 const after=replay.snapshot(),again=make(after,['source','visitor','bystander']);
 replay.tick(1,{actors:context.actors,interactions:[{...event,duration:500}]});again.tick(1,{actors:context.actors});assert.deepEqual(replay.snapshot(),again.snapshot());
 assert.equal(Object.keys(replay.snapshot().interactionProgress).length,1,'one bounded watermark per source');
});


test('excess is receipt-backed, seeded and elapsed-time based; continued strain delays gradual recovery',()=>{
 const foodEvidence={source:'china-tavern-meal',id:'cn-tavern-order-3-consumed',number:3,actorId:'visitor',dishId:'yunlai-mushroom-rice'},dailyNeeds={excessFoodStrain:1,foodEvidence};
 const context={actors:[person('visitor',{dailyNeeds})]},whole=make(),parts=make();advance(whole,180,context);for(let i=0;i<180;i++)advance(parts,1,context);nearEqual(whole.snapshot(),parts.snapshot());
 const noReceipt=make();advance(noReceipt,1000,{actors:[person('visitor',{dailyNeeds:{excessFoodStrain:1}})]});assert.equal(condition(noReceipt,'visitor','laden-grain').dose,0);assert.equal(condition(noReceipt,'visitor','laden-grain').stage,'well');
 const wrongPerson=make();advance(wrongPerson,1000,{actors:[person('visitor',{dailyNeeds:{...dailyNeeds,foodEvidence:{...foodEvidence,actorId:'source'}}})]});assert.equal(condition(wrongPerson,'visitor','laden-grain').dose,0);
 const seed=whole.snapshot();Object.assign(seed.people.visitor.conditions['laden-grain'],{stage:'ill',remaining:200});const continuing=make(seed),easing=make(seed),rested=make(seed);advance(continuing,30,context);advance(easing,30,{actors:[person('visitor',{dailyNeeds:{excessFoodStrain:0}})]});advance(rested,30,{actors:[person('visitor',{resting:true,dailyNeeds})]});
 assert(condition(easing,'visitor','laden-grain').remaining<condition(continuing,'visitor','laden-grain').remaining);assert(condition(rested,'visitor','laden-grain').remaining<condition(continuing,'visitor','laden-grain').remaining);assert.equal(condition(continuing,'visitor','laden-grain').stage,'ill');
 const cautious=make();const high=cautious.snapshot();high.people.visitor.conditions['laden-grain'].threshold=100;const resilient=make(high);advance(resilient,180,context);assert.equal(condition(resilient,'visitor','laden-grain').stage,'well','excess is a persistent risk, not a guaranteed threshold verdict');
});
