import test from 'node:test';
import assert from 'node:assert/strict';
import {BATH_PRIVACY_ZONES, bathPrivacyWish, createBathPrivacy} from '../source/game/bath-privacy.js';
import {createRelationshipEvents, relationshipEventEffect} from '../source/game/relationship-events.js';

// ST04's regression risks are cross-wall/floor witnesses, turning a shared bath
// into a private entitlement, and duplicate/lost social evidence after a save
// failure. These small controller fixtures exercise all actual room mappings;
// they do not substitute for production navigation or visual acceptance.
const clone = value => value===undefined?undefined:JSON.parse(JSON.stringify(value));
const rooms = Object.entries(BATH_PRIVACY_ZONES).flatMap(([country, zones]) => zones.map(zone => ({country, zone})));
const center = zone => ({x:(zone.bounds[0]+zone.bounds[1])/2, y:zone.y, z:(zone.bounds[2]+zone.bounds[3])/2});
const exit = zone => ({x:zone.exit[0], y:zone.exit[1], z:zone.exit[2]});
const profile = over => ({traits:{quiet:.5}, values:{reliability:.5, company:.5}, needs:{fatigue:0}, relations:{player:0}, ...over});
const person = (zone, over={}) => ({id:'guest', name:'Guest', position:center(zone), activity:zone.changing?'changing':'bathing', profile:profile(), ...over});

function harness({country='china', zone=BATH_PRIVACY_ZONES[country][0], people, side=zone.side||null, privacySaved, relationshipSaved, privacySave=()=>true, relationshipSave=()=>true, delivery, onRetreat=()=>true}={}) {
  const world = {player:{position:center(zone), retreating:false}, people:people||[person(zone)], clock:{day:4, seconds:100}, side};
  const notifications=[], deliveries=[], retreats=[], queries=[];
  let durablePrivacy=privacySaved?clone(privacySaved):undefined, durableRelationships=relationshipSaved?clone(relationshipSaved):undefined;
  const ledger=createRelationshipEvents({saved:relationshipSaved, getProfile:id=>world.people.find(p=>p.id===id)?.profile||profile(), saveState:s=>{
    const result=relationshipSave(s); if(result===false||result?.then)return result;
    durableRelationships=clone(s); return true;
  }});
  const privacy=createBathPrivacy({country, saved:privacySaved, getPlayer:()=>world.player, getPeople:z=>{queries.push(z.id);return world.people;}, getClock:()=>world.clock, getSide:()=>world.side,
    saveState:s=>{const result=privacySave(s);if(result===false||result?.then)return result;durablePrivacy=clone(s);return true;},
    onEvent:event=>{deliveries.push(clone(event));return delivery?delivery(event, ledger):ledger.record(event);},
    notify:text=>notifications.push(text), retreat:point=>{retreats.push(point);return onRetreat(point, world);}
  });
  return {world, zone, ledger, privacy, notifications, deliveries, retreats, queries,
    saved:()=>clone(durablePrivacy), relationshipSaved:()=>clone(durableRelationships),
    scan(seconds=world.clock.seconds){world.clock.seconds=seconds;privacy.refresh();},
    outside(seconds=world.clock.seconds){world.player.position=exit(zone);world.clock.seconds=seconds;privacy.refresh();}
  };
}

