/** Original loose side-part sculpt. Y-up, face +Z, dimensions in metres.
 * No textures, transparent cards, copied meshes or per-frame construction.
 * Broad overlapping forms share a continuous root mass; small locks occur only
 * at the silhouette. The module returns one indexed, vertex-coloured mesh.
 */
import * as THREE from 'three';
import HAIR_DATA from './assets/layered-hair-data.mjs';
import {attachHairFlow} from './hair-flow-finish.mjs';
const BASE_CENTER=[0,1.562,-.017], BASE_RADII=[.079,.126,.101];
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gaussian=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
const V=p=>new THREE.Vector3(...p);

// Each path is a deliberately authored flow from the off-centre part/crown.
// Width and thickness are independent: these are flattened locks, not tubes.
const LOCKS=[
 ['sweep-outer',[[.022,1.682,.032],[-.006,1.695,.054],[-.043,1.675,.075],[-.070,1.633,.072],[-.071,1.568,.046]],.037,.0060,1.00],
 ['sweep-main',[[.023,1.681,.046],[.004,1.697,.069],[-.025,1.677,.092],[-.050,1.636,.098],[-.047,1.589,.085]],.031,.0064,1.035],
 ['sweep-front',[[.024,1.680,.056],[.010,1.692,.082],[-.012,1.662,.104],[-.023,1.626,.102],[-.016,1.592,.090]],.020,.0045,1.07],
 ['loose-front',[[.005,1.683,.091],[-.014,1.658,.122],[-.026,1.621,.121],[-.026,1.597,.108],[-.015,1.578,.093]],.010,.0025,1.03],
 ['part-short',[[.028,1.680,.051],[.052,1.686,.062],[.071,1.659,.074],[.079,1.623,.070],[.068,1.586,.063]],.026,.0053,1.02],
 ['part-fringe',[[.029,1.676,.063],[.047,1.677,.083],[.059,1.650,.095],[.060,1.622,.089],[.052,1.600,.081]],.014,.0033,1.055],
 ['left-temple',[[.009,1.688,.022],[-.043,1.689,.033],[-.083,1.651,.053],[-.099,1.594,.035],[-.090,1.565,.029]],.025,.0048,.99],
 ['left-ear-front',[[ -.041,1.669,.061],[-.077,1.644,.072],[-.094,1.603,.055],[-.096,1.571,.032],[-.088,1.554,.019]],.017,.0036,1.03],
 ['right-temple',[[.031,1.684,.004],[.070,1.684,.018],[.097,1.645,.029],[.104,1.595,.008],[.093,1.567,-.005]],.025,.0049,.99],
 ['right-ear-front',[[.066,1.662,.063],[.090,1.639,.066],[.102,1.601,.045],[.102,1.579,.024],[.094,1.564,.030]],.017,.0030,1.025],
 ['crown-left',[[.024,1.690,-.012],[-.028,1.698,-.023],[-.075,1.667,-.044],[-.101,1.622,-.055],[-.098,1.578,-.067]],.044,.0055,1.01],
 ['crown-right',[[.031,1.680,-.022],[.067,1.685,-.039],[.094,1.647,-.058],[.101,1.597,-.072],[.081,1.547,-.082]],.038,.0048,1.00],
 ['back-left',[[.004,1.687,-.041],[-.039,1.678,-.081],[-.071,1.637,-.108],[-.075,1.576,-.115],[-.053,1.523,-.097]],.041,.0050,.985],
 ['back-middle',[[.019,1.684,-.038],[.007,1.668,-.098],[-.013,1.626,-.129],[-.018,1.570,-.131],[-.003,1.509,-.105]],.044,.0048,1.005],
 ['back-right',[[.034,1.677,-.045],[.054,1.652,-.099],[.064,1.608,-.122],[.049,1.555,-.126],[.030,1.512,-.100]],.035,.0043,.995],
 ['left-nape-tip',[[-.083,1.627,-.075],[-.102,1.597,-.091],[-.101,1.567,-.103],[-.083,1.536,-.108],[-.067,1.527,-.100]],.020,.0030,.99]
];

