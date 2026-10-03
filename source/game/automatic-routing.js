import {blocked,canTraverse,findPath,resolveSurfaceHeight,segmentBoxIntersection} from './navigation.js';

// Authored same-level rugs rise .07 m and courtyard curbs drop .10 m.
// Keep their flat supports without admitting even the engine's .4 m stair step.
const FLOOR_BAND=.12,SUPPORT_EPS=.06,WAIT_EPS=.012;
const point=p=>({x:p.x,y:p.y??0,z:p.z});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function overlaps(p,b,r,height){return p.y<b.maxY-.01&&p.y+height>b.minY+.01&&p.x>b.minX-r&&p.x<b.maxX+r&&p.z>b.minZ-r&&p.z<b.maxZ+r;}
function coordinates(d,p){return {lateral:d.axis==='z'?p.z-d.center[2]:p.x-d.center[0],normal:d.axis==='z'?p.x-d.center[0]:p.z-d.center[2]};}
function worldPoint(d,lateral,normal,y){return d.axis==='z'?{x:d.center[0]+normal,y,z:d.center[2]+lateral}:{x:d.center[0]+lateral,y,z:d.center[2]+normal};}
// Smoothstep eases both ends; broad ceremonial leaves retain a slower stroke.
// Inverting the current fraction also keeps interrupted/reversed strokes smooth.
export function doorOpeningSeconds(d){return d.motion==='hinge'?.30+.16*Math.min(1,Math.max(0,(d.width-3.2)/2.8)):d.motion==='gather'?.32:.28;}
const openingTime=fraction=>.5-Math.sin(Math.asin(1-2*Math.min(1,Math.max(0,fraction)))/3);
export function advanceDoorOpening(d,dt){const t=Math.min(1,openingTime(d.fraction)+dt/doorOpeningSeconds(d));return t*t*(3-2*t);}
// One admission rule for physical actors and automatic routes. A moving actor
// must be heading through the usable aperture, not merely passing its side.
// Only the leaf sweep on that trajectory can extend the near-door sensor.
export function approachingDoor(d,p,radius,height,motion,getSweepBoxes){
 const local=coordinates(d,p),usable=Math.max(0,d.width/2-radius),vx=motion?.x??0,vz=motion?.z??0,speed=Math.hypot(vx,vz);
 if(Math.abs((p.y??0)-d.center[1])>=1.2||Math.abs(local.lateral)>d.width/2+.12)return false;
 const near=Math.abs(local.normal)<1.2&&Math.abs(local.lateral)<=usable;
 if(speed<=.08)return near;
 if(Math.abs(local.normal)<1e-6)return near;
 const normal=d.axis==='z'?vx:vz,lateral=d.axis==='z'?vz:vx;
 if(local.normal*normal>=-1e-6)return false;
 const crossing=local.lateral-lateral*local.normal/normal;
 if(Math.abs(crossing)>usable)return false;
 if(near)return true;
 // Admit only at the workspace itself, with one movement step of warning.
 // Movement reserves these same per-pose swept boxes while the leaf opens;
 // actor speed no longer adds a whole animation's travel to the sensor.
 const frame=Math.min(.1,Math.max(0,motion?.dt??.05)),from={...p,y:p.y??0};
 return getSweepBoxes(d).some(b=>{
  const to={x:p.x+vx*frame,y:from.y,z:p.z+vz*frame},margin=radius+.06;
  return segmentBoxIntersection(from,to,{minX:b.minX-margin,maxX:b.maxX+margin,minY:b.minY-height+.01,maxY:b.maxY-.01,minZ:b.minZ-margin,maxZ:b.maxZ+margin})!==null;
 });
}
function crossingDistance(d,start,route,limit,visit){
 let from=start,total=0;
 for(const to of route){
  const a=coordinates(d,from),b=coordinates(d,to),length=distance(from,to);
  if(a.normal*b.normal<=0&&Math.abs(a.normal-b.normal)>1e-7){
   const t=a.normal/(a.normal-b.normal),lateral=a.lateral+(b.lateral-a.lateral)*t,y=(from.y??start.y)+((to.y??start.y)-(from.y??start.y))*t;
   if(Math.abs(lateral)<d.width/2&&Math.abs(y-d.center[1])<.7){visit?.(worldPoint(d,lateral,0,y));return total+length*t;}
  }
  total+=length;if(total>limit)break;from=to;
 }
 return Infinity;
}

