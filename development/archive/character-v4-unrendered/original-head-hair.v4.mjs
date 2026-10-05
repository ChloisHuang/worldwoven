/**
 * Worldwoven original head/hair study v4, isolated opt-in prototype.
 * No downloaded character assets. Works on createApprovedSurfaces() output before
 * skinning/merging. Body, neck, traits, materials and poses remain the caller's.
 * Source units: metres, Y up, face +Z. See reference-observations.md.
 */
import * as THREE from 'three';

export const PROTOTYPE_HAIR_STYLES = Object.freeze([
  'side-quiff', 'center-curtains', 'layered-bob', 'shoulder-waves'
]);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const G=(v,c,w)=>Math.exp(-(((v-c)/w)**2));
const hairNames=/^(continuous-swept-hair-shell|side-part-hair-fringe|hair-|side-swept-fringe|combed-highlight-|tapered-side-lock-|side-flow-)/;

// Smooth Hermite profile, clamped at both ends. Values describe large cranial
// proportions only; eye/nose/lip geometry and trait semantics are not redesigned.
function profile(points,y){
  if(y<=points[0][0])return points[0][1];
  if(y>=points.at(-1)[0])return points.at(-1)[1];
  const j=points.findIndex((p,i)=>i<points.length-1&&y<points[i+1][0]);
  const a=points[j],b=points[j+1],prev=points[Math.max(0,j-1)],next=points[Math.min(points.length-1,j+2)];
  const d=b[0]-a[0],t=(y-a[0])/d;
  const ma=(b[1]-prev[1])/(b[0]-prev[0]),mb=(next[1]-a[1])/(next[0]-a[0]);
  return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*d*ma+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*d*mb;
}
const CROWN_PROFILE=[[1.620,1.620],[1.640,1.644],[1.663,1.676],[1.692,1.704],[1.707,1.714]];
const POSTERIOR_DELTA=[[1.455,0],[1.468,.010],[1.490,.011],[1.515,-.014],[1.545,-.034],[1.580,-.043],[1.620,-.034],[1.663,-.015],[1.692,-.004],[1.707,0]];

/** Continuous world-space warp. The same function is applied to skin and marks.
 * At the chin/neck boundary the displacement and first derivative are zero.
 * Larger posterior radius is independent of nose/eye/jaw preference controls.
 */
export function sculptHeadPoint(x,y,z) {
  const seam=smooth(1.478,1.526,y);
  const front=smooth(-.052,.055,z);
  const forehead=.0075*G(y,1.640,.053);
  const cheek=.0036*G(y,1.550,.031)*(G(x,-.052,.031)+G(x,.052,.031));
  const posterior=profile(POSTERIOR_DELTA,y)*smooth(1.455,1.474,y);
  const dz=posterior*(1-front)+seam*(forehead*front+cheek*front);
  const dx=Math.sign(x)*.0018*G(y,1.552,.031)*smooth(.018,.070,Math.abs(x))*seam;
  const dy=y>1.620?profile(CROWN_PROFILE,y)-Math.min(y,1.707):0;
  return [x+dx,y+dy,z+dz];
}

function material(color){return {color:new THREE.Color(color),skin:false,isMaterial:false};}
function addMesh(parent,name,positions,indices,color){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,material(color));m.name=name;
  m.castShadow=true;m.receiveShadow=false;m.userData.originalHeadStudy=true;
  parent.add(m);return m;
}
function grid(parent,name,nu,nv,fn,color,flip=false){
  const p=[],ix=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv));
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
    const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
    if(flip)ix.push(a,c,b,b,c,d);else ix.push(a,b,c,b,d,c);
  }
  return addMesh(parent,name,p,ix,color);
}

/** A full volumetric lock, with a broad flattened cross-section and tapered tip.
 * The lock normal is projected off the curve tangent at each ring. This avoids
 * paper strips, round tubes and twists around nearly vertical strands.
 */
