// TR03 risks: a dropped save must not advance a border checkpoint, interruption
// must retain the same journey, and duplicate callbacks must not mint new marks.
import assert from 'node:assert/strict';
import {createTravelJourney,travelJourneyView,TRAVEL_REGIONS} from '../source/game/travel-journey.js';

const clone=value=>structuredClone(value);
const actions=['departure','board','land','entry','arrive'];
const stages=['planned','departure-cleared','flying','entry-pending','entry-cleared','arrived'];
const freeze=value=>{Object.freeze(value);for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);return value;};
function fixture(initialRegion=null,saved=null) {
  let durable=saved&&clone(saved),writes=0,clockReads=0,clock={day:7,hour:8.25},writer=null;
  const core=createTravelJourney({saved,initialRegion,getClock:()=>{clockReads++;return clock;},saveState:(next,meta)=>{
    writes++;if(writer)return writer(next,meta);durable=clone(next);return true;
  }});
  return {core,clock:()=>clock,setClock:value=>clock=value,writes:()=>writes,clockReads:()=>clockReads,saved:()=>clone(durable),setWriter:value=>writer=value};
}
function finish(f,to) {
  const result=f.core.begin(to);assert(result.ok);assert(!result.sameRegion);
  for(const action of actions)assert(f.core.advance(result.journey.id,action).ok,action);
  return result.journey.id;
}

// Every directed route uses the same ordered state machine, but exit/entry
// countries and the next journey's departure must remain tied to its own route.
let routeCount=0;
for(const from of TRAVEL_REGIONS)for(const to of TRAVEL_REGIONS)if(from!==to){
  const f=fixture(from),begin=f.core.begin(to),id=begin.journey.id;routeCount++;
  assert(begin.ok);assert.equal(id,'travel-journey-1');assert.equal(begin.journey.from,from);assert.equal(begin.journey.to,to);
  assert.equal(begin.event.action,'begin');assert.equal(f.core.view().revision,1);assert.equal(f.core.view().stamps.length,0);
  assert.equal(f.core.view().currentRegion,from);
  for(const [index,action]of actions.entries()){
    f.setClock({day:7,hour:9+index/4});const result=f.core.advance(id,action);assert(result.ok,`${from}→${to} ${action}`);
    assert.equal(result.journey.stage,stages[index+1]);assert.equal(f.core.view().currentRegion,action==='arrive'?to:from);
    assert.equal(f.core.view().stamps.length,index<3?1:2);
    assert.deepEqual(travelJourneyView(f.saved()),f.core.view());
    const cold=createTravelJourney({saved:f.saved(),initialRegion:TRAVEL_REGIONS.find(r=>r!==from&&r!==to)});
    assert.deepEqual(cold.snapshot(),f.core.snapshot(),'saved country wins over the host seed');
    assert.deepEqual(cold.view(),f.core.view());
  }
  assert.equal(f.writes(),6);assert.equal(f.core.view().active,null);assert.equal(f.core.view().revision,6);
  assert.deepEqual(f.core.view().stamps,[
    {id:`${id}:exit`,journeyId:id,kind:'exit',regionId:from,from,to,day:7,hour:9},
    {id:`${id}:entry`,journeyId:id,kind:'entry',regionId:to,from,to,day:7,hour:9.75},
  ]);
  const before=f.saved(),reads=f.clockReads();f.setClock({day:90,hour:20});
  for(const action of actions){const replay=f.core.advance(id,action);assert(replay.ok&&replay.replayed);assert.deepEqual(replay.event,before.journeys[0].events.find(e=>e.action===action));}
  assert.equal(f.writes(),6);assert.equal(f.clockReads(),reads,'replay does not redates a checkpoint');assert.deepEqual(f.saved(),before);
  const same=f.core.begin(to);assert(same.ok&&same.sameRegion);assert.equal(f.writes(),6);assert.equal(f.core.view().stamps.length,2);
  const second=f.core.begin(from);assert(second.ok);assert.equal(second.journey.id,'travel-journey-2');assert.equal(second.journey.from,to);
  assert(f.core.advance(id,'arrive').replayed);assert.equal(f.core.view().active.id,second.journey.id,'old completion cannot replace the new active journey');
}
assert.equal(routeCount,12);

// First launch has no invented departure country or old dates. All four
// destinations receive their real entry stamp only at the entry checkpoint.
for(const to of TRAVEL_REGIONS){
  const f=fixture(),id=finish(f,to);assert.equal(f.core.view().stamps.length,1);
  assert.deepEqual(f.core.view().stamps[0],{id:`${id}:entry`,journeyId:id,kind:'entry',regionId:to,from:null,to,day:7,hour:8.25});
}
assert.deepEqual(travelJourneyView().stamps,[]);assert.deepEqual(travelJourneyView(null).stamps,[]);
assert.equal(travelJourneyView({visited:['china','japan'],stamps:{china:['cn-tea']}}).loadError,'invalid-travel-journey');
{
  const f=fixture('china'),before=f.core.snapshot();f.setClock(null);
  assert(f.core.begin('china').sameRegion);assert.deepEqual(f.core.snapshot(),before);assert.equal(f.writes(),0);assert.equal(f.clockReads(),0);
}

