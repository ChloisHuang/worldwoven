// Regressions for break starvation, unsafe tray abandonment, double kitchen
// use, player furniture priority and scene-local lock recovery.
import assert from 'node:assert/strict';
import {createJapanStaffLife,JAPAN_STAFF_CREW} from '../source/game/japan-staff-life.js';
import {createJapanServiceOrders,JAPAN_SERVICE_WORKERS} from '../source/game/japan-service-orders.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const actors=new Map(JAPAN_STAFF_CREW.map(id=>[id,{station:{id,npcName:id}}])),tasks=new Map(),facilities=createFacilityQueue();
const items=[{id:'staff-seat',kind:'seat',center:[-6.8,11.4,-7.45],position:[-6.8,11.4,-8.39]},{id:'staff-bed',kind:'bed',center:[-4.3,11.4,-11.5],position:[-4.3,11.4,-9.18]}];
const board=createJapanServiceOrders();
const options={actors,board,furniture:{items,facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>{tasks.set(n.station.id,{...t,to});},clear:n=>tasks.delete(n.station.id),unmount:n=>{n.serviceMount=null;return true;},taskOf:n=>tasks.get(n.station.id),saved:{next:0,dueIn:0}};
const life=createJapanStaffLife(options),retiring=actors.get('jp-ramen'),relief=actors.get('jp-sushi');
tasks.set('jp-ramen',{orderJobId:'held-tray'});tasks.set('jp-sushi',{orderJobId:'cooking'});
life.update(1,{night:true});
assert.equal(life.state().active.phase,'draining');assert.equal(life.canWork('jp-ramen'),false);assert.equal(life.canWork('jp-sushi'),false);
assert.equal(tasks.get('jp-ramen').orderJobId,'held-tray','A due break never releases an unfinished held tray');
tasks.delete('jp-ramen');life.update(1,{night:true});assert.equal(life.state().active.phase,'draining','Wait for relief’s safe current job completion');
tasks.delete('jp-sushi');life.update(1,{night:true});assert.equal(life.state().active.phase,'handoff');
function finish(id){const t=tasks.get(id);assert.ok(t,id+' has a physical task');if(t.mount)actors.get(id).serviceMount=t.mount;t.arrived=true;t.onArrive?.();assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);}
finish('jp-sushi');finish('jp-ramen');life.update(1,{night:true});assert.equal(tasks.get('jp-ramen').action,'ramen');
assert.equal(board.holdWorkplace('kitchen','jp-sushi'),false,'Staff meal owns the real order kitchen until cooked');
assert.equal(life.canWork('jp-sushi'),true,'Relief remains available for delivery while staff meal cooks');
finish('jp-ramen');assert.equal(life.meals().length,1);life.update(1,{night:true});assert.equal(tasks.get('jp-ramen').mount.id,'staff-seat');
finish('jp-ramen');assert.equal(life.meals().length,0);life.update(1,{night:true});assert.equal(tasks.get('jp-ramen').action,'tea');
finish('jp-ramen');life.update(1,{night:true});assert.equal(tasks.get('jp-ramen').mount.id,'staff-bed');
finish('jp-ramen');life.update(1,{night:true});finish('jp-ramen');
assert.equal(life.state().completed,1);assert.equal(life.state().nextWorkerId,'jp-sushi');assert.equal(life.canWork('jp-ramen'),true);
life.update(36,{night:true});assert.equal(life.state().active.id,'jp-sushi','Both staff get fair turns under continuous work');
finish('jp-ramen');finish('jp-sushi');life.update(1,{night:true});finish('jp-sushi');life.update(1,{night:true});
relief.serviceMount=items[0];life.playerRequest('staff-seat');assert.equal(relief.serviceMount,null);assert.equal(facilities.state().find(f=>f.id==='staff-seat').owner,null);
assert.equal(life.state().active.phase,'returning');assert.equal(life.meals().length,0,'Player yield clears the staff tray');
const snapshot=life.snapshot();assert.equal(snapshot.dueIn,0);assert.equal('active' in snapshot,false,'Do not serialize physical ownership');
life.dispose();tasks.clear();const resumed=createJapanStaffLife({...options,saved:snapshot});resumed.update(.1,{night:true});assert.equal(resumed.state().active.id,'jp-sushi','Interrupted worker retains their turn on region re-entry');
resumed.dispose();tasks.clear();
const daytime=createJapanStaffLife({...options,saved:{next:0,dueIn:0}});daytime.update(.1,{night:false});finish('jp-ramen');finish('jp-sushi');
for(const phase of ['preparing','meal','tea']){daytime.update(.1,{night:false});assert.equal(daytime.state().active.phase,phase);finish('jp-ramen');}
assert.equal(daytime.state().active.phase,'returning','Day break finishes after meal and tea without claiming a bed');daytime.update(.1,{night:false});finish('jp-ramen');
daytime.update(.1,{night:true});assert.ok(daytime.state().dueIn<=10,'Entering night brings the next safe sleep rotation forward');daytime.dispose();board.dispose();assert.ok(JAPAN_SERVICE_WORKERS.cook.includes('jp-sushi'));assert.ok(JAPAN_SERVICE_WORKERS.serve.includes('jp-ramen'));
console.log('PASS: finish held jobs, physical relief gate, fair alternating breaks, kitchen lock, meal/tea/sleep, player yield and re-entry');
