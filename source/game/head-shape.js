/**
 * Worldwoven original R16 head shape and short side sweep.
 * No downloaded character assets. Applied to anatomical source surfaces before
 * height mapping/skinning. The upper neck is shaped; the collar and rig stay fixed.
 * Source units: metres, Y up, face +Z. Original work derived from the accepted isolated prototype at 93b8501.
 */
import * as THREE from 'three';

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
  const cheek=.0080*G(y,1.550,.036)*(G(x,-.052,.036)+G(x,.052,.036));
  const posterior=profile(POSTERIOR_DELTA,y)*smooth(1.455,1.474,y);
  const mandibularCorner=-.004*G(y,1.497,.020)*smooth(.006,-.060,z);
  const dz=posterior*(1-front)+seam*(forehead*front+cheek*front)+mandibularCorner;
  const dx=Math.sign(x)*(.0024*G(y,1.552,.036)-.0035*G(y,1.483,.023))*smooth(.018,.070,Math.abs(x))*seam;
  // The mandibular underside rises gently toward the ear instead of keeping
  // the chin-height ring horizontal all the way around the back of the jaw.
  const jawRise=.005*G(y,1.495,.021)*smooth(.026,-.065,z)*smooth(1.455,1.478,y);
  // Lift only the central posterior skull above the cervical insertion. The
  // lateral mandible keeps its ear-below corner, rather than lifting the whole
  // jaw into the same long diagonal as the back of the head.
  const occipitalUnderside=.016*G(y,1.492,.028)*smooth(-.020,-.065,z)*(1-smooth(.025,.060,Math.abs(x)));
  const dy=(y>1.620?profile(CROWN_PROFILE,y)-Math.min(y,1.707):0)+jawRise+occipitalUnderside;
  return [x+dx,y+dy,z+dz];
}

function sculptUpperNeckPoint(x,y,z){
  const blend=smooth(1.453,1.481,y);
  // Collar contact stays fixed. Above it, the neck leans toward the mastoid and
  // widens into the jaw. Its buried top extends inside the jaw; total character
  // height and skeleton attachments stay fixed.
  const back=smooth(.018,-.036,z);
  return[x*(1+.08*blend),y+(.008+.060*back)*blend,z-(.003+.032*back)*blend];
}

function fitExistingHairPoint(x,y,z,name,hairStyle){
  // Preserve the old cut's fall and tied shape. A cranial/jaw warp on hanging
  // locks would create an artificial shelf at occiput height, and lift a bun
  // away from its roots. Only the fitted upper shell follows crown height.
  if(/hair-(low-bun|bun-sweep|braided-tail|braid-weave|braid-tie)/.test(name))return[x,y,z-.027];
  const long=hairStyle==='chin-bob'||hairStyle==='shoulder-wave';
  const back=smooth(.010,-.060,z),front=smooth(-.052,.055,z);
  const lower=-.035*smooth(1.525,1.578,y);
  const hanging=profile([[1.35,-.027],[1.50,-.031],[1.59,-.034],[1.62,-.034],[1.663,-.015],[1.692,-.004],[1.707,0]],y);
  let dz=(long?hanging:mix(lower,profile(POSTERIOR_DELTA,y),smooth(1.578,1.618,y)))*back+.0075*G(y,1.640,.053)*front;
  // The legacy long shell switches from a .094 crown depth to .115 hanging
  // depth at this row. Blend that existing shoulder as the larger skull fits.
  if(long&&name==='continuous-swept-hair-shell'&&y<1.605){const join=smooth(1.52,1.605,y);dz+=.021*join*back;x*=1-.095*join;}
  const dy=(y>1.620?profile(CROWN_PROFILE,y)-Math.min(y,1.707):0)*(1-smooth(1.713,1.743,y));
  return[x,y+dy,z+dz];
}

