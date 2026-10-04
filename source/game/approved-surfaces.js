/** Approved original R8 sculpt with R10 body, tailoring and hairstyle presets.
 * World units are metres; Y up, face +Z. All visible body, face, hair and clothes
 * surfaces are authored parametric meshes. The only material is MeshToonMaterial.
 * Runtime dependency: Three.js 0.186.1. No textures, licensed meshes or PBR.
 */
import * as THREE from 'three';
import {applyNaturalHead} from './head-shape.js';
import {normalizeShapeTraits,hasShapeTraits,shapeHeight} from './character-traits.js';
import {buildPalaceEmperorGarments} from './china-palace-costume.js';
import {buildJinyiGarments} from './jinyi-costume.js';
const gradient = new THREE.DataTexture(new Uint8Array([90, 150, 213, 255]),4,1,THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.generateMipmaps=false; gradient.needsUpdate=true;
const skinGradient=new THREE.DataTexture(new Uint8Array([140,186,229,255]),4,1,THREE.RedFormat);
skinGradient.minFilter=skinGradient.magFilter=THREE.NearestFilter;skinGradient.generateMipmaps=false;skinGradient.needsUpdate=true;
const skinColors=new Set([0xdba789,0xe7b99a,0xb78069,0xa76463,0x704a4a]);
const materials=new Map();
function mat(c){return {color:new THREE.Color(c), skin:skinColors.has(c), isMaterial:false};}
function mesh(g,name,p,idx,color){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat(color));m.name=name;m.castShadow=true;m.receiveShadow=false;g.add(m);return m;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
function spline(a,t){const j=Math.min(a.length-2,Math.floor(t)),u=t-j;const p0=a[Math.max(0,j-1)],p1=a[j],p2=a[j+1],p3=a[Math.min(a.length-1,j+2)];return p1.map((v,k)=>.5*((2*v)+(-p0[k]+p2[k])*u+(2*p0[k]-5*v+4*p2[k]-p3[k])*u*u+(-p0[k]+3*v-3*p2[k]+p3[k])*u*u*u));}
function surface(g,name,nu,nv,fn,color,wrap=true){const detail=name==='continuous-head-jaw-cheeks-nose'?[64,44]:name==='continuous-swept-hair-shell'?[40,24]:/body|bodice/.test(name)?[36,32]:/inset-eye|iris-/.test(name)?[20,6]:/pupil|catchlight/.test(name)?[12,3]:/finger/.test(name)?[8,8]:/palm|wrist|ear-pinna/.test(name)?[16,14]:/footwear/.test(name)?[24,14]:/sole-/.test(name)?[24,5]:/neck/.test(name)?[16,12]:/side-lock/.test(name)?[16,18]:/soft-wrapped-obi/.test(name)?[24,12]:[24,22];nu=Math.min(nu,detail[0]);nv=Math.min(nv,detail[1]);const p=[],idx=[];for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++)p.push(...fn(u/nu,v/nv));for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){const a=v*(nu+1)+u,b=a+1,c=a+nu+1,d=c+1;idx.push(a,b,c,b,d,c);}return mesh(g,name,p,idx,color);}
function loft(g,name,rings,color,{segs=24,steps=26,deform=null,axis='y'}={}){return surface(g,name,segs,steps,(u,v)=>{const a=u*Math.PI*2,r=spline(rings,v*(rings.length-1)),sin=Math.sin(a),cos=Math.cos(a);let p=axis==='x'?[r[0],r[3]+sin*r[1],r[4]+cos*r[2]]:[r[3]+sin*r[1],r[0],r[4]+cos*r[2]];return deform?deform(p,a,v):p;},color);}
function frontOfLoft(rings,x,y){let lo=0,hi=rings.length-1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(spline(rings,t)[0]<y)lo=t;else hi=t;}const r=spline(rings,(lo+hi)/2);return r[4]+r[2]*Math.sqrt(Math.max(.001,1-((x-r[3])/r[1])**2));}
function conformFront(m,rings,offset=.0025){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,frontOfLoft(rings,p.getX(i),p.getY(i))+offset);p.needsUpdate=true;m.geometry.computeVertexNormals();return m;}
function ribbon(g,name,points,width,color,depth=.001){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return surface(g,name,2,18,(u,v)=>{const p=curve.getPoint(v),tan=curve.getTangent(v),w=typeof width==='function'?width(v):width;const lateral=new THREE.Vector3(tan.y,-tan.x,0).normalize().multiplyScalar((u-.5)*w);return[p.x+lateral.x,p.y+lateral.y,p.z+depth];},color,false);}
function tube(g,name,points,r,color,radial=8){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const geo=new THREE.TubeGeometry(curve,Math.min(20,Math.max(10,points.length)),r,radial,false);const m=new THREE.Mesh(geo,mat(color));m.name=name;g.add(m);return m;}
function patch(g,name,fn,color,nu=24,nv=10){return surface(g,name,nu,nv,fn,color,false);}
const BASE={skin:0xdba789,skinLight:0xe7b99a,skinShadow:0xb78069,lip:0xa76463,mouth:0x704a4a,eye:0xf2e5d4,iris:0x594b3f,pupil:0x25252a,brow:0x473d38,hair:0x342f31,hairMid:0x51434a,hairLight:0x65515a,yukata:0x4f7c7d,collar:0xe5dbc1,obi:0x304657,pattern:0x99b1a5,shirt:0xc7b998,pants:0x344451,sole:0x302f33,shoe:0x6b5550};
let C={...BASE};
function headSurface(x,y,masc=false,traits=null){
 const rs=[[1.455,.012,.021,0,.004],[1.468,masc?.044:.037,.052,0,.002],[1.49,masc?.071:.062,.067,0,0],[1.525,.079,.073,0,-.002],[1.57,.088,.075,0,-.003],[1.62,.087,.077,0,-.004],[1.663,.072,.065,0,-.006],[1.692,.044,.042,0,-.008],[1.707,.001,.001,0,-.008]];
 if(traits&&traits.jawWidth!==1)for(const r of rs)r[1]*=jawFactor(r[0],traits.jawWidth);
 let low=0,high=rs.length-1;
 for(let i=0;i<24;i++){const mid=(low+high)/2;if(spline(rs,mid)[0]<y)low=mid;else high=mid;}
 const r=spline(rs,(low+high)/2),c=Math.sqrt(Math.max(0,1-(x/r[1])**2));
 return r[4]+r[2]*c+faceD(x,y,traits)*Math.pow(c,8);
}
function neutralFaceD(x,y){const G=(cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2);return .006*(G(-.045,1.545,.028,.027)+G(.045,1.545,.028,.027))-.0055*(G(-.040,1.589,.027,.012)+G(.040,1.589,.027,.012))+.009*G(0,1.568,.013,.039)+.016*G(0,1.548,.017,.015)+.003*G(0,1.539,.019,.009)+.007*G(0,1.508,.023,.012);}
function jawFactor(y,width){
 // Jaw corners/chin change; temples, ear roots and the neck seam stay fixed.
 const amount=y<1.49?clamp((y-1.455)/.035,0,1):clamp((1.55-y)/.06,0,1);
 return 1+(width-1)*amount;
}
function faceD(x,y,traits=null){
 if(!traits||traits.noseSize===1&&traits.noseWidth===1&&traits.socketDepth===1)return neutralFaceD(x,y);
 const G=(cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2),n=traits.noseSize,w=traits.noseWidth;
 return .006*(G(-.045,1.545,.028,.027)+G(.045,1.545,.028,.027))
  -.0055*traits.socketDepth*(G(-.040,1.589,.027,.012)+G(.040,1.589,.027,.012))
  +.009*n*G(0,1.568,.013*w,.039)+.016*n*G(0,1.548,.017*w,.015*n)
  +.003*n*G(0,1.539,.019*w,.009*n)+.007*G(0,1.508,.023,.012);
}
function buildHead(g,masc=false,hairStyle=masc?'swept-short':'chin-bob',traits=null,onsenBoundBraid=false){
 const facialSurface=(x,y)=>headSurface(x,y,masc,traits);
 const h=new THREE.Group();h.name='sculpted-head';g.add(h);
 const rings=[[1.455,.012,.021,0,.004],[1.468,masc?.044:.037,.052,0,.002],[1.49,masc?.071:.062,.067,0,0],[1.525,.079,.073,0,-.002],[1.57,.088,.075,0,-.003],[1.62,.087,.077,0,-.004],[1.663,.072,.065,0,-.006],[1.692,.044,.042,0,-.008],[1.707,.001,.001,0,-.008]];
 if(traits&&traits.jawWidth!==1)for(const r of rings)r[1]*=jawFactor(r[0],traits.jawWidth);
 loft(h,'continuous-head-jaw-cheeks-nose',rings,C.skin,{segs:64,steps:44,deform:(p,a)=>{const front=Math.pow(Math.max(0,Math.cos(a)),8);p[2]+=faceD(p[0],p[1],traits)*front;return p;}});
 loft(g,'neck',[[1.335,.046,.039,0,-.008],[1.37,.038,.035,0,0],[1.414,.033,.033,0,.004],[1.461,.036,.036,0,.003],[1.48,.037,.04,0,.002]],C.skin,{steps:24});
 for(const s of [-1,1]){
  // Folded ear bowl is one tailored surface, nested against the skull.
  loft(h,'ear-pinna-'+s,[[1.532,.005,.006,s*.086,-.004],[1.545,.012,.012,s*.091,-.001],[1.567,.013,.014,s*.091,-.006],[1.584,.008,.01,s*.09,-.009],[1.588,.001,.003,s*.088,-.008]],C.skin,{segs:24,steps:20});
  tube(h,'ear-fold-'+s,[[s*.099,1.574,.003],[s*.103,1.567,.007],[s*.10,1.55,.008]],.0023,C.skinShadow);
  const eye=traits?.eyeSize??1,cx=s*(masc?.040:.038),cy=1.59,hw=(masc?.022:.0215)*eye,upper=(masc?.0072:.009)*eye,lower=(masc?.0055:.0062)*eye;
  // Thin almond surfaces remain flush with the face, no external eyeballs.
  patch(h,'inset-eye-white-'+s,(u,v)=>{const x=cx+(u*2-1)*hw;const y=cy+Math.sin(u*Math.PI)*mix(-lower,upper,v)+s*(x-cx)*.08;return[x,y,facialSurface(x,y)+.0018];},C.eye,32,12);
  patch(h,'iris-'+s,(u,v)=>{const a=u*Math.PI*2,r=v*.0058*eye,x=cx+Math.cos(a)*r,y=cy+.0008*eye+Math.sin(a)*r;return[x,y,facialSurface(x,y)+.0032];},C.iris,32,8);
  patch(h,'pupil-'+s,(u,v)=>{const a=u*Math.PI*2,r=v*.0028*eye,x=cx+Math.cos(a)*r,y=cy+.0008*eye+Math.sin(a)*r;return[x,y,facialSurface(x,y)+.0038];},C.pupil,24,6);
  patch(h,'eye-catchlight-'+s,(u,v)=>{const a=u*Math.PI*2,r=v*.0013*eye,x=cx-.0016*eye+Math.cos(a)*r,y=cy+.0031*eye+Math.sin(a)*r;return[x,y,facialSurface(x,y)+.0042];},0xfff7e5,16,4);
  for(const [part,hh,color,rad] of [['upper',upper,C.brow,.00165],['lower',-lower,C.skinShadow,.001]]){
   const pts=[];for(let i=0;i<=16;i++){const u=i/16,x=cx+(u*2-1)*hw,y=cy+Math.sin(u*Math.PI)*hh+s*(x-cx)*.08;pts.push([x,y,facialSurface(x,y)+.0028]);}tube(h,'eyelid-'+part+'-'+s,pts,rad,color,6);
  }
  const brows=[];for(let i=0;i<=12;i++){const u=i/12,x=cx+(u*2-1)*(masc?.026:.024),y=1.609+(eye-1)*.009+(masc?.0025:.0048)*Math.sin(u*Math.PI)+s*(x-cx)*.09;brows.push([x,y,facialSurface(x,y)+.0023]);}ribbon(h,'soft-brow-'+s,brows,t=>(masc?.0042:.0030)*Math.sin(Math.PI*(.08+.84*t)),C.brow);
  const nw=traits?.noseWidth??1,ns=traits?.noseSize??1;
  const nostrils=[[s*.007*nw,1.548+(1.54-1.548)*ns],[s*.01*nw,1.548+(1.539-1.548)*ns],[s*.014*nw,1.548+(1.54-1.548)*ns]];
  // Preserve the old exact arithmetic on the neutral fast path.
  if(nw===1&&ns===1)tube(h,'nostril-'+s,[[s*.007,1.54,facialSurface(s*.007,1.54)+.001],[s*.01,1.539,facialSurface(s*.01,1.539)+.001],[s*.014,1.54,facialSurface(s*.014,1.54)+.001]],.0011,C.skinShadow,6);
  else tube(h,'nostril-'+s,nostrils.map(([x,y])=>[x,y,facialSurface(x,y)+.001]),.0011*Math.min(nw,ns),C.skinShadow,6);
 }
 const lipW=masc?.022:.023;
 for(const upper of [true,false])patch(h,upper?'upper-lip':'lower-lip',(u,v)=>{const x=(u*2-1)*lipW;const f=Math.sin(u*Math.PI);const seam=1.512-.0025*f+.0008*Math.cos(u*4*Math.PI);const y=seam+(upper?1:-1)*f*(upper?.0033:.0038)*v;return[x,y,facialSurface(x,y)+.0015+.0018*Math.sin(v*Math.PI)];},C.lip,32,6);
 const mouth=[];for(let i=0;i<=24;i++){const u=i/24,x=(u*2-1)*lipW,y=1.512-.0025*Math.sin(u*Math.PI)+.0008*Math.cos(u*4*Math.PI);mouth.push([x,y,facialSurface(x,y)+.002]);}tube(h,'closed-soft-mouth',mouth,.00075,C.mouth,5);
 buildHair(h,masc,hairStyle,onsenBoundBraid);return h;
}
function buildHair(h,masc,style='chin-bob',onsenBoundBraid=false){
 const short=style==='swept-short'||style==='side-part',bob=style==='chin-bob',long=style==='shoulder-wave',tied=style==='low-bun'||style==='braided-tail';
 const top=style==='side-part'?1.733:1.739;
 // Six genuinely different outlines share the original smooth, swept surface language.
 surface(h,'continuous-swept-hair-shell',40,24,(u,v)=>{
  const a=u*Math.PI*2,frontal=Math.exp(-Math.pow(Math.atan2(Math.sin(a),Math.cos(a))/.88,6));
  const end=short?1.568:bob?1.447:long?1.353:1.565;
  let bottom=end+(short?.012:.016)*Math.abs(Math.sin(a));
  bottom=mix(bottom,1.637+.012*Math.sin(a+(style==='side-part'?-.7:1.1)),frontal);
  const y=mix(top,bottom,v),t=clamp((y-1.605)/(top-1.605),-2,1),wave=long?.006*Math.sin((y-1.35)*29+a*.4):0;
  let rx=y>=1.605?.101*Math.sqrt(Math.max(.0004,1-t*t)):(bob?.111:long?.112:.097)+wave;
  let rz=y>=1.605?.094*Math.sqrt(Math.max(.0004,1-t*t)):(bob?.100:long?.115:.089);
  if(y<1.605){const taper=short||tied?mix(.83,1,clamp((y-1.55)/.055,0,1)):mix(.95,1,clamp((y-end)/.18,0,1));rx*=taper;rz*=taper;}
  const flow=.0018*Math.cos(a*11+v*1.9)*Math.sin(v*Math.PI);
  return[(rx+flow)*Math.sin(a)+.008*Math.sin(v*Math.PI)*(1-v),y,-.009+(rz+flow)*Math.cos(a)];
 },C.hair);
 if(style==='side-part'){
  patch(h,'side-part-hair-fringe',(u,v)=>{const x=mix(-.085,.088,u)*(1-.35*v),edge=1.647-.025*Math.sin(u*Math.PI);const y=mix(edge,1.715,v),q=clamp((y-1.605)/(top-1.605),0,1),rx=.104*Math.sqrt(Math.max(.001,1-q*q)),rz=.097*Math.sqrt(Math.max(.001,1-q*q));return[x,y,-.009+rz*Math.sqrt(Math.max(.015,1-(x/rx)**2))+.003];},C.hair,32,16);
  ribbon(h,'hair-part-line',[[.030,1.721,.019],[.031,1.700,.051],[.032,1.674,.071],[.035,1.652,.086]],.002,C.hairMid);
 }else{
  patch(h,'side-swept-fringe',(u,v)=>{const xx=mix(-.086,.076,u),x=xx*(1-.48*v),edge=1.638+.024*u-.013*Math.sin(Math.PI*u),y=mix(edge,1.715-((x-.012)/.14)**2*.011,v),q=clamp((y-1.605)/(top-1.605),-1,1),rx=.101*Math.sqrt(Math.max(.001,1-q*q)),rz=.094*Math.sqrt(Math.max(.001,1-q*q));return[x,y,-.009+rz*Math.sqrt(Math.max(.015,1-(x/rx)**2))+.004];},C.hair,36,16);
 }
 for(const [i,x]of [-.066,-.027,.018,.057].entries()){
  const e=1.644+.016*((x+.08)/.16),pts=[[x*.4,1.715,0],[x*.82,1.69,0],[x,e+.015,0],[x+.006,e,0]].map(p=>{const q=clamp((p[1]-1.605)/(top-1.605),0,1),rx=.101*Math.sqrt(Math.max(.001,1-q*q)),rz=.094*Math.sqrt(Math.max(.001,1-q*q));p[2]=-.009+rz*Math.sqrt(Math.max(.015,1-(p[0]/rx)**2))+.0056;return p;});ribbon(h,'combed-highlight-'+i,pts,t=>.0012+Math.sin(t*Math.PI)*.0012,i%2?C.hairMid:C.hairLight);
 }
 if(bob||long)for(const side of[-1,1]){
  const end=bob?1.449:1.372;
  loft(h,'tapered-side-lock-'+side,[[end,.006,.021,side*.100,-.026],[end+.045,.018,.043,side*.101,-.019],[1.54,.021,.042,side*.092,-.015],[1.63,.013,.025,side*.080,-.006]],C.hair,{segs:16,steps:18});
  ribbon(h,'side-flow-'+side,[[side*.097,1.61,.015],[side*.112,1.53,.014],[side*.115,end+.03,.002]],.0024,C.hairMid);
 }
 // The long braid is tied up for soaking using the existing compact bun.
 // Keep the original style through the head/shell construction and saved ID.
 if(style==='low-bun'||onsenBoundBraid&&style==='braided-tail'){
  loft(h,'hair-low-bun',[[1.493,.003,.005,0,-.110],[1.505,.040,.031,0,-.123],[1.542,.057,.041,0,-.127],[1.575,.044,.037,0,-.116],[1.588,.004,.008,0,-.100]],C.hair,{segs:24,steps:18});
  for(const side of[-1,1])ribbon(h,'hair-bun-sweep-'+side,[[side*.065,1.61,-.074],[side*.064,1.563,-.097],[side*.036,1.523,-.153]],.0027,C.hairMid);
 }else if(style==='braided-tail'){
  loft(h,'hair-braided-tail',[[1.238,.006,.009,0,-.148],[1.270,.013,.015,-.009,-.149],[1.347,.020,.021,.006,-.148],[1.425,.025,.023,-.005,-.143],[1.509,.026,.026,0,-.121],[1.557,.031,.033,0,-.101]],C.hair,{segs:18,steps:24,deform:(p,a,v)=>{p[0]+=.004*Math.sin(v*39)*Math.sin(Math.PI*v);return p;}});
  for(const side of[-1,1])tube(h,'hair-braid-weave-'+side,Array.from({length:15},(_,i)=>[side*.016*Math.cos(i*1.4),1.28+i*.016,-.163-.002*Math.sin(i)]),.0025,C.hairMid,5);
  loft(h,'hair-braid-tie',[[1.265,.014,.016,-.008,-.149],[1.278,.015,.016,-.008,-.149]],C.obi,{segs:16,steps:3});
 }
}
function hand(g,s){
 loft(g,'relaxed-palm-'+s,[[.818,.007,.009,s*.317,.016],[.837,.022,.014,s*.317,.015],[.88,.026,.018,s*.31,.009],[.918,.019,.019,s*.304,.003],[.939,.021,.022,s*.3,0]],C.skin,{segs:28,steps:26});
 // Four softly grouped finger contours are attached to the palm and curve inward.
 for(let i=0;i<4;i++){const x=s*(.296+i*.012),bot=.815-(i===1?.006:0)+(i===3?.009:0);loft(g,'relaxed-finger-'+s+'-'+i,[[bot,.0035,.004,x,.019],[bot+.01,.005,.006,x,.021],[.846,.0057,.007,x,.016],[.857,.0059,.007,x,.014]],C.skin,{segs:12,steps:14});}
 tube(g,'thumb-'+s,[[s*.288,.887,.009],[s*.285,.87,.024],[s*.291,.85,.031]],.009,C.skin,10);
}
function shoe(g,s,casual){
 const x=s*.089;
 loft(g,'contoured-footwear-'+s,[[.015,.048,.105,x,.024],[.028,.053,.118,x,.027],[.048,.05,.117,x,.029],[.075,.045,.107,x,.02],[.098,.038,.067,x,-.016],[.113,.03,.043,x,-.025]],casual?C.shoe:C.sole,{segs:44,steps:24});
 loft(g,'sole-'+s,[[.008,.047,.106,x,.025],[.016,.052,.12,x,.027],[.028,.053,.118,x,.027]],0x2f3034,{segs:40,steps:8});
 if(casual)ribbon(g,'loafer-vamp-'+s,[[x-.039,.070,.062],[x,.079,.068],[x+.039,.07,.062]],.018,0x867065);
}
function buildCasual(g){
 const shirtProfile=[[.926,.165,.118,0,-.006],[.985,.165,.117,0,-.005],[1.065,.139,.082,0,0],[1.18,.16,.094,0,-.004],[1.28,.185,.087,0,-.01],[1.335,.19,.078,0,-.013],[1.374,.135,.061,0,-.005],[1.407,.049,.038,0,.002]];
 loft(g,'tailored-shirt-body',shirtProfile,C.shirt,{steps:52,segs:56});
 // Dark inset at the open collar, then fabric collar flaps with soft contour.
 patch(g,'collar-opening',(u,v)=>[mix(-.051,.052,u)*(1-v),mix(1.397,1.297,v),.048+v*.042],C.obi,16,12);
 for(const s of [-1,1]){ribbon(g,'shirt-collar-'+s,[[s*.039,1.407,.026],[s*.067,1.367,.064],[s*.043,1.302,.099]],t=>.034*(.95-.35*t),0xddd1b5);ribbon(g,'shirt-fold-'+s,[[s*.10,1.26,.088],[s*.13,1.10,.072],[s*.113,.953,.067]],.0025,0xb2a58a);}
 ribbon(g,'shirt-placket',[[0,1.307,.102],[0,1.11,.088],[0,.94,.074]],.008,0xb4a68a);
 for(let i=0;i<4;i++)patch(g,'shirt-button-'+i,(u,v)=>{const a=u*Math.PI*2,r=v*.0024;return[r*Math.cos(a),1.24-i*.075+r*Math.sin(a),i<2?.099:.084];},0x665f50,16,4);
 for(const s of [-1,1]){
  loft(g,'short-sleeve-'+s,[[1.17,.055,.060,s*.256,-.006],[1.22,.065,.068,s*.235,-.008],[1.28,.071,.074,s*.207,-.011],[1.326,.064,.07,s*.178,-.013],[1.35,.042,.052,s*.15,-.012]],C.shirt,{steps:32,segs:40});
  loft(g,'arm-'+s,[[.916,.021,.023,s*.303,0],[1.01,.03,.03,s*.297,-.002],[1.092,.039,.036,s*.28,-.006],[1.154,.039,.037,s*.266,-.005],[1.23,.045,.042,s*.247,-.006]],C.skin,{steps:38,segs:36});
  loft(g,'tailored-trouser-'+s,[[.107,.046,.046,s*.09,-.02],[.24,.054,.055,s*.09,-.018],[.47,.062,.057,s*.09,-.012],[.62,.076,.071,s*.089,-.01],[.79,.085,.079,s*.083,-.009],[.96,.081,.079,s*.075,-.013],[1.01,.075,.067,s*.07,-.015]],C.pants,{steps:54,segs:40});
  ribbon(g,'trouser-crease-'+s,[[s*.09,.15,.029],[s*.09,.48,.046],[s*.088,.71,.065],[s*.078,.9,.067]],.0025,0x425866);
  hand(g,s);shoe(g,s,true);
 }

 for(const m of g.children)if(m.isMesh&&['shirt-collar--1','shirt-collar-1','collar-opening','shirt-placket'].includes(m.name))conformFront(m,shirtProfile,m.name==='collar-opening'?.0018:.004);
}
function buildYukata(g){
 const yukataProfile=[[.118,.177,.098,0,-.006],[.15,.182,.102,0,-.004],[.29,.178,.102,0,-.004],[.52,.17,.1,0,-.005],[.78,.166,.10,0,-.006],[.96,.158,.097,0,-.004],[1.08,.137,.084,0,-.002],[1.23,.154,.089,0,-.008],[1.32,.184,.08,0,-.012],[1.365,.122,.061,0,-.004],[1.40,.047,.038,0,0]];
 loft(g,'continuous-yukata-body',yukataProfile,C.yukata,{segs:64,steps:70,deform:(p,a,v)=>{p[2]+=.003*Math.sin(a*7+.3)*Math.sin(Math.PI*v);return p;}});
 for(const s of [-1,1]){
  // Dropped shoulder and soft, hanging sleeve are continuous elliptical sections.
  loft(g,'draped-yukata-sleeve-'+s,[[.955,.052,.061,s*.302,-.004],[1.015,.073,.071,s*.291,-.008],[1.09,.086,.080,s*.267,-.011],[1.18,.079,.082,s*.228,-.012],[1.274,.067,.075,s*.202,-.013],[1.321,.058,.068,s*.17,-.012],[1.344,.034,.045,s*.145,-.01]],C.yukata,{steps:44,segs:48});
  loft(g,'wrist-'+s,[[.901,.02,.022,s*.305,0],[.959,.025,.028,s*.296,-.001],[1.017,.028,.032,s*.289,-.002]],C.skin,{steps:20,segs:28});
  ribbon(g,'sleeve-fold-'+s,[[s*.185,1.301,.072],[s*.235,1.176,.078],[s*.266,1.071,.065]],.003,0x628c89);
  hand(g,s);shoe(g,s,false);
 }
 // Left lapel over right; the garment is fully closed and full-length.
 ribbon(g,'inner-collar',[[.039,1.405,.029],[.083,1.348,.069],[0,1.216,.095],[-.076,1.124,.083]],.032,C.collar);
 ribbon(g,'outer-collar',[[ -.04,1.405,.03],[-.082,1.35,.069],[-.01,1.237,.101],[.072,1.121,.088]],.034,C.collar,.003);
 ribbon(g,'lapel-binding',[[ -.047,1.399,.032],[-.092,1.35,.071],[-.02,1.232,.105],[.064,1.122,.091]],.005,0xa7bbb0,.003);
 loft(g,'soft-wrapped-obi',[[1.011,.148,.097,0,0],[1.024,.15,.10,0,0],[1.132,.143,.096,0,0],[1.149,.138,.091,0,0]],C.obi,{steps:22,segs:56});
 loft(g,'obi-tie',[[1.064,.151,.102,0,0],[1.077,.151,.102,0,0]],0xaab4a2,{steps:6,segs:56});
 ribbon(g,'front-overlap-seam',[[.084,1.008,.09],[.064,.75,.102],[.048,.46,.107],[.023,.13,.107]],.0035,0x8aaba0);
 // Tiny original willow sprigs, sparse enough to remain calm at gameplay scale.
 for(const [x,y] of [[-.10,.39],[.099,.57],[-.07,.77]]){
  tube(g,'willow-stem',[[x-.011,y-.05,.099],[x,y,.102],[x+.018,y+.051,.095]],.0015,C.pattern,5);
  for(let k=0;k<4;k++){const yy=y-.028+k*.02,ss=k%2?-1:1;patch(g,'willow-leaf',(u,v)=>{const t=u,w=Math.sin(Math.PI*t)*.004*(v*2-1);return[x+ss*t*.022+w,yy+t*.012+w,.105];},C.pattern,12,2);}
 }

 for(const m of g.children)if(m.isMesh&&['inner-collar','outer-collar','lapel-binding','front-overlap-seam','willow-stem','willow-leaf'].includes(m.name))conformFront(m,yukataProfile,m.name==='outer-collar'?.007:m.name==='lapel-binding'?.009:.0045);
}