// An automatic route owns its detour/wait state. Physical movement is still
// performed by the normal actor controller, with the unchanged live leaf sweep.
// Manual input never calls this API, and abandoning an array abandons its route.
export function createAutomaticRouting({doors,staticColliders,planningColliders,getSweepBoxes,requestOpen,getVersion,getMotion=()=>null}){
 let plans=new WeakMap(),profiles=new WeakMap(),disposed=false;const openColliders=staticColliders.concat(planningColliders);
 // Exact centerline samples bridge narrow translated apertures to the
 // unchanged coarse grid. All visibility links are verified by navigation.
 const portals=doors.map(d=>({id:d.id,points:[-1,0,1].map(side=>worldPoint(d,0,side*(d.width/2+.55),d.center[1]))}));
 const currentColliders=(y,height)=>staticColliders.concat(doors.flatMap(d=>d.boxes).filter(b=>y<b.maxY-.01&&y+height>b.minY+.01));
 function profile(options,radius){
  let radii=profiles.get(options);if(!radii){radii=new Map();profiles.set(options,radii);}
  if(!radii.has(radius))radii.set(radius,{...options,radius,pathRadius:options.pathRadius??.39,portals:options.portals??portals});
  return radii.get(radius);
 }
 function sameFloorOptions(state,originY){
  const o={...state.options,radius:state.radius,pathRadius:state.radius+.025,cache:false,maxStep:FLOOR_BAND,maxSnapDistance:.6};
  // Staging may not borrow a lower floor or go down and back up a nearby stair.
  // The eventual ordinary route retains the full multilevel surface graph.
  const surfaces=o.surfaces??o.walkableSurfaces;
  if(o.multilevel!==false&&surfaces){o.surfaces=surfaces.filter(s=>Math.abs(s.y-originY)<=FLOOR_BAND&&(!s.axis||!Number.isFinite(s.endY)||Math.abs(s.endY-s.y)<1e-7));delete o.walkableSurfaces;o.legacyGround=false;}
  return o;
 }
 function safeWait(d,p,state,colliders,options){
  return !getSweepBoxes(d).some(b=>overlaps(p,b,state.radius+.035,state.options.bodyHeight??1.95))&&!blocked(p.x,p.z,colliders,state.radius,{...options,y:p.y})&&!blocked(p.x,p.z,colliders,state.radius,{...state.options,y:p.y});
 }
 function makeStage(d,p,state,originY=p.y){
  const options=sameFloorOptions(state,originY),surfaces=state.options.surfaces??state.options.walkableSurfaces??[];
  // Removing ramps from the support list alone is insufficient: a retained
  // floor underneath could let the live controller choose the ramp instead.
  // Exclude their reachable footprints from the staging path as well.
  const ramps=state.options.multilevel===false?[]:surfaces.flatMap(s=>{
   if(!s.axis||!Number.isFinite(s.endY)||Math.abs(s.endY-s.y)<1e-7)return [];
   // Only the foot-reachable section can steal support during a retreat.
   // A high flight overhead must not close a perfectly walkable lower floor.
   const dy=s.endY-s.y,ta=(originY-FLOOR_BAND-s.y)/dy,tb=(originY+(state.options.maxStep??.4)-s.y)/dy;
   const low=Math.max(0,Math.min(ta,tb)),high=Math.min(1,Math.max(ta,tb));
   if(high<=low)return [];
   const axis=s.axis.toUpperCase(),start=s['min'+axis],length=s['max'+axis]-start;
   return [{...s,['min'+axis]:start+low*length,['max'+axis]:start+high*length,minY:originY-1,maxY:originY+3}];
  });
  const colliders=currentColliders(p.y,state.options.bodyHeight??1.95).concat(ramps),local=coordinates(d,p),side=Math.sign(local.normal)||-(d.swing||1),candidates=[];
  if(safeWait(d,p,state,colliders,options))return {door:d,points:[],wait:point(p),originY,phase:'waiting',version:getVersion()};
  const maxDepth=d.width/2+.65+state.radius,minDepth=Math.max(Math.abs(local.normal),state.radius+.2);
  const laterals=[local.lateral,0,local.lateral-.35,local.lateral+.35,-d.width/4,d.width/4];
  for(let depth=minDepth;depth<=maxDepth+.15;depth+=.15)for(const lateral of laterals){
   if(Math.abs(lateral)>d.width/2+state.radius)continue;
   const q=worldPoint(d,lateral,side*depth,p.y),support=resolveSurfaceHeight(q,options,colliders);
   if(support===null||Math.abs(support-originY)>FLOOR_BAND)continue;q.y=support;
   if(safeWait(d,q,state,colliders,options))candidates.push(q);
  }
  candidates.sort((a,b)=>distance(p,a)-distance(p,b));
  const clearSegment=(a,b)=>canTraverse(a,b,colliders,options)&&canTraverse(a,b,colliders,state.options)&&!doors.some(other=>other!==d&&crossingDistance(other,a,[b],Infinity)!==Infinity);
  for(const q of candidates)if(clearSegment(p,q))return {door:d,points:[q],wait:q,originY,phase:'staging',version:getVersion()};
  // A local same-side detour is allowed around furniture, but never a different
  // doorway, a stair, unsupported terrain, or a teleport to a grid seed.
  const bounds=options.bounds;
  if(bounds){
   const localBounds={minX:Math.max(bounds.minX,p.x-maxDepth),maxX:Math.min(bounds.maxX,p.x+maxDepth),minZ:Math.max(bounds.minZ,p.z-maxDepth),maxZ:Math.min(bounds.maxZ,p.z+maxDepth)},normalAxis=d.axis==='z'?'X':'Z',at=d.center[d.axis==='z'?0:2];
   if(side>0)localBounds['min'+normalAxis]=Math.max(localBounds['min'+normalAxis],at+.16);else localBounds['max'+normalAxis]=Math.min(localBounds['max'+normalAxis],at-.16);
   if(localBounds.minX<localBounds.maxX&&localBounds.minZ<localBounds.maxZ){
    const detourOptions={...options,bounds:localBounds};
    for(const q of candidates.slice(0,12)){
     const points=findPath(p,q,colliders,detourOptions),last=points.at(-1);
     if(last&&distance(last,q)<WAIT_EPS&&Math.abs((last.y??p.y)-q.y)<=SUPPORT_EPS&&points.every((v,i)=>Math.abs((v.y??p.y)-originY)<=FLOOR_BAND&&clearSegment(i?points[i-1]:p,v)))return {door:d,points,wait:q,originY,phase:'staging',version:getVersion()};
    }
   }
  }
  return {door:d,points:[],wait:null,originY,phase:'blocked',version:getVersion()};
 }
 function imminentDoor(route,p,height=1.95,radius=.34,motion=null){
  let found=null,best=Infinity;
  const speed=Math.max(.1,Math.hypot(motion?.x??0,motion?.z??0));
  for(const d of doors){
   if(Math.abs(p.y-d.center[1])>=.7||!d.boxes.some(b=>p.y<b.maxY-.01&&p.y+height>b.minY+.01))continue;
   let crossing;const at=crossingDistance(d,p,route,d.width+2,q=>crossing=q);
   if(!crossing)continue;
   // The route's verified aperture crossing is its intent. A short initial
   // grid link can point sideways/away while already inside a future leaf;
   // that must not suppress staging or let it borrow a different floor.
   const length=distance(p,crossing),intent=length>1e-7?{x:(crossing.x-p.x)/length*speed,z:(crossing.z-p.z)/length*speed,dt:motion?.dt}:null;
   if(!approachingDoor(d,p,radius,height,intent,getSweepBoxes))continue;
   if(at<best){best=at;found=d;}
  }
  return found;
 }
 return {
  planPath(start,end,options={},radius=.34){
   if(disposed)return [];
   const routeOptions=profile(options,radius);let route=findPath(start,end,openColliders,routeOptions);
   // A legal closed-door start can be inside a future parked leaf. Only in
   // that case may the initial planning leg omit open poses; staging still
   // uses every current leaf and rejoins the full open-leaf route afterward.
   if(!route.length){
    const initial=findPath(start,end,staticColliders,routeOptions),p=point(start),height=routeOptions.bodyHeight??1.95;
    // Eligibility has no opening side effect. A legal closed start may first
    // need a sideways grid link out of a future parked leaf before approaching.
    if(doors.some(d=>d.fraction<1&&d.openBoxes?.some(b=>overlaps(p,b,radius,height))&&crossingDistance(d,p,initial,Infinity)!==Infinity))route=initial;
   }
   plans.set(route,{target:{...point(end),y:end.y??start.y??0},options:routeOptions,radius,stage:null,door:null,phase:route.length?'walking':'complete'});
   return route;
  },
  routeStep(route,position,arrivalTolerance=.14){
   if(disposed)return {waypoint:null,waiting:false,phase:'complete',doorId:null};
   const state=plans.get(route),p=point(position);
   if(!state)return {waypoint:route[0]??null,waiting:false,phase:'walking',doorId:null};
   for(let attempt=0;attempt<4;attempt++){
    if(state.stage){
     let stage=state.stage;requestOpen(stage.door);
     if(stage.retry||(stage.phase==='blocked'&&stage.version!==getVersion()))stage=state.stage=makeStage(stage.door,p,state,stage.originY);
     while(stage.points.length&&distance(p,stage.points[0])<=WAIT_EPS&&Math.abs((stage.points[0].y??p.y)-p.y)<=SUPPORT_EPS)stage.points.shift();
     if(stage.points.length){state.phase='staging';return {waypoint:stage.points[0],waiting:false,phase:state.phase,doorId:stage.door.id};}
     // A formerly unavailable wait point cannot hold an already fully-open
     // door forever. The unchanged real open-leaf join below must still pass.
     if(stage.door.fraction<1-1e-7){state.phase=stage.phase==='blocked'?'blocked':'waiting';return {waypoint:null,waiting:true,phase:state.phase,doorId:stage.door.id};}
     // Rejoin the retained route instead of choosing a new building exit.
     // Skip an original node only if it lies inside a future parked leaf
     // (the legal-closed-start fallback above); validate the complete join.
     let join=0;
     while(join<route.length&&blocked(route[join].x,route[join].z,openColliders,state.radius,{...state.options,y:route[join].y??p.y}))join++;
     const next=route[join],resumed=next?(canTraverse(p,next,openColliders,state.options)?[{...next}]:findPath(p,next,openColliders,state.options)):[];
     if(!next||!resumed.length||distance(resumed.at(-1),next)>.025){state.phase='blocked';return {waypoint:null,waiting:true,phase:state.phase,doorId:stage.door.id};}
     route.splice(0,join+1,...resumed);state.stage=null;
    }
    while(route.length&&distance(p,route[0])<arrivalTolerance&&Math.abs((route[0].y??p.y)-p.y)<.45)route.shift();
    if(!route.length){state.phase='complete';return {waypoint:null,waiting:false,phase:state.phase,doorId:null};}
    const door=imminentDoor(route,p,state.options.bodyHeight??1.95,state.radius,getMotion(position));state.door=door;
    if(door){
     requestOpen(door);
     if(door.fraction<1-1e-7){state.stage=makeStage(door,p,state);continue;}
    }
    state.phase='walking';return {waypoint:route[0],waiting:false,phase:state.phase,doorId:door?.id??null};
   }
   return {waypoint:null,waiting:true,phase:state.phase,doorId:state.stage?.door.id??null};
  },
  routeBlocked(route,position){
   const state=plans.get(route);if(!state)return false;
   if(state.stage){state.stage.retry=true;return true;}
   const d=state.door||imminentDoor(route,point(position),state.options.bodyHeight??1.95,state.radius,getMotion(position));
   if(!d)return false;
   requestOpen(d);state.stage=makeStage(d,point(position),state);return true;
  },
  dispose(){disposed=true;plans=new WeakMap();profiles=new WeakMap();},
  getRouteState(route){const s=plans.get(route);return s?{phase:s.phase,target:{...s.target},doorId:s.stage?.door.id??s.door?.id??null,waitPoint:s.stage?.wait?{...s.stage.wait}:null,stagingPath:s.stage?.points.map(p=>({...p}))??[]}:null;}
 };
}