// Every checkpoint, including initial ID allocation, must reject all save
// answers except literal true. Cold reload sees the previous durable checkpoint.
const rejected=[()=>false,()=>undefined,()=>null,()=>0,()=>({ok:true}),()=>{throw Error('full storage');},()=>Promise.resolve(true),()=>Promise.reject(Error('offline storage'))];
for(const checkpoint of ['begin',...actions])for(const reject of rejected){
  const f=fixture('china');let id=null;
  if(checkpoint!=='begin'){
    id=f.core.begin('japan').journey.id;
    for(const action of actions){if(action===checkpoint)break;assert(f.core.advance(id,action).ok);}
  }
  const before=f.core.snapshot(),durable=f.saved();f.setWriter(reject);
  const failed=checkpoint==='begin'?f.core.begin('japan'):f.core.advance(id,checkpoint);
  assert(!failed.ok,checkpoint);assert(['save-failed','async-save-unsupported'].includes(failed.code));
  assert.deepEqual(f.core.snapshot(),before);assert.deepEqual(f.saved(),durable);
  const cold=fixture('china',durable);assert.deepEqual(cold.core.snapshot(),before);
  const retry=checkpoint==='begin'?cold.core.begin('japan'):cold.core.advance(id,checkpoint);assert(retry.ok);
  assert.equal(retry.journey.id,'travel-journey-1','failed writes do not consume or replace the journey number');
  assert.equal(retry.journey.stage,checkpoint==='begin'?'planned':stages[actions.indexOf(checkpoint)+1]);
}
await Promise.resolve();

// Closing the UI only needs to retain this checkpoint. Reload and a repeated
// destination click reuse it, then each next action continues the same number.
for(let count=0;count<actions.length;count++){
  const f=fixture('egypt'),id=f.core.begin('france').journey.id;
  for(const action of actions.slice(0,count))assert(f.core.advance(id,action).ok);
  const cold=fixture(null,f.saved()),replay=cold.core.begin('france');
  assert(replay.ok&&replay.replayed);assert.equal(replay.journey.id,id);assert.equal(replay.journey.stage,stages[count]);assert.equal(cold.writes(),0);
  assert.equal(cold.core.begin('japan').code,'journey-conflict');assert.equal(cold.core.begin('egypt').code,'journey-conflict');
  for(const action of actions.slice(count))assert(cold.core.advance(id,action).ok);
  assert.equal(cold.core.view().stamps.length,2);assert.equal(cold.core.view().currentRegion,'france');
}

// Cancellation is a durable planned-only terminal event. It does not mint
// stamps, move the country, recycle an ID or undo an already cleared departure.
{
  const f=fixture('china'),id=f.core.begin('japan').journey.id,before=f.saved();
  f.setWriter(()=>false);assert.equal(f.core.cancel(id).code,'save-failed');assert.deepEqual(f.saved(),before);assert.equal(f.core.view().active.stage,'planned');
  f.setWriter(null);const cancelled=f.core.cancel(id);assert(cancelled.ok);assert.equal(cancelled.journey.stage,'cancelled');
  assert.equal(f.core.view().currentRegion,'china');assert.equal(f.core.view().active,null);assert.equal(f.core.view().stamps.length,0);
  const cold=fixture(null,f.saved());assert(cold.core.cancel(id).replayed);assert.equal(cold.writes(),0);assert.equal(cold.core.advance(id,'departure').code,'journey-closed');
  const second=cold.core.begin('japan');assert.equal(second.journey.id,'travel-journey-2');assert(cold.core.advance(second.journey.id,'departure').ok);
  assert.equal(cold.core.cancel(second.journey.id).code,'invalid-stage');assert.equal(cold.core.advance(second.journey.id,'cancel').code,'invalid-action');
}

// Metadata is the same candidate the host must save with its visited/world
// patch. It is supplied before adoption, especially on the final arrive save.
{
  const f=fixture('china');let expectedStage='planned',id,arriveMeta=null;
  f.setWriter((next,meta)=>{
    assert(Object.isFrozen(next));assert(Object.isFrozen(next.journeys));assert(Object.isFrozen(meta.journey.events[0]));
    assert.equal(next.revision,f.core.view().revision+1);assert.equal(meta.journey.stage,expectedStage);
    assert.deepEqual(meta.event,meta.journey.events.at(-1));assert.deepEqual(next.journeys.at(-1),meta.journey);assert.equal(meta.action,meta.event.action);
    if(meta.action==='arrive'){assert.equal(next.currentRegion,'japan');assert.equal(next.activeId,null);assert.equal(f.core.view().currentRegion,'china');arriveMeta=meta;}
    return true;
  });
  id=f.core.begin('japan').journey.id;
  for(const [index,action]of actions.entries()){expectedStage=stages[index+1];assert(f.core.advance(id,action).ok);}
  assert.equal(arriveMeta.journey.id,id);assert.equal(arriveMeta.journey.to,'japan');
}