// Temporary, opaque one-piece swimwear. The closed torso and fitted shorts
// remain covered above and below water, without a heavy folded robe at the lap.
function buildOnsenSwimwear(g){
 const cloth=0x536e7b,trim=0xc3d9d0;
 loft(g,'onsen-swim-body',[[.922,.163,.113,0,-.008],[1.01,.158,.104,0,-.006],[1.10,.145,.087,0,-.003],[1.22,.158,.090,0,-.007],[1.31,.186,.079,0,-.013],[1.36,.139,.063,0,-.006],[1.397,.051,.039,0,.001]],cloth,{segs:40,steps:38});
 for(const s of[-1,1]){
  loft(g,'onsen-trouser-'+s,[[.558,.069,.063,s*.089,-.010],[.62,.075,.070,s*.089,-.010],[.79,.084,.078,s*.083,-.009],[.96,.083,.079,s*.075,-.013],[1.014,.075,.068,s*.07,-.012]],cloth,{segs:30,steps:28});
  loft(g,'bare-leg-onsen-'+s,[[.106,.031,.036,s*.089,-.021],[.26,.043,.045,s*.089,-.017],[.44,.052,.048,s*.089,-.013],[.57,.062,.060,s*.088,-.01]],C.skin,{segs:24,steps:28});
  loft(g,'bare-arm-onsen-'+s,[[.916,.021,.023,s*.303,0],[1.01,.030,.030,s*.297,-.002],[1.092,.039,.036,s*.28,-.006],[1.19,.045,.041,s*.254,-.006],[1.28,.052,.048,s*.204,-.01],[1.326,.048,.046,s*.173,-.011],[1.343,.031,.035,s*.151,-.01]],C.skin,{segs:24,steps:30});
  hand(g,s);
  loft(g,'footwear-bath-bare-'+s,[[.025,.001,.002,s*.089,.04],[.035,.045,.105,s*.089,.04],[.06,.050,.114,s*.089,.04],[.10,.033,.053,s*.089,-.01],[.15,.026,.034,s*.089,-.021]],C.skin,{segs:24,steps:16});
 }
 loft(g,'onsen-collar-binding',[[1.383,.065,.044,0,.001],[1.397,.052,.040,0,.001]],trim,{segs:24,steps:4});
}