test('all five actual pools and seven room volumes have an independently exercisable privacy boundary',()=>{
  assert.equal(rooms.length,7);
  assert.deepEqual([...new Set(rooms.map(({zone})=>zone.poolId))].sort(),['china-furniture-bath-1','egypt-furniture-bath-1','france-furniture-bath-1','japan-furniture-bath-1','japan-furniture-bath-2']);
  assert.equal(new Set(rooms.map(({zone})=>zone.id)).size,7);
  for(const {country,zone} of rooms){
    const h=harness({country,zone});
    h.scan();
    assert.equal(h.privacy.status()?.zoneId,zone.id,zone.id);
    assert.deepEqual(h.privacy.status().people,['guest'],zone.id);
    assert.equal(h.privacy.isPrivatePosition(center(zone)),true,zone.id);
    assert.equal(h.privacy.isPrivatePosition(exit(zone)),false,zone.id);
    assert.equal(h.deliveries.length,0,`${zone.id}: a reminder alone is not evidence`);
    h.outside(104);
    assert.equal(h.deliveries.length,1,zone.id);
    assert.equal(h.deliveries[0].kind,'privacy-retreat',zone.id);
    assert.equal(h.deliveries[0].outcome,'completed',zone.id);
    assert.equal(h.ledger.pair('guest','player').last.feeling,'respected',zone.id);
  }
});

test('all room volumes reject witnesses on another floor, beyond their wall, or no longer alive',()=>{
  for(const {country,zone} of rooms){
    const position=center(zone), h=harness({country,zone,people:[
      person(zone,{id:'upstairs',position:{...position,y:zone.y+3.8}}),
      person(zone,{id:'downstairs',position:{...position,y:zone.y-3.8}}),
      person(zone,{id:'other-room',position:{...position,x:zone.bounds[1]+.1}}),
      person(zone,{id:'dead',alive:false}),
    ]});
    h.scan(); h.scan(110); h.outside(111);
    assert.equal(h.privacy.status(),null,zone.id);
    assert.equal(h.deliveries.length,0,zone.id);
    assert.deepEqual(h.ledger.snapshot().people,{},zone.id);
    assert.equal(h.privacy.isPrivatePosition({...position,y:zone.y+3.8}),false,zone.id);
  }
  const men=BATH_PRIVACY_ZONES.japan.find(z=>z.id==='jp-men-wet'), women=BATH_PRIVACY_ZONES.japan.find(z=>z.id==='jp-women-wet');
  const h=harness({country:'japan',zone:men,people:[person(women,{position:{x:-.8,y:women.y,z:-4}})]});
  h.world.player.position={x:-1.2,y:men.y,z:-4}; h.scan(); h.scan(109);
  assert.equal(h.privacy.status(),null,'nearby people across the male/female dividing wall are not witnesses');
  assert.deepEqual(h.ledger.snapshot().people,{});
});

test('same-side public bathing remains shared, with current nearby/changing/tired requests only',()=>{
  for(const zone of BATH_PRIVACY_ZONES.japan.filter(z=>z.shared)){
    const p=person(zone), far={...p.position,z:p.position.z+3};
    assert.equal(bathPrivacyWish({zone,person:p,playerPosition:far}),null);
    const h=harness({country:'japan',zone,people:[p]});h.world.player.position=far;h.scan();
    assert.equal(h.privacy.status(),null);
    assert.equal(h.privacy.access({id:zone.poolId}).allowed,true);
    const near={...p.position,x:p.position.x+.8};
    assert.equal(bathPrivacyWish({zone,person:p,playerPosition:near}).reason,'personal-space');
    const medium={...p.position,x:p.position.x+1.6};
    assert.equal(bathPrivacyWish({zone,person:p,playerPosition:medium}),null);
    assert.equal(bathPrivacyWish({zone,person:{...p,profile:profile({traits:{quiet:.9}})},playerPosition:medium}).reason,'personal-space');
    assert.match(bathPrivacyWish({zone,person:{...p,profile:profile({needs:{fatigue:.9}})},playerPosition:medium}).text,/疲倦/);
    assert.match(bathPrivacyWish({zone,person:{...p,profile:profile({relations:{player:.8}})},playerPosition:near}).text,/熟悉/);
    assert.equal(bathPrivacyWish({zone,person:{...p,profile:profile({relations:{player:.8}})},playerPosition:far}),null,'friendship grants no arbitrary pool-wide request');
    assert.equal(bathPrivacyWish({zone,person:{...p,activity:'changing'},playerPosition:far}).reason,'changing');
    assert.equal(bathPrivacyWish({zone,person:{...p,activity:'drying'},playerPosition:far}).reason,'changing');
    assert.equal(bathPrivacyWish({zone,person:{...p,activity:'idle'},playerPosition:near}),null);
    h.world.player.position=near;h.scan();
    assert.deepEqual(h.privacy.status().people,['guest']);
    assert.equal(h.privacy.access({id:zone.poolId}).allowed,true,'a personal-space request does not grant private control of a shared pool');
  }
});