function material(color){return {color:new THREE.Color(color),skin:false,isMaterial:false};}
function addMesh(parent,name,positions,indices,color){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,material(color));m.name=name;
  m.castShadow=true;m.receiveShadow=false;m.userData.naturalHeadSurface=true;
  parent.add(m);return m;
}
function grid(parent,name,nu,nv,fn,color,flip=false){
  const p=[],ix=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv));
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
    const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
    if(flip)ix.push(a,c,b,b,c,d);else ix.push(a,b,c,b,d,c);
  }
  const m=addMesh(parent,name,p,ix,color),n=m.geometry.attributes.normal;
  // Both surfaces wrap in U. Share the seam normal so a duplicate vertex never
  // creates a carved ridge along the top of an otherwise rounded broad lock.
  for(let j=0;j<=nv;j++){
    const a=j*(nu+1),b=a+nu,normal=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();
    n.setXYZ(a,normal.x,normal.y,normal.z);n.setXYZ(b,normal.x,normal.y,normal.z);
  }
  n.needsUpdate=true;return m;
}

/** A closed scalp-attached wedge, with a broad rounded crest and tapered tip.
 * The underside follows the same ellipsoid as the fitted bed. This avoids
 * paper strips, round tubes, and hollow arches detached from the skull.
 */
function lock(parent,name,points,width,depth,color,outward=[0,0,1]){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  const origin=new THREE.Vector3(0,1.601,-.019),radii=new THREE.Vector3(.097,.120,.120);
  const onScalp=p=>p.clone().sub(origin).divide(radii).normalize().multiply(radii).add(origin);
  const m=grid(parent,'hair-'+name,16,28,(u,t)=>{
    const authored=curve.getPoint(t),foot=onScalp(authored);
    const normal=foot.clone().sub(origin).divide(radii).divide(radii).normalize();
    const tangent=curve.getTangent(t).normalize();
    const lateral=new THREE.Vector3().crossVectors(tangent,normal).normalize();
    const taper=t>.68?mix(1,.012,smooth(.68,1,t)):mix(.42,1,smooth(0,.22,t));
    const angle=u*Math.PI*2;
    const center=onScalp(foot.clone().addScaledVector(lateral,Math.sin(angle)*width*.5*taper));
    const localNormal=center.clone().sub(origin).divide(radii).divide(radii).normalize();
    const height=Math.max(.003,authored.clone().sub(foot).dot(normal)*.72+depth*.28);
    // Closed wedge: the underside follows the scalp; the crest is rounded and
    // its side edges are buried in the fitted bed, so no floating tube arches.
    center.addScaledVector(localNormal,(.5+.5*Math.cos(angle))*height*taper-.0015);
    return center.toArray();
  },color);
  return m;
}