function removeSurfaces(g,test){const removed=[];g.traverse(m=>{if(m.isMesh&&test(m.name))removed.push(m);});for(const m of removed){m.removeFromParent();m.geometry.dispose();}}
function shirtToBodice(g,color=C.yukata){const m=g.getObjectByName('tailored-shirt-body');if(m){m.name='fitted-court-bodice';m.material=mat(color);}}
function skirt(g,name,{hem=.26,depth=.145,waist=.14,bottom=.13,color=C.yukata,pleats=0}={}){
 const rings=[[bottom,hem,depth,0,-.008],[bottom+.04,hem*1.005,depth,0,-.008],[.37,hem*.92,depth*.96,0,-.008],[.64,hem*.79,depth*.88,0,-.008],[.88,hem*.64,depth*.78,0,-.006],[1.06,waist,.09,0,-.003],[1.10,waist*.97,.086,0,-.003]];
 loft(g,name,rings,color,{segs:36,steps:32,deform:(p,a,v)=>{const fold=pleats*Math.sin(a*16)*Math.sin(Math.PI*v);p[0]+=fold*Math.sin(a);p[2]+=fold*Math.cos(a);return p;}});
 return rings;
}
function belt(g,name,y,width,rx,color=C.obi){loft(g,name,[[y-width/2,rx,.101,0,-.001],[y+width/2,rx*.97,.096,0,-.001]],color,{segs:24,steps:5});}
// Original shrine-service kosode and vermillion hakama. This preset changes
// clothing only: the approved head, hands, wrists and body-sculpt rules are reused.
function buildMiko(g){
 const white=0xfffefa,collar=0xffffff,vermillion=0xca3b2f;
 const upper=[[1.075,.148,.096,0,-.004],[1.14,.151,.095,0,-.004],[1.24,.159,.093,0,-.008],[1.32,.184,.080,0,-.012],[1.365,.122,.061,0,-.004],[1.40,.047,.038,0,0]];
 loft(g,'miko-white-kosode-body',upper,white,{segs:36,steps:30});
 // Keep the existing skirt classification available to seated/lying contact probes.
 const lower=skirt(g,'miko-vermillion-hakama-skirt',{hem:.251,depth:.147,waist:.148,bottom:.118,color:vermillion,pleats:.0055});
 for(const side of[-1,1]){
  loft(g,'miko-wide-sleeve-'+side,[[.946,.053,.070,side*.304,-.009],[.979,.087,.090,side*.297,-.014],[1.055,.106,.098,side*.270,-.014],[1.16,.088,.092,side*.235,-.014],[1.275,.069,.075,side*.202,-.013],[1.322,.058,.068,side*.17,-.012],[1.344,.034,.045,side*.145,-.01]],white,{steps:28,segs:28});
  loft(g,'wrist-'+side,[[.901,.020,.022,side*.305,0],[.959,.025,.028,side*.296,-.001],[1.017,.028,.032,side*.289,-.002]],C.skin,{steps:20,segs:28});
  const lapel=ribbon(g,'miko-white-cross-collar-'+side,[[side*.040,1.405,.03],[side*.080,1.35,.069],[-side*.010,1.236,.101],[-side*.074,1.103,.095]],.029,collar);
  conformFront(lapel,upper,side===-1?.007:.0045);
  const edge=ribbon(g,'miko-collar-seam-'+side,[[side*.048,1.397,.03],[side*.091,1.35,.069],[-side*.002,1.235,.10],[-side*.064,1.11,.096]],.0025,0xd3cdc2);
  conformFront(edge,upper,side===-1?.009:.0065);
  // Deep straight fold lines make the divided hakama read at game distance.
  for(const [j,x]of[.040,.097,.164].entries()){
   const fold=ribbon(g,'miko-hakama-pleat-'+side+'-'+j,[[side*x*.49,1.028,.10],[side*x*.68,.80,.12],[side*x*.89,.43,.14],[side*x,.14,.15]],.005,tone(vermillion,.73));
   conformFront(fold,lower,.006);
  }
  hand(g,side);shoe(g,side,false);
 }
 loft(g,'miko-hakama-waistband',[[1.044,.160,.112,0,-.001],[1.130,.157,.108,0,-.001]],vermillion,{segs:24,steps:5});
 ribbon(g,'miko-hakama-front-tie',[[-.052,1.101,.112],[0,1.080,.119],[.052,1.100,.112]],.025,tone(vermillion,.93));
 // Tie lies clear of the band; the two modest ends remain on the skirt surface.
 for(const side of[-1,1]){const end=ribbon(g,'miko-hakama-tie-end-'+side,[[side*.014,1.084,.116],[side*.035,.996,.114],[side*.049,.91,.112]],.018,tone(vermillion,.91));conformFront(end,lower,.012);}
}
function buildJapan(g,masc,preset){
 if(preset==='miko-hakama'){buildMiko(g);return;}
 if(preset==='haori-trouser'){
  buildCasual(g);removeSurfaces(g,n=>/^short-sleeve/.test(n));const torso=g.getObjectByName('tailored-shirt-body');torso.name='haori-jacket-body';
  removeSurfaces(g,n=>/shirt-collar|shirt-placket|shirt-button|shirt-fold|collar-opening/.test(n));
  for(const side of[-1,1]){loft(g,'haori-long-sleeve-'+side,[[.998,.051,.057,side*.293,-.008],[1.12,.064,.068,side*.26,-.012],[1.29,.074,.075,side*.20,-.012],[1.338,.055,.065,side*.164,-.012]],C.yukata,{steps:24});ribbon(g,'haori-lapel-'+side,[[side*.04,1.403,.03],[side*.085,1.27,.091],[side*.079,1.10,.089],[side*.10,.944,.115]],.025,C.collar);}
  belt(g,'haori-waist-tie',1.055,.038,.153);return;
 }
 buildYukata(g);
 g.traverse(m=>{if(!m.isMesh)return;const n=m.name,p=m.geometry.attributes.position;if(n==='soft-wrapped-obi'||n==='obi-tie'){for(let i=0;i<p.count;i++){const y=p.getY(i);p.setY(i,masc?1.015+(y-1.08)*.40:y+(preset==='kimono-soft-sleeve'?.012:0));}}
 if(n.startsWith('draped-yukata-sleeve'))for(let i=0;i<p.count;i++){const y=p.getY(i),f=clamp((1.32-y)/.365,0,1);p.setZ(i,p.getZ(i)*(masc?.88:preset==='kimono-soft-sleeve'?1.16:1.04));if(!masc)p.setY(i,y-f*(preset==='kimono-soft-sleeve'?.039:.019));}
 if(masc&&n==='continuous-yukata-body')for(let i=0;i<p.count;i++)if(p.getY(i)<1.08)p.setX(i,p.getX(i)*.98);m.geometry.computeVertexNormals();});
 if(!masc){loft(g,'obi-back-bow',[[1.035,.062,.018,0,-.116],[1.07,.099,.033,0,-.122],[1.116,.064,.02,0,-.117]],C.obi,{segs:20,steps:8});}
}
function buildChina(g,masc,preset){
 if(preset==='palace-emperor-robe'){buildPalaceEmperorGarments(g,{loft,surface,ribbon,hand,shoe,conformFront,tone},C);return;}
 if(preset==='jinyi-training'){buildJinyiGarments(g,{loft,surface,ribbon,hand,shoe,conformFront,tone},C);return;}
 if(masc){
  buildJapan(g,true,'haori-trouser');removeSurfaces(g,n=>/^haori-lapel|haori-waist-tie|haori-jacket-body/.test(n));loft(g,'scholar-upper-robe',[[1.045,.156,.103,0,-.005],[1.15,.156,.098,0,-.004],[1.28,.185,.087,0,-.01],[1.335,.19,.078,0,-.013],[1.374,.135,.061,0,-.005],[1.407,.049,.038,0,.002]],C.yukata,{steps:26});
  if(preset==='scholar-long-robe'){
   removeSurfaces(g,n=>/^tailored-trouser|trouser-crease/.test(n));
   loft(g,'scholar-long-robe-body',[[.13,.194,.115,0,-.01],[.35,.186,.112,0,-.007],[.72,.167,.105,0,-.006],[.96,.163,.108,0,-.006],[1.07,.152,.10,0,-.005]],C.yukata,{steps:30});
  }else loft(g,'scholar-split-tunic-body',[[.54,.195,.122,0,-.006],[.62,.189,.119,0,-.005],[.89,.17,.116,0,-.005],[1.06,.15,.103,0,-.005]],C.yukata,{steps:24});
  for(const side of[-1,1])ribbon(g,'scholar-cross-collar-'+side,[[side*.04,1.406,.034],[side*.074,1.345,.073],[-side*.014,1.225,.096],[-side*.093,1.09,.10]],.026,C.collar);
  belt(g,'scholar-waist-sash',1.06,.047,.157);ribbon(g,'scholar-sash-end',[[.061,1.05,.11],[.078,.85,.121],[.083,.68,.126]],.028,C.obi);
 }else{
  buildYukata(g);removeSurfaces(g,n=>/continuous-yukata-body|soft-wrapped-obi|obi-tie|front-overlap|willow/.test(n));
  const skirtProfile=skirt(g,'ruqun-pleated-skirt',{hem:preset==='ruqun-jacket'?.253:.237,depth:.134,waist:.145,pleats:.003});
  const upper=[[1.10,.145,.094,0,-.003],[1.15,.143,.090,0,-.004],[1.24,.151,.088,0,-.007],[1.33,.181,.080,0,-.012],[1.37,.124,.061,0,-.004],[1.406,.047,.039,0,0]];
  loft(g,'ruqun-crossed-bodice',upper,C.yukata,{steps:30});
  if(preset==='ruqun-jacket'){loft(g,'ruqun-short-overjacket',[[.904,.186,.118,0,-.006],[1.02,.167,.111,0,-.005],[1.17,.149,.104,0,-.006]],tone(C.yukata,.84),{steps:16});}
  belt(g,'ruqun-raised-sash',1.108,.075,.149);
  ribbon(g,'ruqun-sash-ribbon',[[.05,1.11,.112],[.074,.86,.119],[.067,.60,.131]],.035,C.obi);
  for(const side of[-1,1]){const m=ribbon(g,'ruqun-hem-border-'+side,[[side*.09,.97,.08],[side*.16,.62,.09],[side*.211,.17,.10]],.012,C.pattern);conformFront(m,skirtProfile,.004);}
 }
}
function buildEgypt(g,masc,preset){
 buildCasual(g);removeSurfaces(g,n=>/tailored-shirt-body|short-sleeve|shirt-|collar-opening|tailored-trouser|trouser-crease|^arm-/.test(n));
 for(const side of[-1,1])loft(g,'bare-arm-'+side,[[.916,.021,.023,side*.303,0],[1.01,.030,.03,side*.297,-.002],[1.092,.039,.036,side*.28,-.006],[1.19,.045,.042,side*.254,-.006],[1.28,.052,.05,side*.204,-.01],[1.326,.048,.048,side*.173,-.011],[1.343,.031,.04,side*.151,-.010]],C.skin,{segs:24,steps:26});
 if(masc){
  const long=preset==='linen-tunic-kilt';
  loft(g,'linen-fitted-tunic',[[1.04,.147,.100,0,-.003],[1.10,.145,.090,0,-.003],[1.24,.17,.09,0,-.007],[1.34,.186,.074,0,-.012],[1.395,.055,.039,0,0]],C.yukata,{steps:28});
  loft(g,'linen-wrapped-kilt',[[long?.49:.57,.19,.135,0,-.003],[.64,.182,.128,0,-.003],[.83,.163,.115,0,-.003],[1.04,.146,.100,0,-.003]],C.yukata,{steps:24,deform:(p,a,v)=>{p[2]+=.003*Math.cos(a*12)*Math.sin(v*Math.PI);return p;}});
  for(const side of[-1,1]){loft(g,'bare-leg-'+side,[[.106,.032,.036,side*.089,-.020],[.26,.043,.046,side*.089,-.017],[.44,.051,.047,side*.089,-.013],[.63,.064,.064,side*.087,-.010],[.71,.068,.065,side*.086,-.009]],C.skin,{segs:20,steps:26});if(long)loft(g,'linen-short-sleeve-'+side,[[1.18,.053,.057,side*.254,-.006],[1.29,.070,.073,side*.202,-.012],[1.34,.048,.056,side*.161,-.011]],C.yukata,{steps:18});}
  ribbon(g,'kilt-wrap-overlap',[[.09,1.035,.103],[.12,.84,.118],[.047,long?.495:.575,.137]],.012,C.collar);
 }else{
  const pleated=preset==='linen-pleated-dress';
  loft(g,'linen-ankle-dress-body',[[.13,pleated?.227:.178,pleated?.132:.11,0,-.005],[.30,pleated?.216:.176,.113,0,-.004],[.58,pleated?.188:.169,.11,0,-.003],[.88,.170,.111,0,-.003],[1.085,.132,.087,0,-.001],[1.24,.159,.096,0,-.006],[1.34,.179,.075,0,-.010],[1.395,.054,.039,0,0]],C.yukata,{segs:36,steps:32,deform:(p,a,v)=>{const f=pleated?.004*Math.cos(a*18)*Math.sin(v*Math.PI):0;p[0]+=Math.sin(a)*f;p[2]+=Math.cos(a)*f;return p;}});
 }
 belt(g,'linen-woven-belt',1.045,.047,.153);
 for(let j=0;j<3;j++)surface(g,'egypt-broad-collar-'+j,24,3,(u,v)=>{const a=u*Math.PI*2,r=mix(.05+j*.029,.077+j*.029,v);return[Math.sin(a)*r,1.401-(r-.05)*.65,-.003+Math.cos(a)*r*.68];},j===1?C.pattern:C.obi);
}
function buildFrance(g,masc,preset){
 if(masc){buildCasual(g);franceCoat(g);if(preset==='court-waistcoat')removeSurfaces(g,n=>/royal-coat-tail/.test(n));
  // A continuous long coat sleeve versus a visibly cropped waistcoat/shirt cut.
  if(preset==='court-frock-coat'){removeSurfaces(g,n=>/^short-sleeve|^arm-/.test(n));for(const side of[-1,1])loft(g,'wrist-court-'+side,[[.916,.022,.023,side*.303,0],[.95,.025,.027,side*.3,-.001],[.982,.028,.03,side*.298,-.002]],C.skin,{segs:16,steps:8});}
  if(preset==='court-frock-coat')for(const side of[-1,1]){loft(g,'court-long-sleeve-'+side,[[.956,.034,.037,side*.302,-.001],[1.08,.05,.047,side*.278,-.005],[1.23,.062,.060,side*.231,-.01],[1.34,.056,.057,side*.17,-.011]],C.yukata,{steps:24});}
  else for(const side of[-1,1])ribbon(g,'waistcoat-front-panel-'+side,[[side*.041,1.385,.055],[side*.067,1.25,.101],[side*.064,1.10,.096],[side*.058,.96,.113]],.052,tone(C.yukata,.77));
  return;
 }
 buildCasual(g);removeSurfaces(g,n=>/tailored-trouser|trouser-crease|shirt-collar|shirt-placket|shirt-button|collar-opening|shirt-fold/.test(n));shirtToBodice(g);
 const over=preset==='court-overgown',rings=skirt(g,'court-full-gown-skirt',{hem:over?.294:.269,depth:over?.169:.151,waist:.135,pleats:.0025});
 const bodice=g.getObjectByName('fitted-court-bodice'),bp=bodice.geometry.attributes.position;
 for(let i=0;i<bp.count;i++){const y=bp.getY(i);if(y<1.12){bp.setX(i,bp.getX(i)*.88);if(y<1.075)bp.setY(i,1.075);}}
 for(const side of[-1,1]){
  ribbon(g,'court-square-neckline-'+side,[[side*.04,1.407,.035],[side*.10,1.36,.07],[side*.075,1.275,.091],[0,1.266,.096]],.019,C.collar);
  loft(g,'court-puffed-sleeve-'+side,[[1.16,.057,.063,side*.257,-.006],[1.23,.080,.083,side*.232,-.009],[1.30,.075,.082,side*.201,-.011],[1.342,.042,.049,side*.156,-.010]],C.yukata,{steps:20});
  const m=ribbon(g,'court-skirt-embroidered-panel-'+side,[[side*.062,1.02,.091],[side*.155,.65,.12],[side*(over?.248:.228),.16,.13]],over?.019:.009,C.obi);conformFront(m,rings,.0045);
 }
 if(over)patch(g,'court-cream-front-inset',(u,v)=>{const y=mix(.135,1.025,v),w=mix(.119,.023,v),x=mix(-w,w,u);return[x,y,frontOfLoft(rings,x,y)+.005];},C.collar,10,24);
 belt(g,'court-waist-ribbon',1.077,.038,.14);ribbon(g,'court-lace-front',[[0,1.267,.098],[0,1.18,.097],[0,1.09,.095]],.023,C.collar);
}
const BODY_SCULPT={
 'feminine-balanced':{hip:1.055,waist:.925,chest:1.0,shoulder:.90,depth:1.01},
 'feminine-slender':{hip:1.015,waist:.875,chest:.965,shoulder:.87,depth:.955},
 'masculine-lean':{hip:.947,waist:.98,chest:1.075,shoulder:.96,depth:1.01},
 'masculine-broad':{hip:1.015,waist:1.05,chest:1.125,shoulder:.99,depth:1.075}
};
// The rig and every sleeve use the same shoulder taper. Wrists and hands keep
// their authored width, while the four body presets retain distinct outlines.
export function armWidthAtHeight(y,preset){return mix(1,BODY_SCULPT[preset]?.shoulder??1,clamp((y-1.03)/.30,0,1));}
// Garment cuts retain their own room around the arm. These are centreline
// distances, never sleeve-radius scales; wide hanging sleeves need more space.
const ARM_HANG={
 fitted:[.045,.018,.028],robe:[.072,.023,.023],
 wide:[.096,.024,.020],miko:[.108,.025,.018],
 // Keep the hand sweep beside the fuller overgown skirt.
 overgown:[.055,.030,.028]
};
function unshapeHeight(y,legLength){
 const offset=.857*(legLength-1),pelvis=.965+offset;
 if(legLength===1||y<=.108||y>=1.455)return y;
 return y<=pelvis?.108+(y-.108)/legLength:(y-offset*(1+.965/.49))/(1-offset/.49);
}
export function createRelaxedArmOffset(preset,wardrobe,legLength=1){
 if(!BODY_SCULPT[preset])return null;
 const cut=wardrobe==='court-overgown'?'overgown':wardrobe==='miko-hakama'?'miko':/yukata|kimono|ruqun|bath-robe/.test(wardrobe)?'wide':/scholar|jinyi/.test(wardrobe)?'robe':'fitted';
 const [upperOut,lowerOut,forward]=ARM_HANG[cut],shoulder=[.171*armWidthAtHeight(1.326,preset),shapeHeight(1.326,legLength),-.010],elbow=[.277*armWidthAtHeight(1.099,preset),shapeHeight(1.099,legLength),-.006],wrist=[.304,shapeHeight(.926,legLength),0];
 const length=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),upper=length(shoulder,elbow),lower=length(elbow,wrist);
 // Solve in the shaped body, then map back to anatomical Y for the shared mesh
 // displacement. This preserves bone lengths even across the pelvis shape split.
 const e=[shoulder[0]+upperOut,shoulder[1]-Math.sqrt(upper*upper-upperOut**2-.004**2),elbow[2]],w=[e[0]+lowerOut,e[1]-Math.sqrt(lower*lower-lowerOut**2-forward**2),e[2]+forward];
 const elbowOffset=[e[0]-elbow[0],unshapeHeight(e[1],legLength)-1.099,e[2]-elbow[2]],wristOffset=[w[0]-wrist[0],unshapeHeight(w[1],legLength)-.926,w[2]-wrist[2]];
 return y=>{
  if(y>=1.326)return [0,0,0];
  if(y>=1.099){const t=(1.326-y)/.227;return elbowOffset.map(v=>v*t);}
  // The distal translation is rigid for palms and fingers, including thumbs.
  const t=clamp((1.099-y)/.161,0,1);return elbowOffset.map((v,i)=>mix(v,wristOffset[i],t));
 };
}
function relaxArmSurfaces(g,preset,wardrobe,legLength){
 const offsetAt=createRelaxedArmOffset(preset,wardrobe,legLength);if(!offsetAt)return;
 const handOffset=offsetAt(.926);g.userData.relaxedArms=true;
 g.traverse(m=>{if(!m.isMesh||!/sleeve|^arm-|bare-arm|wrist-|relaxed-|thumb-/.test(m.name))return;
  const p=m.geometry.attributes.position,sourceY=new Float32Array(p.count),hand=/relaxed-|thumb-/.test(m.name);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),offset=hand?handOffset:offsetAt(y);sourceY[i]=y;p.setXYZ(i,x+Math.sign(x)*offset[0],y+offset[1],p.getZ(i)+offset[2]);}
  m.geometry.setAttribute('sourceY',new THREE.BufferAttribute(sourceY,1));m.geometry.computeVertexNormals();
 });
}
function sculptBody(g,preset){
 const d=BODY_SCULPT[preset]||{hip:1,waist:1,chest:1,shoulder:1,depth:1};
 g.traverse(m=>{if(!m.isMesh||m.parent.name==='sculpted-head'||/footwear|sole-|loafer|relaxed-|thumb-/.test(m.name))return;const p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i);let factor=y<.85?mix(1,d.hip,clamp((y-.65)/.20,0,1)):y<1.075?mix(d.hip,d.waist,(y-.85)/.225):y<1.23?mix(d.waist,d.chest,(y-1.075)/.155):y<1.335?mix(d.chest,d.shoulder,(y-1.23)/.105):mix(d.shoulder,1,clamp((y-1.335)/.09,0,1));
   if(/sleeve|^arm-|bare-arm|wrist-/.test(m.name))factor=armWidthAtHeight(y,preset);
   p.setX(i,x*factor);if(y>.84&&y<1.38)p.setZ(i,p.getZ(i)*d.depth);
  }m.geometry.computeVertexNormals();
 });
}

