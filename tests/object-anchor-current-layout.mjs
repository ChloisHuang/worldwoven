// The R132 floor transfer and R134 employee breaks exposed presentation bugs:
// desk views followed absent workers, and a retrieved dish used the wrong side.
// Exercise the live metadata builders without rerunning wages or whole scenes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createObjectInteractionAnchors} from '../source/game/object-interaction-anchors.js';
import {TAVERN_MEAL} from '../source/game/china-tavern-kitchen.js';
import {tavernTablePlace} from '../source/game/china-tavern-layout.js';

const host={station:{id:'cn-tavern-host',workTarget:[23.4,1.32,6.4]},root:{position:{x:24.9,y:4.265,z:5.57}}};
const chef={station:{id:'cn-cooking',playerWorkTarget:[22.3,5,-6.86]},root:{position:{x:22.1,y:.215,z:-6.25}}};
const anchors=createObjectInteractionAnchors({actors:()=>[host,chef],stations:()=>[host.station,chef.station]});
for(const action of [
 {provider:'china-tavern-lodging',kind:'view'},
 {provider:'china-tavern-labor',kind:'view'},
 {provider:'china-tavern-service',kind:'formal-view'},
 {provider:'china-tavern-service',kind:'property'},
 {provider:'service-menu',kind:'view',menuId:'china-meal',targetKey:'cn-tavern-host'},
]){
 const point=anchors.resolve({...action,position:[22.35,.215,6.7]});
 assert.equal(point.id,'object:counter:cn-tavern-host');assert.equal(point.kind,'hand');assert.deepEqual(point.point,host.station.workTarget);assert.equal(point.floorY,.215);
}
const registration=anchors.resolve({provider:'china-royal-kitchen-employment',kind:'formal-view',position:[23.6,4.015,-5.9]});
assert.equal(registration.id,'object:counter:cn-cooking');assert.deepEqual(registration.point,chef.station.playerWorkTarget);assert.equal(registration.floorY,4.015);
assert.equal(anchors.resolve({provider:'china-royal-kitchen-employment',kind:'formal-review',position:[23.6,4.015,-5.9]}).actor,chef,'real interview still labels the original person');
assert.equal(anchors.resolve({social:true,actor:host}).actor,host,'host conversation still follows the host');
host.root.position.y=.215;host.root.position.z=16.2;assert.deepEqual(anchors.resolve({provider:'china-tavern-lodging',kind:'view',position:[22.35,.215,6.7]}).point,host.station.workTarget,'the read-only counter does not follow the break');

const source=fs.readFileSync(new URL('../source/game/china-tavern-service-scene.js',import.meta.url),'utf8');
const context={host,lot:{stations:[host.station]},ORIGINAL_TAVERN_HOST_ID:'cn-tavern-host',P:TAVERN_MEAL.points,tablePlace:tavernTablePlace,staff:{chef:{station:{id:'cn-tavern-cook'}},assistant:{station:{id:'cn-tavern-assistant'}}},role:()=> 'chef'};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf(' function describe('),source.indexOf(' function choices(){')),context);
const rent=context.describe('rent-room',null,[22.35,.215,6.7],'登记客房');assert.deepEqual(Array.from(rent.visualAnchor.point),host.station.workTarget);
const south=tavernTablePlace('east',1).mealPoint,north=tavernTablePlace('east',-1).mealPoint;
const retrieve=context.describe('retrieve',{placedTableId:'east',placedMealPoint:south,mealPoint:north},[22.7,.215,16.44],'取回原盘');assert.deepEqual(Array.from(retrieve.visualAnchor.point),south);assert.notDeepEqual(Array.from(retrieve.visualAnchor.point),north);
assert.equal(context.describe('handover-in',null,[22.1,.215,9],'交班').visualAnchor.actorId,'cn-tavern-cook','employment role is not mistaken for actor identity');
for(const [kind,point] of [['prep',TAVERN_MEAL.points.prepTop],['heat',TAVERN_MEAL.points.stoveTop],['wash',TAVERN_MEAL.points.washTop],['pickup',TAVERN_MEAL.points.passTop]])assert.deepEqual(Array.from(context.describe(kind,null,[0,.215,0],kind).visualAnchor.point),point);
console.log('PASS moved desk, absent cross-floor workers, person-only interviews, real dish placement, original handover identity and current work surfaces');