test('wrong-side signage and empty rooms are socially neutral; access checks all five pools',()=>{
  for(const {country,zone} of rooms){
    const h=harness({country,zone,people:[],side:zone.side?(zone.side==='men'?'women':'men'):null});
    h.scan(); h.scan(110); h.outside(111);
    assert.equal(h.deliveries.length,0,`${zone.id}: signs cannot hold opinions`);
    assert.deepEqual(h.ledger.snapshot().people,{},zone.id);
    const access=h.privacy.access({id:zone.poolId});
    assert.equal(access.allowed,!zone.side,zone.id);
    assert.equal(h.privacy.access({id:'ordinary-chair'}).allowed,true);
  }
  for(const {country,zone} of rooms.filter(({zone})=>!zone.changing)){
    const h=harness({country,zone});
    assert.equal(h.privacy.access({poolId:zone.poolId}).allowed,!!zone.shared,zone.id);
    h.world.people[0].position.y+=4;
    assert.equal(h.privacy.access({id:zone.poolId}).allowed,true,`${zone.id}: other-floor occupancy does not reserve the pool`);
  }
});

test('a wrong-side request with a present informed person produces only their directional evidence',()=>{
  const zone=BATH_PRIVACY_ZONES.japan.find(z=>z.id==='jp-women-wet');
  const h=harness({country:'japan',zone,side:'men',people:[person(zone,{activity:'idle'}),person(zone,{id:'absent',position:{...center(zone),y:0}})]});
  h.scan();assert.equal(h.privacy.status().wrongSide,true);h.scan(108);
  assert.deepEqual(h.deliveries[0].participants,['player','guest']);
  assert.equal(h.deliveries[0].kind,'privacy-intrusion');
  assert(h.ledger.knownOpinion('guest','player')<0);
  assert.equal(h.ledger.pair('player','guest'),null);
  assert.equal(h.ledger.pair('absent','player'),null);
});

test('retreat button and honest blocked navigation never count as an actual room exit',()=>{
  const h=harness({onRetreat:(point,world)=>{world.player.retreating=true;return true;}});
  h.scan();assert.equal(h.privacy.retreat(),true);assert.deepEqual(h.retreats,[h.zone.exit]);
  h.scan(109);
  assert.equal(h.deliveries.length,0,'an ongoing navigation attempt neither rewards nor punishes blockage');
  assert.equal(h.ledger.pair('guest','player'),null);
  assert.equal(Object.values(h.privacy.snapshot().episodes)[0].open,true);
  h.world.player.retreating=false;h.outside(110);
  assert.equal(h.deliveries.length,1);
  assert.equal(h.deliveries[0].outcome,'completed');
  assert.equal(h.privacy.retreat(),false);
  const failed=harness({onRetreat:()=>false});failed.scan();assert.equal(failed.privacy.retreat(),false);
  assert.equal(failed.deliveries.length,0);
});

test('the 8-second fault requires an outstanding request and never credits a late retreat as repair',()=>{
  const h=harness();h.scan();h.scan(107.99);assert.equal(h.deliveries.length,0);
  h.scan(108);assert.equal(h.deliveries.length,1);
  assert.equal(h.deliveries[0].fault,true);assert.equal(h.deliveries[0].outcome,'failed');
  const fault=clone(h.ledger.pair('guest','player'));
  assert(fault.relation<0&&fault.trust<0&&fault.aversion>0);
  h.scan(120);assert.equal(h.deliveries.length,1);
  h.outside(121);assert.equal(h.deliveries.length,2);
  assert.equal(h.deliveries[1].outcome,'cancelled');assert.equal(h.deliveries[1].fault,false);
  const after=h.ledger.pair('guest','player');
  for(const key of ['relation','trust','aversion'])assert.equal(after[key],fault[key]);
  assert.match(h.privacy.memory('guest'),/没有及时离开/);
  assert.equal(h.privacy.memory('unaware'),null);
});

