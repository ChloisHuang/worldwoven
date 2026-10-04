/** Original representative French frock-coat study. No production imports.
 * Call after createApprovedSurfaces(opts), before mergeSurfaces/skinning.
 * Existing names, colors, bone assignment, hands and arm rest pose are retained.
 */
import * as THREE from 'three';
import {armWidthAtHeight, createRelaxedArmOffset} from '../../source/game/approved-surfaces.js';
import {shapeHeight} from '../../source/game/character-traits.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const BODY={
 'masculine-lean':{hip:.947,waist:.98,chest:1.075,shoulder:.96,depth:1.01},
 'masculine-broad':{hip:1.015,waist:1.05,chest:1.125,shoulder:.99,depth:1.075}
};
// Separate shoulder, chest and waist stations make a tailored silhouette;
// no uniform horizontal scale is applied to the character or its rig.
const BODICE=[
 [.926,.165,.118,0,-.006],[.985,.160,.112,0,-.005],
 [1.065,.143,.084,0,-.001],[1.18,.160,.095,0,-.008],
 [1.275,.177,.086,0,-.012],[1.320,.179,.074,0,-.012],
 [1.350,.155,.061,0,-.008],[1.376,.112,.049,0,-.003],
 [1.397,.056,.038,0,.001],[1.407,.044,.033,0,.002]
];
const SLEEVE=[
 [.956,.030,.033,.302,-.001],[1.025,.034,.036,.290,-.003],
 [1.099,.039,.041,.275,-.006],[1.18,.044,.047,.241,-.009],
 [1.26,.046,.054,.213,-.011],[1.310,.044,.055,.189,-.011],
 [1.340,.037,.047,.169,-.010],[1.358,.022,.031,.150,-.009],
 [1.369,.003,.007,.138,-.008]
];
function spline(rows,t){
 const j=Math.min(rows.length-2,Math.floor(t)),u=t-j;
 const a=rows[Math.max(0,j-1)],b=rows[j],c=rows[j+1],d=rows[Math.min(rows.length-1,j+2)];
 return b.map((x,k)=>.5*(2*x+(-a[k]+c[k])*u+(2*a[k]-5*x+4*c[k]-d[k])*u*u+(-a[k]+3*x-3*c[k]+d[k])*u*u*u));
}
function sectionAt(rows,y){
 let lo=0,hi=rows.length-1;
 for(let i=0;i<30;i++){const t=(lo+hi)/2;if(spline(rows,t)[0]<y)lo=t;else hi=t;}
 return spline(rows,(lo+hi)/2);
}
function frontAt(x,y){
 const r=sectionAt(BODICE,y);
 return r[4]+r[2]*Math.sqrt(Math.max(.002,1-((x-r[3])/r[1])**2));
}
function shapePoint(p,opts,arm=false){
 const [x,y,z]=p,d=BODY[opts.bodyPreset];
 let f=y<.85?mix(1,d.hip,clamp((y-.65)/.20)):y<1.075?mix(d.hip,d.waist,(y-.85)/.225):y<1.23?mix(d.waist,d.chest,(y-1.075)/.155):y<1.335?mix(d.chest,d.shoulder,(y-1.23)/.105):mix(d.shoulder,1,clamp((y-1.335)/.09));
 if(arm)f=armWidthAtHeight(y,opts.bodyPreset);
 const o=arm?opts.offset(y):[0,0,0];
 return [x*f+Math.sign(x)*o[0],shapeHeight(y+o[1],opts.legLength),z*(y>.84&&y<1.38?d.depth:1)+o[2]];
}
function grid(nu,nv,fn,opts,{arm=false,closed=false}={}){
 const p=[],sy=[],index=[];
 for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++){
  const q=fn(u/nu,v/nv);sy.push(q[1]);p.push(...shapePoint(q,opts,arm));
 }
 for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){
  const a=v*(nu+1)+u,b=a+1,c=a+nu+1,d=c+1;index.push(a,b,c,b,d,c);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('sourceY',new THREE.Float32BufferAttribute(sy,1));g.setIndex(index);g.computeVertexNormals();
 if(closed){const n=g.attributes.normal,t=new THREE.Vector3();for(let v=0;v<=nv;v++){const a=v*(nu+1),b=a+nu;t.set(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,t.x,t.y,t.z);n.setXYZ(b,t.x,t.y,t.z);}}
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function loft(rows,opts,{arm=false,side=1,nu=32,nv=32}={}){
 return grid(nu,nv,(u,v)=>{
  const r=spline(rows,v*(rows.length-1)),a=u*Math.PI*2;
  // Shallow compression beside the elbow, two broad cloth waves rather than
  // decorative tubes. The cuff and cap remain exact, unruffled boundaries.
  const ease=arm?.0007*Math.sin((r[0]-1.09)*65)*Math.exp(-(((r[0]-1.09)/.060)**2))*Math.sin(a)**2:0;
  return [side*r[3]+(r[1]+ease)*Math.sin(a),r[0],r[4]+(r[2]+ease)*Math.cos(a)];
 },opts,{arm,closed:true});
}
function setGeometry(m,g){const old=m.geometry;m.geometry=g;old.dispose();m.userData.naturalClothing=true;}
function bezier(a,b,c,d,t){const s=1-t;return a.map((x,i)=>s*s*s*x+3*s*s*t*b[i]+3*s*t*t*c[i]+t*t*t*d[i]);}
function ribbon(points,width,opts,offset=.0032){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],0)));
 return grid(2,24,(u,v)=>{const p=curve.getPoint(v),t=curve.getTangent(v),w=typeof width==='function'?width(v):width;const x=p.x+(u-.5)*w*t.y,y=p.y-(u-.5)*w*t.x;return [x,y,frontAt(x,y)+offset];},opts);
}
/** A bounded prototype for the existing male France court-frock-coat.
 * Returns a summary, or null for other outfits. Dimensions are unscaled metres.
 * All generated vertices include anatomical sourceY for production weights.
 */
