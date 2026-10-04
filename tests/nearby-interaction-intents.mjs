// Regression: NPC duties leaked into player actions; manual/task entry differed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {playerStationIntent,nearbyInteraction,chooseNearbyInteraction} from '../source/game/player-interaction-intents.js';
const station=id=>({id,position:[0,0,0],action:'fixture'}),p={x:0,y:0,z:1};
for(const id of ['jp-rest','jp-incense','jp-steam','jp-garden-onsen','jp-market-tea','jp-herb-workshop','cn-cooking','france-bakery','france-bedroom','egypt-royal-dining','egypt-royal-kitchen'])assert.equal(playerStationIntent(station(id)),null,id+' is employee work, without player career');
for(const id of ['jp-sushi','jp-ramen','jp-omamori','jp-welcome','jp-tea','cn-archery','cn-tea','cn-money-house-teller','cn-tavern-host','cn-tavern-reception','france-cafe','egypt-anubis-judgment'])assert(playerStationIntent(station(id)),id+' remains public');
assert.equal(playerStationIntent({...station('jp-sushi'),npcOnly:true}),null);
assert.equal(playerStationIntent(station('cn-pharmacy-assistant')),null,'no order means no collection');
const collect=playerStationIntent(station('cn-pharmacy-assistant'),{clinicCollection:{action:'领取第 3 号云纹包',intentKey:'cn-clinic-order-3'}});
assert.equal(collect.intentKey,'cn-clinic-order-3');
assert(nearbyInteraction(collect,p));assert(!nearbyInteraction(collect,{x:0,y:4,z:0}));assert(!nearbyInteraction(collect,{x:0,y:0,z:9}));assert(!nearbyInteraction(collect,p,{clear:()=>false}));
assert.equal(chooseNearbyInteraction([{...station('chat'),priority:5,position:[0,0,.9]},collect],p,()=>true).id,collect.id,'task outranks an incidental closer chat');
assert.equal(chooseNearbyInteraction([collect],p,()=>false),null);
const main=fs.readFileSync('source/game/main.js','utf8');
for(const hook of ['japanServiceUI?.openStation(station.id)','franceTea?.ownsStation(station.id)','chinaSalonUI?.openStation(station.id)','chinaTavernUI?.openStation(station.id)','chinaMoneyHouse?.ownsStation(station.id)','chinaClinic.startPlayer(station.id,player,station.intentKey)','onIntent:requestStationIntent,canSee:station=>nearbyInteractionClear(station)'])assert(main.includes(hook),'existing service dispatch retained: '+hook);
assert(!main.includes('n.station===performing'),'cloned intents keep NPC identity via stable ID');
console.log('PASS: public/task eligibility, distance/floor/occlusion, task priority, existing service dispatches');