test('honoring shared-pool personal space ends the outstanding timer; renewed proximity gets a fresh warning',()=>{
  const zone=BATH_PRIVACY_ZONES.japan.find(z=>z.id==='jp-men-wet'), h=harness({country:'japan',zone});
  h.scan();h.world.player.position={...center(zone),z:center(zone).z+3};h.scan(103);
  assert.equal(h.privacy.status(),null);assert.equal(h.deliveries.length,0);
  h.scan(120);assert.equal(h.deliveries.length,0);
  h.world.player.position=center(zone);h.scan(121);
  assert.equal(h.deliveries.length,0,'a renewed request cannot inherit time spent respecting the first one');
  h.scan(128.99);assert.equal(h.deliveries.length,0);
  h.scan(129);assert.equal(h.deliveries.length,1);
  assert.equal(h.deliveries[0].kind,'privacy-intrusion');
});

test('Japan changing/wet transitions remain private until an actual common-corridor exit',()=>{
  const zone=BATH_PRIVACY_ZONES.japan.find(z=>z.id==='jp-men-wet');
  const changing=BATH_PRIVACY_ZONES.japan.find(z=>z.id==='jp-men-changing');
  const h=harness({country:'japan',zone});h.scan();
  h.world.player.position={x:-6,y:zone.y,z:.3};h.scan(101);
  assert.equal(h.deliveries.length,0,'the internal wet/changing threshold is still private');
  h.world.player.position=center(changing);h.scan(102);
  assert.equal(h.deliveries.length,0,'crossing into another private volume is not a public retreat');
  h.outside(104);assert.equal(h.deliveries.length,1);
  assert.equal(h.deliveries[0].kind,'privacy-retreat');
});

test('repeat scans, same-day re-entry and reload preserve exact event idempotency and the open 8-second timer',()=>{
  const h=harness();h.scan();h.scan(103);
  const reloaded=harness({privacySaved:h.saved(),relationshipSaved:h.relationshipSaved()});
  reloaded.scan(107);assert.equal(reloaded.deliveries.length,0);
  reloaded.scan(108);assert.equal(reloaded.deliveries.length,1);
  reloaded.outside(109);const once=reloaded.ledger.snapshot();
  reloaded.world.player.position=center(reloaded.zone);reloaded.scan(120);reloaded.scan(129);reloaded.outside(130);
  assert.deepEqual(reloaded.ledger.snapshot(),once);
  const again=harness({privacySaved:reloaded.saved(),relationshipSaved:reloaded.relationshipSaved()});
  again.scan(140);again.scan(149);again.outside(150);
  assert.deepEqual(again.ledger.snapshot(),once);
  assert.equal(again.deliveries.length,0);
});

test('loading outside does not invent a physical retreat, and leaving the country suspends without credit',()=>{
  const h=harness();h.scan();
  const fresh=harness({privacySaved:h.saved()});fresh.outside(105);
  assert.equal(fresh.deliveries.length,0);
  assert.equal(fresh.ledger.pair('guest','player'),null);
  assert.equal(Object.values(fresh.privacy.snapshot().episodes)[0].open,false);
  h.privacy.suspend();
  assert.equal(h.privacy.status(),null);
  assert.equal(Object.values(h.privacy.snapshot().episodes)[0].open,false);
  h.outside(105);assert.equal(h.deliveries.length,0);
  const fault=harness();fault.scan();fault.scan(108);const evidence=fault.ledger.snapshot();
  fault.privacy.suspend();fault.outside(109);
  assert.deepEqual(fault.ledger.snapshot(),evidence);
  assert.match(fault.privacy.memory('guest'),/没有及时离开/);
});