export function sculptLayeredHairGeometry({center=BASE_CENTER,radii=BASE_RADII,color=0x44342f,scalpGeometry=null}={}){
 const positions=[],indices=[],colors=[],flow=[],root=V(BASE_CENTER),r=V(BASE_RADII),baseColor=new THREE.Color(color);
 const scalpMaterial=scalpGeometry?new THREE.MeshBasicMaterial({side:THREE.DoubleSide}):null;
 const scalp=scalpGeometry?new THREE.Mesh(scalpGeometry,scalpMaterial):null;
 if(scalp)scalp.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),direction=new THREE.Vector3();
 function scalpPoint(p,rise){
  direction.copy(p).sub(root).normalize();
  if(scalp){ray.set(root,direction);ray.far=.25;const hit=ray.intersectObject(scalp,false)[0];if(hit){
    const surface=root.clone().addScaledVector(direction,hit.distance);
    // The skin mesh includes the ear. Roots pass above/in front of its helix,
    // never growing from the ear itself when a near-horizontal ray hits it.
    const earWeight=gaussian(surface.z,-.003,.032)*(1-smooth(1.577,1.602,surface.y))*smooth(.070,.084,Math.abs(surface.x));
    const scalpX=Math.min(Math.abs(surface.x),.078);
    surface.x=mix(surface.x,Math.sign(surface.x)*scalpX,earWeight);
    return surface.addScaledVector(direction,rise);
   }}
  const q=direction.clone().divide(r),distance=1/q.length();return root.clone().addScaledVector(direction,distance+rise);
 }

 function add(p,value=1,u=0,v=0){positions.push(...p);const c=baseColor.clone().multiplyScalar(value);colors.push(c.r,c.g,c.b);flow.push(u,v,1);return positions.length/3-1;}
 function envelopeLift(q){
  const crown=smooth(.26,.84,q.y),part=gaussian(q.x,.27,.085)*gaussian(q.z,.17,.64)*crown;
  return .0045+.0080*crown-.0035*part+.0025*gaussian(q.x,-.24,.55)*crown;
 }
 // A close scalp envelope, completely covered at the forehead by the swept
 // fringe. The ear edge is an arch with asymmetric sideburn/nape termination.
 const columns=56,rows=16,phiBounds=[];
 for(let i=0;i<=columns;i++){
  const a=i/columns*Math.PI*2,signed=a>Math.PI?a-Math.PI*2:a,abs=Math.abs(signed);
  const ear=gaussian(abs,1.63,.30),front=gaussian(signed,0,1.17);
  let edge=1.518+.119*front+.032*ear;
  edge+=.010*gaussian(abs,2.42,.45);
  edge+=.0045*Math.sin(a*5+.5)+.003*Math.sin(a*9);
  // No straight side cut: sweep the temple into an irregular ear opening.
  // Solve the boundary on the actual vault. The former ellipsoid angle moved
  // the hairline down when the head was narrowed, shortening the upper third.
  // Frontal centre is 1.640 m; its rounded corners descend into the temple.
  if(abs<.50)edge=mix(edge,1.640,1-smooth(.10,.50,abs));
  let low=.015,high=2.55;
  for(let step=0;step<12;step++){
   const phi=(low+high)*.5,q=new THREE.Vector3(Math.sin(phi)*Math.sin(a),Math.cos(phi),Math.sin(phi)*Math.cos(a)),d=q.clone().multiply(r).add(root);
   if(scalpPoint(d,envelopeLift(q)).y>edge)low=phi;else high=phi;
  }
  phiBounds.push((low+high)*.5);
 }
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const a=i/columns*Math.PI*2,phi=phiBounds[i]*j/rows;
  const q=new THREE.Vector3(Math.sin(phi)*Math.sin(a),Math.cos(phi),Math.sin(phi)*Math.cos(a));
  const p=scalpPoint(q.clone().multiply(r).add(root),envelopeLift(q));
  add(p.toArray(),.975,j/rows*.32,i/columns*9/16);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);
 }
 for(const [name,points,authoredWidth,depth,value] of LOCKS){
  const width=authoredWidth*(/temple|crown-|back-|nape/.test(name)?.93:1);
  const curve=new THREE.CatmullRomCurve3(points.map(V),false,'centripetal'),start=positions.length/3,steps=16,sides=8;
  const rear=/back-|nape/.test(name);
  for(let j=0;j<=steps;j++){
   const t=j/steps,guide=curve.getPoint(t),foot=scalpPoint(guide,0),excess=Math.max(0,guide.distanceTo(root)-foot.distanceTo(root)),rise=.006+Math.min(.024,excess*.40)+.003*Math.sin(Math.PI*t),p=scalpPoint(guide,rise),tangent=curve.getTangent(t).normalize();
   const radial=p.clone().sub(root).divide(r).divide(r).normalize();
   const side=new THREE.Vector3().crossVectors(tangent,radial).normalize(),out=new THREE.Vector3().crossVectors(side,tangent).normalize();
   const taper=(.67+.33*smooth(0,.18,t))*(1-.995*smooth(.39,1,t));
   const thickness=depth*(.42+.30*Math.sin(Math.PI*t))*(1-.98*smooth(.69,1,t));
   for(let k=0;k<=sides;k++){
    const a=k/sides*Math.PI*2,across=Math.cos(a),round=Math.sin(a);
    const acrossPoint=p.clone().addScaledVector(side,across*width*.5*taper);
    const rooted=scalpPoint(acrossPoint,.004+Math.max(0,round)*(rise+thickness-.004));
    const free=p.clone().addScaledVector(side,across*width*.5*taper).addScaledVector(out,round*thickness);
    const point=rooted.lerp(free,rear?0:smooth(.80,1,t));
    // Small continuous longitudinal planes catch the cel light. No incised
    // dark lines or independently extruded strand ridges are required.
    add(point.toArray(),value,t,k/sides/16);
   }
  }
  for(let j=0;j<steps;j++)for(let k=0;k<sides;k++){
   const a=start+j*(sides+1)+k,b=a+1,c=a+sides+1,d=c+1;indices.push(a,b,c,b,d,c);
  }
 }
 // One fit transform, allowing the complete head owner to tune width, height,
 // depth and location without maintaining a second version of the hairstyle.
 for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++)positions[i+k]=center[k]+(positions[i+k]-BASE_CENTER[k])*radii[k]/BASE_RADII[k];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('featureCoord',new THREE.Float32BufferAttribute(flow,3));g.setIndex(indices);g.computeVertexNormals();
 // Average the duplicated seams so all locks read as flattened solid forms.
 const n=g.attributes.normal;let offset=(columns+1)*(rows+1);
 for(let j=0;j<=rows;j++){const a=j*(columns+1),b=a+columns,v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
 for(const lock of LOCKS){for(let j=0;j<=16;j++){const a=offset+j*9,b=a+8,v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}offset+=17*9;}
 scalpMaterial?.dispose();g.computeBoundingBox();g.computeBoundingSphere();g.userData={originalAsset:true,style:'loose-asymmetrical-side-part',triangles:indices.length/3,locks:LOCKS.length};return g;
}

