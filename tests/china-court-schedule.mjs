import assert from 'node:assert/strict';
import {createAudienceSchedule,courtRouteBudget,cachedCourtPlanner,COURT_START_HOUR} from '../source/game/china-court-schedule.js';
const schedule=createAudienceSchedule();
assert.equal(COURT_START_HOUR,11.5);
assert(Math.abs(schedule.secondsUntil(10)-128.5714285714)<1e-6);
assert(schedule.due(10,false,120),'long real route summons everyone at the initial clock');
assert(!schedule.due(10,false,40),'short route needs no arbitrary individual waiting schedule');
schedule.call(10,120);
assert(!schedule.start(11.49),'early arrivals must hold until the one fixed courtStart');
assert(schedule.atStart(11.5));assert(schedule.start(11.5));
assert.equal(schedule.snapshot().courtStart,11.5);
schedule.finish('completed');assert.equal(schedule.snapshot().completionId,'cn-morning-audience:0');
assert(!createAudienceSchedule(schedule.snapshot()).due(10,false,999),'refresh cannot replay a completed court');
const late=createAudienceSchedule();late.call(10,120);late.finish('postponed','player-blocked-entrance');
assert.equal(late.snapshot().courtStart,11.5,'an obstruction never slides the start time');
assert(!createAudienceSchedule(late.snapshot()).due(10,false,999));assert.equal(late.snapshot().completionId,null);
const missed=createAudienceSchedule();assert(missed.missed(12));missed.finish('missed','entered-after-court-start');assert(!missed.due(10,false,999));
const interrupted=createAudienceSchedule();interrupted.call();assert.equal(createAudienceSchedule(interrupted.snapshot()).snapshot().outcome,'interrupted');
for(const outcome of ['called','in-session','interrupted']){
 const resumed=createAudienceSchedule({version:2,day:4,calledDay:4,outcome});resumed.observe(10,4);
 assert(resumed.due(10,false,120),'unfinished '+outcome+' save must gather again before11:30');
 resumed.call(10,120);assert(!resumed.atStart(11.49));assert(resumed.start(11.5));
}
for(const outcome of ['completed','postponed','missed']){
 const terminal=createAudienceSchedule({day:4,calledDay:4,outcome});terminal.observe(10,4);assert(!terminal.due(10,false,999),outcome+' remains terminal');
}
const afterStart=createAudienceSchedule({day:4,calledDay:4,outcome:'called'});afterStart.observe(11.51,4);assert(!afterStart.due(11.51,false,999),'late reload cannot shift the fixed ceremony');
const recordedCompletion=createAudienceSchedule({day:4,calledDay:4,outcome:'interrupted',lastCompletedDay:4});recordedCompletion.observe(10,4);assert(!recordedCompletion.due(10,false,999),'a durable completion receipt blocks a replay even if the transient outcome differs');
schedule.observe(23.99);schedule.observe(.01);assert.equal(schedule.snapshot().day,1);assert(schedule.due(11,false,80));
const budget=courtRouteBudget({position:{x:0,y:0,z:0},path:[[3,0,4],[6,0,8]],walkSpeed:2,planPath:(_,p)=>[p],safeExitSeconds:2,doorSeconds:3});
assert(budget.reachable);assert.equal(budget.distance,10);assert.equal(budget.seconds,10/1.56+5);
assert(!courtRouteBudget({position:{x:0,y:0,z:0},path:[[3,0,4]],walkSpeed:2,planPath:()=>[]}).reachable);
let plans=0;const cached=cachedCourtPlanner((_,p)=>{plans++;return [p];}),legs={position:{x:0,y:0,z:0},path:[[3,0,4],[6,0,8]],walkSpeed:2,planPath:cached};
courtRouteBudget(legs);courtRouteBudget(legs);assert.equal(plans,2,'repeated authored legs reuse their planned route');
courtRouteBudget({...legs,position:{x:1,y:0,z:1},knownSegments:1});assert.equal(plans,2,'the actual current planned remainder is measured without A*');
console.log('PASS: fixed 11:30, common real-route summon budget, early hold, late/missed exception, durable receipt and reachable route length');

const {courtLaneBudgets}=await import('../source/game/china-court-schedule.js');
const segment=seconds=>({reachable:true,seconds,distance:seconds,doors:[]});
const lanes=courtLaneBudgets([{actor:'front',lane:0,approach:segment(30),entry:segment(17)},{actor:'other',lane:1,approach:segment(20),entry:segment(18)},{actor:'middle',lane:0,approach:segment(68),entry:segment(17)},{actor:'back',lane:0,approach:segment(35),entry:segment(16)}]);
assert.equal(lanes[0].seconds,47);assert.equal(lanes[1].seconds,38);assert.equal(lanes[2].seconds,85);assert.equal(lanes[3].seconds,101);assert.equal(lanes[3].queueWaitSeconds,50);assert.equal(Math.max(...lanes.map(a=>a.seconds)),101,'middle late approach includes real queued back-rank entry');
const blocked=courtLaneBudgets([{actor:'blocked',lane:0,approach:{reachable:false,seconds:Infinity,reason:'safe-exit-blocked'},entry:segment(10)},{actor:'back',lane:0,approach:segment(3),entry:segment(10)}]);assert.equal(blocked[1].reachable,false);
const inPlace=courtLaneBudgets([{actor:'front',lane:0,inPlace:true,approach:segment(0),entry:segment(0)},{actor:'back',lane:0,approach:segment(3),entry:segment(10)}]);assert.equal(inPlace[1].seconds,13);
console.log('PASS serialized two-lane admission ETA, long middle approach, independent opposite lane, already-seated rank and blocked predecessor');