export function applyNaturalClothing(root,options={}){
 const bodyPreset=options.bodyPreset??'masculine-lean';
 const wardrobe=options.wardrobePreset??'court-frock-coat';
 if(options.culture!=='france'||!BODY[bodyPreset]||wardrobe!=='court-frock-coat')return null;
 const bodice=root.getObjectByName('royal-frock-bodice');
 if(!bodice||bodice.userData.naturalClothing)return null;
 const legLength=options.shapeTraits?.legLength??1;
 const opts={bodyPreset,legLength,offset:createRelaxedArmOffset(bodyPreset,wardrobe,legLength)};
 const changed=[];
 const replace=(name,g)=>{const m=root.getObjectByName(name);if(!m){g.dispose();return;}setGeometry(m,g);changed.push(name);};
 replace('royal-frock-bodice',loft(BODICE,opts));
 for(const side of [-1,1]){
  replace('court-long-sleeve-'+side,loft(SLEEVE,opts,{arm:true,side,nu:28,nv:32}));
  // A collar fold opens naturally from the neck then falls against the chest.
  // Its outer edge and rounded point are authored, rather than a wide ribbon
  // whose edges intersect the bodice and look like a floating leaf.
  replace('shirt-collar-'+side,grid(8,18,(u,v)=>{
   const inner=bezier([.031,1.404],[.024,1.386],[.026,1.362],[.047,1.327],v);
   const outer=bezier([.048,1.397],[.064,1.382],[.070,1.355],[.047,1.327],v);
   const x=side*mix(inner[0],outer[0],u),y=mix(inner[1],outer[1],u);
   return [x,y,frontAt(x,y)+.0032+.0030*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)];
  },opts));
  replace('royal-gold-facing-'+side,ribbon([[side*.035,1.390],[side*.058,1.310],[side*.052,1.15],[side*.061,.970]],.0075,opts,.0038));
  // Existing restrained seams now follow the actual garment, not open air.
  replace('shirt-fold-'+side,ribbon([[side*.125,1.215],[side*.130,1.115],[side*.118,.971]],.0015,opts,.0017));
 }
 replace('royal-cravat',ribbon([[0,1.403],[0,1.365],[0,1.315]],t=>.020+.010*Math.sin(t*Math.PI),opts,.006));
 // Reproject the inherited placket, buttons and opening after torso shaping.
 // Their colors/identity remain untouched. A local inverse x factor lets their
 // topology survive; sourceY and every arm/hand source remain intact.
 root.traverse(m=>{
  if(!m.isMesh||!/^shirt-placket$|^shirt-button-|^collar-opening$/.test(m.name))return;
  const p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const y=p.getY(i),unit=shapePoint([1,y,0],opts)[0],x=p.getX(i)/unit;
   const z=frontAt(x,y)+(m.name==='collar-opening'?.0018:.0038);
   p.setZ(i,z*(y>.84&&y<1.38?BODY[bodyPreset].depth:1));
  }
  m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();changed.push(m.name);
 });
 root.userData.naturalClothing={prototypeOnly:true,cut:'french-frock-soft-set-in-sleeve',changed,neckBoundaryUnchanged:true};
 return root.userData.naturalClothing;
}
