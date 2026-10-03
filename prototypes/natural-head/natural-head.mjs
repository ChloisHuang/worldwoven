/**
 * Worldwoven original natural head study, isolated opt-in prototype.
 * No downloaded character assets. Works on createApprovedSurfaces() output before
 * skinning/merging. Body, neck, traits, materials and poses remain the caller's.
 * Source units: metres, Y up, face +Z. See README.md for reference provenance.
 */
import * as THREE from 'three';

export const PROTOTYPE_HAIR_STYLES = Object.freeze(['natural-side-sweep']);
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

function naturalSweep(head,hair){
  const color=f=>new THREE.Color(hair).multiplyScalar(f).getHex();
  // The fitted underlayer is deliberately lower than every main lock. It fills
  // their roots and the back, without drawing a straight fringe across the face.
  grid(head,'hair-fitted-underlayer',64,36,(u,v)=>{
    const a=u*Math.PI*2,c=Math.cos(a),s=Math.sin(a),angle=Math.atan2(s,c);
    const front=smooth(.2,.88,c);
    const nape=1.539+.007*Math.cos(a*3+.4);
    const side=mix(nape,1.573,smooth(.1,.95,Math.abs(s)));
    const edge=1.667-.033*G(angle,-.86,.28)-.021*G(angle,1.06,.32)+.006*G(angle,.30,.2);
    const y=mix(1.718,mix(side,edge,front),v),q=clamp((y-1.601)/.118,-1,1);
    const r=Math.sqrt(Math.max(.00001,1-q*q));
    return[s*.093*r,y,-.025+c*.111*r];
  },color(.95),true);

  // Broad curved volumes: roots bury into the underlayer, lift once, then sweep
  // toward the temple. Tips finish at unequal heights and do not form a brim.
  lock(head,'main-sweep',[[.036,1.681,.066],[.014,1.716,.062],[-.028,1.722,.055],[-.066,1.695,.063],[-.081,1.654,.069],[-.065,1.623,.074]],.049,.025,color(1.035),[0,.22,1]);
  lock(head,'front-subgroup',[[.025,1.680,.068],[.002,1.707,.082],[-.031,1.701,.090],[-.054,1.669,.094],[-.045,1.644,.089]],.027,.020,color(1.06),[0,.1,1]);
  lock(head,'crown-sweep',[[.035,1.709,.024],[.001,1.735,.007],[-.048,1.719,-.005],[-.084,1.674,-.018],[-.089,1.625,-.012],[-.082,1.588,-.007]],.053,.024,color(1.0),[-.5,.5,.2]);
  lock(head,'back-crown-sweep',[[.026,1.711,-.030],[-.009,1.728,-.050],[-.056,1.703,-.079],[-.076,1.646,-.103],[-.057,1.592,-.116]],.053,.021,color(.99),[-.4,.35,-.7]);
  lock(head,'short-part-return',[[.039,1.682,.062],[.057,1.702,.041],[.079,1.679,.030],[.095,1.635,.020],[.087,1.601,.012]],.031,.020,color(1.02),[.65,.2,.7]);
  lock(head,'short-crown-return',[[.039,1.708,.001],[.066,1.706,-.019],[.093,1.663,-.043],[.095,1.615,-.054],[.079,1.581,-.049]],.043,.019,color(.98),[.85,.3,-.25]);
  // Smaller supporting layers follow the skull; they don't compete with the part.
  for(const side of[-1,1])lock(head,'rear-layer-'+side,[[side*.040,1.697,-.073],[side*.066,1.655,-.111],[side*.064,1.601,-.125],[side*.036,1.552,-.124]],.050,.018,color(.96),[side*.4,0,-1]);
  lock(head,'nape-center',[[0,1.712,-.061],[0,1.674,-.112],[.003,1.610,-.139],[-.006,1.552,-.127]],.059,.018,color(.96),[0,0,-1]);
}

export function applyNaturalHead(root,{hair=0x44342f,bald=false,heightMap=y=>y}={}){
  const head=root.getObjectByName('sculpted-head');
  if(!head||head.userData.naturalHead)throw new Error('Requires unmodified unmerged approved surfaces');
  for(const m of [...head.children])if(m.isMesh&&hairNames.test(m.name)){m.removeFromParent();m.geometry.dispose();}
  head.traverse(m=>{
    if(!m.isMesh||/cook-.*cap|artist-beret|garden-straw/.test(m.name))return;
    const p=m.geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setXYZ(i,...sculptHeadPoint(p.getX(i),p.getY(i),p.getZ(i)));
    p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();
  });
  if(!bald)naturalSweep(head,hair);
  for(const m of head.children)if(m.isMesh&&m.userData.originalHeadStudy){
    const a=m.geometry.attributes.position,sy=new Float32Array(a.count);
    for(let i=0;i<a.count;i++){sy[i]=a.getY(i);a.setY(i,heightMap(a.getY(i)));}
    m.geometry.setAttribute('sourceY',new THREE.BufferAttribute(sy,1));m.geometry.computeVertexNormals();
  }
  head.userData.naturalHead={version:1,bald};return root;
}
