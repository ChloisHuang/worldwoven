import assert from 'node:assert/strict';
import {socialAttentionFactors as factors,individualAppearanceAffinity as affinity} from '../source/game/social-attention.js';
import {SHAPE_RANGES} from '../source/game/character-traits.js';
import {createNpcSocial} from '../source/game/npc-social.js';
const shapeTraits=Object.fromEntries(Object.entries(SHAPE_RANGES).map(([k,v])=>[k,v.min]));
const adult={ageYears:25,traits:{sociability:.8},relations:{player:.2},opinions:{player:.2}};
const base={observer:adult,target:{id:'player',ageYears:25},appearanceAffinity:1};
assert(factors(base).attraction>0);assert.equal(factors({...base,target:{id:'player'}}).attraction,0);assert.equal(factors({...base,target:{id:'player',ageYears:17}}).acceptanceAppearance,0);
assert.equal(factors({...base,observer:{...adult,trust:{player:-.5}}}).acceptanceAppearance,0);
assert.equal(factors({...base,observer:{...adult,opinions:{player:-.5}}}).attraction,0);
assert.equal(factors({...base,situation:{busy:true}}).attentionChance,0);
assert(factors({...base,target:{id:'player',ageYears:12}}).attentionChance>0,'Ordinary respectful attention survives adult-only attraction gate');
for(const country of ['china','japan','france','egypt']){
 const args={observerId:country+'-resident',worldSeed:17,shapeTraits};const result=affinity(args);assert.equal(result,affinity(args));
 for(const [key,{max}] of Object.entries(SHAPE_RANGES))assert.notEqual(result,affinity({...args,shapeTraits:{...shapeTraits,[key]:max}}),`${country} ${key} enters individual preference`);
}
assert.notEqual(affinity({observerId:'a',shapeTraits}),affinity({observerId:'b',shapeTraits}));assert.equal(affinity({observerId:'a',shapeTraits:{jawWidth:1}}),0,'Incomplete appearance unknown, not invented');
const actor=id=>({station:{id},root:{position:{x:0,y:0,z:0},rotation:{y:0},visible:true}});
const a=actor('a'),b=actor('b'),p={root:{position:{x:0,y:0,z:1}}};let people=[a],visible=true,calls=0;
const make=()=>createNpcSocial({actors:()=>people,player:()=>p,worldSeed:42,getCountry:()=> 'china',visible:()=>visible,getSocialFactors:()=>{calls++;return {attentionChance:1,attraction:1};}});
const one=make();one.update(.1);assert(one.look(a));const saved=one.snapshot(),state=one.attentionState(a);assert.equal(state.opportunities,1);for(let i=0;i<20;i++)one.update(.1);assert.equal(calls,1);assert.equal(one.look(a),null,'Attractive attention still bounded');
const restored=make();restored.restore(saved);people=[a,b];restored.update(12);people=[a];const control=make();control.restore(saved);control.update(12);assert.deepEqual(restored.attentionState(a),control.attentionState(a),'Adding candidate does not multiply original actor action opportunity or alter saved random stream');
visible=false;const blocked=make();blocked.update(.1);assert.equal(blocked.look(a),null);assert.equal(blocked.attentionState(a).opportunities,1,'Occluded opportunity consumed without rerolling each frame');
console.log('PASS ten-trait individual preferences, adult-only attraction, distrust, duties, fixed seeded opportunity, bounded gaze, occlusion and reload');

// Reputation/trust can change willingness but never reroll a saved decision or
// manufacture completion. The optional hook preserves old saves and defaults.
const {createPlayerConversationLedger}=await import('../source/game/player-conversation-ledger.js');
const makeLedger=(context=0,saved)=>createPlayerConversationLedger({worldSeed:2,saved,saveState:()=>true,getClock:()=>({seconds:100,day:1}),getProfile:()=>({traits:{sociability:.5},needs:{social:.5},relations:{},opinions:{}}),getAcceptanceContext:()=>context});
const neutral=makeLedger().start('a','art').event,positive=makeLedger(100).start('a','art').event,negative=makeLedger(-100).start('a','art').event;
assert(Math.abs(positive.chance-neutral.chance-.10)<1e-9);assert(Math.abs(negative.chance-neutral.chance+.12)<1e-9);assert.equal(positive.roll,negative.roll);
const original=makeLedger(.1);const invitation=original.start('a','art').event;const resumed=makeLedger(-.12,original.snapshot());assert.deepEqual(resumed.event(invitation.id),invitation);
console.log('PASS bounded known-context acceptance and immutable saved invitation decision');
