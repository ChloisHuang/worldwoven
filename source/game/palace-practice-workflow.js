/**
 * Engine-independent, deterministic occupation for Rui and the palace court.
 * This module never sets an actor position, invents a path, or stores a lease.
 * The adapter must move through the live navigation/door/collision controller.
 * See createPalacePracticeWorkflow's contract below before integrating it.
 */
const point = value => {
  const p = Array.isArray(value) ? {x:value[0],y:value[1],z:value[2]} : value;
  if (!p || ![p.x,p.y ?? 0,p.z].every(Number.isFinite)) throw new TypeError('Invalid practice anchor');
  return {x:p.x,y:p.y ?? 0,z:p.z};
};
const copy = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
const near = (a,b,tolerance=.09) => !!a && Math.hypot(a.x-b.x,a.z-b.z)<=tolerance && Math.abs((a.y??0)-b.y)<=.16;
const overlap = (a,b) => {
  const p=a.position,r=a.radius,h=a.height;
  return p.y<b.maxY && p.y+h>b.minY && p.x+r>b.minX && p.x-r<b.maxX && p.z+r>b.minZ && p.z-r<b.maxZ;
};

export const PALACE_PRACTICE_ANCHORS = freeze({
  checkIn:{x:20.9,y:.215,z:19.65}, waiting:{x:18,y:.215,z:19.7},
  home:{x:17.1,y:.215,z:18.6}, rack:{x:24.5,y:.215,z:19.3},
  rackWorkTarget:{x:24.7,y:1.25,z:20.25},maintenanceGateWorkTarget:{x:18.3,y:1.2,z:11.8},
  frontCenter:{x:21,y:.215,z:19.3}, westSouth:{x:17.1,y:.215,z:19.3},
  westNorth:{x:17.1,y:.215,z:8.75}, northEast:{x:24.9,y:.215,z:8.75},
  eastSouth:{x:24.9,y:.215,z:19.3},
  maintenanceOutside:{x:17.1,y:.215,z:11.8}, maintenanceInside:{x:18.85,y:.215,z:11.8},
  resetStops:[{x:19.65,y:.215,z:11.65},{x:22.25,y:.215,z:11.65}],
  lanes:[
    {id:'a',entry:{x:19.65,y:.215,z:18.85},marker:{x:19.65,y:.215,z:17.55},target:{x:19.65,y:1.45,z:10.75},targetId:'cn-archery-target-a'},
    {id:'b',entry:{x:22.25,y:.215,z:18.85},marker:{x:22.25,y:.215,z:17.55},target:{x:22.25,y:1.45,z:10.75},targetId:'cn-archery-target-b'}
  ],
  downrange:{minX:18.25,maxX:23.75,minY:.1,maxY:3.5,minZ:9.9,maxZ:16.95},
  shootingVolume:{minX:18.25,maxX:23.75,minY:.1,maxY:3.5,minZ:9.9,maxZ:18.25}
});

const DEFAULT_TIMING = freeze({greet:2.8,inspect:.85,reserve:.2,checkout:.85,ready:.65,gesture:.8,flight:.38,
  response:.48,result:1.05,returnBow:.75,resetTarget:1.1,rest:3.2,segmentTimeout:22,
  routeTimeout:70,interlockTimeout:16,gateTimeout:12,queueTimeout:100,roundTimeout:110});