test('a request whose initial persistence failed cannot start an invisible fault timer',()=>{
  let fail=true;const h=harness({privacySave:()=>!fail});
  h.scan();assert.deepEqual(h.privacy.snapshot().episodes,{});
  assert.equal(h.deliveries.length,0);
  fail=false;h.scan(120);assert.equal(h.deliveries.length,0);
  h.scan(127.99);assert.equal(h.deliveries.length,0);
  h.scan(128);assert.equal(h.deliveries.length,1);
  assert.equal(h.deliveries[0].kind,'privacy-intrusion');
});

test('a failed source save creates no event or reward; the actual exit retries without losing evidence',()=>{
  let fail=false;const h=harness({privacySave:()=>!fail});h.scan();const persisted=h.saved();
  fail=true;h.outside(104);
  assert.equal(h.deliveries.length,0);assert.equal(h.ledger.pair('guest','player'),null);
  assert.deepEqual(h.saved(),persisted);assert.equal(Object.values(h.privacy.snapshot().episodes)[0].open,true);
  fail=false;h.scan(105);
  assert.equal(h.deliveries.length,1);assert.equal(h.privacy.snapshot().pending.length,0);
  assert.equal(h.ledger.pair('guest','player').knownEvents,1);
  h.scan(106);assert.equal(h.deliveries.length,1);
});

test('relationship save failure leaves durable pending evidence which retries once after reload',()=>{
  const h=harness({relationshipSave:()=>false});h.scan();h.outside(104);
  assert.equal(h.privacy.snapshot().pending.length,1);assert.equal(h.ledger.pair('guest','player'),null);
  const pending=h.saved().pending[0];
  const retry=harness({people:[],privacySaved:h.saved()});retry.outside(105);
  assert.equal(retry.privacy.snapshot().pending.length,0);
  assert.deepEqual(retry.deliveries,[pending]);assert.equal(retry.ledger.pair('guest','player').knownEvents,1);
  retry.scan(110);assert.equal(retry.deliveries.length,1);
});

test('successful relationship delivery followed by failed outbox acknowledgement is safe to replay',()=>{
  let failAcknowledgement=true;
  const h=harness({privacySave:s=>!(failAcknowledgement&&Object.values(s.episodes).some(e=>e.retreat)&&s.pending.length===0)});
  h.scan();h.outside(104);
  assert.equal(h.privacy.snapshot().pending.length,1);
  const credited=h.ledger.snapshot();assert.equal(h.ledger.pair('guest','player').knownEvents,1);
  failAcknowledgement=false;
  const retry=harness({people:[],privacySaved:h.saved(),relationshipSaved:h.relationshipSaved()});retry.outside(105);
  assert.equal(retry.privacy.snapshot().pending.length,0);
  assert.deepEqual(retry.ledger.snapshot(),credited);
});

test('a thrown delivery error stays pending and can be retried without interrupting the privacy controller',()=>{
  let throwing=true;
  const h=harness({delivery:(event,ledger)=>{if(throwing)throw new Error('temporary relationship storage outage');return ledger.record(event);}});
  h.scan();assert.doesNotThrow(()=>h.outside(104));
  assert.equal(h.privacy.snapshot().pending.length,1);assert.equal(h.ledger.pair('guest','player'),null);
  throwing=false;h.scan(105);
  assert.equal(h.privacy.snapshot().pending.length,0);assert.equal(h.ledger.pair('guest','player').knownEvents,1);
});

