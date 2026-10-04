// Reproduces multi-resident seat/host contention and save migrations: cheap,
// deterministic coverage of shared decision integration, without a full scene.
import assert from 'node:assert/strict';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {CHINA_CONSORTS,palaceResidentSave} from '../source/game/china-palace-residents.js';
import {consortActivities,createPalaceLeisureClaims,createConsortPassage} from '../source/game/china-consort-activities.js';
import {npcRoleAppearance} from '../source/game/appearance.js';
const ids=['cn-emperor',...CHINA_CONSORTS.map(p=>p.id),'cn-tea'],claims=createPalaceLeisureClaims();
const saved=palaceResidentSave({worldSeed:42,actorIds:ids});
for(const p of Object.values(saved.people))p.needs={hunger:.25,fatigue:.25,social:.25};
const brain=createLifeDecisions({worldSeed:42,actorIds:ids,saved}),stage=(id,label,path,duration=0,options={})=>({id,label,path,duration,...options});
const candidates=profile=>consortActivities({station:profile,home:{toArray:()=>profile.npcPosition.slice()}},{stage,homeExit:()=>[[-18,.215,-13.35]],homeReturn:()=>[profile.npcPosition],bed:{id:profile.privateBedId,position:profile.npcPosition},mealSeats:[{id:'meal-a',position:[21,.215,1.3]},{id:'meal-b',position:[22,.215,1.3]}],host:{station:{id:'cn-tea'}},available:id=>claims.available(id,profile.id)});
assert.equal(new Set(CHINA_CONSORTS.map(p=>p.privateRoomId)).size,3);assert.equal(new Set(CHINA_CONSORTS.map(p=>p.privateBedId)).size,3);assert(CHINA_CONSORTS.every(p=>p.ageYears>=18));
assert.equal(new Set(CHINA_CONSORTS.map(p=>JSON.stringify(npcRoleAppearance('china',p.id,42)))).size,3);
const prob=(id,action)=>brain.distribution(id,candidates(CHINA_CONSORTS.find(p=>p.id===id)),10).find(c=>c.id===action).probability;
assert(prob('cn-consort-heng','read')>prob('cn-consort-ling','read'));assert(prob('cn-consort-ling','garden')>prob('cn-consort-heng','garden'));
const yue=CHINA_CONSORTS[0],heng=CHINA_CONSORTS[1];assert(claims.reserve('palace-tea-host',yue.id));assert(!claims.reserve('palace-tea-host',heng.id));assert(!brain.distribution(heng.id,candidates(heng)).some(c=>c.id==='visit'),'one finite tea-host slot is filtered before sampling');
assert(!claims.tick(yue.id,121,true),'conversation pauses claim budget');assert(!claims.available('palace-tea-host',heng.id));assert(claims.tick(yue.id,121));assert(claims.available('palace-tea-host',heng.id),'bounded timeout frees unavailable host');
for(const [i,p]of CHINA_CONSORTS.entries())assert(claims.reserve('palace-garden-'+i,p.id));assert.equal(claims.state().length,3);claims.release(heng.id);assert.equal(claims.state().length,2);claims.dispose();assert.equal(claims.state().length,0);
const original=brain.snapshot();original.people[yue.id].traits.quiet=.71;original.people[yue.id].relations['cn-tea']=.89;original.people[yue.id].current={id:'visit',targetId:'cn-tea',duration:11,startedAt:0};original.people[yue.id].cooldowns.rest=76;
assert.deepEqual(palaceResidentSave({worldSeed:42,actorIds:ids,saved:original}),original,'existing personality, relationship, intention, cooldown and PRNG remain byte-for-byte stable');
const migrated=structuredClone(original);delete migrated.people[heng.id];const restored=palaceResidentSave({worldSeed:42,actorIds:ids,saved:migrated});assert.deepEqual(restored.people[yue.id],original.people[yue.id]);assert.deepEqual(restored.people[heng.id].traits,heng.traits);
const passage=createConsortPassage(),resident=p=>({station:p,root:{position:{x:-18.6,z:p.npcPosition[2]}}}),h=resident(CHINA_CONSORTS[1]),l=resident(CHINA_CONSORTS[2]);assert(passage.allow(h,[-20.1,.215,-4.1]));assert(!passage.allow(l,[-20.1,.215,.9]));h.root.position={x:-20.1,z:-6};passage.leave(h);assert(!passage.allow(l,[-20.1,.215,.9]));h.root.position={x:-18.3,z:-10.7};passage.leave(h);assert(passage.allow(l,[-20.1,.215,.9]));passage.dispose();
console.log('PASS: adult/private identity, distinct conditional probabilities, finite host/garden claims, timeout/conversation pause, migrated and retained per-person state');