/**
 * Required adapter:
 *   moveActor({actorId,target,routeId,waypointIndex,dt,radius,gateAccess})
 *     -> 'pending'|'arrived'|'blocked', or {status,reason?}.
 *   It must use normal collision and automaticDoors.planPath/routeStep, never
 *   teleport or treat an empty path as success. Call only from update, once per
 *   actor per tick. A door opening or another person delaying passage is pending;
 *   an impossible/failed route is blocked. There is a bounded pending timeout.
 * Optional callbacks: stopActor(actorId,{reason}), onShot({type,...}),
 *   onTargetReset({actorId,targetId,index}), onComplete({actorId,stationId,...}),
 *   onStateChange(readOnlyState). onComplete is PLAYER ONLY, after return+exit.
 *
 * update(dt,{actors:[{id,position:{x,y,z},radius?,height?}],
 *   maintenanceGateOpen:boolean,downrangeGateOpen:boolean,
 *   playerManual?:boolean,lotActive?:boolean})
 * Pass all actors and actual gate states every frame, even when culled/hidden.
 * Positions are read again after movement. Missing shooter/gate data fails
 * closed. Apply state.maintenanceGateRequested to the real gate and feed back
 * its actual state; never use an automatic proximity rule for this gate.
 *
 * startPlayer() is explicit consent to this bounded route; duplicate starts do
 * nothing. interruptPlayer() stops immediately, relinquishes the prop/lease,
 * and NEVER routes the player. cancelPlayer() additionally tries a normal safe
 * exit; pass {walkToExit:false} for any other manual navigation/UI interruption.
 * No controller data is save data: persist only the earned station stamp.
 */
