import * as THREE from 'three';
import {material} from '/assets/geometry.accd26d9fe1820ba.js';
import {moveWithCollision} from '/assets/navigation.61467e65ab34c23b.js';

// Operable thresholds are known to the route planner. Only their moving leaves
// participate in physical movement and camera collision; the static lot's cached
// navigation graph is never invalidated on every animation frame.
const PALETTES={shoji:[0x765744,0xe8ddbc,0x9a7a49],palace:[0x843a31,0x963e32,0xcaa45e],french:[0xe6e0c9,0x698779,0xb79b54],egypt:[0x5e503b,0x386f72,0xbc984e]};
function shapeBox(parent,x,y,z,w,h,d,color,bevel=.012){
  const b=Math.min(bevel,w/5,h/5,d/3),s=new THREE.Shape();
  s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:b,bevelThickness:b,curveSegments:1});
  geo.translate(x,y,z-d/2+b);const m=new THREE.Mesh(geo,material(color));parent.add(m);return m;
}
function mergeLeaf(g){
  g.updateMatrixWorld(true);const positions=[],normals=[],colors=[];
  for(const o of [...g.children]){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);const p=geo.attributes.position,n=geo.attributes.normal,c=o.material.color;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}geo.dispose();o.geometry.dispose();g.remove(o);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeBoundingBox();geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,material(0xffffff,{vertexColors:true}));m.castShadow=m.receiveShadow=true;g.add(m);return m;
}
function leaf(width,height,style,side){
  const g=new THREE.Group(),[wood,panel,metal]=PALETTES[style]||PALETTES.palace;
  shapeBox(g,0,height/2,0,width,height,.105,wood);
  const innerW=width-.19;
  if(style==='shoji'){
    shapeBox(g,0,height*.53,.060,innerW,height*.79,.022,panel,.004);
    for(let y=.32;y<height-.16;y+=.38)shapeBox(g,0,y,.08,innerW,.028,.026,wood,.003);
    for(let x=-innerW/2+.27;x<innerW/2-.1;x+=.29)shapeBox(g,x,height*.53,.081,.025,height*.79,.026,wood,.003);
    shapeBox(g,-side*(width/2-.13),height*.49,.085,.045,.15,.035,metal,.008);
  }else{
    const centers=[height*.25,height*.68],heights=[height*.27,height*.43];
    for(let i=0;i<2;i++){
      shapeBox(g,0,centers[i],.064,innerW,heights[i],.028,metal,.006);
      shapeBox(g,0,centers[i],.083,innerW-.055,heights[i]-.055,.026,panel,.01);
      if(style==='palace')for(let x=-innerW*.35;x<innerW*.4;x+=innerW*.35)for(let j=-1;j<=1;j++)shapeBox(g,x,centers[i]+j*heights[i]*.27,.107,.038,.038,.028,metal,.008);
      if(style==='egypt')for(let j=-1;j<=1;j++)shapeBox(g,0,centers[i]+j*heights[i]*.29,.106,innerW*.65,.022,.015,metal,.003);
    }
    const knob=new THREE.Mesh(new THREE.TorusGeometry(.069,.014,5,16),material(metal));knob.position.set(-side*(width/2-.13),height*.47,.135);g.add(knob);
    // Jamb-mounted offset strap hinges keep the opened leaf outside the clear
    // portal. Their short connected straps bridge from timber to hinge pin.
    for(const y of[height*.2,height*.8])shapeBox(g,side*(width/2+.065),y,0,.19,.09,.09,metal,.012);
  }
  mergeLeaf(g);return g;
}
function boxFromLeaf(g,width,height){
  const b=new THREE.Box3(new THREE.Vector3(-width/2,0,-.065),new THREE.Vector3(width/2,height,.15));b.applyMatrix4(g.matrixWorld);
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
const DEFAULT_DOORS={
  japan:[{id:'japan-guest-shoji',center:[2,7.675,-7.76],width:2.6,height:2.73,axis:'x',style:'shoji',motion:'slide'}],
  egypt:[{id:'egypt-private-suite-door',center:[17.9,0,11.4],width:3.18,height:3.36,axis:'x',style:'egypt',motion:'hinge',swing:1}],
  france:[{id:'france-palace-front',center:[0,.23,3.5],width:3.8,height:3.86,axis:'x',style:'french',motion:'hinge',swing:1}]
};
export function createAutomaticDoors(lot,region){
  const root=new THREE.Group();root.name='R10 operable cultural doors';lot.group.add(root);let disposed=false;
  const doors=(lot.automaticDoorways||DEFAULT_DOORS[region]||[]).map(spec=>{
    const d={...spec,center:[...spec.center],fraction:0,hold:0},g=new THREE.Group();g.name='Automatic door / '+d.id;g.position.fromArray(d.center);if(d.axis==='z')g.rotation.y=Math.PI/2;root.add(g);d.group=g;d.leaves=[];
    for(const side of [-1,1]){const pivot=new THREE.Group(),width=d.width/2-.012,m=leaf(width,d.height,d.style,side);pivot.add(m);g.add(pivot);d.leaves.push({side,pivot,mesh:m,width});}
    return d;
  });
  let cameraBoxes=[];const previousPositions=new WeakMap();
  function poseDoor(d){
    for(const l of d.leaves){
      if(d.motion==='slide'){l.pivot.position.set(l.side*(d.width/4+d.fraction*(d.width/2+.08)),0,0);l.mesh.position.x=0;l.pivot.rotation.y=0;}
      else{const hingeOffset=.16;l.pivot.position.set(l.side*(d.width/2+hingeOffset),0,0);l.mesh.position.x=-l.side*(d.width/4+hingeOffset);l.pivot.rotation.y=-l.side*(d.swing||1)*d.fraction*Math.PI*.5;}
    }
    d.group.updateWorldMatrix(true,true);
  }
  function doorBoxes(d){return d.leaves.map(l=>boxFromLeaf(l.mesh,l.width,d.height));}
  function sync(){for(const d of doors)poseDoor(d);cameraBoxes=doors.flatMap(doorBoxes);}
  // The route graph reserves the thin space occupied by fully-open leaves.
  // Otherwise a route can legitimately aim through an open leaf's side face.
  for(const d of doors)d.fraction=1;sync();const openLeafColliders=cameraBoxes.map(b=>({...b}));
  for(const d of doors)d.fraction=0;sync();
  const api={
    // Actor descriptors may provide {position,radius,height,speed}. Root-backed
    // actors and raw position objects remain supported; positions are stable keys
    // for inferred speed, so freshly allocated descriptors do not defeat history.
    update(dt,actors=[]){
      if(disposed)return;dt=Math.min(.1,Math.max(0,dt));
      const people=actors.map(a=>{
        const p=a.root?.position||a.position||a;if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return null;
        const old=previousPositions.get(p),measured=old&&dt>0?Math.hypot(p.x-old.x,p.z-old.z)/dt:0;
        previousPositions.set(p,{x:p.x,z:p.z});
        return {p,r:Math.max(.01,a.radius??a.collisionRadius??.34),height:a.height??1.95,speed:Math.min(8,Math.max(0,a.speed??measured))};
      }).filter(Boolean);
      for(const d of doors){
        const approach=people.some(a=>{const travel=a.speed*.58,moving=a.speed>.08,reach=d.motion==='hinge'?d.width/2+.32:.15;return within(d,a.p,moving?Math.max(1.7,reach+a.r+.25+travel):1.7,.8+(moving?travel:0));});
        const currentBoxes=doorBoxes(d),safety=people.some(a=>within(d,a.p,1.35,.55)||currentBoxes.some(b=>penetration(a.p,b,a.r,a.height)>0));
        if(approach||safety)d.hold=1.1;else d.hold=Math.max(0,d.hold-dt);
        const target=approach||safety||d.hold>0?1:0;
        const desired=safety?1:THREE.MathUtils.clamp(d.fraction+(target?1:-1)*dt/(target?.48:.85),0,1);
        const delta=desired-d.fraction,steps=Math.max(1,Math.ceil(Math.abs(delta)/.02)),step=delta/steps;
        let boxes=doorBoxes(d);
        const initialFraction=d.fraction;d.fraction=desired;poseDoor(d);const finalBoxes=doorBoxes(d);d.fraction=initialFraction;poseDoor(d);
        // A restored actor already inside a leaf may let that same leaf move
        // completely clear. Other leaves and previously clear actors still get
        // the full swept-volume test; no new overlap is introduced.
        const recovering=people.map(a=>boxes.map((b,j)=>penetration(a.p,b,a.r,a.height)>0&&penetration(a.p,finalBoxes[j],a.r,a.height)===0));
        for(let i=0;i<steps&&Math.abs(step)>1e-10;i++){
          const before=d.fraction;d.fraction+=step;poseDoor(d);const next=doorBoxes(d);
          const unsafe=people.some((a,k)=>boxes.some((box,j)=>{
            if(recovering[k][j])return false;
            const oldDepth=penetration(a.p,box,a.r,a.height),newDepth=penetration(a.p,next[j],a.r,a.height);
            const swept=unionBox(box,next[j]);
            return newDepth>oldDepth+1e-7||penetration(a.p,swept,a.r,a.height)>oldDepth+1e-7;
          }));
          if(unsafe){d.fraction=before;poseDoor(d);break;}boxes=next;
        }
        if(Math.abs(d.fraction-desired)<1e-9)d.fraction=desired;
      }
      sync();
    },
    constrainMove(position,dx,dz,r=.34,height=1.95){
      if(disposed||!cameraBoxes.length)return {dx,dz};
      const relevant=cameraBoxes.filter(b=>(position.y??0)<b.maxY-.01&&(position.y??0)+height>b.minY+.01);
      const p={x:position.x,y:position.y,z:position.z},options={bounds:lot.bounds,multilevel:false,cache:false};
      const overlapping=relevant.filter(b=>penetration(p,b,r,height)>0),clear=relevant.filter(b=>!overlapping.includes(b));
      if(!overlapping.length)moveWithCollision(p,dx,dz,relevant,r,options);
      else{
        // Restored actors or externally changed transforms can begin overlapped.
        // Permit only non-increasing penetration until clear, then forbid reentry.
        const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08)),sx=dx/steps,sz=dz/steps;
        const advance=(vx,vz)=>{const q={...p};moveWithCollision(q,vx,vz,clear,r,options);if(overlapping.some(b=>penetration(q,b,r,height)>penetration(p,b,r,height)+1e-7))return false;p.x=q.x;p.z=q.z;return true;};
        for(let i=0;i<steps;i++)if(!advance(sx,sz)){advance(sx,0);advance(0,sz);}
      }
      return {dx:p.x-position.x,dz:p.z-position.z};
    },
    get cameraColliders(){return cameraBoxes;},
    get planningColliders(){return openLeafColliders;},
    getState(){return doors.map(d=>({id:d.id,style:d.style,motion:d.motion,fraction:d.fraction,hold:d.hold,center:[...d.center],width:d.width,height:d.height,axis:d.axis}));},
    dispose(){if(disposed)return;disposed=true;root.traverse(o=>o.geometry?.dispose());root.removeFromParent();cameraBoxes=[];},
    root
  };
  return api;
}