function lock(parent,name,points,width,depth,color,outward=[0,0,1]){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  const axis=new THREE.Vector3(...outward).normalize(),fallback=new THREE.Vector3(1,0,0);
  return grid(parent,'hair-'+name,8,16,(u,t)=>{
    const p=curve.getPoint(t),tan=curve.getTangent(t).normalize();
    let normal=axis.clone().addScaledVector(tan,-axis.dot(tan));
    if(normal.lengthSq()<.001)normal=fallback.clone().addScaledVector(tan,-fallback.dot(tan));
    normal.normalize();const lateral=new THREE.Vector3().crossVectors(tan,normal).normalize();
    const a=u*Math.PI*2;
    const taper=t>.70?mix(1,.025,smooth(.70,1,t)):mix(.63,1,smooth(0,.27,t));
    const tipDepth=t>.80?mix(1,.06,smooth(.80,1,t)):1;
    const w=width*.5*taper*(1+.025*Math.cos(t*Math.PI*3));
    const d=depth*.5*tipDepth;
    p.addScaledVector(lateral,Math.sin(a)*w).addScaledVector(normal,Math.cos(a)*d);
    return p.toArray();
  },color);
}

function cap(parent,style,color){
  const tall=style==='side-quiff',bob=style==='layered-bob';
  const top=tall?1.740:1.744;
  return grid(parent,'hair-fitted-foundation',40,24,(u,v)=>{
    const a=u*Math.PI*2,s=Math.sin(a),c=Math.cos(a);
    const front=smooth(.23,.89,c);
    const temple=1.553+.022*Math.abs(s);
    const hairline=style==='center-curtains'?1.669:style==='side-quiff'?1.653+.009*Math.sin(a+.45):1.648;
    const bottom=mix(temple,hairline,front);
    const y=mix(top,bottom,v),q=(y-1.608)/(top-1.608);
    const f=Math.sqrt(Math.max(.00001,1-q*q));
    // Cap is only the fitted foundation. The silhouette is authored by locks.
    const rx=(bob?.100:.097)*f,rz=.116*f;
    const shift=tall?-.004*Math.sin(v*Math.PI):0;
    return [s*rx+shift,y,-.023+c*rz];
  },color,true);
}

function backLayers(parent,color,{end=1.535,width=.046,wave=0}={}){
  for(let i=0;i<5;i++){
    const x=(i-2)*.039;
    lock(parent,'back-layer-'+i,[
      [x*.43,1.727,-.067],[x*.95,1.667,-.130],
      [x*(1.02+wave),mix(1.590,end,.25),-.143-wave*.026],
      [x*.98+Math.sin(i*1.4)*wave*.024,end+.035,-.137+wave*.015],
      [x*.82,end+(i%2)*.009,-.115]
    ],width,.022,color,[x,0,-1]);
  }
}

function templeLocks(parent,color,{end=1.565,bob=false}={}){
  for(const s of[-1,1])for(let i=0;i<2;i++)lock(parent,'temple-'+s+'-'+i,[
    [s*.066,1.696,-.008-i*.038],
    [s*(bob?.109:.093),1.635,.005-i*.043],
    [s*(bob?.115:.096),1.584,-.004-i*.045],
    [s*(bob?.100:.084),end+(i?-.01:.006),-.005-i*.046]
  ],bob?.047:.029,bob?.025:.017,color,[s,0,.12]);
}

