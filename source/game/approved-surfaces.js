/** Approved R8 parametric sculpt, reduced and adapted for R9 skeletal production.
 * World units are metres; Y up, face +Z. All visible body, face, hair and clothes
 * surfaces are authored parametric meshes. The only material is MeshToonMaterial.
 * Runtime dependency: Three.js 0.186.1. No textures, licensed meshes or PBR.
 */
import * as THREE from 'three';
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
function headSurface(x,y,masc=false){
 const rs=[[1.455,.012,.021,0,.004],[1.468,masc?.044:.037,.052,0,.002],[1.49,masc?.071:.062,.067,0,0],[1.525,.079,.073,0,-.002],[1.57,.088,.075,0,-.003],[1.62,.087,.077,0,-.004],[1.663,.072,.065,0,-.006],[1.692,.044,.042,0,-.008],[1.707,.001,.001,0,-.008]];
 let low=0,high=rs.length-1;
 for(let i=0;i<24;i++){const mid=(low+high)/2;if(spline(rs,mid)[0]<y)low=mid;else high=mid;}
 const r=spline(rs,(low+high)/2),c=Math.sqrt(Math.max(0,1-(x/r[1])**2));
 return r[4]+r[2]*c+faceD(x,y)*Math.pow(c,8);
}
function faceD(x,y){const G=(cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2);return .006*(G(-.045,1.545,.028,.027)+G(.045,1.545,.028,.027))-.0055*(G(-.040,1.589,.027,.012)+G(.040,1.589,.027,.012))+.009*G(0,1.568,.013,.039)+.016*G(0,1.548,.017,.015)+.003*G(0,1.539,.019,.009)+.007*G(0,1.508,.023,.012);}
function buildHead(g,masc=false){
 const facialSurface=(x,y)=>headSurface(x,y,masc);
 const h=new THREE.Group();h.name='sculpted-head';g.add(h);
 const rings=[[1.455,.012,.021,0,.004],[1.468,masc?.044:.037,.052,0,.002],[1.49,masc?.071:.062,.067,0,0],[1.525,.079,.073,0,-.002],[1.57,.088,.075,0,-.003],[1.62,.087,.077,0,-.004],[1.663,.072,.065,0,-.006],[1.692,.044,.042,0,-.008],[1.707,.001,.001,0,-.008]];
 loft(h,'continuous-head-jaw-cheeks-nose',rings,C.skin,{segs:64,steps:44,deform:(p,a)=>{const front=Math.pow(Math.max(0,Math.cos(a)),8);p[2]+=faceD(p[0],p[1])*front;return p;}});
 loft(g,'neck',[[1.335,.046,.039,0,-.008],[1.37,.038,.035,0,0],[1.414,.033,.033,0,.004],[1.461,.036,.036,0,.003],[1.48,.037,.04,0,.002]],C.skin,{steps:24});
 for(const s of [-1,1]){
  // Folded ear bowl is one tailored surface, nested against the skull.
  loft(h,'ear-pinna-'+s,[[1.532,.005,.006,s*.086,-.004],[1.545,.012,.012,s*.091,-.001],[1.567,.013,.014,s*.091,-.006],[1.584,.008,.01,s*.09,-.009],[1.588,.001,.003,s*.088,-.008]],C.skin,{segs:24,steps:20});
  tube(h,'ear-fold-'+s,[[s*.099,1.574,.003],[s*.103,1.567,.007],[s*.10,1.55,.008]],.0023,C.skinShadow);
  const cx=s*(masc?.040:.038),cy=1.59,hw=masc?.022:.0215,upper=masc?.0072:.009,lower=masc?.0055:.0062;
  // Thin almond surfaces remain flush with the face, no external eyeballs.
  patch(h,'inset-eye-white-'+s,(u,v)=>{const x=cx+(u*2-1)*hw;const y=cy+Math.sin(u*Math.PI)*mix(-lower,upper,v)+s*(x-cx)*.08;return[x,y,facialSurface(x,y)+.0018];},C.eye,32,12);
  patch(h,'iris-'+s,(u,v)=>{const a=u*Math.PI*2,r=v*.0058,x=cx+Math.cos(a)*r,y=cy+.0008+Math.sin(a)*r;return[x,y,facialSurface(x,y)+.0032];},C.iris,32,8);
  patch(h,'pupil-'+s,(u,v)=>{const a=u*Math.PI*2,r=v*.0028,x=cx+Math.cos(a)*r,y=cy+.0008+Math.sin(a)*r;return[x,y,facialSurface(x,y)+.0038];},C.pupil,24,6);
  patch(h,'eye-catchlight-'+s,(u,v)=>{const a=u*Math.PI*2,r=v*.0013,x=cx-.0016+Math.cos(a)*r,y=cy+.0031+Math.sin(a)*r;return[x,y,facialSurface(x,y)+.0042];},0xfff7e5,16,4);
  for(const [part,hh,color,rad] of [['upper',upper,C.brow,.00165],['lower',-lower,C.skinShadow,.001]]){
   const pts=[];for(let i=0;i<=16;i++){const u=i/16,x=cx+(u*2-1)*hw,y=cy+Math.sin(u*Math.PI)*hh+s*(x-cx)*.08;pts.push([x,y,facialSurface(x,y)+.0028]);}tube(h,'eyelid-'+part+'-'+s,pts,rad,color,6);
  }
  const brows=[];for(let i=0;i<=12;i++){const u=i/12,x=cx+(u*2-1)*(masc?.026:.024),y=1.609+(masc?.0025:.0048)*Math.sin(u*Math.PI)+s*(x-cx)*.09;brows.push([x,y,facialSurface(x,y)+.0023]);}ribbon(h,'soft-brow-'+s,brows,t=>(masc?.0042:.0030)*Math.sin(Math.PI*(.08+.84*t)),C.brow);
  tube(h,'nostril-'+s,[[s*.007,1.54,facialSurface(s*.007,1.54)+.001],[s*.01,1.539,facialSurface(s*.01,1.539)+.001],[s*.014,1.54,facialSurface(s*.014,1.54)+.001]],.0011,C.skinShadow,6);
 }
 const lipW=masc?.022:.023;
 for(const upper of [true,false])patch(h,upper?'upper-lip':'lower-lip',(u,v)=>{const x=(u*2-1)*lipW;const f=Math.sin(u*Math.PI);const seam=1.512-.0025*f+.0008*Math.cos(u*4*Math.PI);const y=seam+(upper?1:-1)*f*(upper?.0033:.0038)*v;return[x,y,facialSurface(x,y)+.0015+.0018*Math.sin(v*Math.PI)];},C.lip,32,6);
 const mouth=[];for(let i=0;i<=24;i++){const u=i/24,x=(u*2-1)*lipW,y=1.512-.0025*Math.sin(u*Math.PI)+.0008*Math.cos(u*4*Math.PI);mouth.push([x,y,facialSurface(x,y)+.002]);}tube(h,'closed-soft-mouth',mouth,.00075,C.mouth,5);
 buildHair(h,masc);return h;
}
function buildHair(h,masc){
 const top=masc?1.733:1.741;
 // Single swept shell: a designed hairline and a continuous nape/back silhouette.
 surface(h,'continuous-swept-hair-shell',64,28,(u,v)=>{
  const a=u*Math.PI*2,front=Math.max(0,Math.cos(a)),back=Math.max(0,-Math.cos(a));
  let bottom=masc?(1.577-.028*Math.abs(Math.sin(a))):(1.350+.016*Math.abs(Math.sin(a))+.008*Math.cos(a*3));
  const frontal=Math.exp(-Math.pow(Math.atan2(Math.sin(a),Math.cos(a))/.91,6));
  bottom=mix(bottom,1.636+.014*Math.sin(a+1.1),frontal);
  const y=mix(top,bottom,v),t=clamp((y-1.605)/(top-1.605),-2,1);
  let rx,rz;if(y>=1.605){rx=.101*Math.sqrt(Math.max(0.0004,1-t*t));rz=.092*Math.sqrt(Math.max(.0004,1-t*t));}else{rx=(masc?.1:.100)+(masc?0:.007)*Math.sin((1.605-y)*9);rz=(masc?.086:.092)+(masc?0:.004)*Math.sin((1.605-y)*8);}
  if(y<1.605){const taper=masc?mix(.86,1,clamp((y-1.55)/.055,0,1)):mix(.89,1,clamp((y-1.35)/.255,0,1));rx*=taper;rz*=taper;}
  const flow=.0018*Math.cos(a*11+v*1.9)*Math.sin(v*Math.PI);
  return[(rx+flow)*Math.sin(a)+.011*Math.sin(v*Math.PI)*(1-v),y, -.009+(rz+flow)*Math.cos(a)];
 },C.hair);
 // Asymmetric side-sweep is a thin, flowing sheet with a feathered boundary.
 patch(h,'side-swept-fringe',(u,v)=>{const xx=mix(-.086,.076,u),x=xx*(1-.48*v),edge=1.638+.024*u-.013*Math.sin(Math.PI*u);const y=mix(edge,1.715-((x-.012)/.14)**2*.011,v);const sy=clamp((y-1.605)/(top-1.605),-1,1),rx=.101*Math.sqrt(Math.max(.001,1-sy*sy)),rz=.092*Math.sqrt(Math.max(.001,1-sy*sy));const z=-.009+rz*Math.sqrt(Math.max(.015,1-(x/rx)**2))+.004;return[x,y,z];},C.hair,48,18);
 // Sparse broad ribbons follow hair flow. No stacked lumps or sphere clusters.
 const flowLines=masc?[-.06,-.025,.017,.052]:[-.08,-.04,.008,.05,.082];
 flowLines.forEach((x,i)=>{const e=1.64+.02*((x+.087)/.162),points=[[x*.4,1.715,0],[x*.82,1.69,0],[x,e+.02,0],[x+.006,e,0]].map(p=>{const q=clamp((p[1]-1.605)/(top-1.605),0,1),rx=.101*Math.sqrt(Math.max(.001,1-q*q)),rz=.092*Math.sqrt(Math.max(.001,1-q*q));p[2]=-.009+rz*Math.sqrt(Math.max(.015,1-(p[0]/rx)**2))+.0056;return p;});ribbon(h,'combed-highlight-'+i,points,t=>(.0012+Math.sin(t*Math.PI)*.0012),i%2?C.hairMid:C.hairLight);});
 if(!masc)for(const s of [-1,1]){
  // Long side locks taper into the bob rather than separate hair balls.
  loft(h,'tapered-side-lock-'+s,[[1.36,.014,.035,s*.082,-.018],[1.41,.025,.049,s*.09,-.016],[1.49,.022,.047,s*.088,-.014],[1.57,.020,.039,s*.087,-.015],[1.64,.012,.024,s*.079,-.006]],C.hair,{segs:28,steps:34});
  ribbon(h,'side-flow-'+s,[[s*.099,1.62,.013],[s*.108,1.54,.02],[s*.112,1.45,.011],[s*.093,1.379,.005]],.0024,C.hairMid);
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

function tone(c,f){return new THREE.Color(c).multiplyScalar(f).getHex();}
function adaptYukata(g,culture,masc){
 if(culture==='japan') return;
 const remove=[];
 g.traverse(m=>{if(!m.isMesh)return;const n=m.name;
 if(culture==='china'){
  if(n==='continuous-yukata-body'){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<1.01)p.setX(i,p.getX(i)*(1+.2*(1-y)));}}
  if(n==='soft-wrapped-obi'||n==='obi-tie'){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,1.065+(p.getY(i)-1.08)*.50);}
  if(n.includes('willow-'))remove.push(m);
 }else if(culture==='egypt'){
  if(n.includes('collar')||n.includes('binding')||n.includes('willow')||n.includes('sleeve-fold'))remove.push(m);
  if(n.startsWith('draped-yukata-sleeve'))remove.push(m);
  if(n==='continuous-yukata-body'){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<.98){p.setX(i,p.getX(i)*(1+.12*(1-y)));p.setZ(i,p.getZ(i)+.004*Math.sin(p.getX(i)*95));}}}
  if(n==='soft-wrapped-obi'||n==='obi-tie'){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,1.03+(p.getY(i)-1.08)*.44);}
 }else if(culture==='france'){
  if(n.includes('collar')||n.includes('binding')||n.includes('willow')||n.includes('front-overlap'))remove.push(m);
  if(n==='continuous-yukata-body'){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<1.04){const f=1+.70*(1-y);p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*(1+.43*(1-y)));}}}
  if(n==='soft-wrapped-obi'||n==='obi-tie'){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,1.06+(p.getY(i)-1.08)*.40);}
 }
 m.geometry.computeVertexNormals();
 });
 for(const m of remove){m.removeFromParent();m.geometry.dispose();}
 if(culture==='china'){
  ribbon(g,'palace-sash',[[.055,1.05,.107],[.072,.85,.114],[.096,.63,.125]],.038,C.obi);
  for(const s of [-1,1]) ribbon(g,'palace-hem-border-'+s,[[s*.15,.96,.057],[s*.18,.53,.060],[s*.203,.14,.064]],.014,C.pattern);
  const h=g.getObjectByName('sculpted-head');tube(h,'palace-hairpin',[[-.13,1.687,-.022],[.13,1.687,-.022]],.0055,C.obi,8);
  loft(h,'palace-jade-ornament',[[1.676,.010,.007,.138,-.022],[1.689,.014,.010,.138,-.022],[1.701,.006,.004,.138,-.022]],C.pattern,{segs:12,steps:8});
 }else if(culture==='egypt'){
  for(const s of [-1,1]){
   loft(g,'linen-short-sleeve-'+s,[[1.20,.053,.060,s*.251,-.006],[1.27,.067,.072,s*.213,-.010],[1.33,.058,.065,s*.174,-.012]],C.yukata,{segs:24,steps:18});
   loft(g,'bare-arm-'+s,[[.916,.021,.023,s*.303,0],[1.01,.03,.03,s*.297,-.002],[1.092,.039,.036,s*.28,-.006],[1.154,.039,.037,s*.266,-.005],[1.23,.045,.042,s*.247,-.006]],C.skin,{steps:24,segs:24});
  }
  for(let j=0;j<3;j++) surface(g,'egypt-broad-collar-'+j,40,4,(u,v)=>{const a=u*Math.PI*2,r=mix(.050+j*.033,.080+j*.033,v);return[Math.sin(a)*r,1.40-r*.67,Math.cos(a)*r*.69+.008+Math.max(0,Math.cos(a))*.055];},j%2?C.obi:C.pattern);
  ribbon(g,'linen-front-panel',[[0,1.0,.111],[0,.70,.117],[0,.35,.12]],.10,C.collar);
  for(const s of [-1,1])ribbon(g,'linen-front-border-'+s,[[s*.048,1.0,.117],[s*.048,.70,.123],[s*.048,.35,.126]],.008,C.obi);
 }else if(culture==='france'){
  // Closed palace day gown, softly flared hem and shaped lace neckline.
  for(const s of [-1,1])ribbon(g,'royal-lace-neckline-'+s,[[s*.04,1.397,.032],[s*.084,1.35,.069],[s*.072,1.30,.087],[0,1.28,.094]],.028,C.collar);
  for(let i=0;i<4;i++)loft(g,'royal-bodice-button-'+i,[[1.125+i*.037,.003,.003,0,.094],[1.13+i*.037,.005,.004,0,.096],[1.135+i*.037,.003,.003,0,.094]],C.obi,{steps:4,segs:8});
  for(const s of [-1,1])ribbon(g,'royal-embroidered-skirt-'+s,[[s*.105,1.0,.084],[s*.18,.62,.105],[s*.265,.17,.125]],.008,C.obi);
 }
}
function franceCoat(g){
 const shirt=g.getObjectByName('tailored-shirt-body');if(shirt){shirt.material=mat(C.yukata);shirt.name='royal-frock-bodice';}
 for(const s of [-1,1]){
  const p=[[.56,.076,.080,s*.097,-.012],[.73,.085,.086,s*.089,-.013],[.93,.080,.09,s*.082,-.014],[1.04,.066,.078,s*.072,-.011]];
  loft(g,'royal-coat-tail-'+s,p,C.yukata,{segs:24,steps:24});
  ribbon(g,'royal-gold-facing-'+s,[[s*.041,1.393,.040],[s*.060,1.30,.100],[s*.050,1.15,.100],[s*.062,.97,.108]],.012,C.obi);
 }
 ribbon(g,'royal-cravat',[[0,1.402,.042],[0,1.345,.072],[0,1.276,.105]],t=>.027+Math.sin(t*Math.PI)*.019,C.collar);
}
function jobAccessories(g,style,culture){
 const h=g.getObjectByName('sculpted-head');
 if(style==='chef'){
  // Low cap stays inside the existing 1.95 m navigation clearance.
  loft(h,'cook-soft-cap',[[1.683,.096,.083,0,-.007],[1.713,.099,.086,0,-.007],[1.759,.083,.073,0,-.008],[1.785,.041,.038,0,-.008],[1.79,.001,.001,0,-.008]],C.collar,{segs:32,steps:20});
  loft(h,'cook-cap-band',[[1.688,.099,.086,0,-.007],[1.72,.098,.086,0,-.007]],C.collar,{segs:32,steps:5});
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
export function createApprovedSurfaces({culture=null,masc=false,style='casual',skin=BASE.skin,hair=BASE.hair,clothes=BASE.yukata,accent=BASE.collar,eyeColor=BASE.iris}={}){
 C={...BASE,skin:new THREE.Color(skin).getHex(),hair:new THREE.Color(hair).getHex(),yukata:new THREE.Color(clothes).getHex(),shirt:new THREE.Color(clothes).getHex(),collar:new THREE.Color(accent).getHex()};
 C.iris=new THREE.Color(eyeColor).getHex();C.skinLight=tone(C.skin,1.08);C.skinShadow=tone(C.skin,.74);C.lip=new THREE.Color(C.skin).lerp(new THREE.Color(0x8e454d),.48).getHex();C.mouth=tone(C.lip,.69);C.hairMid=tone(C.hair,1.32);C.hairLight=tone(C.hair,1.52);C.brow=tone(C.hair,.9);C.obi=culture==='egypt'?0xbd9c48:culture==='china'?0xb69b56:culture==='france'?0xa68d53:0x34495a;C.pattern=culture==='egypt'?0x4d9198:new THREE.Color(C.yukata).lerp(new THREE.Color(0xd6dfbc),.56).getHex();
 if(culture==='egypt')C.yukata=new THREE.Color(C.yukata).lerp(new THREE.Color(0xe2d7b9),.28).getHex();
 const root=new THREE.Group();buildHead(root,masc);
 if(!culture){buildCasual(root);}else if(culture==='france'&&masc){buildCasual(root);franceCoat(root);}else{buildYukata(root);adaptYukata(root,culture,masc);}
 jobAccessories(root,style,culture);
 root.traverse(m=>{if(m.isMesh){m.userData.softSkin=/continuous-head|neck|^ear-|inset-eye|iris-|pupil-|eye-catchlight|eyelid-|soft-brow|nostril-|lip|mouth|relaxed-|thumb-|wrist-|^arm-|bare-arm/.test(m.name);m.receiveShadow=false;m.castShadow=true;}});
 return root;
}
