// Focused regression: saved thresholds and elapsed-time contact accumulation
// must not become frame roulette, remote contagion or replayable clinic rewards.
// This pure model is not wired to the world or the existing clinic service yet.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHealth} from '../source/game/game-health.js';

const make=(saved,actorIds=['source','visitor'])=>createGameHealth({worldSeed:24,actorIds,saved});
const condition=(model,id,name='mistbell')=>model.snapshot().people[id].conditions[name];
const person=(id,extra={})=>({id,sceneId:'china-clinic',position:{x:id==='source'?0:.5,y:0,z:0},...extra});
const encounter=(extra={})=>({actors:[person('source'),person('visitor')],contacts:[{a:'source',b:'visitor'}],...extra});
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
 whole.tick(1500,context);for(let i=0;i<600;i++)parts.tick(2.5,context);
 nearEqual(whole.snapshot(),parts.snapshot());
 assert.equal(condition(whole,'source').stage,'well');
});

test('healthy defaults stay healthy; distant, other-scene and undocumented contacts add no exposure',()=>{
 const healthy=make();healthy.tick(10000,encounter());
 for(const id of['source','visitor'])assert.deepEqual(healthy.status(id),{symptoms:[],restRecommended:false,absenceRecommended:false,careStatus:'none'});
 const saved=sourceSave();
 for(const context of[
  encounter({actors:[person('source'),person('visitor',{position:{x:8,y:0,z:0}})]}),
  encounter({actors:[person('source'),person('visitor',{sceneId:'japan'})]}),
  encounter({actors:[person('source'),person('visitor',{position:null})]}),
  encounter({contacts:[]})
 ]){const model=make(saved);model.tick(100,context);assert.equal(condition(model,'visitor').dose,0);assert.equal(condition(model,'visitor').stage,'well');}
 // Remote population, ordering and duplicate pair descriptions do not bias risk.
 const ordinary=make(saved),expanded=make(saved,['remote','visitor','source']);
 ordinary.tick(20,encounter());expanded.tick(20,encounter({actors:[person('remote',{sceneId:'egypt'}),person('visitor'),person('source')],contacts:[{a:'visitor',b:'source'},{a:'source',b:'visitor'}]}));
 assert.deepEqual(expanded.snapshot().people.visitor,ordinary.snapshot().people.visitor);
});

test('only the invented contagious condition transmits; exertion weariness needs personal exertion',()=>{
 const noninfectious=make(sourceSave('ember-weariness'));noninfectious.tick(200,encounter());
 assert.equal(condition(noninfectious,'visitor').dose,0);assert.equal(condition(noninfectious,'visitor','ember-weariness').dose,0);
 const contact=make(sourceSave());contact.tick(20,encounter());assert(condition(contact,'visitor').dose>0);
 const exerting=make();exerting.tick(160,{actors:[person('visitor',{exertion:1,needs:{fatigue:1,hunger:.7},hygiene:.3})]});
 assert.notEqual(condition(exerting,'visitor','ember-weariness').stage,'well');assert.equal(condition(exerting,'visitor').dose,0);
});

test('contact duration accumulates risk; protection and healthier inputs lower the same seeded exposure',()=>{
 const saved=sourceSave(),brief=make(saved),long=make(saved),protectedModel=make(saved),burdened=make(saved);
 brief.tick(5,encounter());long.tick(20,encounter());
 protectedModel.tick(20,encounter({contacts:[{a:'source',b:'visitor',protection:.8}]}));
 burdened.tick(20,encounter({actors:[person('source'),person('visitor',{needs:{fatigue:.9,hunger:.8},hygiene:.2})]}));
 assert(condition(long,'visitor').dose>condition(brief,'visitor').dose);
 assert(condition(protectedModel,'visitor').dose<condition(long,'visitor').dose);
 assert(condition(burdened,'visitor').dose>condition(long,'visitor').dose);
 assert.equal(condition(brief,'visitor').stage,'well','one brief contact is not a guaranteed illness');
 const frailSave=structuredClone(saved),sturdySave=structuredClone(saved);
 frailSave.people.visitor.constitution=0;sturdySave.people.visitor.constitution=1;
 const frail=make(frailSave),sturdy=make(sturdySave);frail.tick(20,encounter());sturdy.tick(20,encounter());
 assert(condition(frail,'visitor').dose>condition(sturdy,'visitor').dose);
});

test('a saved contact continues identically, including hidden incubation and condition-specific immunity',()=>{
 const live=make(sourceSave());live.tick(50,encounter());
 const restored=make(JSON.parse(JSON.stringify(live.snapshot())));
 live.tick(220,encounter());restored.tick(220,encounter());assert.deepEqual(restored.snapshot(),live.snapshot());
 const seeded=sourceSave();Object.assign(seeded.people.visitor.conditions.mistbell,{stage:'incubating',remaining:5});
 const phases=make(seeded);assert.deepEqual(phases.status('visitor').symptoms,[]);phases.tick(5);assert(phases.status('visitor').absenceRecommended);
 phases.tick(500);assert.equal(condition(phases,'visitor').stage,'well');assert(condition(phases,'visitor').immuneFor>0);
 assert.equal(condition(phases,'visitor','ember-weariness').immuneFor,0);
 const immune=phases.snapshot();Object.assign(immune.people.source.conditions.mistbell,{stage:'ill',remaining:240,immuneFor:0});
 const protectedByHistory=make(immune);protectedByHistory.tick(100,encounter());assert.equal(condition(protectedByHistory,'visitor').dose,0);
});

test('rest, nutrition, hygiene and idempotent saved care support recovery without an instant cure',()=>{
 const saved=sourceSave('ember-weariness'),ordinary=make(saved),supported=make(saved),rested=make(saved),fed=make(saved),clean=make(saved);
 assert(supported.applyCare('source',{providerId:'china-clinic',receiptNumber:7}));
 assert.equal(condition(supported,'source','ember-weariness').remaining,240);
 assert.equal(supported.status('source').careStatus,'support-active');
 const poor={needs:{fatigue:.8,hunger:.8},hygiene:.2};
 ordinary.tick(60,{actors:[person('source',poor)]});supported.tick(60,{actors:[person('source',poor)]});
 rested.tick(60,{actors:[person('source',{...poor,resting:true})]});
 fed.tick(60,{actors:[person('source',{...poor,nutrition:1})]});
 clean.tick(60,{actors:[person('source',{...poor,hygiene:1})]});
 for(const model of[supported,rested,fed,clean])assert(condition(model,'source','ember-weariness').remaining<condition(ordinary,'source','ember-weariness').remaining);
 const restored=make(JSON.parse(JSON.stringify(supported.snapshot()))),before=restored.snapshot();
 assert.equal(restored.applyCare('source',{providerId:'china-clinic',receiptNumber:7}),false);
 assert.equal(restored.applyCare('source',{providerId:'china-clinic',receiptNumber:6}),false);assert.deepEqual(restored.snapshot(),before);
 supported.tick(60);restored.tick(60);assert.deepEqual(restored.snapshot(),supported.snapshot());
 restored.tick(500,{actors:[person('source',{resting:true})]});assert.equal(condition(restored,'source','ember-weariness').stage,'well');
 assert.equal(restored.status('source').absenceRecommended,false);assert.equal(restored.status('source').careStatus,'none');
});
