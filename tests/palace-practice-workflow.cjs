const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

(async()=>{
  const {createPalacePracticeWorkflow,PALACE_PRACTICE_ANCHORS:A}=await import(pathToFileURL(path.resolve(__dirname,'../source/game/palace-practice-workflow.js')));
  const passed=[],clone=x=>JSON.parse(JSON.stringify(x));
  function test(name,fn){fn();passed.push(name);}
  function harness(config={}){
    const actors=[
      {id:'cn-guard-rui',position:clone(A.home),radius:.25,height:1.95},
      {id:'player',position:{x:20.9,y:.215,z:22},radius:.34,height:1.95},
      {id:'cn-tea',position:{x:-21,y:.215,z:16},radius:.25,height:1.95},
      {id:'cn-calligraphy',position:{x:6.5,y:.815,z:-26.48},radius:.25,height:1.95},
      {id:'cn-cooking',position:{x:21,y:.215,z:-8},radius:.25,height:1.95},
      {id:'cn-rest',position:{x:-21,y:.215,z:-6},radius:.25,height:1.95},
      {id:'cn-garden',position:{x:5,y:.215,z:18},radius:.25,height:1.95}
    ];
    const events=[],moves=[],stops=[],phases={guard:new Set(),player:new Set()},completions=[],resets=[];
    let w,ticks=0;
    w=createPalacePracticeWorkflow({
      ...config.options,
      moveActor(info){
        moves.push({...info,target:{...info.target}});
        const special=config.move?.(info,w);if(special)return special;
        const a=actors.find(a=>a.id===info.actorId);if(!a)return 'blocked';
        const p=a.position,q=info.target,dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz),amount=Math.min(d,3*info.dt);
        // A numerical walk adapter: every step is bounded by speed * dt.
        if(d>1e-10){p.x+=dx/d*amount;p.z+=dz/d*amount;}
        assert(Math.abs(p.y-q.y)<.01,'the authored court route does not change floor');
        return Math.hypot(q.x-p.x,q.z-p.z)<.001?'arrived':'pending';
      },
      stopActor(id,why){stops.push({id,...why});},
      onShot(e){
        events.push(e);
        if(e.type==='release') {
          const s=w.getState();assert.equal(s.interlock,null,'a shot releases only when the interlock is clear');
          assert.equal(s.leaseOwner,e.actorId);assert.equal(s.bowHolder,e.actorId);assert(!s.reset);
        }
        config.onShot?.(e,w);
      },
      onTargetReset(e){assert(w.getState().courtCold,'target work only happens cold');assert.equal(w.getState().resetOwner,'cn-guard-rui');resets.push(e);},
      onComplete(e){completions.push(e);},
      onStateChange(s){phases.guard.add(s.guard.phase);phases.player.add(s.player.phase);}
    });
    phases.guard.add(w.getState().guard.phase);phases.player.add(w.getState().player.phase);
    function tick(extra={},dt=.05){
      ticks++;
      const state=w.getState();
      const next={actors,maintenanceGateOpen:state.maintenanceGateRequested,downrangeGateOpen:false,...extra};
      const s=w.update(dt,next);
      if(s.shot){assert.equal(s.interlock,null);assert.equal(s.shot.actorId,s.leaseOwner);assert(!s.courtCold);}
      if(s.reset){assert(s.courtCold);assert.equal(s.leaseOwner,null);assert.equal(s.bowHolder,null);}
      if(s.bowHolder)assert.equal(s.bowHolder,s.leaseOwner);
      return s;
    }
    function until(predicate,max=6000,extra={}){
      for(let i=0;i<max;i++){const s=tick(typeof extra==='function'?extra():extra);if(predicate(s))return s;}
      assert.fail('condition did not complete: '+JSON.stringify(w.getState()));
    }
    return {w,actors,events,moves,stops,phases,completions,resets,tick,until,get ticks(){return ticks;},
      actor:id=>actors.find(a=>a.id===id),start(){tick();w.startPlayer();return this;}};
  }
  const noOwnership=s=>{assert.equal(s.leaseOwner,null);assert.equal(s.bowHolder,null);assert.equal(s.shot,null);};

  test('guard completes a visible patrol, demonstration, prop return, cold reset and rest cycle',()=>{
    const h=harness();h.until(s=>h.resets.length===2&&s.guard.phase==='rest');
    for(const phase of ['walk-home','rest','greet','patrol','inspect-rack','reserve','rack-checkout','walk-to-marker','ready','stylized-practice','result','return-rack','rack-return','maintenance-approach','maintenance-open','maintenance-target','resetting','maintenance-exit','maintenance-close','inventory-walk','rack-inventory','return-home']) assert(h.phases.guard.has(phase),phase);
    assert.equal(h.events.filter(e=>e.type==='impact').length,3);assert.equal(h.completions.length,0);
    assert.equal(h.w.getState().guard.roundsCompleted,1);assert.equal(h.w.getState().needsReset,false);noOwnership(h.w.getState());
    assert(h.moves.some(m=>m.gateAccess==='maintenance'));
  });
  test('one explicit player round completes only after every walk, checkout, three gestures, return and exit',()=>{
    const h=harness().start();h.until(s=>s.player.phase==='complete');
    for(const phase of ['check-in','queue','waiting','reserve','walk-rack','rack-checkout','walk-to-marker','ready','stylized-practice','result','return-rack','rack-return','exit','complete'])assert(h.phases.player.has(phase),phase);
    assert.equal(h.completions.length,1);assert.equal(h.completions[0].actorId,'player');assert.equal(h.completions[0].shots,3);
    assert.equal(h.w.getState().player.progress,1);noOwnership(h.w.getState());
    assert(Math.hypot(h.actor('player').position.x-A.checkIn.x,h.actor('player').position.z-A.checkIn.z)<.01);
    const completeTicks=h.ticks;for(let i=0;i<50;i++)h.tick();assert.equal(h.completions.length,1);assert(completeTicks>160,'an eight-second generic timer cannot finish the route');
  });
  test('repeat starts are idempotent while queued, moving and active',()=>{
    const h=harness().start();
    for(let i=0;i<450;i++){
      const before=h.w.getState();if(before.player.phase==='complete')break;
      h.w.startPlayer();const after=h.w.getState();
      assert.equal(after.player.roundId,before.player.roundId);assert.deepEqual(after.player.route,before.player.route);assert.equal(after.player.phase,before.player.phase);h.tick();
    }
    h.until(s=>s.player.phase==='complete');assert.equal(h.completions.length,1);
  });
  test('guard midflight yields by cancelling the effect, returning the bow and physically reaching home',()=>{
    const h=harness();h.until(s=>s.shot?.actorId==='cn-guard-rui');h.w.startPlayer();
    assert.equal(h.w.getState().shot,null);assert.equal(h.w.getState().guard.phase,'return-rack');
    h.until(s=>s.leaseOwner==='player');
    assert.equal(h.w.getState().guard.phase,'waiting');assert.deepEqual(h.actor('cn-guard-rui').position,A.home);
    assert(h.phases.guard.has('rack-return'));assert(h.phases.guard.has('yield-home'));
    h.until(s=>s.player.phase==='complete');assert.equal(h.completions.length,1);
  });
  test('player waits outside the lanes while Rui leaves maintenance and closes its real gate',()=>{
    const h=harness();h.until(s=>s.guard.phase==='resetting');assert(h.w.canEnterDownrange('cn-guard-rui'));assert(!h.w.canEnterDownrange('player'));
    h.w.startPlayer();assert.equal(h.w.getState().guard.phase,'maintenance-exit');
    h.until(s=>s.leaseOwner==='player');assert(!h.w.getState().reset);assert(!h.w.getState().maintenanceGateRequested);assert.equal(h.w.getState().guard.phase,'waiting');
    h.until(s=>s.player.phase==='complete');assert.equal(h.completions.length,1);
  });
  for(const gate of ['maintenanceGateOpen','downrangeGateOpen'])test(gate+' cancels an in-flight visual immediately, then retries the interrupted gesture',()=>{
    const h=harness().start();h.until(s=>s.shot?.actorId==='player');const before=h.w.getState().player.shots;
    const s=h.tick({[gate]:true});assert.equal(s.shot,null);assert.equal(s.player.status,'paused');assert.equal(s.player.shots,before);assert.equal(h.completions.length,0);
    h.until(s=>s.player.phase==='complete');assert.equal(h.completions.length,1);assert.equal(h.events.filter(e=>e.type==='impact'&&e.actorId==='player').length,3);
    assert(h.events.some(e=>e.type==='clear'&&e.actorId==='player'));
  });
  test('an actor in either lane interlocks both lanes, including body-radius overlap',()=>{
    const h=harness().start();h.until(s=>s.shot?.actorId==='player');const stray=h.actor('cn-garden'),old=clone(stray.position);
    stray.position={x:23.9,y:.215,z:14};let s=h.tick();assert.equal(s.player.reason,'person-in-lane');assert.equal(s.shot,null);
    stray.position=old;h.until(s=>s.player.phase==='complete');assert.equal(h.completions.length,1);
  });
  test('a gate change on a zero-time frame still clears the visual',()=>{
    const h=harness().start();h.until(s=>s.shot?.actorId==='player');h.tick({maintenanceGateOpen:true},0);assert.equal(h.w.getState().shot,null);
  });
  test('missing gate data fails closed and expires rather than awarding an elapsed-time stamp',()=>{
    const h=harness().start();h.until(s=>s.player.phase==='ready');h.until(s=>s.player.phase==='blocked',500,{maintenanceGateOpen:undefined});
    assert.equal(h.completions.length,0);noOwnership(h.w.getState());assert.match(h.w.getState().player.reason,/interlock-timeout/);
  });
  test('lost marker contact never creates a visual shot and times out cleanly',()=>{
    const h=harness().start();h.until(s=>s.player.phase==='ready');h.actor('player').position.z=19;h.until(s=>s.player.phase==='blocked',500);
    assert.equal(h.completions.length,0);noOwnership(h.w.getState());assert.match(h.w.getState().player.reason,/off-marker/);
  });
  const playerPhases=['check-in','queue','waiting','reserve','walk-rack','rack-checkout','walk-to-marker','ready','stylized-practice','result','return-rack','rack-return','exit'];
  for(const desired of playerPhases)test('manual movement interrupts '+desired+' without reclaiming player control',()=>{
    const h=harness().start();if(h.w.getState().player.phase!==desired)h.until(s=>s.player.phase===desired);
    const moveCount=h.moves.filter(m=>m.actorId==='player').length;
    h.tick({playerManual:true});for(let i=0;i<20;i++)h.tick();
    assert.equal(h.moves.filter(m=>m.actorId==='player').length,moveCount);assert.equal(h.w.getState().player.phase,'interrupted');assert.equal(h.w.getState().playerControlled,false);
    assert.notEqual(h.w.getState().leaseOwner,'player');assert.notEqual(h.w.getState().bowHolder,'player');assert.equal(h.completions.length,0);
  });
  for(const desired of playerPhases)test('cancel from '+desired+' releases ownership and walks to a safe exit',()=>{
    const h=harness().start();if(h.w.getState().player.phase!==desired)h.until(s=>s.player.phase===desired);
    h.w.cancelPlayer();assert.notEqual(h.w.getState().leaseOwner,'player');assert.notEqual(h.w.getState().bowHolder,'player');assert.equal(h.w.getState().shot,null);
    h.until(s=>s.player.phase==='cancelled');assert.equal(h.completions.length,0);assert.equal(h.w.getState().playerControlled,false);
    assert(Math.hypot(h.actor('player').position.x-A.checkIn.x,h.actor('player').position.z-A.checkIn.z)<.01);
  });
  test('a failed return path clears ownership and withholds the stamp even after three target responses',()=>{
    const h=harness({move:(m,w)=>m.actorId==='player'&&w.getState().player.phase==='return-rack'?'blocked':null}).start();
    h.until(s=>s.player.phase==='blocked');assert.equal(h.w.getState().player.shots,3);assert.equal(h.completions.length,0);noOwnership(h.w.getState());
  });
  test('a pending route has a bounded deadlock timeout and an explicit failure reason',()=>{
    const h=harness({move:m=>m.actorId==='player'?'pending':null}).start();h.until(s=>s.player.phase==='blocked',600);
    assert.equal(h.w.getState().player.reason,'route-timeout');assert.equal(h.completions.length,0);assert.notEqual(h.w.getState().leaseOwner,'player');
  });
  test('an arrived response without physical movement cannot complete a walk',()=>{
    const h=harness({move:m=>m.actorId==='player'?'arrived':null}).start();h.until(s=>s.player.phase==='blocked',600);
    assert.equal(h.w.getState().player.reason,'route-timeout');assert.equal(h.completions.length,0);assert.deepEqual(h.actor('player').position,{x:20.9,y:.215,z:22});
  });
  test('gate-opening failure releases reset ownership and exposes a retryable guard block',()=>{
    const h=harness();h.until(s=>s.guard.phase==='maintenance-open');h.until(s=>s.guard.phase==='blocked',400,{maintenanceGateOpen:false});
    noOwnership(h.w.getState());assert.equal(h.w.getState().reset,false);assert.equal(h.w.getState().maintenanceGateRequested,false);assert.match(h.w.getState().guard.reason,/gate-timeout/);
    h.w.resumeGuard();h.until(s=>h.resets.length===2&&s.guard.phase==='rest');assert.equal(h.w.getState().guard.reason,null);
  });
  test('queue waiting is bounded when guard cannot reach the safe greeting point',()=>{
    const h=harness({move:m=>m.actorId==='cn-guard-rui'?'blocked':null}).start();h.until(s=>s.player.phase==='blocked',2200);
    assert.equal(h.w.getState().player.reason,'queue-timeout');noOwnership(h.w.getState());assert.equal(h.completions.length,0);
  });
  test('movement adapter exceptions cannot strand a practice lease or bow',()=>{
    const h=harness({move:(m,w)=>{if(m.actorId==='player'&&w.getState().player.phase==='walk-to-marker')throw Error('route adapter unavailable');}}).start();
    h.until(s=>s.player.phase==='blocked');noOwnership(h.w.getState());assert.equal(h.completions.length,0);assert.equal(h.w.getState().lastError.callback,'moveActor');
  });
  test('manual cancellation from inside a movement callback cannot resume its abandoned route',()=>{
    let cancel=false;
    const h=harness({move:(m,w)=>{if(cancel&&m.actorId==='player'){w.interruptPlayer();return 'arrived';}}}).start();
    h.until(s=>s.player.phase==='walk-to-marker');cancel=true;h.tick();assert.equal(h.w.getState().player.phase,'interrupted');noOwnership(h.w.getState());
  });
  test('large dt cannot catch up through multiple poses or fabricate a completed route',()=>{
    const h=harness().start(),p=clone(h.actor('player').position);h.tick({},500);
    assert(Math.hypot(h.actor('player').position.x-p.x,h.actor('player').position.z-p.z)<=.301);assert.equal(h.completions.length,0);
  });
  test('the player can explicitly start a second round after completing the first',()=>{
    const h=harness().start();h.until(s=>s.player.phase==='complete');h.w.startPlayer();h.until(s=>s.player.phase==='complete');assert.equal(h.completions.length,2);assert.notEqual(h.completions[0].roundId,h.completions[1].roundId);
  });
  for(const desired of ['stylized-practice','resetting'])test('lot disposal cleans '+desired+' immediately and repeated disposal is inert',()=>{
    const h=harness();if(desired==='stylized-practice'){h.start();h.until(s=>s.shot?.actorId==='player');}else h.until(s=>s.guard.phase===desired);
    const s=h.tick({lotActive:false});noOwnership(s);assert.equal(s.reset,false);assert.equal(s.maintenanceGateRequested,false);assert(s.disposed);
    const calls=h.moves.length,stops=h.stops.length;h.w.dispose();h.w.update(1,{actors:h.actors});h.w.startPlayer();assert.equal(h.moves.length,calls);assert.equal(h.stops.length,stops);assert.equal(h.completions.length,0);
  });
  test('snapshots and authored anchors are immutable; a fresh controller has no saved ownership',()=>{
    const h=harness().start();h.until(s=>s.leaseOwner==='player');const s=h.w.getState();assert(Object.isFrozen(s));assert(Object.isFrozen(s.player));assert(Object.isFrozen(s.lease));assert(Object.isFrozen(h.w.anchors.lanes[0].marker));
    s.lease.owner='intruder';assert.equal(h.w.getState().leaseOwner,'player');const fresh=harness();noOwnership(fresh.w.getState());assert.equal(fresh.w.getState().player.requested,false);
  });
  test('deterministic dt produces identical event sequences and never touches the five resident identities',()=>{
    const a=harness().start(),b=harness().start(),before=clone(a.actors.slice(2));a.until(s=>s.player.phase==='complete');b.until(s=>s.player.phase==='complete');
    assert.deepEqual(a.events,b.events);assert.deepEqual(a.completions,b.completions);assert.deepEqual(a.actors.slice(2),before);
    assert(a.moves.every(m=>['player','cn-guard-rui'].includes(m.actorId)));
  });
  test('inspection and reset poses face authored work objects, independently from their standing anchors',()=>{
    const rackWorkTarget={x:24.65,y:1.4,z:20.15},maintenanceGateWorkTarget={x:18.3,y:1.3,z:11.85};
    const h=harness({options:{anchors:{rackWorkTarget,maintenanceGateWorkTarget}}});
    h.until(s=>s.guard.phase==='rack-checkout');assert.deepEqual(h.w.getState().guard.lookTarget,rackWorkTarget);assert.notDeepEqual(h.w.getState().guard.lookTarget,A.rack);
    h.until(s=>s.guard.phase==='maintenance-open');assert.deepEqual(h.w.getState().guard.lookTarget,maintenanceGateWorkTarget);
    h.until(s=>s.guard.phase==='resetting');assert.deepEqual(h.w.getState().guard.lookTarget,A.lanes[0].target);assert.notDeepEqual(h.w.getState().guard.lookTarget,A.resetStops[0]);
    h.until(s=>s.guard.phase==='resetting'&&h.resets.length===1);assert.deepEqual(h.w.getState().guard.lookTarget,A.lanes[1].target);
  });
  console.log(JSON.stringify({status:'PASS',tests:passed.length,cases:passed,scope:'Pure deterministic workflow and numerical movement-adapter tests only; no scene, production route, pose, or render validation'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