function naturalSweep(head,hair){
  const color=f=>new THREE.Color(hair).multiplyScalar(f).getHex();
  // The fitted underlayer is deliberately lower than every main lock. It fills
  // their roots and the back, without drawing a straight fringe across the face.
  grid(head,'hair-fitted-underlayer',64,36,(u,v)=>{
    const a=u*Math.PI*2,c=Math.cos(a),s=Math.sin(a),angle=Math.atan2(s,c);
    const front=smooth(.2,.88,c);
    const nape=1.539+.007*Math.cos(a*3+.4);
    const side=mix(nape,1.573,smooth(.1,.95,Math.abs(s)));
    const edge=1.674+.010*G(angle,-.10,.35)-.033*G(angle,-.86,.28)-.021*G(angle,1.06,.32)+.006*G(angle,.30,.2);
    const y=mix(1.721,mix(side,edge,front),v),q=clamp((y-1.601)/.120,-1,1);
    const r=Math.sqrt(Math.max(.00001,1-q*q));
    return[s*.097*r,y,-.019+c*.120*r];
  },color(.95),true);

  // Broad curved volumes: roots bury into the underlayer, lift once, then sweep
  // toward the temple. Tips finish at unequal heights and do not form a brim.
  lock(head,'main-sweep',[[.036,1.681,.066],[.014,1.712,.062],[-.028,1.718,.055],[-.066,1.695,.063],[-.081,1.654,.069],[-.065,1.623,.074]],.049,.025,color(1.035),[0,.22,1]);
  lock(head,'front-subgroup',[[.025,1.680,.068],[.002,1.707,.082],[-.031,1.701,.090],[-.054,1.669,.094],[-.045,1.644,.089]],.027,.020,color(1.06),[0,.1,1]);
  lock(head,'crown-sweep',[[.035,1.709,.024],[.001,1.729,.007],[-.048,1.719,-.005],[-.084,1.674,-.018],[-.089,1.625,-.012],[-.082,1.588,-.007]],.064,.018,color(1.0),[-.5,.5,.2]);
  lock(head,'back-crown-sweep',[[.026,1.711,-.030],[-.009,1.722,-.050],[-.056,1.703,-.079],[-.076,1.646,-.103],[-.057,1.592,-.116]],.064,.016,color(.99),[-.4,.35,-.7]);
  lock(head,'short-part-return',[[.039,1.682,.062],[.057,1.702,.041],[.079,1.679,.030],[.095,1.635,.020],[.087,1.601,.012]],.031,.020,color(1.02),[.65,.2,.7]);
  lock(head,'short-crown-return',[[.039,1.708,.001],[.066,1.706,-.019],[.093,1.663,-.043],[.095,1.615,-.054],[.079,1.581,-.049]],.043,.019,color(.98),[.85,.3,-.25]);
  // Smaller supporting layers follow the skull; they don't compete with the part.
  for(const side of[-1,1])lock(head,'rear-layer-'+side,[[side*.040,1.697,-.073],[side*.066,1.655,-.111],[side*.064,1.601,-.125],[side*.036,1.552,-.124]],.050,.018,color(.96),[side*.4,0,-1]);
  lock(head,'nape-center',[[0,1.712,-.061],[0,1.674,-.112],[.003,1.610,-.139],[-.006,1.552,-.127]],.059,.018,color(.96),[0,0,-1]);
}

export function applyNaturalHead(root,{hair=0x44342f,hairStyle='side-part'}={}){
  const head=root.getObjectByName('sculpted-head');
  if(!head||head.userData.naturalHead)throw new Error('Requires unmodified anatomical head surfaces');
  const replaceShort=hairStyle==='side-part';
  for(const m of [...head.children])if(replaceShort&&m.isMesh&&hairNames.test(m.name)){m.removeFromParent();m.geometry.dispose();}
  head.traverse(m=>{
    if(!m.isMesh)return;
    const existingHair=hairNames.test(m.name),hat=/cook-.*cap|artist-beret|garden-straw/.test(m.name);
    const p=m.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const y=p.getY(i),point=existingHair?fitExistingHairPoint(p.getX(i),y,p.getZ(i),m.name,hairStyle):sculptHeadPoint(p.getX(i),y,p.getZ(i));
      // Existing hairstyles and job hats follow the deeper cranium while their
      // upper silhouette/clearance stays at its original height.
      if(hat)point[1]=y+(point[1]-y)*(1-smooth(1.713,1.743,y));
      // The side sweep already meets the left-front hat mouth; seat the straw
      // brim 1.5mm lower to close the remaining 1mm centre-front support gap.
      if(hairStyle==='side-part'&&/^garden-straw-/.test(m.name))point[1]-=.0015;
      p.setXYZ(i,...point);
    }
    p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();
  });
  const neck=root.getObjectByName('neck');
  if(neck){
    const p=neck.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      p.setXYZ(i,...sculptUpperNeckPoint(p.getX(i),p.getY(i),p.getZ(i)));
    }
    p.needsUpdate=true;neck.geometry.computeVertexNormals();neck.geometry.computeBoundingBox();neck.geometry.computeBoundingSphere();
  }
  if(replaceShort)naturalSweep(head,hair);
  head.userData.naturalHead=true;return root;
}
