/** Two original opaque hairstyles. Y-up, metres, face +Z.
 * Authored from public hairstyle previews; no imported mod geometry/textures.
 * Offline scalp fit is baked by build-female-hair-options.mjs. Runtime reads
 * static positions/normals, so actors do not trace rays or create hair per frame.
 */
import * as THREE from 'three';
import DATA from './assets/female-hair-options-data.mjs';
import {attachHairFlow} from './hair-flow-finish.mjs';
export const FEMALE_HAIR_OPTIONS=['long-layered','gathered-updo'];
const V=p=>new THREE.Vector3(...p),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gauss=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
const GATHERED_EDGE=[[0,1.645],[.55,1.640],[.90,1.607],[1.15,1.582],[1.45,1.586],[1.65,1.578],[1.95,1.547],[2.4,1.518],[Math.PI,1.512]];
function gatheredHairline(a){for(let i=0;i<GATHERED_EDGE.length-1;i++){const[x,y]=GATHERED_EDGE[i],[nx,ny]=GATHERED_EDGE[i+1];if(a<=nx)return mix(y,ny,smooth(x,nx,a));}return 1.512;}
export function sculptFemaleHairOption({style='long-layered',scalpGeometry,garmentGeometry=null,landmarks={}}={}){
 const up=style==='gathered-updo',origin=V([0,1.565,-.008]),ray=new THREE.Raycaster(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),scalp=new THREE.Mesh(scalpGeometry,mat);scalp.updateMatrixWorld(true);scalpGeometry.computeBoundingBox();const skullTop=scalpGeometry.boundingBox.max.y;
 const p=[],ix=[],values=[],flow=[],seams=[],longParts=[];
 const garment=garmentGeometry?new THREE.Mesh(garmentGeometry,mat):null;garment?.updateMatrixWorld(true);
 function drape(q,lift=.008){if(!garment||q.y>1.405)return q;ray.set(new THREE.Vector3(q.x,q.y,.5),new THREE.Vector3(0,0,-1));ray.far=1;const hit=ray.intersectObject(garment,false)[0];if(hit)q.z=mix(q.z,hit.point.z+lift,smooth(1.405,1.365,q.y));return q;}
 const add=(q,value=1,coord=[0,0,1])=>{p.push(...q.toArray());values.push(value);flow.push(...coord);return p.length/3-1;};
 // Fit horizontal sections so the authored frontal opening retains its actual
 // Y landmark. Radial projection from the head center lowered the hairline.
 function skin(q,lift=.006){const y=Math.min(skullTop-.0007,q.y-.008*smooth(1.630,1.682,q.y)),center=new THREE.Vector3(0,y,-.015),d=new THREE.Vector3(q.x,0,q.z+.015).normalize();ray.set(center,d);ray.far=.3;const hit=ray.intersectObject(scalp,false)[0];if(!hit)return q;const out=center.addScaledVector(d,hit.distance+lift);out.y=q.y;return out;}
 function grid(nu,nv,fn,wrap=false){const start=p.length/3;for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const r=fn(i/nu,j/nv);add(r[0],r[1],r[2]);}for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=start+j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}if(wrap)for(let j=0;j<=nv;j++)seams.push([start+j*(nu+1),start+j*(nu+1)+nu]);}
 // Actual skull surface supplies the rounded crown; the off-centre part is a
 // shallow root depression and two broad lifts, never a conical cap apex.
 const crownY=(landmarks.crown?.[1]??1.690)+.010;
 grid(48,20,(u,v)=>{const a=u*Math.PI*2,signed=a>Math.PI?a-Math.PI*2:a,front=1-smooth(.50,1.26,Math.abs(signed)),ear=gauss(Math.abs(signed),1.58,.30);
  const contour=front*(.006*Math.cos(signed*3.8)-.007*gauss(signed,.08,.17)+.002*Math.sin(signed*5));
  // The gathered style clears the helix and curls down behind it. Tapering the
  // last root rows into skin avoids a thick straight strip crossing the ear.
  const edge=(up?gatheredHairline(Math.abs(signed)):1.518+.127*front+.022*ear)+contour;
  const y=crownY-(crownY-edge)*Math.pow(.035+.965*v,1.45),phi=Math.acos(Math.max(-.96,Math.min(.999,(y-origin.y)/.139))),q=new THREE.Vector3(Math.sin(phi)*Math.sin(a)*.096,y,Math.sin(phi)*Math.cos(a)*.135-.015);
  const part=gauss(q.x,.010,.007)*gauss(q.z,.024,.093)*smooth(1.61,1.69,q.y),rootFlow=up?Math.cos(9*a-3.3*v):Math.cos(12*a+1.2*v);
  const edgeBlend=up?1-.90*smooth(.74,1,v):1;
  const out=skin(q,(.008+.005*Math.sin(phi)-.003*part+(up?.0034:.0020)*rootFlow*Math.sin(phi))*edgeBlend);
  if(v<.08)out.y=Math.min(out.y,crownY);
  return[out,1.015+(up?.16:.055)*rootFlow-.075*part,[v*.32,(u*(up?9:12)+(up?-.525:.191)*v+1)/16,1]];
 },true);
 // Seal the tiny top ring with a low fan, keeping a rounded closed crown.
 const top=new THREE.Vector3();for(let i=0;i<48;i++)top.add(new THREE.Vector3(p[i*3],p[i*3+1],p[i*3+2]));top.multiplyScalar(1/48);top.y+=.0008;const pole=add(top,1.015);for(let i=0;i<48;i++)ix.push(pole,i+1,i);
 function lock(name,points,width,depth,value=1,{rooted=true,steps=22,sides=8,rootEnd=.48,rootLift=.009,draped=false}={}){
  const curve=new THREE.CatmullRomCurve3(points.map(V),false,'centripetal'),start=p.length/3;
  let fittedZ=null;const samples=96;
  if(draped){fittedZ=Array.from({length:samples+1},(_,i)=>drape(curve.getPoint(i/samples),.007+depth*.55).z);
   // Interpolate over the shoulder contact instead of stepping from the free
   // neck length to the first ray hit. The section tangent follows this real
   // bent centerline, so the strand does not crease into an angular elbow.
   for(let pass=0;pass<3;pass++)fittedZ=fittedZ.map((z,i,a)=>{let sum=0,w=0;for(let k=-4;k<=4;k++){const v=Math.exp(-k*k/5);sum+=a[Math.max(0,Math.min(samples,i+k))]*v;w+=v;}return sum/w;});
  }
  function centerAt(t){const q=curve.getPoint(t),attach=rooted?1-smooth(rootEnd-.16,rootEnd,t):0;if(attach>0)q.lerp(skin(q.clone(),rootLift),attach);if(draped&&q.y<1.46){const u=t*samples,i=Math.min(samples-1,Math.floor(u));q.z=mix(q.z,mix(fittedZ[i],fittedZ[i+1],u-i),smooth(1.46,1.42,q.y));}return q;}
  for(let j=0;j<=steps;j++){
   const t=j/steps,guide=curve.getPoint(t),center=centerAt(t),tangent=draped?centerAt(Math.min(1,t+.002)).sub(centerAt(Math.max(0,t-.002))).normalize():curve.getTangent(t).normalize();
   const attach=rooted?1-smooth(rootEnd-.16,rootEnd,t):0;
   let out=center.clone().sub(origin);out.y*=.15;out.normalize();
   if(draped)out.lerp(new THREE.Vector3(0,0,1),smooth(1.445,1.365,center.y)).normalize();
   const side=new THREE.Vector3().crossVectors(tangent,out).normalize();out.crossVectors(side,tangent).normalize();
   const taper=1-.65*smooth(.68,.90,t)-.31*smooth(.90,1,t);
   const w=width*(.58+.42*smooth(0,.12,t))*taper,d=depth*(.75+.25*Math.sin(Math.PI*t))*(1-.94*smooth(.78,1,t));
   for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,q=center.clone().addScaledVector(side,Math.cos(a)*w*.5).addScaledVector(out,Math.sin(a)*d);
    if(attach>0)q.lerp(skin(q,rootLift-.004+Math.max(0,Math.sin(a))*.009),attach);
    add(q,value*(.970+.070*Math.sin(a)),[rooted?t:.24+t*.76,k/sides/16,1]);
   }seams.push([start+j*(sides+1),start+j*(sides+1)+sides]);
  }
  for(let j=0;j<steps;j++)for(let k=0;k<sides;k++){const a=start+j*(sides+1)+k,b=a+1,c=a+sides+1,d=c+1;ix.push(a,b,c,b,d,c);}
  longParts.push(name);
 }
 if(!up){
  // Broad back lengths are one corrugated surface, with a tapered variable
  // lower edge. Side/frontal lengths attach to this body rather than floating.
  grid(40,22,(u,v)=>{const a=mix(.93,Math.PI*2-.93,u),edge=1.132+.020*Math.sin(a*5+.8)+.011*Math.sin(a*9),y=mix(1.622,edge,v),s=Math.sin(a),c=Math.cos(a),wave=Math.sin(v*7.0+.5)*.013;
   const rx=mix(.090,.110,v)+wave+ .009*Math.sin(v*Math.PI),rz=mix(.105,.130,v)+.008*Math.sin(v*5.2),taper=1-.32*smooth(.71,1,v),groove=.0035*Math.cos(a*11-v*1.8)*Math.sin(Math.PI*v);
   let q=new THREE.Vector3(s*(rx+groove)*taper,y,-.020+c*(rz+groove));
   if(v<.24)q.lerp(skin(q,.008),1-smooth(0,.24,v));
   return[q,.965+.040*Math.cos(a*11-v*1.8),[.12+.88*v,(a*11-v*1.8)/(Math.PI*2*16),1]];
  });
  for(const s of[-1,1]){
   const asym=s<0?1:0;
   // The front lengths fall over the real gown surface. Broad paths have
   // independent lengths and a shallow S; their section is wide/thin at the
   // shoulder and rounder in the lower fold, avoiding suspended belt loops.
   lock('front-length-'+s,[[s*.013,1.686,.032],[s*.044,1.650,.080],[s*.079,1.585,.047],[s*.090,1.498,.036],[s*.092,1.433,.043],[s*.105,1.371,.050],[s*.115,1.316,.063],[s*.102,1.263,.080],[s*.083,1.214,.084],[s*.082,1.169+asym*.015,.081],[s*.065,1.140+asym*.020,.075]],.036,.006,1.11,{rootEnd:.33,steps:26,draped:true});
   lock('outer-length-'+s,[[s*.035,1.678,.008],[s*.082,1.614,.026],[s*.092,1.540,.008],[s*.099,1.452,.003],[s*.112,1.386,.025],[s*.127,1.337,.044],[s*.117,1.278,.056],[s*.099,1.230+asym*.019,.054]],.040,.0065,1.025,{rootEnd:.36,steps:24,draped:true});
   lock('inner-layer-'+s,[[s*.022,1.683,.029],[s*.054,1.638,.060],[s*.078,1.575,.039],[s*.083,1.496,.034],[s*.081,1.420,.045],[s*.093,1.355,.065],[s*.098,1.306,.072],[s*.083,1.267,.079],[s*.061,1.235+asym*.026,.082]],.024,.0043,1.18,{rootEnd:.38,steps:20,draped:true});
   lock('cheek-frame-'+s,[[s*.010,1.682,.034],[s*.040,1.644,.078],[s*.072,1.591,.048],[s*.080,1.536,.035],[s*.073,1.492+asym*.006,.028]],.019,.0035,1.10,{rootEnd:.66,steps:22});
  }
 }else{
  for(const s of[-1,1]){
   lock('gather-temple-'+s,[[s*.026,1.682,.023],[s*.064,1.645,.038],[s*.079,1.609,-.006],[s*.071,1.568,-.073],[s*.035,1.543,-.116],[s*.008,1.548,-.128]],.039,.005,1.17,{rootEnd:.90,steps:20,rootLift:.013});
   lock('gather-crown-'+s,[[s*.014,1.689,-.009],[s*.047,1.676,-.054],[s*.063,1.628,-.104],[s*.044,1.578,-.127],[s*.016,1.551,-.130]],.044,.005,1.14,{rootEnd:.90,steps:20,rootLift:.013});
   lock('fine-temple-root-'+s,[[s*.060,1.623,.044],[s*.073,1.601,.034],[s*.075,1.579,.028],[s*.071,1.557,.028]],.010,.0024,1.06,{rootEnd:.83,steps:18,rootLift:.0055});
  }
  // Flattened overlapping rolls form a low chignon. Its asymmetric folded
  // center and visible winding have volume and direction; no sphere is used.
  grid(24,12,(u,v)=>{const a=u*Math.PI*2,b=.035+(Math.PI-.07)*v,r=1+.06*Math.cos(a*5+v*4);return[new THREE.Vector3(Math.sin(b)*Math.cos(a)*.044*r,1.544+Math.sin(b)*Math.sin(a)*.027*r,-.127+Math.cos(b)*.019),.965+.045*Math.cos(a*5+v*4),[.24+.76*v,(u*5+v*4/(Math.PI*2))/16,.7]];},true);
  for(let band=0;band<2;band++){
   const pts=[];for(let j=0;j<=12;j++){const a=mix(-.5+band*.9,Math.PI*2+.32+band*.5,j/12),shrink=1-.18*j/12;pts.push([Math.cos(a)*(.049-band*.018)*shrink,1.544+Math.sin(a)*(.027-band*.008),-.121-Math.sin(j/12*Math.PI)*.021-band*.006]);}
   lock('chignon-roll-'+band,pts,.031-band*.003,.009,1.055+band*.035,{rooted:false,steps:36,sides:8});
  }
  lock('chignon-center-fold',[[-.026,1.554,-.132],[-.014,1.564,-.148],[.009,1.555,-.157],[.019,1.539,-.151],[.004,1.524,-.134]],.030,.009,1.06,{rooted:false,steps:18});
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('featureCoord',new THREE.Float32BufferAttribute(flow,3));g.setIndex(ix);g.computeVertexNormals();const n=g.attributes.normal;
 for(const[a,b]of seams){const q=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,q.x,q.y,q.z);n.setXYZ(b,q.x,q.y,q.z);}
 g.computeBoundingBox();g.computeBoundingSphere();g.userData={style,triangles:ix.length/3,values,parts:longParts};mat.dispose();return g;
}
export function createFemaleHairOption({style='long-layered',color=0x44342f,flowFinish=false}={}){
 const a=DATA[style];if(!a)throw Error('Unknown female hairstyle '+style);const g=new THREE.BufferGeometry(),base=new THREE.Color(color),c=[];
 for(const v of a.value)c.push(base.r*v,base.g*v,base.b*v);
 g.setAttribute('position',new THREE.Float32BufferAttribute(a.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(a.normal,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(a.index);g.computeBoundingBox();g.computeBoundingSphere();g.userData={style,originalAsset:true,triangles:a.index.length/3,scalpSha256:a.scalpSha256};if(flowFinish)attachHairFlow(g,a.flow);return g;
}
export function addFemaleHairOption(head,color=0x44342f,style='long-layered',options={}){
 for(const m of [...head.children])if(m.isMesh&&/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 const g=createFemaleHairOption({...options,style,color}),m=new THREE.Mesh(g,{color:new THREE.Color(color),isMaterial:false});m.name='hair-female-'+style;m.userData.softSkin=true;head.add(m);head.userData.femaleHair={...g.userData};return m;
}
