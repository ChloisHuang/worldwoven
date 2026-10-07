import test from 'node:test';
import assert from 'node:assert/strict';
import {createChinaSalonCompanionship} from '../source/game/china-salon-companionship.js';
import {SALON_ARTISTS} from '../source/game/china-tavern-salon-artists.js';
import {resetSocialHolds,isSociallyHeld} from '../source/game/npc-social-ownership.js';
function fixture(seed=1){
 resetSocialHolds();const ids=['player','cn-tavern-diner-west',...SALON_ARTISTS.map(a=>a.id)],roster=ids.map(actorId=>({actorId,alive:true}));
 const identities=Object.fromEntries(ids.map(actorId=>[actorId,{actorId,country:'china',ageYears:25,revision:1}])),contexts={},clock={day:2,hour:20};let room=true,arrived=false,save=true,starts=0;
 const api=createChinaSalonCompanionship({worldSeed:seed,getRoster:()=>roster,getIdentity:id=>identities[id],getContext:(a,b)=>({age:25,selfAge:25,available:true,privatePlaceAvailable:room,interestGiven:true,interestReceived:true,relation:.5,trust:.4,selfProfile:{needs:{fatigue:0,hunger:0,social:1},traits:{sociability:1}},...contexts[a+'|'+b]}),isAvailable:()=>true,getClock:()=>clock,getPlace:()=>room?{ok:true,place:{id:'real-guest-bed',roomId:'tavern-guest-lan',private:true,points:[[19,4,18],[20,4,18]]}}:{ok:false,reason:'private-entitlement-required'},saveState:()=>save,
 createJourney:()=>{starts++;return {state:()=>({ok:true}),update:()=>({ok:room,phase:arrived?'arrived':'approaching'}),cancel(){},finish(){}}}});
 return {api,identities,contexts,clock,room:v=>room=v,arrive:()=>arrived=true,save:v=>save=v,starts:()=>starts};
}
function offered(id){for(let seed=1;seed<60;seed++){const h=fixture(seed);assert.equal(h.api.select('player',id).ok,true);h.api.update(3);h.api.update(2);if(h.api.status()?.stage==='awaiting-response')return h;}throw Error('No consenting fixture');}
test('each original artist can separately agree; no title, service payment or release status grants consent',()=>{
 for(const artist of SALON_ARTISTS){const h=offered(artist.id),e=h.api.status();assert.equal(e.consent.player,false);assert.equal(h.starts(),0);assert.match(e.id,/^salon-company:/);assert.equal(e.venue,'salon-company');assert.equal(h.api.respond(e.id,'player',true).ok,true);assert(isSociallyHeld(artist.id));h.api.update(20);assert.equal(h.api.history().length,0);h.arrive();h.api.update(1);h.api.update(10);assert.equal(h.api.history().at(-1).stage,'completed');assert.equal(h.api.project('player',{}).interactions[artist.id].completedCount,1);assert(!isSociallyHeld(artist.id));}
});
test('actual adult identity, directional boundary, legal room and explicit player response all remain necessary',()=>{
 const id=SALON_ARTISTS[0].id,h=fixture();h.room(false);assert.equal(h.api.select('player',id).ok,false);h.room(true);h.identities[id].ageYears=17;assert.equal(h.api.select('player',id).ok,false);h.identities[id].ageYears=25;h.contexts[id+'|player']={boundary:true};assert.equal(h.api.select('player',id).ok,false);delete h.contexts[id+'|player'];assert.equal(h.api.select('player','cn-tavern-diner-west').reason,'venue-pair-required');
 const q=offered(id),e=q.api.status();assert.equal(q.api.respond(e.id,'player',undefined).ok,false);q.api.respond(e.id,'player',false);assert.equal(q.starts(),0);assert.equal(q.api.select(id,'player').reason,'already-invited-tonight');assert.equal(q.api.project('player',{}).relations,undefined);
});
test('withdrawal, lost room and failed storage release borrowed actors and never award closeness',()=>{
 for(const kind of ['withdraw','room','save']){const id=SALON_ARTISTS[2].id,h=offered(id),e=h.api.status();if(kind==='save')h.save(false);h.api.respond(e.id,'player',true);if(kind==='withdraw')h.api.withdraw(id);if(kind==='room'){h.room(false);h.api.update(1);}assert.equal(h.api.status(),null);assert(!isSociallyHeld(id));assert.equal(h.api.project('player',{}).relations,undefined);}
});
test('a real NPC guest and artist use two personal replies and the same lawful journey',()=>{
 let h;for(let seed=1;seed<60;seed++){h=fixture(seed);h.api.select('cn-tavern-diner-west',SALON_ARTISTS[1].id);h.api.update(3);h.api.update(2);if(h.api.status()?.stage==='travelling')break;}assert.equal(h.api.status()?.stage,'travelling');assert(h.api.status().participants.every(id=>h.api.status().consent[id]));h.arrive();h.api.update(1);h.api.update(10);assert.equal(h.api.history().at(-1).stage,'completed');
});
test('corrupt private state fails closed and is retained rather than silently replaced',()=>{
 const saved={version:999,active:{forged:true}},s=createChinaSalonCompanionship({saved,saveState:()=>{throw Error('must not overwrite');}});assert.equal(s.loadError,'invalid-saved-state');assert.equal(s.select('player',SALON_ARTISTS[0].id).ok,false);s.update(900);assert.deepEqual(s.snapshot(),saved);s.dispose();assert.deepEqual(s.snapshot(),saved);
});