export function createPalacePracticeWorkflow(options={}) {
  if (typeof options.moveActor!=='function') throw new TypeError('Practice requires a movement adapter');
  const guardId=options.guardId ?? 'cn-guard-rui',playerId=options.playerId ?? 'player';
  if (!guardId || !playerId || guardId===playerId) throw new TypeError('Practice actors must have distinct IDs');
  const authored={...PALACE_PRACTICE_ANCHORS,...options.anchors},anchors={};
  for (const key of ['checkIn','waiting','home','rack','rackWorkTarget','maintenanceGateWorkTarget','frontCenter','westSouth','westNorth','northEast','eastSouth','maintenanceOutside','maintenanceInside']) anchors[key]=point(authored[key]);
  anchors.resetStops=authored.resetStops.map(point);
  anchors.lanes=authored.lanes.map(l=>({id:l.id,targetId:l.targetId,marker:point(l.marker),entry:point(l.entry),target:point(l.target)}));
  if (anchors.lanes.length!==2 || anchors.resetStops.length!==2) throw new TypeError('The court has exactly two authored targets');
  for (const key of ['downrange','shootingVolume']) {
    anchors[key]={...authored[key]};
    for (const axis of ['X','Y','Z']) if (!Number.isFinite(anchors[key]['min'+axis]) || !(anchors[key]['max'+axis]>anchors[key]['min'+axis])) throw new TypeError('Invalid practice volume');
  }
  freeze(anchors);
  const timing={...DEFAULT_TIMING,...options.timing};
  for (const duration of Object.values(timing)) if (!Number.isFinite(duration)||duration<=0) throw new TypeError('Practice durations must be positive seconds');
  const shotCount=options.shotCount ?? 3;
  if (!Number.isInteger(shotCount)||shotCount<1||shotCount>5) throw new TypeError('Practice is bounded to one through five authored gestures');
  const actor = (id,role,lane) => ({id,role,lane,phase:'idle',status:'idle',action:'idle',elapsed:0,
    route:null,routeIndex:0,routeSerial:0,routeElapsed:0,segmentElapsed:0,roundElapsed:0,
    shots:0,stage:'gesture',stageElapsed:0,interlockElapsed:0,successful:false,requested:false,
    requestElapsed:0,reason:null,roundId:0,resetIndex:0,yielding:false,roundsCompleted:0});
  const guard=actor(guardId,'guard',1),player=actor(playerId,'player',0);
  let frame={actors:[]},disposed=false,lease=null,bowHolder=null,shot=null,shotSerial=0,
    resetOwner=null,maintenanceGateRequested=false,needsReset=false,roundSerial=0,
    elapsed=0,lastError=null,lastEvent=null,lastPublished=null;

  function emit(name,event) {
    try { options[name]?.(freeze(copy(event))); }
    catch(error) { lastError={callback:name,message:String(error?.message ?? error)}; }
  }
  function people() {
    return (frame.actors||[]).filter(a=>a && a.id && a.position && [a.position.x,a.position.y??0,a.position.z].every(Number.isFinite))
      .map(a=>({id:a.id,position:point(a.position),radius:Number.isFinite(a.radius)?Math.max(0,a.radius):(a.id===playerId?.34:.25),height:Number.isFinite(a.height)?Math.max(.01,a.height):1.95}));
  }
  const position = id => people().find(a=>a.id===id)?.position ?? null;
  const laneOf = a => anchors.lanes[a.lane];
  const courtCold = () => !lease && !bowHolder && !shot;
  function stop(a,reason) { try {options.stopActor?.(a.id,{reason});} catch(error) {lastError={callback:'stopActor',message:String(error?.message??error)};} a.route=null; }
  function clearShot(reason) {
    if (!shot) return;
    const old=shot;shot=null;emit('onShot',{...old,type:'clear',reason});
  }
  function release(a,reason) {
    if (shot?.actorId===a.id) clearShot(reason);
    if (lease?.owner===a.id) lease=null;
    if (bowHolder===a.id) bowHolder=null;
  }
  function phase(a,name,action=name,status='active') {
    a.phase=name;a.action=action;a.status=status;a.elapsed=0;a.route=null;a.routeIndex=0;
    a.routeElapsed=0;a.segmentElapsed=0;a.interlockElapsed=0;
  }
  function route(a,name,points,action='walk',status='moving') {
    stop(a,'route-change');phase(a,name,action,status);a.route=points.map(point);a.routeSerial++;
  }
  function safeHomeRoute(a) {
    const p=position(a.id);
    if (!p || p.x<anchors.shootingVolume.minX) return [anchors.westSouth,anchors.home];
    if (p.z<anchors.downrange.minZ) return [anchors.northEast,anchors.eastSouth,anchors.frontCenter,anchors.westSouth,anchors.home];
    if (p.x>anchors.shootingVolume.maxX) return [anchors.eastSouth,anchors.frontCenter,anchors.westSouth,anchors.home];
    return [laneOf(a).entry,anchors.frontCenter,anchors.westSouth,anchors.home];
  }
  function safeRackRoute(a) {
    const p=position(a.id);
    if (p && p.x<anchors.shootingVolume.minX) return [anchors.westSouth,anchors.frontCenter,anchors.rack];
    if (p && p.z<anchors.downrange.minZ) return [anchors.northEast,anchors.eastSouth,anchors.rack];
    if (p && p.x>anchors.shootingVolume.maxX) return [anchors.eastSouth,anchors.rack];
    return [laneOf(a).entry,anchors.rack];
  }
  function fail(a,reason) {
    stop(a,reason);release(a,reason);a.requested=false;a.successful=false;a.reason=reason;
    if (resetOwner===a.id) {resetOwner=null;maintenanceGateRequested=false;}
    phase(a,'blocked','wait-clear','blocked');lastEvent={type:'blocked',actorId:a.id,reason};
  }
  function move(a,dt) {
    if (!a.route?.length) {fail(a,'missing-route');return false;}
    a.routeElapsed+=dt;a.segmentElapsed+=dt;
    if (a.routeElapsed>timing.routeTimeout || a.segmentElapsed>timing.segmentTimeout) {fail(a,'route-timeout');return false;}
    const target=a.route[a.routeIndex],id=`${a.id}:${a.routeSerial}`;
    let answer;
    try {answer=options.moveActor({actorId:a.id,target:{...target},routeId:id,waypointIndex:a.routeIndex,dt,
      radius:a.id===playerId?.34:.25,gateAccess:resetOwner===a.id?'maintenance':lease?.owner===a.id?'lane':null});}
    catch(error) {fail(a,'movement-adapter-error');lastError={callback:'moveActor',message:String(error?.message??error)};return false;}
    if (disposed || !a.route || id!==`${a.id}:${a.routeSerial}` || a.phase==='interrupted' || a.phase==='cancelled') return false;
    const status=typeof answer==='string'?answer:answer?.status;
    if (status==='blocked') {fail(a,answer?.reason || 'route-blocked');return false;}
    if (!['pending','arrived'].includes(status)) {fail(a,'invalid-movement-status');return false;}
    a.status=status==='arrived'?'arriving':'moving';
    // Feedback, rather than elapsed time or an empty plan, proves arrival.
    if (status!=='arrived' || !near(position(a.id),target)) return false;
    a.routeIndex++;a.segmentElapsed=0;
    if (a.routeIndex<a.route.length) return false;
    stop(a,'arrived');return true;
  }
  function acquire(a) {
    if (lease || resetOwner || maintenanceGateRequested || frame.maintenanceGateOpen!==false || frame.downrangeGateOpen!==false) return false;
    if (!position(a.id)) return false;
    a.roundId=++roundSerial;a.roundElapsed=0;a.shots=0;a.successful=false;a.reason=null;
    lease={owner:a.id,lane:laneOf(a).id,roundId:a.roundId};return true;
  }
  function interlock(a) {
    if (lease?.owner!==a.id) return 'lease-unavailable';
    if (bowHolder!==a.id) return 'bow-unavailable';
    if (!position(a.id)) return 'actor-unavailable';
    if (!near(position(a.id),laneOf(a).marker)) return 'off-marker';
    if (frame.maintenanceGateOpen!==false) return frame.maintenanceGateOpen===true?'maintenance-gate-open':'gate-state-unavailable';
    if (frame.downrangeGateOpen!==false) return frame.downrangeGateOpen===true?'downrange-gate-open':'gate-state-unavailable';
    if (resetOwner || maintenanceGateRequested) return 'court-resetting';
    if (people().some(p=>p.id!==a.id&&overlap(p,anchors.shootingVolume))) return 'person-in-lane';
    return null;
  }
  function guardHome(yielding=false) {
    guard.yielding=yielding;route(guard,yielding?'yield-home':'return-home',safeHomeRoute(guard));
  }
  function returnRack(a,yielding=false) {
    a.yielding=yielding;clearShot('return-rack');route(a,'return-rack',safeRackRoute(a));
  }
  function beginMaintenanceExit(yielding=false) {
    guard.yielding=yielding;
    route(guard,'maintenance-exit',[anchors.resetStops[0],anchors.maintenanceInside,anchors.maintenanceOutside],'walk');
  }
  function requestYield() {
    if (guard.yielding || ['blocked','disposed','waiting','yield-home'].includes(guard.phase)) return;
    guard.yielding=true;
    if (resetOwner===guard.id) {
      if (['maintenance-approach','maintenance-open'].includes(guard.phase)) {
        maintenanceGateRequested=false;phase(guard,'maintenance-close','inspect-gate');
      } else if (guard.phase!=='maintenance-close' && guard.phase!=='maintenance-exit') beginMaintenanceExit(true);
      return;
    }
    if (lease?.owner===guard.id || bowHolder===guard.id) {guard.successful=false;returnRack(guard,true);}
    else guardHome(true);
  }
  function round(a,dt) {
    const lane=laneOf(a);
    switch (a.phase) {
      case 'reserve':
        if (a.elapsed>=timing.reserve) {
          if(a===guard && near(position(a.id),anchors.rack))phase(a,'rack-checkout','rack-checkout');
          else route(a,'walk-rack',[anchors.frontCenter,anchors.rack]);
        }
        return true;
      case 'walk-rack':
        if (move(a,dt)) phase(a,'rack-checkout','rack-checkout');
        return true;
      case 'rack-checkout':
        if (!near(position(a.id),anchors.rack)) {fail(a,'rack-position-lost');return true;}
        if (a.elapsed>=timing.checkout) {bowHolder=a.id;route(a,'walk-to-marker',[lane.entry,lane.marker]);}
        return true;
      case 'walk-to-marker':
        if (move(a,dt)) phase(a,'ready','practice-ready');
        return true;
      case 'ready':
      case 'stylized-practice': {
        const blocked=interlock(a);
        if (blocked) {
          clearShot(blocked);a.status='paused';a.action='wait-clear';a.reason=blocked;a.interlockElapsed+=dt;
          a.elapsed=0;a.stage='gesture';a.stageElapsed=0;
          if (a.interlockElapsed>timing.interlockTimeout) fail(a,'interlock-timeout:'+blocked);
          return true;
        }
        a.interlockElapsed=0;a.reason=null;a.status='active';
        if (a.phase==='ready') {
          a.action='practice-ready';
          if (a.elapsed>=timing.ready) {phase(a,'stylized-practice','practice-pose');a.stage='gesture';a.stageElapsed=0;}
          return true;
        }
        a.stageElapsed+=dt;
        if (a.stage==='gesture') {
          a.action='practice-pose';
          if (a.stageElapsed>=timing.gesture) {
            a.stage='flight';a.stageElapsed=0;a.action='practice-release';
            shot={id:++shotSerial,actorId:a.id,lane:lane.id,targetId:lane.targetId,target:{...lane.target},progress:0};
            emit('onShot',{...shot,type:'release'});
          }
        } else if (a.stage==='flight') {
          a.action='practice-release';
          if (shot?.actorId===a.id) shot.progress=Math.min(1,a.stageElapsed/timing.flight);
          if (a.stageElapsed>=timing.flight) {
            if (!shot || shot.actorId!==a.id) {a.stage='gesture';a.stageElapsed=0;return true;}
            const hit={...shot};shot=null;a.shots++;needsReset=true;
            emit('onShot',{...hit,progress:1,type:'impact'});a.stage='response';a.stageElapsed=0;
          }
        } else {
          a.action='practice-result';
          if (a.stageElapsed>=timing.response) {
            if (a.shots>=shotCount) {a.successful=true;phase(a,'result','practice-result');}
            else {a.stage='gesture';a.stageElapsed=0;}
          }
        }
        return true;
      }
      case 'result':
        if (a.elapsed>=timing.result) returnRack(a);
        return true;
      case 'return-rack':
        if (move(a,dt)) phase(a,'rack-return','rack-return');
        return true;
      case 'rack-return':
        if (!near(position(a.id),anchors.rack)) {fail(a,'rack-position-lost');return true;}
        if (a.elapsed>=timing.returnBow) {
          release(a,'bow-returned');
          if (a===player) route(a,'exit',[anchors.frontCenter,anchors.checkIn]);
          else if (a.yielding || player.requested) guardHome(true);
          else {if(a.successful)a.roundsCompleted++;beginMaintenance();}
        }
        return true;
      case 'exit':
        if (move(a,dt)) {
          const completed=a.successful && a.shots===shotCount && !bowHolder && !lease;
          a.requested=false;phase(a,completed?'complete':'cancelled','idle',completed?'complete':'cancelled');
          if (completed) {a.roundsCompleted++;lastEvent={type:'complete',actorId:a.id,roundId:a.roundId};emit('onComplete',{actorId:a.id,stationId:'cn-archery',roundId:a.roundId,shots:a.shots});}
        }
        return true;
      default:return false;
    }
  }
  function beginMaintenance() {
    if (!courtCold() || player.requested) {guardHome(!!player.requested);return;}
    resetOwner=guardId;guard.resetIndex=0;guard.yielding=false;
    route(guard,'maintenance-approach',[anchors.frontCenter,anchors.westSouth,anchors.maintenanceOutside]);
  }
  function updateGuard(dt) {
    if (player.requested) requestYield();
    if (round(guard,dt)) return;
    switch(guard.phase) {
      case 'walk-home':case 'return-home':case 'yield-home':
        if (move(guard,dt)) {
          release(guard,'home');guard.yielding=false;
          if(needsReset&&!player.requested)beginMaintenance();
          else phase(guard,player.requested?'waiting':'rest',player.requested?'greet':'rest',player.requested?'waiting':'active');
        }
        break;
      case 'waiting':
        guard.action='greet';
        if (!player.requested) {guard.yielding=false;if(needsReset)beginMaintenance();else phase(guard,'greet','greet');}
        break;
      case 'rest':if(guard.elapsed>=timing.rest)phase(guard,'greet','greet');break;
      case 'greet':
        if (guard.elapsed>=timing.greet) route(guard,'patrol',[anchors.westSouth,anchors.westNorth,anchors.northEast,anchors.eastSouth,anchors.rack],'inspect-walk');
        break;
      case 'patrol':if(move(guard,dt))phase(guard,'inspect-rack','inspect-rack');break;
      case 'inspect-rack':
        if (guard.elapsed>=timing.inspect && acquire(guard)) phase(guard,'reserve','inspect-court');
        else if (guard.elapsed>timing.gateTimeout+timing.inspect) fail(guard,'court-unavailable');
        break;
      case 'maintenance-approach':
        if (!courtCold()) {fail(guard,'court-not-cold');break;}
        if (move(guard,dt)) {maintenanceGateRequested=true;phase(guard,'maintenance-open','inspect-gate');}
        break;
      case 'maintenance-open':
        if (!courtCold()) {fail(guard,'court-not-cold');break;}
        if (frame.maintenanceGateOpen===true && frame.downrangeGateOpen===false) route(guard,'maintenance-target',[anchors.maintenanceInside,anchors.resetStops[0]]);
        else if (guard.elapsed>timing.gateTimeout) fail(guard,'maintenance-gate-timeout');
        break;
      case 'maintenance-target':
        if (!courtCold() || frame.maintenanceGateOpen!==true) {fail(guard,'maintenance-interrupted');break;}
        if (move(guard,dt)) phase(guard,'resetting','reset-target');
        break;
      case 'resetting':
        if (!courtCold() || frame.maintenanceGateOpen!==true) {fail(guard,'maintenance-interrupted');break;}
        if (!near(position(guardId),anchors.resetStops[guard.resetIndex])) {fail(guard,'reset-position-lost');break;}
        if (guard.elapsed>=timing.resetTarget) {
          emit('onTargetReset',{actorId:guardId,targetId:anchors.lanes[guard.resetIndex].targetId,index:guard.resetIndex});
          guard.resetIndex++;
          if (guard.resetIndex<anchors.resetStops.length) route(guard,'maintenance-target',[anchors.resetStops[guard.resetIndex]]);
          else {needsReset=false;beginMaintenanceExit();}
        }
        break;
      case 'maintenance-exit':
        if (!courtCold()) {fail(guard,'court-not-cold');break;}
        if (frame.maintenanceGateOpen!==true) {
          guard.status='paused';guard.action='wait-clear';
          if (guard.elapsed>timing.gateTimeout) fail(guard,'maintenance-exit-gate-timeout');
        } else if (move(guard,dt)) {maintenanceGateRequested=false;phase(guard,'maintenance-close','inspect-gate');}
        break;
      case 'maintenance-close':
        if (frame.maintenanceGateOpen===false) {
          resetOwner=null;
          if(player.requested || guard.yielding)guardHome(true);
          else route(guard,'inventory-walk',[anchors.westSouth,anchors.frontCenter,anchors.rack]);
        }
        else if (guard.elapsed>timing.gateTimeout) fail(guard,'maintenance-close-timeout');
        break;
      case 'inventory-walk':if(move(guard,dt))phase(guard,'rack-inventory','inspect-rack');break;
      case 'rack-inventory':if(guard.elapsed>=timing.inspect)guardHome();break;
      default:break;
    }
  }
  function updatePlayer(dt) {
    if (round(player,dt)) return;
    switch(player.phase) {
      case 'check-in':if(move(player,dt))route(player,'queue',[anchors.waiting],'walk','waiting');break;
      case 'queue':if(move(player,dt))phase(player,'waiting','observe','waiting');break;
      case 'waiting':
        if (guard.phase==='waiting' && near(position(guardId),anchors.home) && acquire(player)) phase(player,'reserve','inspect-court');
        break;
      case 'cancel-exit':if(move(player,dt))phase(player,'cancelled','idle','cancelled');break;
      default:break;
    }
  }
  function actorState(a) {
    const poseAction=a.action==='practice-pose'?'archery-draw':a.action==='practice-release'?'archery-release':
      a.action==='practice-ready'?'archery-ready':a.action==='reset-target'?'archery-reset':
      ['inspect-rack','rack-checkout','rack-return','inspect-gate'].includes(a.action)?'archery-check':
      bowHolder===a.id?'archery-carry':null;
    const completed=a.phase==='complete',lookTarget=poseAction==='archery-reset'?anchors.lanes[Math.min(1,a.resetIndex)].target:
      poseAction==='archery-check'?(a.action==='inspect-gate'?anchors.maintenanceGateWorkTarget:anchors.rackWorkTarget):
      poseAction?laneOf(a).target:null;
    const poseDuration=poseAction==='archery-reset'?timing.resetTarget:poseAction==='archery-ready'?timing.ready:
      a.action==='rack-checkout'?timing.checkout:a.action==='rack-return'?timing.returnBow:timing.inspect;
    return {id:a.id,phase:a.phase,status:a.status,action:a.action,elapsed:a.elapsed,
      route:a.route?{id:`${a.id}:${a.routeSerial}`,waypointIndex:a.routeIndex,target:{...a.route[a.routeIndex]},remaining:a.route.length-a.routeIndex}:null,
      requested:a.requested,reason:a.reason,yielding:a.yielding,lane:laneOf(a).id,
      shots:a.shots,shotCount,roundId:a.roundId,roundsCompleted:a.roundsCompleted,
      progress:completed?1:Math.min(.95,(a.shots+(a.phase==='stylized-practice'?Math.min(1,a.stageElapsed/timing.gesture)*.35:0))/(shotCount+1)),
      poseAction,lookTarget:lookTarget?copy(lookTarget):null,
      bowHeld:bowHolder===a.id,poseProgress:a.phase==='stylized-practice'?Math.min(1,a.stageElapsed/(a.stage==='flight'?timing.flight:timing.gesture)):
        poseAction&&poseAction!=='archery-carry'?Math.min(1,a.elapsed/poseDuration):0};
  }
  function getState() {
    const activeActor=lease?.owner===playerId?player:lease?.owner===guardId?guard:null;
    return freeze({disposed,elapsed,guard:actorState(guard),player:actorState(player),
      lease:lease?{...lease}:null,leaseOwner:lease?.owner??null,bowHolder,
      shot:shot?copy(shot):null,reset:!!resetOwner,resetOwner,needsReset,
      maintenanceGateRequested,laneEntryOwner:activeActor&&['walk-to-marker','return-rack'].includes(activeActor.phase)?activeActor.id:player.phase==='cancel-exit'?playerId:null,
      courtCold:courtCold(),interlock:activeActor?interlock(activeActor):null,
      playerControlled:player.requested || player.phase==='cancel-exit',
      lastEvent:lastEvent?{...lastEvent}:null,lastError:lastError?{...lastError}:null});
  }
  function publish() {
    const state=getState(),signature=JSON.stringify([state.disposed,state.guard.phase,state.guard.status,state.guard.action,state.player.phase,state.player.status,state.player.action,state.leaseOwner,state.bowHolder,state.shot?.id??null,state.reset,state.maintenanceGateRequested,state.lastEvent,state.lastError]);
    if(signature!==lastPublished){lastPublished=signature;emit('onStateChange',state);}
    return state;
  }
  function cancelPlayer(reason='cancelled',{walkToExit=true}={}) {
    if (disposed || (!player.requested && !['cancel-exit'].includes(player.phase))) return getState();
    stop(player,reason);release(player,reason);player.requested=false;player.successful=false;player.reason=reason;
    lastEvent={type:reason==='manual-input'?'interrupted':'cancelled',actorId:playerId,reason};
    if (walkToExit) route(player,'cancel-exit',position(playerId)?.z<anchors.shootingVolume.maxZ?[laneOf(player).entry,anchors.checkIn]:[anchors.checkIn]);
    else phase(player,'interrupted','idle','interrupted');
    return publish();
  }
  function dispose(reason='lot-disposed') {
    if (disposed) return getState();
    stop(player,reason);stop(guard,reason);release(player,reason);release(guard,reason);
    resetOwner=null;maintenanceGateRequested=false;player.requested=false;guard.requested=false;
    phase(player,'disposed','idle','disposed');phase(guard,'disposed','idle','disposed');disposed=true;
    return publish();
  }
  route(guard,'walk-home',[anchors.home]);
  return Object.freeze({
    anchors,
    startPlayer() {
      if(disposed || player.requested || player.phase==='cancel-exit') return getState();
      player.requested=true;player.requestElapsed=0;player.reason=null;player.shots=0;player.successful=false;
      route(player,'check-in',[anchors.checkIn]);requestYield();return publish();
    },
    cancelPlayer,
    interruptPlayer(reason='manual-input') {return cancelPlayer(reason,{walkToExit:false});},
    update(dt,nextFrame) {
      if (disposed) return getState();
      if (!Number.isFinite(dt)||dt<0) throw new TypeError('Practice dt must be finite, nonnegative seconds');
      frame=nextFrame || {actors:[]};
      if (frame.lotActive===false) return dispose('lot-exit');
      if (frame.playerManual) cancelPlayer('manual-input',{walkToExit:false});
      // No catch-up loop: a sleeping tab cannot skip routes, poses, or safety.
      dt=Math.min(.1,dt);elapsed+=dt;
      if (dt===0) {
        const owner=lease?.owner===playerId?player:lease?.owner===guardId?guard:null;
        if(owner && interlock(owner))clearShot(interlock(owner));
        return publish();
      }
      for(const a of [guard,player]) {
        a.elapsed+=dt;
        if(lease?.owner===a.id){a.roundElapsed+=dt;if(a.roundElapsed>timing.roundTimeout)fail(a,'round-timeout');}
      }
      if(player.requested) {
        player.requestElapsed+=dt;
        if (!lease && player.requestElapsed>timing.queueTimeout && ['check-in','queue','waiting'].includes(player.phase)) fail(player,'queue-timeout');
      }
      updateGuard(dt);updatePlayer(dt);
      // Re-read after BOTH movement callbacks. A late arrival in the volume
      // clears an effect in this same update, before the renderer consumes it.
      const owner=lease?.owner===playerId?player:lease?.owner===guardId?guard:null;
      if(shot && (!owner || interlock(owner)))clearShot(owner?interlock(owner):'lease-unavailable');
      return publish();
    },
    getState,dispose,
    canEnterDownrange(actorId) {return !disposed&&courtCold()&&resetOwner===actorId&&frame.maintenanceGateOpen===true;},
    // A failed route needs an explicit retry after the adapter/obstacle changes.
    resumeGuard() {
      if(!disposed && guard.phase==='blocked') {
        const inside=people().some(a=>a.id===guardId&&overlap(a,anchors.downrange));
        if(inside&&!courtCold())return getState();
        guard.reason=null;
        if (inside) {
          resetOwner=guardId;maintenanceGateRequested=true;beginMaintenanceExit(!!player.requested);
        } else guardHome(!!player.requested);
      }
      return publish();
    }
  });
}