function quiff(parent,p){
  const center=new THREE.Vector3(0,1.608,-.023),radii=new THREE.Vector3(.098,.133,.118);
  const scalp=(a,b)=>{
    const front=smooth(-.2,.7,Math.cos(a)),rx=.092+.006*front,rz=.110+.008*front;
    return new THREE.Vector3(Math.sin(a)*Math.sin(b)*rx,Math.cos(b)*radii.y,Math.cos(a)*Math.sin(b)*rz).add(center);
  };
  // Source shape plan: 1 large S sweep, 2 parallel crown flow, 3 short return.
  // All are relief in ONE connected shell. Sides/nape are 3–8mm thinner than V3.
  const guides=[
    {name:'main-s-sweep',height:.018,width:.018,path:[[.30,.68],[-.14,.60],[-.66,.91],[-.58,1.23],[-.90,1.58]]},
    {name:'parallel-crown',height:.013,width:.018,path:[[.55,.38],[-.34,.36],[-.95,.69],[-1.42,1.05],[-1.61,1.60]]},
    {name:'short-right-return',height:.006,width:.014,path:[[.84,.74],[1.12,.97],[1.38,1.34],[1.48,1.70]]}
  ];
  const flow=[];
  for(const guide of guides){
    const curve=new THREE.CatmullRomCurve3(guide.path.map(([a,b])=>new THREE.Vector3(a,b,0)),false,'centripetal');
    flow.push({...guide,samples:Array.from({length:33},(_,j)=>{const t=j/32,q=curve.getPoint(t);return {point:scalp(q.x,q.y),t};})});
  }
  const part=new THREE.CatmullRomCurve3([[.66,.26],[.57,.60],[.52,.92],[.48,1.24]].map(([a,b])=>new THREE.Vector3(a,b,0)),false,'centripetal');
  const partSamples=Array.from({length:33},(_,i)=>{const q=part.getPoint(i/32);return scalp(q.x,q.y);});
  const m=grid(parent,'hair-continuous-side-sweep',64,36,(u,v)=>{
    const a=u*Math.PI*2,s=Math.sin(a),c=Math.cos(a),angle=Math.atan2(s,c),frontal=smooth(.23,.88,c);
    // A descending left lock and higher open right part give the cut asymmetry.
    const frontEdge=1.658-.037*G(angle,-.70,.27)-.007*G(angle,0,.18)+.008*G(angle,.44,.22);
    const nape=1.555+.004*Math.sin(a*3+.8)+.002*Math.cos(a*5-.7);
    const sideEdge=mix(nape,1.578,smooth(.22,.95,Math.abs(s)));
    const bottom=mix(sideEdge,frontEdge,frontal),y=mix(1.741,bottom,v),q=clamp((y-center.y)/radii.y,-1,1);
    const b=Math.acos(q),base=scalp(a,b),normal=base.clone().sub(center).divide(radii).divide(radii).normalize();
    let ridgeHeight=0;
    for(const guide of flow){
      let best=Infinity,at=0;
      for(const sample of guide.samples){const d=base.distanceToSquared(sample.point);if(d<best){best=d;at=sample.t;}}
      ridgeHeight+=guide.height*Math.exp(-best/(guide.width**2))*Math.sin(Math.PI*(.13+.75*at));
    }
    let partDistance=Infinity;for(const point of partSamples)partDistance=Math.min(partDistance,base.distanceToSquared(point));
    const relief=.020*Math.tanh(ridgeHeight/.020)-.003*Math.exp(-partDistance/(.0055**2));
    const hem=smooth(.88,1,v);
    base.addScaledVector(normal,relief*Math.sin(v*Math.PI*.5)*(1-hem)-.011*hem);
    return base.toArray();
  },p.base,true);
  // Duplicate UV-seam vertices share a normal; the pole gets its common tangent
  // plane. This removes a frontal join without another surface or texture.
  const n=m.geometry.attributes.normal;
  for(let j=0;j<=36;j++){
    const a=j*65,b=a+64,v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();
    n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);
  }
  for(let i=0;i<=64;i++)n.setXYZ(i,0,1,0);n.needsUpdate=true;
}

function curtains(parent,p){
  cap(parent,'center-curtains',p.base);backLayers(parent,p.base,{end:1.512});
  for(const s of[-1,1])for(let i=0;i<4;i++){
    const z=.079-i*.029;
    lock(parent,'curtain-'+s+'-'+i,[
      [s*.006,1.726,z*.72],[s*.051,1.748-i*.004,z-.004],
      [s*.089,1.682,z+.027],[s*.079,1.629-i*.009,z+.026],
      [s*(i===0?.052:.092),1.591+i*.011,z+.018]
    ],.047,.021,p.tones[(i+(s>0?1:0))%3],[s*.22,.1,1]);
  }
  templeLocks(parent,p.base,{end:1.533});
}

