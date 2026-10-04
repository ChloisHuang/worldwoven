/** Original softly waved asymmetric bob. Metres, Y-up, face +Z.
 * A continuous crown/back mass carries broad sculpted flow and four tapering
 * face-framing locks. One opaque merged mesh; no textures, rays or per-frame work.
 */
import * as THREE from 'three';
import HAIR_DATA from './assets/female-hair-data.mjs';
export const FEMALE_HAIR_FIT={center:[0,1.54638,-.0163],radii:[.081,.10413,.0945]};
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gauss=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
const V=p=>new THREE.Vector3(...p);
function spline(rows,t){const j=Math.min(rows.length-2,Math.floor(t)),u=t-j,a=rows[Math.max(0,j-1)],b=rows[j],c=rows[j+1],d=rows[Math.min(rows.length-1,j+2)];return b.map((x,k)=>.5*(2*x+(-a[k]+c[k])*u+(2*a[k]-5*x+4*c[k]-d[k])*u*u+(-a[k]+3*x-3*c[k]+d[k])*u*u*u));}
// This upper profile follows the raised frontal/parietal skull, rather than
// adding a cap above the old forehead. Lower bob length stays unchanged.
const PROFILE=[[1.705,0,0,.012],[1.691,.040,.048,.010],[1.660,.069,.082,.006],[1.620,.087,.103,.002],[1.550,.095,.110,0],[1.503,.097,.106,-.002],[1.457,.091,.096,-.002],[1.415,.074,.078,0]];
function atHeight(y){let lo=0,hi=PROFILE.length-1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(spline(PROFILE,t)[0]>y)lo=t;else hi=t;}return spline(PROFILE,(lo+hi)/2);}
// Ends on the longer left have a soft inward wave. The shorter right opens the
// cheek and ear, so its silhouette is structural rather than a color variant.
const LOCKS=[
 ['long-sweep',[[.018,1.692,.020],[-.006,1.683,.045],[-.048,1.644,.078],[-.081,1.585,.052],[-.085,1.528,.042],[-.085,1.482,.038],[-.070,1.435,.031]],.033,.0045,1.030],
 ['left-under-wave',[[-.038,1.668,.049],[-.075,1.622,.061],[-.099,1.543,.035],[-.097,1.466,.024],[-.080,1.421,.012]],.030,.005,.995],
 ['short-sweep',[[.020,1.689,.025],[.050,1.674,.063],[.080,1.633,.070],[.088,1.570,.051],[.080,1.512,.021]],.028,.0057,1.020],
 ['right-temple',[[.053,1.660,.047],[.084,1.620,.043],[.097,1.559,.009],[.091,1.495,-.002],[.077,1.466,-.014]],.025,.004,.985]
];
export function sculptFemaleHairGeometry({color=0x44342f,center=FEMALE_HAIR_FIT.center,radii=FEMALE_HAIR_FIT.radii,scalpGeometry=null}={}){
 const position=[],value=[],index=[],seams=[],columns=64,rows=28;
 const origin=V(FEMALE_HAIR_FIT.center),ray=new THREE.Raycaster(),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const scalp=scalpGeometry?new THREE.Mesh(scalpGeometry,material):null;scalp?.updateMatrixWorld(true);
 function fitScalp(p,lift=.004,exact=false){if(!scalp)return p;const dir=p.clone().sub(origin),length=dir.length();ray.set(origin,dir.normalize());ray.far=.20;const hit=ray.intersectObject(scalp,false)[0];if(hit&&(exact||length<hit.distance+lift))p.copy(origin).addScaledVector(dir,hit.distance+lift);return p;}
 const add=(p,c)=>{position.push(...p);value.push(c);return position.length/3-1;};
 // A single pole avoids a ring of degenerate triangles at the crown.
 add([.012,1.705,-.0163],1);
 for(let j=1;j<=rows;j++)for(let i=0;i<=columns;i++){
  const a=i/columns*Math.PI*2,signed=a>Math.PI?a-Math.PI*2:a,ab=Math.abs(signed),v=j/rows;
  const lower=1.424+.038*smooth(-.2,1,Math.sin(a))+.009*Math.sin(a*7+.8)+.004*Math.sin(a*13+.3);
  const hairline=1.640+.006*gauss(signed,.12,.22)-.003*gauss(signed,-.3,.24);
  const edge=mix(hairline,lower,smooth(.46,1.16,ab));
  const y=mix(1.705,edge,v),r=atHeight(y);
  const flow=a+.11*Math.sin(v*5.2-.8)*Math.sin(a)*smooth(.24,.85,v);
  const ridge=(.0018*Math.cos(a*13+.55*Math.sin(v*5))+.0009*Math.cos(a*23-.45*v))*Math.sin(Math.PI*v*.95);
  const wave=.0045*Math.sin((y-1.42)*30+.5)*smooth(1.60,1.48,y);
  const x=r[3]+Math.sin(flow)*(r[1]+ridge+wave);
  const z=-.0163+Math.cos(flow)*(r[2]+ridge+wave*.6);
  const p=fitScalp(new THREE.Vector3(x,y,z),.0045);
  add(p.toArray(),.975+.020*Math.cos(a*13+.55*Math.sin(v*5)));
 }
 for(let i=0;i<columns;i++)index.push(0,1+i,2+i);
 for(let j=0;j<rows-1;j++)for(let i=0;i<columns;i++){const a=1+j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;index.push(a,b,c,b,d,c);}
 for(let j=0;j<rows;j++)seams.push([1+j*(columns+1),1+j*(columns+1)+columns]);
 for(const [name,points,width,depth,c] of LOCKS){
  const curve=new THREE.CatmullRomCurve3(points.map(V),false,'centripetal'),start=position.length/3,steps=18,sides=8;
  for(let j=0;j<=steps;j++){
   const t=j/steps,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   p.lerp(fitScalp(p.clone(),.009,true),smooth(1.535,1.640,p.y));
   const radial=p.clone().sub(V(FEMALE_HAIR_FIT.center));radial.y*=.45;radial.normalize();
   const side=new THREE.Vector3().crossVectors(tangent,radial).normalize(),out=new THREE.Vector3().crossVectors(side,tangent).normalize();
   const taper=(.58+.42*smooth(0,.16,t))*(1-.985*smooth(.52,1,t)),thickness=depth*(.6+.4*Math.sin(t*Math.PI))*(1-.94*smooth(.74,1,t));
   for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,q=p.clone().addScaledVector(side,Math.cos(a)*width*.5*taper).addScaledVector(out,Math.sin(a)*thickness);q.lerp(fitScalp(q.clone(),.005+Math.max(0,Math.sin(a))*.006,true),smooth(1.535,1.640,q.y));add(q.toArray(),c);}
   seams.push([start+j*(sides+1),start+j*(sides+1)+sides]);
  }
  for(let j=0;j<steps;j++)for(let k=0;k<sides;k++){const a=start+j*(sides+1)+k,b=a+1,c=a+sides+1,d=c+1;index.push(a,b,c,b,d,c);}
 }
 const colors=[],base=new THREE.Color(color);
 for(let i=0;i<position.length;i+=3){for(let k=0;k<3;k++)position[i+k]=center[k]+(position[i+k]-FEMALE_HAIR_FIT.center[k])*radii[k]/FEMALE_HAIR_FIT.radii[k];colors.push(base.r*value[i/3],base.g*value[i/3],base.b*value[i/3]);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(index);g.computeVertexNormals();
 const n=g.attributes.normal;for(const[a,b]of seams){const v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
 material.dispose();g.computeBoundingBox();g.computeBoundingSphere();g.userData={originalAsset:true,style:'asymmetrical-soft-wave-bob',triangles:index.length/3,locks:LOCKS.length};return g;
}
/** Reuse the authored/baked mesh. No scalp queries occur in this runtime path. */
export function createFemaleHairGeometry({color=0x44342f,center=FEMALE_HAIR_FIT.center,radii=FEMALE_HAIR_FIT.radii}={}){
 const p=HAIR_DATA.position.slice(),n=HAIR_DATA.normal.slice(),c=[],base=new THREE.Color(color);
 for(let i=0;i<p.length;i+=3){for(let k=0;k<3;k++){p[i+k]=center[k]+(p[i+k]-FEMALE_HAIR_FIT.center[k])*radii[k]/FEMALE_HAIR_FIT.radii[k];n[i+k]*=FEMALE_HAIR_FIT.radii[k]/radii[k];}const length=Math.hypot(n[i],n[i+1],n[i+2]);for(let k=0;k<3;k++)n[i+k]/=length;c.push(base.r*HAIR_DATA.value[i/3],base.g*HAIR_DATA.value[i/3],base.b*HAIR_DATA.value[i/3]);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(HAIR_DATA.index);g.computeBoundingBox();g.computeBoundingSphere();g.userData={originalAsset:true,style:'asymmetrical-soft-wave-bob',triangles:HAIR_DATA.index.length/3,scalpSha256:HAIR_DATA.scalpSha256};return g;
}
export function addFemaleHair(head,color=0x44342f,fit={}){
 for(const m of [...head.children])if(m.isMesh&&/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 const geometry=createFemaleHairGeometry({...fit,color}),mesh=new THREE.Mesh(geometry,fit.material??{color:new THREE.Color(color),isMaterial:false});mesh.name='hair-female-asymmetrical-wave-bob';mesh.userData.softSkin=true;head.add(mesh);head.userData.femaleHair={...geometry.userData};return mesh;
}