// Bad writes, nested callbacks and detached-view edits cannot change the
// candidate under the writer or leak mutations into the committed ledger.
{
  const f=fixture('china');let nested=[];
  f.setWriter(()=>{nested.push(f.core.begin('egypt'),f.core.advance('travel-journey-1','departure'),f.core.cancel('travel-journey-1'));return true;});
  const begin=f.core.begin('japan');assert(begin.ok);assert(nested.every(result=>!result.ok&&result.code==='journey-busy'));assert.equal(f.core.view().lastError,null);
  f.setWriter(next=>{next.journeys[0].to='france';return true;});
  assert.equal(f.core.advance(begin.journey.id,'departure').code,'save-failed');assert.equal(f.core.view().active.stage,'planned');assert.equal(f.core.view().active.to,'japan');
  const snapshot=f.core.snapshot(),view=f.core.view();snapshot.journeys[0].to='egypt';view.active.to='france';begin.journey.to='egypt';
  assert.equal(f.core.view().active.to,'japan');
  let core;core=createTravelJourney({initialRegion:'china',getClock:()=>{assert.equal(core.begin('france').code,'journey-busy');return {day:1,hour:2};},saveState:()=>true});
  assert(core.begin('japan').ok);assert.equal(core.view().active.to,'japan');
}

// Corrupt histories are locked as a whole. No partial passport marks, guessed
// current country, automatic migration or write-back can launder bad records.
{
  const f=fixture('china');finish(f,'japan');finish(f,'egypt');const saved=freeze(f.saved());
  assert.deepEqual(travelJourneyView(saved),f.core.view());
  const corruptions=[
    s=>s.version=2,s=>s.revision++,s=>s.serial++,s=>s.currentRegion='france',s=>s.activeId=s.journeys[0].id,
    s=>s.initialRegion=null,s=>s.journeys[0].id='travel-journey-5',s=>s.journeys[1].from='france',
    s=>s.journeys[0].to='china',s=>s.journeys[0].stage='planned',s=>s.journeys[0].events.pop(),
    s=>s.journeys[0].events[1].from='egypt',s=>s.journeys[0].events[1].to='france',s=>s.journeys[0].events[1].journeyId=s.journeys[1].id,
    s=>s.journeys[0].events[1].id='forged',s=>s.journeys[0].events[1].day=-1,s=>s.journeys[0].events[1].hour=24,
    s=>s.journeys[0].events[1].action='entry',s=>s.journeys[0].events.splice(1,0,clone(s.journeys[0].events[1])),
    s=>s.journeys[0].events.reverse(),s=>s.journeys[0].events[0].paid=1,s=>s.stamps=[{kind:'entry',regionId:'france'}],
    s=>s.journeys[0].events[0].day=NaN,s=>s.journeys[0].events[0].hour=Infinity,
  ];
  for(const corrupt of corruptions){
    const bad=clone(saved);corrupt(bad);let writes=0;
    const core=createTravelJourney({saved:bad,initialRegion:'france',getClock:()=>({day:1,hour:2}),saveState:()=>{writes++;return true;}});
    assert.equal(core.view().loadError,'invalid-travel-journey');assert.equal(core.view().currentRegion,null);assert.equal(core.view().active,null);
    assert.deepEqual(core.view().stamps,[]);assert.deepEqual(travelJourneyView(bad).stamps,[]);assert.equal(core.snapshot(),null);
    assert(!core.begin('china').ok);assert(!core.advance('travel-journey-1','arrive').ok);assert(!core.cancel('travel-journey-1').ok);assert.equal(writes,0);
  }
  for(const bad of [{},[],false,0,'china'])assert.equal(travelJourneyView(bad).loadError,'invalid-travel-journey');
}

{
  const f=fixture('china'),id=f.core.begin('japan').journey.id,before=f.core.snapshot();
  for(const action of ['board','land','entry','arrive','cancelled',{action:'departure',to:'france'},null])assert(!f.core.advance(id,action).ok);
  for(const bad of ['moon','constructor',null,{to:'japan'}])assert.equal(f.core.begin(bad).code,'invalid-region');
  for(const bad of [null,{},'travel-journey-0','travel-journey-01','other'])assert.equal(f.core.advance(bad,'departure').code,'invalid-journey-id');
  assert.equal(f.core.advance('travel-journey-9','departure').code,'journey-not-found');assert.deepEqual(f.core.snapshot(),before);
  for(const clock of [null,{}, {day:-1,hour:8},{day:1.2,hour:8},{day:1,hour:-1},{day:1,hour:24},{day:1,hour:NaN},{day:1,hour:Infinity}]){
    f.setClock(clock);assert.equal(f.core.advance(id,'departure').code,'invalid-clock');assert.deepEqual(f.core.snapshot(),before);
  }
  assert.equal(createTravelJourney({getClock:()=>({day:1,hour:8})}).begin('japan').code,'persistence-unavailable');
  assert.equal(createTravelJourney({getClock:()=>{throw Error('clock unavailable');},saveState:()=>true}).begin('japan').code,'invalid-clock');
}
console.log('PASS travel journey: 12 directed routes, first-entry origins, exact clocks, checkpoint rejection/cold resume, idempotent replay, planned cancellation, atomic arrival metadata, tamper and reentry guards');
