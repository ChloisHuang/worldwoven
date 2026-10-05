import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSimulationClock} from '../source/game/simulation-clock.js';
import {createAudienceSchedule} from '../source/game/china-court-schedule.js';

test('loaded simulation time survives reload and only natural time creates a day',()=>{
  let clock=createSimulationClock();for(let n=0;n<400;n++)clock.advance(.1);
  const saved=clock.snapshot(),before=clock.state();clock=createSimulationClock(saved);
  assert.deepEqual(clock.state(),before);assert.equal(clock.state().day,0);
  for(const bad of [NaN,-1,Infinity])clock.advance(bad);assert.deepEqual(clock.snapshot(),saved);
  clock.advance(80000);assert.equal(clock.state().seconds,before.seconds+.25,'background-sized deltas bounded');
  const midnight=(24*60-600)/.7;clock=createSimulationClock({version:1,seconds:midnight-.1});
  const audience=createAudienceSchedule({day:0,calledDay:0,outcome:'completed'});
  audience.observe(clock.state().hour,clock.state().day);clock.advance(.2);audience.observe(clock.state().hour,clock.state().day);
  assert.equal(clock.state().day,1);assert.equal(audience.snapshot().day,1);
  audience.observe(2,1);audience.observe(22,1);audience.observe(2,1);
  assert.equal(audience.snapshot().day,1,'lighting or clock-hour observers cannot invent another authoritative day');
});

test('existing court day migrates without replaying completed wages or changing the fixed start',()=>{
  const clock=createSimulationClock(undefined,7),a=createAudienceSchedule({day:7,calledDay:7,outcome:'completed'});
  assert.equal(clock.state().day,7);assert.equal(clock.state().hour,10);
  a.observe(clock.state().hour,clock.state().day);assert.equal(a.due(10,false,999),false);assert.equal(a.snapshot().courtStart,11.5);
});

test('legacy and persistent-clock unfinished summons recover before the same fixed start',()=>{
  for(const saved of [undefined,{version:1,seconds:4*1440/.7}]){
    const clock=createSimulationClock(saved,4),court=createAudienceSchedule({version:2,day:4,calledDay:4,outcome:'called'});
    court.observe(clock.state().hour,clock.state().day);
    assert(court.due(clock.state().hour,false,120));assert.equal(court.snapshot().day,4);
    court.call(clock.state().hour,120);
    for(let n=0;n<1285;n++){const s=clock.advance(.1);court.observe(s.hour,s.day);assert(!court.atStart(s.hour));}
    const s=clock.advance(.1);court.observe(s.hour,s.day);assert(court.atStart(s.hour));
    assert.equal(court.snapshot().completionId,null,'recovered summons grants no completion');
  }
});
