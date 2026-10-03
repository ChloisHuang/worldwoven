import * as THREE from 'three';
import {material} from './geometry.js';
import {createAutomaticRouting,approachingDoor,advanceDoorOpening} from './automatic-routing.js';
import {moveWithCollision,segmentBoxIntersection} from './navigation.js';
import {roomClosureSpecs,existingBannerCameraColliders} from './room-closures.js';

// Operable thresholds are known to the route planner. Movement briefly reserves
// their sampled opening workspace; cameras still collide with actual leaves and
// fixed supports. Animation never invalidates the static lot's navigation graph.
const PALETTES={shoji:[0x765744,0xe8ddbc,0x9a7a49],palace:[0x843a31,0x963e32,0xcaa45e],french:[0xe6e0c9,0x698779,0xb79b54],egypt:[0x5e503b,0x386f72,0xbc984e]};
function shapeBox(parent,x,y,z,w,h,d,color,bevel=.012){
  const b=Math.min(bevel,w/5,h/5,d/3),s=new THREE.Shape();
  s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:b,bevelThickness:b,curveSegments:1});
  geo.translate(x,y,z-d/2+b);const m=new THREE.Mesh(geo,material(color));parent.add(m);return m;
}
function mergeLeaf(g){
  g.updateMatrixWorld(true);const positions=[],normals=[],colors=[],hingeStrapRanges=[],curtainPartRanges=[];
  for(const o of [...g.children]){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);const p=geo.attributes.position,n=geo.attributes.normal,c=o.material.color;if(o.userData.curtainPart)curtainPartRanges.push({kind:o.userData.curtainPart,attachmentIndex:o.userData.attachmentIndex??null,firstTriangle:positions.length/9,triangleCount:p.count/3});if(o.userData.hingeStrap){const mark=o.userData.hingeStrap;hingeStrapRanges.push({firstTriangle:positions.length/9,triangleCount:p.count/3,side:mark.side,center:new THREE.Vector3(...mark.center).applyMatrix4(o.matrix).toArray(),size:[...mark.size]});}for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}geo.dispose();o.geometry.dispose();g.remove(o);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeBoundingBox();geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,material(0xffffff,{vertexColors:true}));m.userData.hingeStrapRanges=hingeStrapRanges;m.userData.curtainPartRanges=curtainPartRanges;m.castShadow=m.receiveShadow=true;g.add(m);return m;
}
function leaf(width,height,style,side){
  const g=new THREE.Group(),[wood,panel,metal]=PALETTES[style]||PALETTES.palace;
  shapeBox(g,0,height/2,0,width,height,.105,wood);
  const innerW=width-.19;
  // Doors are approached from both directions. Each face gets its own joined
  // lattice/panels and usable pull; the center slab and hinge straps stay single.
  for(const face of[-1,1]){
    const part=(x,y,z,w,h,d,c,b)=>{const m=shapeBox(g,x,y,face*z,w,h,d,c,b);m.userData.doorFace=face;return m;};
    if(style==='shoji'){
      part(0,height*.53,.060,innerW,height*.79,.022,panel,.004);
      for(let y=.32;y<height-.16;y+=.38)part(0,y,.08,innerW,.028,.026,wood,.003);
      for(let x=-innerW/2+.27;x<innerW/2-.1;x+=.29)part(x,height*.53,.081,.025,height*.79,.026,wood,.003);
      part(-side*(width/2-.13),height*.49,.085,.045,.15,.035,metal,.008);
    }else{
      const centers=[height*.25,height*.68],heights=[height*.27,height*.43];
      for(let i=0;i<2;i++){
        part(0,centers[i],.064,innerW,heights[i],.028,metal,.006);
        part(0,centers[i],.083,innerW-.055,heights[i]-.055,.026,panel,.01);
        if(style==='palace')for(let x=-innerW*.35;x<innerW*.4;x+=innerW*.35)for(let j=-1;j<=1;j++)part(x,centers[i]+j*heights[i]*.27,.107,.038,.038,.028,metal,.008);
        if(style==='egypt')for(let j=-1;j<=1;j++)part(0,centers[i]+j*heights[i]*.29,.106,innerW*.65,.022,.015,metal,.003);
      }
      const knob=new THREE.Mesh(new THREE.TorusGeometry(.069,.014,5,16),material(metal));knob.position.set(-side*(width/2-.13),height*.47,face*.135);knob.userData.doorFace=face;g.add(knob);
    }
  }
  if(style!=='shoji')for(const y of[height*.2,height*.8]){const x=side*(width/2+.065),strap=shapeBox(g,x,y,0,.19,.09,.09,metal,.012);strap.userData.hingeStrap={side,center:[x,y,0],size:[.19,.09,.09]};}
  g.userData={style,twoSidedDecoration:true,frontDetailMeshes:g.children.filter(x=>x.userData.doorFace===1).length,backDetailMeshes:g.children.filter(x=>x.userData.doorFace===-1).length};
  mergeLeaf(g);return g;
}
function curtainLeaf(width,height,style,kind,authoredBottom){
  const g=new THREE.Group(),palette={shoji:[0x3f5962,0xc1aa70],palace:[0x943e3d,0xc9a85e],egypt:[0xcab98f,0x426f79],french:[0x527469,0xc5ad6d]}[style],bottom=authoredBottom??(kind==='half-curtain'?Math.max(2.35,height*.60):.035);
  // Opaque pleated cloth is a closed volume, visible and decorated from both
  // sides. No alpha blending, no depth-write compromise, no floating back face.
  const count=Math.max(6,Math.ceil(width/.15)),vertices=[],quad=(a,b,c,d)=>vertices.push(...a,...b,...c,...a,...c,...d),front=[],back=[];
  for(let i=0;i<=count;i++){const x=-width/2+width*i/count,z=Math.cos(i*Math.PI)*.045;front.push([x,bottom,z+.019],[x,height,z+.019]);back.push([x,bottom,z-.019],[x,height,z-.019]);}
  for(let i=0;i<count;i++){let a=i*2,b=(i+1)*2;quad(front[a],front[b],front[b+1],front[a+1]);quad(back[b],back[a],back[a+1],back[b+1]);quad(back[a+1],front[a+1],front[b+1],back[b+1]);quad(front[a],back[a],back[b],front[b]);}
  quad(back[0],front[0],front[1],back[1]);const j=count*2;quad(front[j],back[j],back[j+1],front[j+1]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();const cloth=new THREE.Mesh(geo,material(palette[0]));cloth.userData.curtainPart='cloth';g.add(cloth);
  for(const face of[-1,1])for(const y of[bottom+.10,height-.10]){const band=shapeBox(g,0,y,face*.073,width-.03,.055,.018,palette[1],.002);band.userData.doorFace=face;}
  // Small sewn tabs and closed metal loops connect the moving cloth to the
  // separate rail. Loops slide along its axis as the pleats gather.
  const loopCenters=[];
  for(const x of[-width*.32,0,width*.32]){
    const at=(x+width/2)/width*count,i=Math.min(count-1,Math.floor(at)),t=at-i,z0=THREE.MathUtils.lerp(Math.cos(i*Math.PI)*.045,Math.cos((i+1)*Math.PI)*.045,t),y0=height-.012,y1=height+.006,dz=-z0,dy=y1-y0;
    // Follow this exact pleat instead of leaving a vertical tab floating at z0.
    const tab=shapeBox(g,0,0,0,.010,Math.hypot(dy,dz)+.008,.004,palette[0],.001);tab.position.set(x,(y0+y1)/2,z0/2);tab.rotation.x=Math.atan2(dz,dy);tab.userData.curtainPart='sewn-tab';tab.userData.attachmentIndex=loopCenters.length;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.010,.002,6,12),material(palette[1]));ring.rotation.y=Math.PI/2;ring.position.set(x,height+.013,0);ring.userData.curtainPart='hanger-loop';ring.userData.attachmentIndex=loopCenters.length;g.add(ring);
    loopCenters.push({x,y:height+.013,z:0,innerRadius:.008,outerRadius:.012});
  }
  g.userData={style,kind,twoSidedDecoration:true,frontDetailMeshes:2,backDetailMeshes:2,opaquePrivacy:kind==='full-curtain',curtainLoopCenters:loopCenters};const merged=mergeLeaf(g);merged.userData.curtainLoopCenters=loopCenters;
  // Centimetre pleats alias against the whole-lot shadow map. Keep their toon
  // and lamp lighting, opaque depth and cast shadows, but do not feed sampled
  // self-shadow bands back onto this moving cloth (same scoped policy as skin).
  merged.receiveShadow=false;merged.userData.shadowPolicy='toon-lit-casting-cloth-no-shadow-receiver';return g;
}
function boxFromLeaf(g,width,height,bottom=0){
  const b=new THREE.Box3(new THREE.Vector3(-width/2,bottom,-.15),new THREE.Vector3(width/2,height,.15));b.applyMatrix4(g.matrixWorld);
  return {minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z};
}
function within(d,p,depth,padding=0){
  const x=p.x-d.center[0],z=p.z-d.center[2],lateral=d.axis==='z'?z:x,normal=d.axis==='z'?x:z;
  return Math.abs((p.y??0)-d.center[1])<1.2&&Math.abs(lateral)<d.width/2+padding&&Math.abs(normal)<depth;
}
// Match the navigation controller's conservative radius-expanded boxes.
function penetration(p,b,r,height){
  if((p.y??0)>=b.maxY-.01||(p.y??0)+height<=b.minY+.01)return 0;
  const x=Math.min(p.x-(b.minX-r),b.maxX+r-p.x),z=Math.min(p.z-(b.minZ-r),b.maxZ+r-p.z);
  return Math.max(0,Math.min(x,z));
}
function unionBox(a,b){return {minX:Math.min(a.minX,b.minX),maxX:Math.max(a.maxX,b.maxX),minY:Math.min(a.minY,b.minY),maxY:Math.max(a.maxY,b.maxY),minZ:Math.min(a.minZ,b.minZ),maxZ:Math.max(a.maxZ,b.maxZ)};}
// Fixed broad-phase bins cover each closure's complete possible travel. Moving
// leaves do not invalidate static room geometry or the navigation route cache.
const CELL=8;
function broadPhase(doors){
 const bins=new Map();
 const cells=(box,fn)=>{for(let x=Math.floor(box.minX/CELL);x<=Math.floor(box.maxX/CELL);x++)for(let z=Math.floor(box.minZ/CELL);z<=Math.floor(box.maxZ/CELL);z++)fn(x+','+z);};
 for(const d of doors){const r=d.width+.4;d.envelope={minX:d.center[0]-r,maxX:d.center[0]+r,minZ:d.center[2]-r,maxZ:d.center[2]+r};cells(d.envelope,k=>{if(!bins.has(k))bins.set(k,new Set());bins.get(k).add(d);});}
 return box=>{const found=new Set();cells(box,k=>{for(const d of bins.get(k)||[])if(d.envelope.maxX>=box.minX&&d.envelope.minX<=box.maxX&&d.envelope.maxZ>=box.minZ&&d.envelope.minZ<=box.maxZ)found.add(d);});return found;};
}
export function createAutomaticDoors(lot,region){
  const root=new THREE.Group(),fixedSupportBoxes=[];root.name='Operable cultural doors and room curtains';lot.group.add(root);let disposed=false,version=0;
  const stats={updates:0,visitedClosures:0,poseEvaluations:0,boxEvaluations:0,collisionCandidates:0};
  const doors=roomClosureSpecs(lot,region).map((spec,index)=>{
    const d={...spec,apertureHeight:spec.height,height:spec.height-(spec.motion==='gather'?.030:spec.kind==='door'?.025:0),center:[...spec.center],fraction:0,hold:0,routeHold:0,index},g=new THREE.Group();g.name='Automatic '+d.kind+' / '+d.id;g.position.fromArray(d.center);if(d.axis==='z')g.rotation.y=Math.PI/2;root.add(g);d.group=g;d.leaves=[];
    for(const side of [-1,1]){
      const pivot=new THREE.Group(),width=d.width/2-.012+(d.sideOverlap||0),runningGap=d.kind==='door'?(d.bottomClearance??0):0;
      if(runningGap<0||runningGap>.03)throw Error('Invalid authored door running gap: '+d.id);
      const m=d.motion==='gather'?curtainLeaf(width,d.height,d.style,d.kind,d.kind==='half-curtain'?Math.max(2.35,d.apertureHeight*.60):.035):leaf(width,d.height-runningGap,d.style,side);
      // Shorten the leaf from its bottom only: top edge, jamb, pin and group
      // remain fixed. This does not waive a rug/furniture collision.
      if(runningGap)m.traverse(o=>{if(o.isMesh){o.geometry.translate(0,runningGap,0);for(const mark of o.userData.hingeStrapRanges||[])mark.center[1]+=runningGap;}});
      pivot.add(m);g.add(pivot);d.leaves.push({side,pivot,mesh:m,width,bottom:d.kind==='half-curtain'?Math.max(2.35,d.apertureHeight*.60):runningGap,topExtra:d.motion==='gather'?.025:0});
    }
    if(d.motion==='gather'){
      const rail=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,d.width+.02,8),material((PALETTES[d.style]||PALETTES.palace)[2]));rail.name='Continuous curtain hanging rail';rail.rotation.z=Math.PI/2;rail.position.set(0,d.height+.015,0);rail.castShadow=rail.receiveShadow=true;g.add(rail);g.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(rail);fixedSupportBoxes.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});g.userData.curtainRail={radius:.006,centerY:d.height+.015,clothTop:d.height,highestLoopY:d.height+.025,apertureHeight:d.apertureHeight};
    }
    if(d.surfaceTrack){
      // Visible surface-mounted top guide. The corresponding authored plane
      // clears the wall/column face; sliding panels never disappear in a wall.
      const direction=Math.sign(d.trackMountOffset)||1,guideZ=-direction*(d.style==='shoji'?.13:.20),wood=(PALETTES[d.style]||PALETTES.palace)[0];
      const guide=shapeBox(g,0,d.height-.065,guideZ,(d.width+(d.sideOverlap||0))*2+.20,.075,.04,wood,.006);
      guide.name='Surface-mounted timber sliding guide';guide.castShadow=guide.receiveShadow=true;
      const wallZ=-(d.trackMountOffset||.24),depth=Math.abs(wallZ-guideZ)+.035;
      for(const side of[-1,1]){const mount=shapeBox(g,side*(d.width-.11),d.height-.065,(wallZ+guideZ)/2,.10,.13,depth,wood,.006);mount.name='Lintel-to-track joined bracket';mount.castShadow=mount.receiveShadow=true;}
    }
    if(d.surfaceTrack){g.updateWorldMatrix(true,true);g.traverse(o=>{if(o.isMesh&&['Surface-mounted timber sliding guide','Lintel-to-track joined bracket'].includes(o.name)){const b=new THREE.Box3().setFromObject(o);fixedSupportBoxes.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});}});}
    d.occluders=(lot.colliders||[]).filter(b=>b.maxX>d.center[0]-d.width-7&&b.minX<d.center[0]+d.width+7&&b.maxZ>d.center[2]-d.width-7&&b.minZ<d.center[2]+d.width+7&&(b.maxY??4)>d.center[1]+1.3&&(b.minY??0)<d.center[1]+1.3);
    return d;
  });
  let cameraBoxes=[],openingObstructions=new WeakSet(),frameSeconds=1/60;const previousPositions=new WeakMap(),query=broadPhase(doors),active=new Set();
  function poseDoor(d){
    stats.poseEvaluations++;
    for(const l of d.leaves){
      if(d.motion==='gather'){
        const gathered=Math.min(.18,l.width*.16),scale=1-d.fraction*(1-gathered/l.width);
        l.mesh.scale.x=scale;l.mesh.position.x=0;
        // Cloth gathers wholly inside the aperture, not buried beyond the jamb.
        const parkedCenter=d.width/2-gathered/2-.025;
        l.pivot.position.set(l.side*THREE.MathUtils.lerp(d.width/4,parkedCenter,d.fraction),0,0);l.pivot.rotation.y=0;
      }else if(d.motion==='slide'){l.pivot.position.set(l.side*(d.width/4+(d.sideOverlap||0)/2+d.fraction*(d.width/2+.08)),0,0);l.mesh.position.x=0;l.pivot.rotation.y=0;}
      else{
        // The pin lies on the opening side of the reveal. Counter-translate
        // the leaf so its closed plane stays fixed while the wood edge turns
        // clear of the jamb, rather than rotating around the wall's mid-plane.
        const hingeOffset=.16,pinNormal=-(d.swing||1)*.18;
        l.pivot.position.set(l.side*(d.width/2+hingeOffset),0,pinNormal);
        l.mesh.position.set(-l.side*(d.width/4+hingeOffset),0,-pinNormal);
        l.pivot.rotation.y=-l.side*(d.swing||1)*d.fraction*Math.PI*.5;
      }
    }
    d.group.updateWorldMatrix(true,true);
  }
  function doorBoxes(d){stats.boxEvaluations+=d.leaves.length;return d.leaves.map(l=>boxFromLeaf(l.mesh,l.width,d.height+(l.topExtra??0),l.bottom));}
  for(const d of doors){d.fraction=1;poseDoor(d);d.openBoxes=doorBoxes(d);d.fraction=0;poseDoor(d);d.boxes=doorBoxes(d);cameraBoxes.push(...d.boxes);}
  const openLeafColliders=doors.flatMap(d=>d.openBoxes),bannerBoxes=existingBannerCameraColliders(region);
  cameraBoxes.push(...bannerBoxes,...fixedSupportBoxes);
  function publish(d,boxes){d.boxes=boxes;for(let i=0;i<boxes.length;i++)cameraBoxes[d.index*2+i]=boxes[i];version++;}
  // Lazy conservative sweep snapshots are planning data only. Restore the live
  // pose before returning; no collider or rendered leaf is ever bypassed.
  function getSweepBoxes(d){
    if(d.sweepBoxes)return d.sweepBoxes;
    const fraction=d.fraction,boxes=[];d.fraction=0;poseDoor(d);let previous=doorBoxes(d);
    for(let i=1;i<=50;i++){d.fraction=i/50;poseDoor(d);const next=doorBoxes(d);for(let j=0;j<next.length;j++)boxes.push({...unionBox(previous[j],next[j]),openingFraction:i/50});previous=next;}
    d.fraction=fraction;poseDoor(d);d.sweepBoxes=boxes;return boxes;
  }
  function visibleFrom(d,p){const y=d.center[1]+1.3,from={x:p.x,y,z:p.z},to={x:d.center[0],y,z:d.center[2]};return !d.occluders.some(b=>segmentBoxIntersection(from,to,{...b,minY:b.minY??-1,maxY:b.maxY??4})!==null);}
  function requestOpen(d){if(disposed)return;d.routeHold=.25;active.add(d);}
  const routing=createAutomaticRouting({doors,staticColliders:lot.colliders||[],planningColliders:openLeafColliders,getSweepBoxes,getVersion:()=>version,getMotion:p=>previousPositions.get(p)?.motion,requestOpen});
  const api={
    ...routing,
    // Stable position keys allow freshly allocated actor descriptors each frame.
    update(dt,actors=[]){
      if(disposed)return;openingObstructions=new WeakSet();dt=Math.min(.1,Math.max(0,dt));if(dt>0)frameSeconds=dt;stats.updates++;
      const people=actors.map(a=>{
        const p=a.root?.position||a.position||a;if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return null;
        // Controllers move after this update, so the observed displacement
        // belongs to the previous step. A long next frame must not dilute it.
        const old=previousPositions.get(p),elapsed=old?.dt||dt,vx=a.velocity?.x??(old&&elapsed>0?(p.x-old.x)/elapsed:0),vz=a.velocity?.z??(old&&elapsed>0?(p.z-old.z)/elapsed:0),measured=Math.hypot(vx,vz),speed=Math.min(8,Math.max(0,a.speed??measured)),scale=measured>0?speed/measured:0,motion={x:vx*scale,z:vz*scale,dt};
        previousPositions.set(p,{x:p.x,z:p.z,dt,motion});
        return {p,r:Math.max(.01,a.radius??a.collisionRadius??.34),height:a.height??1.95,speed,motion};
      }).filter(Boolean);
      const candidates=new Set(active);
      for(const a of people){const r=2+a.r+a.speed*dt;for(const d of query({minX:a.p.x-r,maxX:a.p.x+r,minZ:a.p.z-r,maxZ:a.p.z+r}))candidates.add(d);}
      for(const d of candidates){
        stats.visitedClosures++;
        const routeRequested=d.routeHold>0;d.routeHold=Math.max(0,d.routeHold-dt);
        const nearby=people.filter(a=>Math.abs((a.p.y??0)-d.center[1])<1.2&&Math.abs(a.p.x-d.center[0])<d.width+7&&Math.abs(a.p.z-d.center[2])<d.width+7);
        const reachable=nearby.filter(a=>visibleFrom(d,a.p));
        const approach=reachable.some(a=>approachingDoor(d,a.p,a.r,a.height,a.motion,getSweepBoxes));
        // Occupancy keeps an already opening/closing doorway safe. It cannot
        // independently open a closed door for a distant or sideways passer.
        const overlapping=nearby.some(a=>d.boxes.some(b=>penetration(a.p,b,a.r,a.height)>0)),safety=(d.fraction>0&&reachable.some(a=>within(d,a.p,1.35,.55)))||overlapping;
        if(approach||safety||routeRequested)d.hold=1.1;else d.hold=Math.max(0,d.hold-dt);
        const target=approach||safety||routeRequested||d.hold>0?1:0;
        const desired=overlapping?1:target?advanceDoorOpening(d,dt):Math.max(0,d.fraction-dt/.85);
        if(target||d.fraction>0)active.add(d);else active.delete(d);
        if(Math.abs(desired-d.fraction)<1e-10){
          // Normalize an already-converged endpoint, including its live boxes.
          // A sub-epsilon remainder must not keep a closed door active forever.
          if((desired===0||desired===1)&&d.fraction!==desired){d.fraction=desired;poseDoor(d);publish(d,doorBoxes(d));}
          if(!target&&d.fraction===0)active.delete(d);
          continue;
        }
        const delta=desired-d.fraction,steps=Math.max(1,Math.ceil(Math.abs(delta)/.02)),step=delta/steps;
        let boxes=d.boxes;
        const initialFraction=d.fraction;d.fraction=desired;poseDoor(d);const finalBoxes=doorBoxes(d);d.fraction=initialFraction;poseDoor(d);
        const recovering=nearby.map(a=>boxes.map((b,j)=>penetration(a.p,b,a.r,a.height)>0&&penetration(a.p,finalBoxes[j],a.r,a.height)===0));
        for(let i=0;i<steps;i++){
          const before=d.fraction;d.fraction+=step;poseDoor(d);const next=doorBoxes(d);
          const obstructing=nearby.filter((a,k)=>boxes.some((box,j)=>{
            if(recovering[k][j])return false;
            const oldDepth=penetration(a.p,box,a.r,a.height),newDepth=penetration(a.p,next[j],a.r,a.height),swept=unionBox(box,next[j]);
            return newDepth>oldDepth+1e-7||penetration(a.p,swept,a.r,a.height)>oldDepth+1e-7;
          }));
          // Report every actor that actually stops this opening step, including
          // a player after an NPC in the list. Do not infer blockage by distance.
          if(obstructing.length){if(step>0&&d.kind==='door'&&d.motion==='hinge')for(const a of obstructing)openingObstructions.add(a.p);d.fraction=before;poseDoor(d);break;}boxes=next;
        }
        if(Math.abs(d.fraction-desired)<1e-9)d.fraction=desired;
        if(d.fraction!==initialFraction)publish(d,boxes);
      }
    },
    constrainMove(position,dx,dz,r=.34,height=1.95){
      if(disposed||!cameraBoxes.length)return {dx,dz};
      const candidates=query({minX:Math.min(position.x,position.x+dx)-r,maxX:Math.max(position.x,position.x+dx)+r,minZ:Math.min(position.z,position.z+dz)-r,maxZ:Math.max(position.z,position.z+dz)+r});
      const length=Math.hypot(dx,dz),from={x:position.x,y:position.y??0,z:position.z},to={x:position.x+dx,y:from.y,z:position.z+dz},motion={x:dx/frameSeconds,z:dz/frameSeconds,dt:frameSeconds};let allowed=1;
      for(const d of candidates){
        if(d.fraction>=1)continue;
        // Desired movement supplies intent even on the first input frame or
        // while waiting. Renewing it cannot steer or relocate the actor.
        if(visibleFrom(d,position)&&approachingDoor(d,position,r,height,motion,getSweepBoxes))requestOpen(d);
        if(!d.hold&&!d.routeHold)continue;
        const sweep=getSweepBoxes(d),margin=r+.035;
        // A restored/near-start actor already inside the future workspace keeps
        // its real-leaf escape and automatic backoff; never cage it in a new box.
        if(sweep.some(b=>penetration(from,b,margin,height)>0))continue;
        for(const b of sweep){
          const at=segmentBoxIntersection(from,to,{minX:b.minX-margin,maxX:b.maxX+margin,minY:b.minY-height+.01,maxY:b.maxY-.01,minZ:b.minZ-margin,maxZ:b.maxZ+margin});
          if(at!==null)allowed=Math.min(allowed,Math.max(0,at-.002/Math.max(length,.002)));
        }
      }
      // Clip the requested line only. No sliding along an invisible rectangle,
      // and no reservation once the moving leaf reaches its fully open pose.
      dx*=allowed;dz*=allowed;
      const relevant=[];for(const d of candidates)for(const b of d.boxes)if((position.y??0)<b.maxY-.01&&(position.y??0)+height>b.minY+.01)relevant.push(b);stats.collisionCandidates+=relevant.length;
      if(!relevant.length)return {dx,dz};
      const p={x:position.x,y:position.y,z:position.z},options={bounds:lot.bounds,multilevel:false,cache:false};
      const overlapping=relevant.filter(b=>penetration(p,b,r,height)>0),clear=relevant.filter(b=>!overlapping.includes(b));
      if(!overlapping.length)moveWithCollision(p,dx,dz,relevant,r,options);
      else{
        // Saved/restored overlapping actors can escape, but never push deeper.
        const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08)),sx=dx/steps,sz=dz/steps;
        const advance=(vx,vz)=>{const q={...p};moveWithCollision(q,vx,vz,clear,r,options);if(overlapping.some(b=>penetration(q,b,r,height)>penetration(p,b,r,height)+1e-7))return false;p.x=q.x;p.z=q.z;return true;};
        for(let i=0;i<steps;i++)if(!advance(sx,sz)){advance(sx,0);advance(0,sz);}
      }
      return {dx:p.x-position.x,dz:p.z-position.z};
    },
    // Read-only, last-update provenance keyed by the actual position object.
    isOpeningObstructedBy(position){return !disposed&&openingObstructions.has(position);},
    get cameraColliders(){return cameraBoxes;},
    get collisionVersion(){return version;},
    get planningColliders(){return openLeafColliders;},
    getState(){return doors.map(d=>({id:d.id,openingId:d.openingId,kind:d.kind,style:d.style,motion:d.motion,fraction:d.fraction,hold:d.hold,center:[...d.center],width:d.width,height:d.height,apertureHeight:d.apertureHeight,axis:d.axis}));},
    getStats(){return {...stats,closures:doors.length,staticBannerCameraBoxes:bannerBoxes.length,active:active.size,collisionVersion:version};},
    dispose(){if(disposed)return;disposed=true;routing.dispose();root.traverse(o=>o.geometry?.dispose());root.removeFromParent();cameraBoxes=[];openingObstructions=new WeakSet();active.clear();for(const d of doors){d.routeHold=0;d.sweepBoxes=null;}},
    root
  };
  return api;
}
