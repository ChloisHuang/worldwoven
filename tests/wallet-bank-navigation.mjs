// The wallet's small main.js adapter uses current regional services. Test that
// boundary without building four 3D worlds or running a second pathfinder.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {playerStationIntent} from '../source/game/player-interaction-intents.js';
import {CHINA_MONEY_HOUSE} from '../source/game/china-money-house.js';
import {FRANCE_EXCHANGE_COUNTER,franceExchangeStation} from '../source/game/france-exchange-counter.js';
import {JAPAN_EXCHANGE_COUNTER,japanExchangeStation} from '../source/game/japan-exchange-counter.js';
import {EGYPT_EXCHANGE_COUNTER,egyptExchangeStation} from '../source/game/egypt-exchange-counter.js';
const source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function walletBankTarget(){'),source.indexOf('const careerHandbook=createCareerHandbook('));
let planned=0,requests=[];
const context={mode:'lot',active:null,player:{},lot:null,routeOptions:{},automaticDoors:{planPath(){planned++;return [];}},chinaMoneyHouse:null,
 stationIntent:playerStationIntent,requestStationIntent:station=>{requests.push(station);return true;}};
const api=vm.runInNewContext(code+';({walletBankTarget,goToWalletBank})',context);
const counters=[['china',CHINA_MONEY_HOUSE,()=>({id:CHINA_MONEY_HOUSE.stationId,position:CHINA_MONEY_HOUSE.points.counter,action:'办理存取、兑换与查账'})],
 ['japan',JAPAN_EXCHANGE_COUNTER,japanExchangeStation],['egypt',EGYPT_EXCHANGE_COUNTER,egyptExchangeStation],['france',FRANCE_EXCHANGE_COUNTER,franceExchangeStation]];
let prior=null;
for(const[country,counter,station]of counters){
 context.active={id:country};context.lot={stations:[{id:'unrelated',position:[0,0,0]},station()]};context.chinaMoneyHouse={ownsStation:id=>id===counter.stationId};
 const target=api.walletBankTarget();assert.equal(target.country,country);assert.equal(target.stationId,counter.stationId);assert.equal(target.label,country==='china'?'去钱庄':'去银行');
 if(prior)assert.equal(api.goToWalletBank(prior),false,'previous country cannot navigate its old bank');
 assert.equal(api.goToWalletBank(target),true);assert.equal(requests.at(-1).id,counter.stationId);assert.deepEqual(requests.at(-1).position,counter.points.counter);
 assert.equal(planned,0,'availability never invokes path planning');prior=target;
}
assert.equal(requests.length,4);
const current=api.walletBankTarget();context.lot={stations:[...context.lot.stations]};assert.equal(api.goToWalletBank(current),false,'same-country reload invalidates scene identity');
for(const[key,value]of [['mode','globe'],['player',null],['chinaMoneyHouse',null],['routeOptions',null],['automaticDoors',null],['lot',{stations:[]}],['lot',{stations:[{id:FRANCE_EXCHANGE_COUNTER.stationId,npcOnly:true}]}]]){
 const old=context[key];context[key]=value;assert.equal(api.walletBankTarget(),null,key+' unavailable');assert.equal(api.goToWalletBank(current),false);context[key]=old;
}
context.requestStationIntent=()=>false;assert.equal(api.goToWalletBank(api.walletBankTarget()),false,'shared intent rejection propagates without an alternate route or transaction');
assert.equal(requests.length,4);assert.equal(planned,0);
console.log('PASS wallet bank adapter: four original local counters, live country/scene, missing navigation/service, old intents and shared intent rejection; no route planning during reads');