function tone(c,f){return new THREE.Color(c).multiplyScalar(f).getHex();}
function franceCoat(g){
 const shirt=g.getObjectByName('tailored-shirt-body');if(shirt){shirt.material=mat(C.yukata);shirt.name='royal-frock-bodice';}
 for(const s of [-1,1]){
  const p=[[.56,.076,.080,s*.097,-.012],[.73,.085,.086,s*.089,-.013],[.93,.080,.09,s*.082,-.014],[1.04,.066,.078,s*.072,-.011]];
  loft(g,'royal-coat-tail-'+s,p,C.yukata,{segs:20,steps:16});
  ribbon(g,'royal-gold-facing-'+s,[[s*.041,1.393,.040],[s*.060,1.30,.100],[s*.050,1.15,.100],[s*.062,.97,.108]],.012,C.obi);
 }
 ribbon(g,'royal-cravat',[[0,1.402,.042],[0,1.345,.072],[0,1.276,.105]],t=>.027+Math.sin(t*Math.PI)*.019,C.collar);
}
function jobAccessories(g,style,culture){
 const h=g.getObjectByName('sculpted-head');
 if(style==='chef'){
  // Low cap stays inside the existing 1.95 m navigation clearance.
  loft(h,'cook-soft-cap',[[1.683,.108,.098,0,-.007],[1.713,.109,.098,0,-.007],[1.759,.083,.073,0,-.008],[1.785,.041,.038,0,-.008],[1.79,.001,.001,0,-.008]],C.collar,{segs:32,steps:20});
  loft(h,'cook-cap-band',[[1.688,.110,.100,0,-.007],[1.72,.108,.098,0,-.007]],C.collar,{segs:32,steps:5});
  patch(g,'cook-apron',(u,v)=>{const y=mix(.61,1.288,v),w=y>1.10?.098:.126;return[mix(-w,w,u),y,.116+Math.sin(v*Math.PI)*.008];},C.collar,12,24);
  ribbon(g,'apron-pocket',[[-.055,.96,.128],[0,.956,.129],[.055,.96,.128]],.050,C.pattern);
 }else if(style==='artist'){
  if(culture==='france'||!culture){loft(h,'artist-beret',[[1.702,.096,.084,0,-.013],[1.733,.116,.094,.008,-.015],[1.773,.056,.047,.017,-.019],[1.78,.003,.003,.02,-.02]],C.obi,{segs:32,steps:18});}
  ribbon(g,'artist-pocket',[[-.09,1.17,.103],[-.087,1.13,.11],[-.085,1.095,.108]],.035,C.pattern);
 }else if(style==='gardener'){
  loft(h,'garden-straw-brim',[[1.69,.103,.09,0,-.01],[1.697,.158,.127,0,-.01],[1.709,.161,.129,0,-.01],[1.718,.102,.091,0,-.01]],0xc7ac7a,{segs:40,steps:10});
  loft(h,'garden-straw-crown',[[1.704,.101,.089,0,-.01],[1.78,.085,.074,0,-.01],[1.813,.023,.022,0,-.01]],0xc7ac7a,{segs:32,steps:18});
 }
}
export function createApprovedSurfaces({culture=null,masc=false,style='casual',bodyPreset=masc?'masculine-lean':'feminine-balanced',hairStyle=masc?'swept-short':'chin-bob',wardrobePreset=null,skin=BASE.skin,hair=BASE.hair,clothes=BASE.yukata,accent=BASE.collar,eyeColor=BASE.iris,shapeTraits=null}={}){
 const normalized=normalizeShapeTraits(shapeTraits),traits=hasShapeTraits(normalized)?normalized:null;
 C={...BASE,skin:new THREE.Color(skin).getHex(),hair:new THREE.Color(hair).getHex(),yukata:new THREE.Color(clothes).getHex(),shirt:new THREE.Color(clothes).getHex(),collar:new THREE.Color(accent).getHex()};
 C.iris=new THREE.Color(eyeColor).getHex();C.skinLight=tone(C.skin,1.08);C.skinShadow=tone(C.skin,.74);C.lip=new THREE.Color(C.skin).lerp(new THREE.Color(0x8e454d),.48).getHex();C.mouth=tone(C.lip,.69);C.hairMid=tone(C.hair,1.32);C.hairLight=tone(C.hair,1.52);C.brow=tone(C.hair,.9);C.obi=culture==='egypt'?0xbd9c48:culture==='china'?0xb69b56:culture==='france'?0xa68d53:0x34495a;C.pattern=culture==='egypt'?0x4d9198:new THREE.Color(C.yukata).lerp(new THREE.Color(0xd6dfbc),.56).getHex();
 // R9 individual Egyptian dye survives both tailoring presets.
 if(culture==='egypt')C.yukata=new THREE.Color(C.yukata).lerp(new THREE.Color(0xe2d7b9),.28).getHex();
 const root=new THREE.Group();buildHead(root,masc,hairStyle,traits,culture==='japan'&&wardrobePreset==='onsen-swimwear'&&hairStyle==='braided-tail');
 // Temporary opaque ankle-length bath robe; saved cultural outfits remain untouched.
 if(culture==='japan'&&wardrobePreset==='onsen-swimwear')buildOnsenSwimwear(root);
 else if(wardrobePreset==='bath-robe'){
  buildJapan(root,masc,masc?'yukata-narrow-obi':'yukata-wide-obi');removeSurfaces(root,n=>/footwear|sole-|loafer/.test(n));
  for(const side of[-1,1])loft(root,'footwear-bath-bare-'+side,[[.025,.001,.002,side*.089,.04],[.035,.045,.105,side*.089,.04],[.06,.050,.114,side*.089,.04],[.10,.033,.053,side*.089,-.01],[.15,.026,.034,side*.089,-.021]],C.skin,{segs:24,steps:16});
 }

 else if(culture==='japan')buildJapan(root,masc,wardrobePreset||(masc?'yukata-narrow-obi':'yukata-wide-obi'));
 else if(culture==='china')buildChina(root,masc,wardrobePreset||(masc?'scholar-long-robe':'ruqun-long-skirt'));
 else if(culture==='egypt')buildEgypt(root,masc,wardrobePreset||(masc?'linen-kilt':'linen-sheath'));
 else if(culture==='france')buildFrance(root,masc,wardrobePreset||(masc?'court-frock-coat':'court-gown'));
 else buildCasual(root);
 jobAccessories(root,style,culture);applyNaturalHead(root,{hair:C.hair,hairStyle});sculptBody(root,bodyPreset);relaxArmSurfaces(root,bodyPreset,wardrobePreset,normalized.legLength);
 if(traits?.legLength!==undefined&&traits.legLength!==1)root.traverse(m=>{
  if(!m.isMesh)return;
  const p=m.geometry.attributes.position,sourceY=new Float32Array(p.count);
  // Source Y is anatomical identity for skin weights and posterior bedding
  // contact regions; do not reclassify a longer leg as a different body part.
  const footwear=/footwear|sole-|loafer/.test(m.name);
  for(let i=0;i<p.count;i++){const y=p.getY(i);sourceY[i]=m.geometry.attributes.sourceY?.getX(i)??y;if(!footwear)p.setY(i,shapeHeight(y,traits.legLength));}
  m.geometry.setAttribute('sourceY',new THREE.BufferAttribute(sourceY,1));
  // The new short cut is wholly above the fixed head anchor; preserve its
  // wrapped seam normals when a leg-length change leaves its positions fixed.
  if(!m.userData.naturalHeadSurface)m.geometry.computeVertexNormals();
 });
 root.traverse(m=>{if(m.isMesh){m.userData.softSkin=/footwear-bath-bare|continuous-head|neck|^ear-|inset-eye|iris-|pupil-|eye-catchlight|eyelid-|soft-brow|nostril-|lip|mouth|relaxed-|thumb-|wrist-|^arm-|bare-arm|bare-leg/.test(m.name);m.receiveShadow=false;m.castShadow=true;}});
 return root;
}