test('beauty and friendship never waive privacy, imply consent, or unlock private rooms',()=>{
  const zone=BATH_PRIVACY_ZONES.china[0], plain=person(zone), beautiful=person(zone,{profile:profile({relations:{player:.95},beauty:1,attractiveness:1,appearance:{beauty:1}})});
  const before=clone(beautiful);
  for(const p of [plain,beautiful]){
    const h=harness({zone,people:[p]});h.scan();
    assert.equal(bathPrivacyWish({zone,person:p,playerPosition:center(zone)}).reason,'private-bath');
    assert.equal(h.privacy.access({id:zone.poolId}).allowed,false);
    h.outside(104);assert.equal(h.privacy.access({id:zone.poolId}).allowed,false);
    assert.equal(h.ledger.pair('guest','player').relation,.003);
    const projected=h.ledger.projection('guest',p.profile);
    for(const key of ['consent','invitation','privateRoom','privateRoomAccess','overnight'])assert.equal(projected[key],undefined);
  }
  assert.deepEqual(beautiful,before,'neither privacy nor relationship logic mutates identity/consent');
  const event={source:'bath-privacy',kind:'privacy-intrusion',actorId:'player',outcome:'failed',fault:true};
  assert.deepEqual(relationshipEventEffect(event,plain.profile),relationshipEventEffect(event,beautiful.profile));
  const retreat={...event,kind:'privacy-retreat',outcome:'completed',fault:false};
  assert.deepEqual(relationshipEventEffect(retreat,plain.profile),relationshipEventEffect(retreat,beautiful.profile));
});

test('privacy uses one room-local broad phase at 1 Hz and does not scan people outside bathing rooms',()=>{
  const h=harness();h.world.player.position=exit(h.zone);h.privacy.update(0);assert.equal(h.queries.length,0);
  h.world.player.position=center(h.zone);h.privacy.update(1);assert.equal(h.queries.length,1);
  for(let i=0;i<50;i++)h.privacy.update(.01);
  assert.equal(h.queries.length,1);
  h.privacy.update(.6);assert.equal(h.queries.length,2);
});

test('all five genuinely mounted player baths make NPC entry yield without blocking anyone from leaving',()=>{
  for(const {country,zone} of rooms.filter(({zone})=>!zone.changing)){
    const h=harness({country,zone,people:[]}), npc=person(zone,{id:'passing-guest',activity:'walking'}), from=exit(zone), to=center(zone);
    h.world.player.poolId=zone.poolId;
    const playerBefore=clone(h.world.player), npcBefore=clone(npc), sourceBefore=h.privacy.snapshot(), socialBefore=h.ledger.snapshot();
    assert.equal(h.privacy.allowsMove(npc,from,to,{probeOnly:true}),false,zone.poolId);
    assert.equal(h.notifications.length,0,`${zone.poolId}: a route probe cannot send a notice`);
    assert.deepEqual(h.privacy.snapshot(),sourceBefore,zone.poolId);
    assert.equal(h.privacy.allowsMove(npc,from,to),false,zone.poolId);
    assert.equal(h.notifications.length,1,zone.poolId);
    assert.match(h.notifications[0],/按 E 离池/);
    for(let i=0;i<5;i++)assert.equal(h.privacy.allowsMove(npc,from,to),false,zone.poolId);
    assert.equal(h.notifications.length,1,`${zone.poolId}: repeated blocked movement only notifies once`);
    assert.equal(h.privacy.allowsMove(npc,to,from),true,`${zone.poolId}: an NPC can leave`);
    assert.equal(h.privacy.allowsMove({id:'player'},to,from),true,`${zone.poolId}: the player can always leave`);
    assert.equal(h.privacy.allowsMove(npc,from,{...to,y:zone.y+4}),true,`${zone.poolId}: another floor is unaffected`);
    assert.equal(h.deliveries.length,0,`${zone.poolId}: yielding movement creates no invented relationship event`);
    assert.deepEqual(h.world.player,playerBefore);assert.deepEqual(npc,npcBefore);
    assert.deepEqual(h.privacy.snapshot(),sourceBefore);assert.deepEqual(h.ledger.snapshot(),socialBefore);
    delete h.world.player.poolId;
    assert.equal(h.privacy.allowsMove(npc,from,to),true,`${zone.poolId}: original navigation resumes immediately after unmount`);
    h.scan();h.world.player.poolId=zone.poolId;
    assert.equal(h.privacy.allowsMove(npc,from,to),false);
    assert.equal(h.notifications.length,2,`${zone.poolId}: a new bath can issue its own notice`);
  }
});