function bob(parent,p){
  cap(parent,'layered-bob',p.base);
  backLayers(parent,p.base,{end:1.447,width:.053});
  for(const s of[-1,1])for(let i=0;i<3;i++){
    const z=.065-i*.054;
    lock(parent,'bob-side-'+s+'-'+i,[
      [s*.049,1.721,z*.63],[s*.091,1.671,z],
      [s*.113,1.585,z+.003],[s*.113,1.505,z+.009],
      [s*(.090+i*.004),1.451+i*.005,z-.005]
    ],.050,.026,p.tones[(i+(s>0?1:0))%3],[s*.65,0,.65]);
  }
  // Two unequal front sweeps leave a soft side part instead of a blunt helmet.
  lock(parent,'bob-long-fringe',[[.021,1.725,.060],[-.029,1.723,.098],[-.066,1.669,.102],[-.084,1.599,.084],[-.091,1.531,.052]],.059,.025,p.tones[1]);
  lock(parent,'bob-short-fringe',[[.026,1.722,.058],[.069,1.705,.085],[.091,1.656,.069],[.089,1.605,.047]],.045,.022,p.tones[0]);
}

function waves(parent,p){
  cap(parent,'shoulder-waves',p.base);
  backLayers(parent,p.base,{end:1.372,width:.056,wave:.6});
  for(const s of[-1,1])for(let i=0;i<3;i++){
    const z=.058-i*.045;
    lock(parent,'wave-side-'+s+'-'+i,[
      [s*.043,1.728,z*.80],[s*.093,1.665,z+.009],
      [s*.108,1.582,z+.021],[s*.131,1.509,z+.031],
      [s*.112,1.435,z+.039],[s*.131,1.364+i*.018,z+.022]
    ],.052,.026,p.tones[(i+(s>0?1:0))%3],[s*.62,0,.78]);
  }
  lock(parent,'wave-root-sweep',[[.026,1.729,.060],[-.035,1.735,.089],[-.079,1.672,.101],[-.097,1.605,.073],[-.100,1.548,.071]],.057,.023,p.tones[1]);
  lock(parent,'wave-open-side',[[.031,1.726,.062],[.079,1.697,.082],[.092,1.637,.064],[.103,1.570,.045]],.043,.021,p.tones[0]);
}

export function applyOriginalHeadHair(root,{hairStyle='side-quiff',hair=0x342f31,bald=false,heightMap=y=>y}={}){
  const head=root.getObjectByName('sculpted-head');
  if(!head)throw new Error('Original head study requires unmerged approved surfaces');
  if(head.userData.originalHeadStudy)throw new Error('Original head study must be applied exactly once');
  const removed=head.children.filter(m=>m.isMesh&&hairNames.test(m.name));
  for(const m of removed){m.removeFromParent();m.geometry.dispose();}
  head.traverse(m=>{
    if(!m.isMesh)return;
    // Role hats remain untouched and require fitting in the later integration.
    if(/cook-.*cap|artist-beret|garden-straw/.test(m.name))return;
    const p=m.geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setXYZ(i,...sculptHeadPoint(p.getX(i),p.getY(i),p.getZ(i)));
    p.needsUpdate=true;m.geometry.computeVertexNormals();
    m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();
  });
  const chosen=PROTOTYPE_HAIR_STYLES.includes(hairStyle)?hairStyle:'side-quiff';
  const base=new THREE.Color(hair);
  const p={base:base.getHex(),tones:[.96,1.055,1.105].map(f=>base.clone().multiplyScalar(f).getHex())};
  if(!bald)({ 'side-quiff':quiff,'center-curtains':curtains,'layered-bob':bob,'shoulder-waves':waves })[chosen](head,p);
  // Supply the existing shapeHeight map when applying after body proportioning.
  // Anatomical sourceY preserves the character rig's existing name/weight rules.
  for(const m of head.children)if(m.isMesh&&m.userData.originalHeadStudy){
    const a=m.geometry.attributes.position,sourceY=new Float32Array(a.count);let changed=false;
    for(let i=0;i<a.count;i++){sourceY[i]=a.getY(i);const mapped=heightMap(a.getY(i));changed ||= mapped!==a.getY(i);a.setY(i,mapped);}
    m.geometry.setAttribute('sourceY',new THREE.BufferAttribute(sourceY,1));if(changed)m.geometry.computeVertexNormals();
  }
  head.userData.originalHeadStudy={version:4,hairStyle:chosen,bald,removedHairMeshes:removed.length};
  return root;
}