/** Reuse the evaluated original mesh. No rays or per-frame work at runtime. */
export function createLayeredHairGeometry({center=BASE_CENTER,radii=BASE_RADII,color=0x44342f,flowFinish=false}={}){
 const p=HAIR_DATA.position.slice(),n=HAIR_DATA.normal.slice(),c=[],base=new THREE.Color(color);
 for(let i=0;i<p.length;i+=3){
  for(let k=0;k<3;k++){p[i+k]=center[k]+(p[i+k]-BASE_CENTER[k])*radii[k]/BASE_RADII[k];n[i+k]*=BASE_RADII[k]/radii[k];}
  const length=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=length;
  const value=HAIR_DATA.value[i/3];c.push(base.r*value,base.g*value,base.b*value);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(HAIR_DATA.index);g.computeBoundingBox();g.computeBoundingSphere();g.userData={originalAsset:true,style:HAIR_DATA.style,triangles:HAIR_DATA.index.length/3,locks:LOCKS.length,scalpSha256:HAIR_DATA.scalpSha256};if(flowFinish)attachHairFlow(g,HAIR_DATA.flow);return g;
}

/** Replace only head hair. The placeholder matches Worldwoven's mesh batcher.
 * Pass resculpt:true only for offline refitting to a changed anatomical scalp.
 */
export function addLayeredHair(head,color=0x44342f,fit={}){
 for(const child of [...head.children])if(child.isMesh&&/^(hair-|fringe|combed|side-lock|side-flow)/.test(child.name)){child.removeFromParent();child.geometry.dispose();}
 const scalp=head.children.find(m=>m.isMesh&&/^continuous-head/.test(m.name));
 const geometry=fit.resculpt?sculptLayeredHairGeometry({scalpGeometry:scalp?.geometry,...fit,color}):createLayeredHairGeometry({...fit,color});
 const material=fit.material??{color:new THREE.Color(color),isMaterial:false};
 const mesh=new THREE.Mesh(geometry,material);mesh.name='hair-layered-loose-side-part';mesh.userData.softSkin=true;mesh.userData.layeredHair=true;head.add(mesh);head.userData.layeredHair={...geometry.userData,center:fit.center??BASE_CENTER,radii:fit.radii??BASE_RADII};return mesh;
}
