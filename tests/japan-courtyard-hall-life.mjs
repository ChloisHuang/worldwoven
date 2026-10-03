// Bounded regressions: local post ownership, reversible uniform, order
// permissions, saved rotation upgrades and the one shared staff-facility turn.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createJapanStaffLife,JAPAN_STAFF_CREW} from '../source/game/japan-staff-life.js';
import {createJapanServiceOrders,JAPAN_LOCAL_WORKERS,JAPAN_SERVICE_WORKERS} from '../source/game/japan-service-orders.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const source=fs.readFileSync('source/game/japan-bathhouse.js','utf8'),start=source.indexOf(' const stations=['),end=source.indexOf('\n ];',start);
const stations=JSON.parse(JSON.stringify(vm.runInNewContext(source.slice(start,end+4)+';stations')));
function fixture(saved={},omitId=null){
 const actors=new Map(JAPAN_STAFF_CREW.filter(id=>id!==omitId).map(id=>{const station=stations.find(s=>s.id===id),look={wardrobePreset:id==='jp-omamori'?'miko-hakama':'jinbei',hairStyle:id==='jp-omamori'?'low-bun':'bob',bodyPreset:id,shapeTraits:{height:.9}};return [id,{station,home:{toArray:()=>station.npcPosition.slice()},root:{userData:{appearance:look}}}];}));
 const original=new Map([...actors].map(([id,n])=>[id,JSON.stringify(n.root.userData.appearance)])),tasks=new Map(),facilities=createFacilityQueue(),board=createJapanServiceOrders();
 const items=[{id:'staff-seat',kind:'seat',center:[-6.8,11.4,-7.45],position:[-6.8,11.4,-8.39]},{id:'staff-bed',kind:'bed',center:[-4.3,11.4,-11.5],position:[-4.3,11.4,-9.18]}];
 const life=createJapanStaffLife({actors,board,furniture:{items,facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:n=>{n.serviceMount=null;return true;},taskOf:n=>tasks.get(n.station.id),changeWardrobe:(n,look)=>{n.root.userData.appearance={...look};},saved:{version:5,next:10,dueIn:0,...saved}});
 function done(id){const t=tasks.get(id);assert(t,id+' has task');if(t.mount)actors.get(id).serviceMount=t.mount;t.onArrive?.();assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);}
 return {actors,original,tasks,board,facilities,life,done,dispose(){life.dispose();board.dispose();facilities.dispose();}};
}
for(const [version,next,index]of [[1,3,1],[2,7,3],[3,11,5],[4,19,9],[5,13,13]]){
 const f=fixture({version,next,completed:7,interrupted:2,dueIn:8});assert.equal(f.life.state().nextWorkerId,JAPAN_STAFF_CREW[index]);assert.deepEqual(f.life.snapshot(),{version:5,next:index,dueIn:8,completed:7,interrupted:2});f.dispose();
}
const partial=fixture({next:0},'jp-balcony');assert(!partial.life.state().crew.includes('jp-tea'),'A missing partner excludes the complete local pair');partial.dispose();
const f=fixture();
for(let turn=0;turn<14;turn++){
 f.life.update(100,{night:true});const a=f.life.state().active,{id,reliefId}=a,n=f.actors.get(id),cover=f.actors.get(reliefId),local=JAPAN_LOCAL_WORKERS.includes(id);
 assert.equal(id,JAPAN_STAFF_CREW[(10+turn)%14]);assert.equal(f.life.canWork(id),false);assert.equal(f.life.canWork(reliefId),false);
 if(local){assert.deepEqual(f.tasks.get(reliefId).to,id==='jp-tea'?[-5.9,7.6,5.6]:n.home.toArray());assert.deepEqual(f.tasks.get(reliefId).mount?.anchor,id==='jp-tea'?n.home.toArray():undefined);}
 f.done(id);assert.equal(f.life.state().active.phase,'handoff');f.done(reliefId);
 if(local){const work=f.life.idleTask(reliefId);assert.equal(work.action,n.station.npcAction);assert.deepEqual(work.workTarget,n.station.workTarget);for(const kind of Object.keys(JAPAN_SERVICE_WORKERS))assert.equal(f.life.canClaim(id,kind),false);}
 if(id==='jp-omamori'){assert.equal(cover.root.userData.appearance.wardrobePreset,'miko-hakama');assert.equal(cover.root.userData.appearance.hairStyle,'low-bun');assert.equal(cover.root.userData.appearance.locomotionWardrobePreset,'jinbei');}
 for(const phase of ['preparing','meal','tea','sleep','returning']){f.life.update(.1,{night:true});assert.equal(f.life.state().active.phase,phase);if(phase==='preparing'){assert(f.board.holdWorkplace('kitchen',id));assert.equal(f.board.holdWorkplace('kitchen',reliefId),false);}f.done(id);}
 if(local){assert.equal(f.life.state().active.phase,'reclaiming');f.life.update(.1,{night:true});f.done(id);}
 if(id==='jp-tea')assert.equal(f.facilities.reservation('japan-kotatsu-host',id)?.actor,id,'Physically seated return retains its reservation');
 assert.equal(f.life.state().active,null);assert.equal(f.life.state().completed,turn+1);for(const [key,actor]of f.actors)assert.equal(JSON.stringify(actor.root.userData.appearance),f.original.get(key));
}
f.dispose();
for(const reason of ['dispose','abort-primary','abort-relief','player-request']){
 const f=fixture();f.life.update(.1);f.done('jp-omamori');f.done('jp-garden-onsen');const cover=f.actors.get('jp-garden-onsen');assert.equal(cover.root.userData.appearance.wardrobePreset,'miko-hakama');
 if(reason==='dispose')f.life.dispose();else if(reason==='player-request'){f.actors.get('jp-omamori').serviceMount={id:'staff-bed'};f.life.playerRequest('staff-bed');}else f.life.abort(f.actors.get(reason==='abort-primary'?'jp-omamori':'jp-garden-onsen'));
 if(['abort-primary','player-request'].includes(reason)){assert.equal(cover.root.userData.appearance.wardrobePreset,'miko-hakama','Relief still covers while original walks back');assert.equal(f.life.state().active.covering,true);f.life.update(.1);f.done('jp-omamori');f.life.update(.1);f.done('jp-omamori');}
 assert.equal(JSON.stringify(cover.root.userData.appearance),f.original.get('jp-garden-onsen'),reason+' restores clothes after actual coverage ends');assert(!JSON.stringify(f.life.snapshot()).includes('miko'));f.dispose();
}
const orders=createJapanServiceOrders(),guest=orders.spawn({side:'men',appearance:{},restPoint:[0,3.8,7],diningPoint:[0,3.8,7]});orders.guestStep(guest.id,'arrived',{position:[-4.22,0,5.7]});for(const id of JAPAN_LOCAL_WORKERS){assert(orders.holdWorkplace('kitchen',id));orders.releaseWorkplace(id);for(const job of orders.jobs())assert.equal(orders.claim(job.id,id),null);for(const ids of Object.values(JAPAN_SERVICE_WORKERS))assert(!ids.includes(id));}orders.dispose();
console.log('PASS: fourteen fair turns; old 2/4/6/10 saves; exact local post/action and kotatsu anchor; temporary miko restoration on return, abort, interruption and dispose; shared facilities and no customer-job grants');