test('shared player bathing protects nearby space only and permits distant peers and retreating movements',()=>{
  for(const zone of BATH_PRIVACY_ZONES.japan.filter(z=>z.shared)){
    const h=harness({country:'japan',zone,people:[]}), npc=person(zone,{activity:'walking'}), p=center(zone);
    h.world.player.poolId=zone.poolId;
    const near={...p,x:p.x+.6}, nearer={...p,x:p.x+.3}, farther={...p,x:p.x+.9}, distant={...p,x:p.x+2};
    assert.equal(h.privacy.allowsMove(npc,exit(zone),distant),true,zone.id);
    assert.equal(h.privacy.allowsMove(npc,near,farther),true,`${zone.id}: an already-near NPC may back away`);
    assert.equal(h.privacy.allowsMove(npc,near,near),true,`${zone.id}: a stationary route probe isn't an approach`);
    assert.equal(h.privacy.allowsMove(npc,near,nearer),false,zone.id);
    assert.equal(h.privacy.access({id:zone.poolId}).allowed,true,`${zone.id}: player privacy doesn't reserve the shared pool`);
    const other=BATH_PRIVACY_ZONES.japan.find(z=>z.shared&&z.side!==zone.side);
    assert.equal(h.privacy.allowsMove(npc,exit(other),center(other)),true,`${zone.id}: another room is unaffected`);
    assert.equal(h.ledger.pair('guest','player'),null);
    assert.equal(h.ledger.projection('guest',npc.profile).consent,undefined);
  }
});

test('standing in an empty bath or mounting an unrelated object never grants a player-only room',()=>{
  for(const {country,zone} of rooms.filter(({zone})=>!zone.changing)){
    const h=harness({country,zone,people:[]}), npc=person(zone), from=exit(zone), to=center(zone);
    assert.equal(h.privacy.allowsMove(npc,from,to),true,zone.poolId);
    h.world.player.poolId='ordinary-chair';
    assert.equal(h.privacy.allowsMove(npc,from,to),true,zone.poolId);
    assert.equal(h.notifications.length,0);assert.equal(h.deliveries.length,0);
    assert.deepEqual(h.privacy.snapshot().episodes,{});
  }
});

test('privacy fault remains actionable after retreat and opens only the existing apology even between strangers',async()=>{
  const {relationshipInteractionEligible}=await import('../source/game/relationship-interactions.js');
  const h=harness();h.scan();h.scan(108);const fault=h.privacy.faultFor('guest');assert(fault?.startsWith('bath:'));
  h.outside(110);assert.equal(h.privacy.faultFor('guest'),fault);
  const context={available:true,completedCount:0,relation:0,trust:0,faultEventId:fault,age:25,selfAge:25};
  assert(relationshipInteractionEligible('apology',context));
  assert(!relationshipInteractionEligible('apology',{...context,available:false}));
  assert(!relationshipInteractionEligible('apology',{...context,acknowledgedEventId:fault}));
  for(const id of ['flirt','express-interest','public-invitation','private-company'])assert(!relationshipInteractionEligible(id,context));
});

test('UI decision time and blocked sight do not manufacture misconduct or informed witnesses',()=>{
  const h=harness();h.scan();h.world.player.paused=true;h.scan(120);h.world.player.paused=false;h.scan(121);h.scan(128.99);assert.equal(h.deliveries.length,0);h.scan(129);assert.equal(h.deliveries.length,1);
  const unseen=harness({people:[{...person(BATH_PRIVACY_ZONES.china[0]),perceives:false}]});unseen.scan();assert.equal(unseen.privacy.status(),null);assert.equal(unseen.deliveries.length,0);
});

