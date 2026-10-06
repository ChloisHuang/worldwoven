import assert from 'node:assert/strict';
import {createAudienceSchedule,courtRouteBudget,cachedCourtPlanner,COURT_START_HOUR} from '../source/game/china-court-schedule.js';
const schedule=createAudienceSchedule();
assert.equal(COURT_START_HOUR,11.5);
assert(Math.abs(schedule.secondsUntil(10)-128.5714285714)<1e-6);
assert(schedule.due(10,false,120),'long real route summons everyone at the initial clock');
assert(!schedule.due(10,false,40),'short route needs no arbitrary individual waiting schedule');
schedule.call(10,120);
assert(!schedule.start(11.49),'clock alone cannot grant an early opening without all-present proof');
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
const early=createAudienceSchedule();early.observe(10,0);early.call(10,120);assert(!early.start(10.2));assert(early.start(10.2,{assembled:true}));assert.equal(early.snapshot().startedAt,10.2);assert.equal(early.snapshot().lastStartedDay,0);assert(!early.start(10.3,{assembled:true}));
const unfinished=createAudienceSchedule(early.snapshot());unfinished.observe(10.25,0);assert.equal(unfinished.snapshot().outcome,'interrupted');assert(!unfinished.due(10.25,false,999));assert.equal(unfinished.call(10.25,120),false);assert(!unfinished.start(10.25,{assembled:true}));
early.finish('completed');const earlierDone=createAudienceSchedule(early.snapshot());earlierDone.observe(10.5,0);assert(!earlierDone.due(10.5,false,999));assert.equal(earlierDone.snapshot().completionId,'cn-morning-audience:0');earlierDone.observe(10,1);assert(earlierDone.due(10,false,999));
console.log('PASS: 11:30 deadline, common real-route summon budget, guarded early opening, late/missed exception, durable receipt and reachable route length');
