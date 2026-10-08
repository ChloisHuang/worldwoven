import assert from 'node:assert/strict';
import {readChinaUsurpationContext,projectUsurpationResidence} from '../source/game/china-usurpation-context.js';
import {RESERVED_CONSORT_QUARTERS as Q} from '../source/game/china-consort-quarters.js';

const actor=(id,ageYears=30)=>({actorId:id,root:{userData:{}},ageYears,alive:true,station:{id,npcName:id}});
const ids=['cn-emperor','cn-official-rites','cn-official-personnel','cn-range-warden','cn-archery','cn-consort-yue','cn-tavern-host'];
const room={id:Q.roomId,privateOwnerId:null},bed={id:Q.bedId,kind:'bed',privateRoomId:Q.roomId,privateOwnerId:null};
const scene={country:'china',player:actor('player',24),npcs:ids.map(id=>actor(id)),
 lot:{interiorRooms:[room],doorways:[{id:Q.doorId,rooms:[Q.roomId,'residence-suite-corridor']}]},
 furniture:{items:[bed,{id:'china-furniture-bed-0',kind:'bed',privateRoomId:'bedroom'}]},
 archery:{guardBinding:()=>({actorId:'cn-archery',available:true}),wardenBinding:()=>({actorId:'cn-range-warden',available:true})}};
const supported=new Set(['cn-official-rites','cn-official-personnel','cn-range-warden']);
const relationships={stanceFor:(id,target)=>({observerId:id,active:target==='player'&&supported.has(id),eventId:'support:'+id}),pair:()=>({trust:.2}),knownReputation:()=>.1};
const options={scene,relationships,getProfile:()=>({relations:{player:.4}}),careers:{skills:{cooking:99},performance:999,workExperience:{royalKitchen:{receipts:[]}},officialCareer:{service:[]}}};
let context=readChinaUsurpationContext(options);
assert.equal(context.supporters.length,3);assert.equal(new Set(context.supporters.map(row=>row.circleId)).size,2);
assert.equal(context.supporters.find(row=>row.id==='cn-range-warden').guardCommander,true);
assert.deepEqual(context.experience,{intrigue:0,guard:0,abdication:0},'skills and aggregate performance cannot manufacture work');
assert.deepEqual(context.residences.player,{roomId:Q.roomId,bedId:Q.bedId});
assert.equal(room.privateOwnerId,null,'read never grants a room');
scene.npcs.find(row=>row.actorId==='cn-range-warden').ageYears=17;
assert.equal(readChinaUsurpationContext(options).supporters.length,2);
scene.npcs.find(row=>row.actorId==='cn-range-warden').ageYears=undefined;
assert.equal(readChinaUsurpationContext(options).supporters.length,2,'unknown is not adult');
scene.npcs.find(row=>row.actorId==='cn-range-warden').ageYears=30;
supported.delete('cn-official-rites');assert.equal(readChinaUsurpationContext(options).supporters.length,2,'withdrawn support disappears');
supported.add('cn-official-rites');scene.npcs.push(scene.npcs[1]);
assert.equal(readChinaUsurpationContext(options).supporters.length,3,'same person counts once');
const receipt={source:'china-royal-kitchen',actorId:'cn-emperor',number:1,orderId:'cn-royal-meal-1',mealId:'cn-royal-meal-1-meal',day:0,workReceiptId:'cn-royal-kitchen-labor-1',completed:true};
options.careers.workExperience.royalKitchen.receipts=[receipt,receipt,{...receipt,completed:false}];
options.careers.officialCareer.service=[{id:'real-service-1',positive:true,score:1},{id:'real-service-1',positive:true,score:1},{id:'missed-service',positive:false,score:-1}];
options.guardWork={job:{checkpoints:[{circuit:0,routeId:'east',index:0,id:'actual-checkpoint'}]}};
assert.deepEqual(readChinaUsurpationContext(options).experience,{intrigue:1,guard:1,abdication:1});
room.privateOwnerId='other';bed.privateOwnerId='other';
context=readChinaUsurpationContext(options);assert.equal(context.residences.player,null,'occupied rooms are not taken');
const office={actorId:'player',residence:{roomId:Q.roomId,bedId:Q.bedId}};
assert.equal(projectUsurpationResidence(office,scene),false);assert.equal(bed.privateOwnerId,'other');
const rental={id:'rented-bed',kind:'bed',guestRoomId:'tavern-guest-east'};scene.furniture.items.push(rental);
scene.lodging={furnitureAccess:item=>item===rental};
assert.deepEqual(readChinaUsurpationContext(options).residences.player,{roomId:rental.guestRoomId,bedId:rental.id});
assert.equal(rental.privateOwnerId,undefined,'a paid stay stays a lease, not property');
room.privateOwnerId=bed.privateOwnerId=null;
assert.equal(projectUsurpationResidence({actorId:'cn-emperor',residence:office.residence},scene),false);
assert.equal(projectUsurpationResidence(office,scene),true);assert.equal(bed.privateOwnerId,'player');
assert.equal(scene.furniture.items[1].privateOwnerId,undefined,'former emperor chamber is untouched');
scene.country='japan';assert.equal(readChinaUsurpationContext(options).supporters.length,0);
assert.equal(projectUsurpationResidence(office,scene),false);
console.log('China usurpation sources: real support, adult identity, actual work and legal residence checks passed');
