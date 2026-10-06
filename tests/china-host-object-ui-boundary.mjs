// Role providers and object presentation must agree after a holder changes.
// Actual modules + extracted production metadata builders; no geometry/routes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createObjectInteractionAnchors} from '../source/game/object-interaction-anchors.js';
import {createChinaTavernService} from '../source/game/china-tavern-service.js';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createChinaTavernEmployment} from '../source/game/china-tavern-employment.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {TAVERN_MEAL} from '../source/game/china-tavern-kitchen.js';
import {tavernTablePlace} from '../source/game/china-tavern-layout.js';
import {ORIGINAL_TAVERN_HOST_ID} from '../source/game/china-tavern-host-role.js';
const counter={id:ORIGINAL_TAVERN_HOST_ID,workTarget:[23.4,1.32,6.4]},original={station:{...counter,npcName:'许安',npcPosition:[24.1,.215,6.4]},root:{position:{x:24.1,y:.215,z:6.4}}},replacement={station:{id:'cn-garden',npcName:'现任掌柜',workTarget:[-4,1,12],npcPosition:[-4,.215,12]},root:{position:{x:24.1,y:.215,z:6.4}}},player={root:{position:{x:22.35,y:.215,z:6.7}},ageYears:24};
const anchors=createObjectInteractionAnchors({actors:()=>[original,replacement],stations:()=>[counter]});
let binding={roleId:'cn-tavern-host',slotId:'cn-tavern-host-rotation-1',holderId:replacement.station.id,actor:replacement,alive:true,isPlayer:false,available:true,revision:1};
const gates={hostRole:()=>binding,hostActor:()=>binding.available&&binding.alive&&!binding.isPlayer?binding.actor:null,hostAtPost:()=>true,hostAdmissionOpen:()=>true,hostCompletionAvailable:()=>true,hostUnavailableReason:()=> '掌柜暂不可接待',active:()=>false};
const careers={isHired:()=>false,workState:()=>({revision:0}),state:()=>({revision:0}),applicationResult:()=>null,beginDutyAvailability:()=>({ok:true})};
const scene={...gates,snapshot:()=>null,state:()=>({}),choices:()=>[],finished:()=>false,stopActivity(){}};
const service=createChinaTavernService({meal:{staffScene:scene,view:()=>({order:null})},careers,host:original,getPlayer:()=>player,getClock:()=>({day:1,hour:10}),document:null});
const employment=createChinaTavernEmployment({saveState:()=>true,meetHost:()=>false});
const labor=createChinaTavernLabor({serviceAdapter:()=>gates,employment,careers,host:original,getPlayer:()=>player,copperLedger:createCurrencyLedger({saveState:()=>true}),document:null});
const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8'),decoration={japanServiceUI:null,npcs:[original,replacement]};vm.createContext(decoration);vm.runInContext(main.slice(main.indexOf('function contextualTarget('),main.indexOf('function currentControl(')),decoration);
for(const [provider,kind]of[[service,'formal-apply'],[labor,'apply']]){
 const intent=provider.intent(kind),decorated=decoration.contextualTarget(intent);assert.equal(anchors.resolve(decorated).actor,replacement);assert.match(decorated.targetName,/现任掌柜/);assert(!decorated.targetName.includes('许安'));
}
for(const row of[{holderId:null,actor:null,alive:false,isPlayer:false,available:false},{holderId:replacement.station.id,actor:replacement,alive:false,isPlayer:false,available:false},{holderId:'player',actor:player,alive:true,isPlayer:true,available:true}]){
 binding={...binding,...row};for(const [provider,kind]of[[service,'formal-apply'],[labor,'apply']]){const intent=provider.intent(kind);assert(intent,'unavailable request may remain explicit');assert.equal(anchors.resolve(decoration.contextualTarget(intent)),null,'no incumbent never falls through to predecessor marker');}
}
for(const action of[{provider:'china-tavern-service',kind:'formal-view'},{provider:'china-tavern-service',kind:'property'},{provider:'china-tavern-labor',kind:'view'},{provider:'china-tavern-lodging',kind:'view'},{provider:'service-menu',kind:'view',menuId:'china-meal',targetKey:ORIGINAL_TAVERN_HOST_ID}]){
 const item=decoration.contextualTarget({...action,id:action.menuId||action.provider,position:[22.35,.215,6.7]}),anchor=anchors.resolve(item);assert.deepEqual(anchor.point,counter.workTarget);if(item.targetName)assert(!item.targetName.includes('许安'),'static counter title has no predecessor identity');
}
const social={id:ORIGINAL_TAVERN_HOST_ID,social:true,actor:original,targetName:'许安本人',position:[24.1,.215,6.4]};assert.equal(decoration.contextualTarget(social),social,'former person social action is preserved');
const source=fs.readFileSync(new URL('../source/game/china-tavern-service-scene.js',import.meta.url),'utf8'),context={ORIGINAL_TAVERN_HOST_ID,lot:{stations:[counter]},host:null,staff:{host:null},role:()=> 'host',P:TAVERN_MEAL.points,tablePlace:tavernTablePlace};vm.createContext(context);vm.runInContext(source.slice(source.indexOf(' function describe('),source.indexOf(' function choices(){')),context);
for(const kind of['handover-in','handover-out']){const choice=context.describe(kind,null,[22.35,.215,6.7],kind),anchor=anchors.resolve({provider:'china-tavern-service',kind:'task',choice,position:choice.position});assert.deepEqual(anchor.point,counter.workTarget);assert.equal(anchor.id,'object:counter:'+ORIGINAL_TAVERN_HOST_ID);}
context.host=replacement;const rent=context.describe('rent-room',null,[24.1,.215,6.4],'登记客房');assert.deepEqual(Array.from(rent.visualAnchor.point),counter.workTarget,'rent-room belongs to tavern surface, never replacement former workplace');context.staff.host=replacement;assert.equal(context.describe('handover-in',null,[22.35,.215,6.7],'交班').visualAnchor.actorId,replacement.station.id);
console.log('PASS merged host/object UI: successor identity/name; vacancy/dead/player suppress predecessor; static counters; former-person social identity; player handover and rent-room actual counter surfaces');