test('existing cross-side delivery permission is restricted to the actual service passage, never bathing privileges',async()=>{
  const {bathServicePassage}=await import('../source/game/bath-privacy.js');
  assert(bathServicePassage('men',{x:-4.2,y:3.8,z:-2.16}));assert(bathServicePassage('women',{x:1.35,y:3.8,z:-2.16}));
  assert(!bathServicePassage('women',{x:3,y:3.8,z:-4.4}));assert(!bathServicePassage('men',{x:-4.2,y:7.6,z:-2}));
  const zone=BATH_PRIVACY_ZONES.japan.find(z=>z.id==='jp-women-wet'),p={x:2.25,y:3.8,z:-2.16};
  const privacy=createBathPrivacy({country:'japan',getPlayer:()=>({position:p}),getPeople:()=>[],getSide:()=> 'men',getServiceAccess:z=>bathServicePassage(z.side,p),getClock:()=>({seconds:1,day:0})});
  privacy.refresh();assert.equal(privacy.status(),null);assert.equal(privacy.access({id:zone.poolId}).allowed,false);
  p.z=-4.4;privacy.refresh();assert(privacy.status()?.wrongSide);
});

test('production current control keeps exit/transition and cancel-stand ahead of privacy retreat',async()=>{
  const fs=await import('node:fs'),vm=await import('node:vm'),source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
  const begin=source.indexOf('function currentControl(){'),end=source.indexOf('\nlet continuityReady=',begin);
  const control=source.slice(begin,end),execute=source.split('\n').find(line=>line.startsWith('function executeNearbyAction('));
  let standCalls=0,retreatCalls=0,cancelCalls=0;
  const context={player:{root:{position:{toArray:()=>[0,3.8,0]}}},seated:null,bathTransition:null,pendingStand:null,pendingInteraction:null,performing:null,
    bathPrivacy:{status:()=>({zoneId:'jp-men-wet'}),retreat:()=>{retreatCalls++;return true;}},roofShown:false,interactionMenuOpen:()=>false,activeDailyToilet:()=>null,
    standFromSeat:()=>{standCalls++;return false;},cancelPlayerStandIntent:()=>{cancelCalls++;},toast:()=>{},furnitureExit:()=> '离开浴池'};
  for(const key of ['palaceCompanionship','chinaConsortCourt','chinaLabor','egyptTableServiceEmployment','egyptKitchenEmployment','japanTableServiceEmployment','japanKitchenEmployment','japanBathMixingEmployment','japanBathDeliveryEmployment','japanWomenBathDeliveryEmployment','japanReceptionEmployment','chinaRoyalKitchenEmployment','chinaClinicPhysicianEmployment','chinaCareer','chinaGuardEmployment','franceLabor','franceTeaEmployment','francePastryEmployment','npcSocial'])context[key]=null;
  vm.createContext(context);vm.runInContext(control+'\n'+execute,context);
  assert.equal(context.currentControl().intentKey,'bath-privacy-retreat');
  context.seated={id:'pool-seat-1',kind:'bath'};
  assert.equal(context.currentControl().intentKey,'seated:pool-seat-1');context.executeNearbyAction(context.currentControl());assert.equal(standCalls,1);assert.equal(retreatCalls,0);
  context.bathTransition={};assert.equal(context.currentControl().intentKey,'bath');context.executeNearbyAction(context.currentControl());assert.equal(standCalls,2);
  context.bathTransition=null;context.pendingStand={mount:context.seated};assert.equal(context.currentControl().intentKey,'stand:pool-seat-1');context.executeNearbyAction(context.currentControl());assert.equal(cancelCalls,1);assert.equal(retreatCalls,0);
  context.pendingStand=null;context.seated=null;assert.equal(context.currentControl().intentKey,'bath-privacy-retreat');context.executeNearbyAction(context.currentControl());assert.equal(retreatCalls,1);
});
