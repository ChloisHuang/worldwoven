import * as G from './geometry.js?rev=R7-20261002';
const {THREE}=G;
// Original R7 furniture. No image maps, DOM calls, downloaded assets or font dependency.
// Distances are metres; +Z is the customer / front side. Each prop is origin-local.
const C={wood:0x49332b,cedar:0x875435,honey:0xbb8853,grain:0xd1a16c,ivory:0xf0e2c3,
 lacquer:0x78352d,tile:0x417f79,tileLight:0x649b8e,tileRose:0x985866,gold:0xbf9a58,
 indigo:0x344e64,cloth:0x9e4c42,clothLight:0xc27a62,water:0x6faea6,skin:0xdba787};
const shared=new Map();
function cached(key,fn){if(!shared.has(key))shared.set(key,fn());return shared.get(key);}
function part(g,geo,color,x=0,y=0,z=0,extra={}){return G.mesh(g,geo,color,x,y,z,extra);}
function sphere(g,x,y,z,r,c,sx=1,sy=1,sz=1){const small=r<.05;const m=part(g,cached(small?'grainSphere':'sphere12',()=>new THREE.SphereGeometry(1,small?6:12,small?4:7)),c,x,y,z);m.scale.set(r*sx,r*sy,r*sz);return m;}
function rod(g,a,b,r,c,n=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);const m=part(g,cached('cylinder'+n,()=>new THREE.CylinderGeometry(1,1,1,n)),c);m.position.copy(A.add(B).multiplyScalar(.5));m.scale.set(r,v.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
function tube(g,points,r,c,segments=18,radial=5,extra={}){return part(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,radial,false),c,0,0,0,extra);}
function rr(w,d,r){r=Math.min(r,w/2,d/2);const s=new THREE.Shape(),x=-w/2,y=-d/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+d-r);s.quadraticCurveTo(x+w,y+d,x+w-r,y+d);s.lineTo(x+r,y+d);s.quadraticCurveTo(x,y+d,x,y+d-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;}
function horizontalGeo(shape,h,bevel=.02){const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.001,h-2*bevel),steps:1,curveSegments:3,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1});geo.translate(0,0,-h/2+bevel);geo.rotateX(-Math.PI/2);return geo;}
function slab(g,x,y,z,w,h,d,c,r=.08,bevel=.016){return part(g,horizontalGeo(rr(w-2*bevel,d-2*bevel,r),h,bevel),c,x,y,z);}
function ring(g,x,y,z,w,d,iw,id,h,c,r=.5,ir=.3){const s=rr(w,d,r),hole=new THREE.Path(rr(iw,id,ir).getPoints(5).reverse());s.holes.push(hole);return part(g,horizontalGeo(s,h,.009),c,x,y,z);}
function lathe(g,profile,c,x=0,y=0,z=0,segments=14,extra={}){return part(g,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments),c,x,y,z,extra);}
function bounds(x,y,z,w,h,d){return {minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2};}
function kit(name){const group=new THREE.Group(),staticRoot=new THREE.Group(),dynamicRoot=new THREE.Group();group.name=name;staticRoot.name=name+' static';dynamicRoot.name=name+' animated';dynamicRoot.userData.dynamic=true;dynamicRoot.userData.noStaticBatch=true;group.add(staticRoot,dynamicRoot);return {group,staticRoot,dynamicRoot,localColliders:[],cameraBoxes:[],update(){},footprint:{}};}
function obstacle(k,x,y,z,w,h,d,camera=true){const b=bounds(x,y,z,w,h,d);k.localColliders.push(b);if(camera)k.cameraBoxes.push({...b});}
// One vertex-colour draw call per moving opaque subassembly. No InstancedMesh is
// hidden inside external static packers; original local transform pivots survive.
function compact(root){root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),meshes=[];root.traverse(o=>{if(o.isMesh&&!o.material.transparent)meshes.push(o);});if(!meshes.length)return;
 const pos=[],norm=[],col=[];for(const m of meshes){let geo=m.geometry.clone();geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld));if(geo.index)geo=geo.toNonIndexed();if(!geo.attributes.normal)geo.computeVertexNormals();pos.push(...geo.attributes.position.array);norm.push(...geo.attributes.normal.array);const color=m.material.color;for(let i=0;i<geo.attributes.position.count;i++)col.push(color.r,color.g,color.b);m.parent.remove(m);geo.dispose();}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeBoundingSphere();const material=G.material(0xffffff,{vertexColors:true});const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name='Vertex-colour moving assembly';root.add(mesh);}
function wovenStool(g,x,z,height=.66,color=C.honey){const q=new THREE.Group();g.add(q);q.position.set(x,0,z);q.name='Turned woven stool with splayed legs';
 lathe(q,[[0,height-.075],[.23,height-.075],[.295,height-.045],[.305,height],[.286,height+.035],[0,height+.035]],color);
 lathe(q,[[.23,height+.037],[.23,height+.051],[.281,height+.045],[.288,height+.026]],C.wood);
 for(let i=-5;i<=5;i++){const xx=i*.047,l=Math.sqrt(Math.max(0,.235*.235-xx*xx));rod(q,[xx,height+.047,-l],[xx,height+.047,l],.012,i%2?C.grain:0xc3a572,5);}
 for(const dx of [-1,1])for(const dz of [-1,1]){rod(q,[dx*.17,height-.065,dz*.17],[dx*.265,.035,dz*.265],.042,C.cedar,8);lathe(q,[[.035,0],[.048,.017],[.049,.04],[.036,.061]],C.wood,dx*.25,.06,dz*.25,8);}
 part(q,new THREE.TorusGeometry(.244,.022,5,16),C.cedar,0,height*.4,0).rotation.x=Math.PI/2;
 return q;}
function teacup(g,x,y,z,c=C.tile){lathe(g,[[.05,0],[.071,.015],[.075,.125],[.086,.153],[.07,.159],[.056,.125],[.053,.028],[0,.025]],c,x,y,z,12);lathe(g,[[0,.137],[.06,.137]],0x657347,x,y,z,12);}
function chopsticks(g,x,y,z,angle=.2){const q=new THREE.Group();q.position.set(x,y,z);q.rotation.y=angle;g.add(q);for(const dx of [-.026,.026])rod(q,[dx,0,-.23],[dx,.016,.23],.009,C.cedar);slab(q,0,-.017,.1,.16,.035,.045,C.ivory,.015,.006);}
function plate(g,x,y,z,r=.31,c=C.ivory){return lathe(g,[[0,.008],[r*.45,.008],[r*.49,0],[r*.68,.013],[r*.97,.061],[r,.078],[r*.94,.086],[r*.64,.048],[0,.04]],c,x,y,z,14);}
function fish(g,x,y,z,color=0xe88467){const p=new THREE.Shape();p.moveTo(-.23,-.105);p.bezierCurveTo(-.31,-.04,-.27,.08,-.2,.105);p.bezierCurveTo(.02,.13,.2,.11,.245,.065);p.bezierCurveTo(.27,-.02,.23,-.09,.14,-.115);p.closePath();part(g,horizontalGeo(p,.07,.014),color,x,y,z);for(let i=-2;i<=2;i++)tube(g,[[x+i*.068-.02,y+.052,z-.083],[x+i*.068+.022,y+.049,z],[x+i*.068+.043,y+.046,z+.077]],.007,0xf2bf98,5,4);}
function nigiri(g,x,y,z,variant=0){sphere(g,x,y+.063,z,.17,C.ivory,1.3,.47,.65);for(let i=0;i<9;i++){const a=i*2.4;sphere(g,x+Math.cos(a)*(.08+(i%2)*.085),y+.083+Math.sin(a)*.015,z+Math.sin(a)*.072,.022,0xf7edcf,1.25,.55,.65);}fish(g,x,y+.117,z,variant%2?0xc85d53:0xe68967);}
function sushiDish(variant=0){const q=new THREE.Group();q.name='Moving handmade sushi plate '+variant;plate(q,0,0,0,.30,[C.ivory,0x76a394,0xab6360][variant%3]);if(variant%3===2){for(const x of [-.115,.115]){lathe(q,[[0,0],[.09,0],[.106,.12],[.1,.17],[.082,.176],[.081,.139],[0,.139]],0x243c32,x,.071,0,12);lathe(q,[[0,.148],[.08,.148]],C.ivory,x,.071,0,12);for(let i=0;i<6;i++)sphere(q,x+Math.sin(i*2.4)*.05,.231,Math.cos(i*2.4)*.05,.024,0xe99a58);}}else{nigiri(q,0,.035,-.15,variant);nigiri(q,.015,.050,.15,variant+1);}sphere(q,.23,.098,-.02,.05,0x8d9b52,1,.75,1);for(let i=0;i<3;i++)sphere(q,-.22,.088+i*.009,-.045+i*.031,.045,0xe3aa91,1.1,.25,.7);compact(q);return q;}
function steam(g,x,y,z,seed=0,scale=1){const q=new THREE.Group();q.name='Steam rising continuously';q.position.set(x,y,z);g.add(q);const puffs=[];for(let i=0;i<4;i++){const m=part(q,cached('steamSphere',()=>new THREE.SphereGeometry(1,8,6)),0xf4ead2,0,0,0,{transparent:true,opacity:.10,depthWrite:false});m.material=m.material.clone();m.castShadow=false;m.renderOrder=20+i;puffs.push(m);}return time=>{for(let i=0;i<puffs.length;i++){const f=((time*.28+i*.25+seed)%1+1)%1;const m=puffs[i];m.material.opacity=.115*Math.sin(Math.PI*f);m.position.set(Math.sin(f*6.28+seed)*.045*scale,f*.37*scale,Math.cos(f*4+seed)*.03*scale);m.scale.setScalar((.035+f*.07)*scale);m.scale.y*=1.55;}};}
export function createConveyorSushi({width=6.4,depth=3,height=1,seating=true}={}){
 const k=kit('Handcrafted kaiten sushi island'),g=k.staticRoot,d=k.dynamicRoot;
 const w=Math.max(5.8,width),dep=Math.max(2.8,depth),r=dep/2,innerW=w-1.5,innerD=dep-1.5;
 ring(g,0,.48,0,w-.35,dep-.35,innerW,innerD,.84,C.wood,r-.18,(dep-1.5)/2);
 ring(g,0,height-.13,0,w-.15,dep-.15,innerW-.08,innerD-.08,.10,C.lacquer,r-.08,(dep-1.6)/2);
 ring(g,0,height,0,w,dep,innerW,innerD,.15,C.honey,r,innerD/2);
 ring(g,0,height+.094,0,w-.29,dep-.29,innerW+.18,innerD+.18,.035,0x334a48,r-.15,(innerD+.18)/2);
 ring(g,0,height+.12,0,w-.34,dep-.34,w-.43,dep-.43,.016,C.gold,r-.17,r-.215);
 ring(g,0,height+.12,0,innerW+.24,innerD+.24,innerW+.16,innerD+.16,.016,C.gold,(innerD+.24)/2,(innerD+.16)/2);
 // Glazed individual inset tiles and framed lower panels are readable at eye level.
 for(const side of [-1,1])for(let i=0;i<14;i++){const xx=(i-6.5)*(w-dep)/14;slab(g,xx,.57,side*(dep/2-.168),.22,.48,.035,i%6===1?C.tileRose:i%3?C.tile:C.tileLight,.025,.008);}
 for(const side of [-1,1])for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/7;const xx=side*((w-dep)/2+Math.cos(a)*(dep/2-.185)),zz=Math.sin(a)*(dep/2-.185);const panel=slab(g,xx,.57,zz,.20,.46,.04,i%4?C.tile:C.tileLight,.02,.005);panel.rotation.y=-side*a+Math.PI/2;}
 for(const side of [-1,1])rod(g,[-(w-dep)/2,.225,side*(dep/2-.16)],[(w-dep)/2,.225,side*(dep/2-.16)],.033,C.gold,8);
 // A narrow preparation ledge inside the conveyor leaves space for the chef.
 slab(g,0,.92,.22,2.25,.10,.52,C.cedar,.07,.015);slab(g,.02,1.00,.23,1.13,.055,.34,C.grain,.04,.008);
 for(const x of [-.31,.31])nigiri(g,x,1.016,.26,1);
 lathe(g,[[.12,0],[.19,.02],[.195,.22],[.17,.245],[.15,.23],[.145,.035],[0,.03]],C.honey,-.86,.98,.20,14);for(let i=0;i<5;i++)rod(g,[-.91+i*.022,1.12,.19],[-.96+i*.035,1.46,.15],.009,C.cedar);
 teacup(g,.88,.976,.23);const animateChef=()=>{};k.npcPosition=[0,0,-(dep/2+.58)];k.workTarget=[0,1.065,-dep/2];k.npcYaw=0;slab(g,0,1.028,-dep/2,1.20,.055,.32,C.grain,.04,.008);nigiri(g,-.31,1.058,-dep/2,1);nigiri(g,.31,1.073,-dep/2,0);obstacle(k,0,1.01,-dep/2,1.20,.18,.34);
 const plates=[];for(let i=0;i<10;i++){const p=sushiDish(i);d.add(p);plates.push(p);}const beltR=dep/2-.41,straight=(w-dep)/2,total=4*straight+2*Math.PI*beltR;
 function pathAt(distance){let s=((distance%total)+total)%total;if(s<2*straight)return [s-straight,beltR,Math.PI/2];s-=2*straight;if(s<Math.PI*beltR){const a=Math.PI/2-s/beltR;return [straight+Math.cos(a)*beltR,Math.sin(a)*beltR,Math.PI-a];}s-=Math.PI*beltR;if(s<2*straight)return [straight-s,-beltR,-Math.PI/2];s-=2*straight;const a=-Math.PI/2-s/beltR;return [-straight+Math.cos(a)*beltR,Math.sin(a)*beltR,Math.PI-a];}
 const seats=[];if(seating)for(let i=0;i<4;i++){const x=(i-1.5)*1.12,z=dep/2+.51;wovenStool(g,x,z);teacup(g,x,height+.10,dep/2-.10);chopsticks(g,x+.34,height+.096,dep/2-.13,.15);obstacle(k,x,.36,z,.57,.72,.57,false);seats.push([x,0,z]);}
 obstacle(k,0,height/2,0,w,height+.16,dep);k.footprint={minX:-w/2-.011,maxX:w/2+.011,minZ:-dep/2-.17,maxZ:seating?dep/2+.83:dep/2,maxY:1.53,operatingMinZ:-(dep/2+.88),customerSide:'+Z',seats,approach:[0,0,dep/2+1.4],recommendedExternalClearance:1.1};
 k.update=(_dt,time=0)=>{const t=Number.isFinite(time)?time:0;for(let i=0;i<plates.length;i++){const [x,z,a]=pathAt(t*.22+i*total/plates.length);plates[i].position.set(x,height+.129,z);plates[i].rotation.y=a;}animateChef(t);};k.animation={beltSpeed:.22,beltLength:total,beltPeriod:total/.22,chefPeriod:4,plateCount:plates.length};k.update(0,0);return k;
}
export function createRamenBowl({radius=.235,colour=0x995143}={}){const q=new THREE.Group();q.name='Hollow ceramic ramen bowl with broth noodles egg pork nori and scallions';const s=radius/.235;
 lathe(q,[[.088,0],[.10,.025],[.127,.045],[.176,.105],[.22,.195],[.233,.213],[.232,.23],[.218,.233],[.204,.211],[.169,.133],[.125,.072],[.085,.049],[0,.047]],colour,0,0,0,14);
 lathe(q,[[.204,.212],[.195,.191],[.169,.136],[.13,.082],[.084,.057],[0,.057]],C.ivory,0,0,0,14);
 lathe(q,[[.215,.221],[.232,.221],[.235,.231],[.226,.236],[.216,.229]],C.ivory,0,0,0,14);
 lathe(q,[[0,.184],[.191,.184]],0x9b662c,0,0,0,14);
 for(let i=0;i<10;i++){const a=i*.69,pts=[];for(let j=0;j<=11;j++){const t=j/11*Math.PI*2.2,rr=.059+.005*j;pts.push([Math.cos(a)*.052+Math.cos(t+a)*rr,.192+Math.sin(j*.8+i)*.009,Math.sin(a)*.04+Math.sin(t+a)*rr*.65]);}tube(q,pts,.0065,0xe8c06c,14,4);}
 // Two half eggs have a separately modeled yolk embedded in their pale centre.
 for(const x of [-.102,.03]){const egg=new THREE.Group();egg.position.set(x,.209,-.055);egg.rotation.z=x<0?.12:-.2;egg.rotation.y=.2;q.add(egg);sphere(egg,0,0,0,.065,0xf6ead1,.79,.25,1.2);sphere(egg,0,.013,-.001,.039,0xe5a03d,.78,.30,1.12);}
 for(const z of [.063,.118]){sphere(q,-.064,.205,z,.069,0xbf8265,1,.16,.72);tube(q,[[-.109,.22,z-.015],[-.067,.221,z-.03],[-.018,.22,z-.006]],.008,0xe0ab83,7,4);}
 for(const dx of [.104,.131]){const n=slab(q,dx,.259,.06,.087,.013,.16,0x304c35,.012,.004);n.rotation.x=-.85;n.rotation.z=-.15;}
 for(let i=0;i<9;i++){const x=.015+Math.cos(i*2.4)*.07,z=.056+Math.sin(i*2.4)*.047;lathe(q,[[.009,0],[.015,.005],[.014,.012],[.007,.014],[.006,.005]],i%2?0x78a05b:0xa9bc75,x,.212,z,7);}
 q.scale.setScalar(s);return q;}
export function createRamenCounter({width=4.8,height=1,seating=true}={}){const k=kit('Glazed tile ramen service counter'),g=k.staticRoot,d=k.dynamicRoot,w=Math.max(4.4,width);
 slab(g,0,.43,0,w-.12,.82,.69,C.wood,.08,.02);slab(g,0,height-.08,0,w,.18,.86,C.ivory,.075,.024);slab(g,0,height+.02,0,w-.09,.034,.75,C.cedar,.035,.009);
 for(let col=0;col<16;col++)for(let row=0;row<3;row++)slab(g,(col-7.5)*(w-.15)/16,.24+row*.225,.364,(w-.15)/16-.025,.207,.035,(col+row*2)%9===3?C.tileRose:(col+row)%3?C.tile:C.tileLight,.012,.005);
 for(const y of [.105,.895])slab(g,0,y,.388,w-.09,.047,.05,C.honey,.015,.006);for(const x of [-w/2+.09,w/2-.09])slab(g,x,.49,.389,.065,.78,.05,C.honey,.02,.006);
 // Continuous foot rail on small brass stand-offs.
 rod(g,[-w/2+.18,.22,.61],[w/2-.18,.22,.61],.027,C.gold,10);for(const x of [-w/2+.22,0,w/2-.22])rod(g,[x,.22,.38],[x,.22,.61],.024,C.gold,8);
 // Lower rear kitchen work surface, open at the chef's standing spot.
 slab(g,-w/2+.44,1.03,-.79,.70,.085,.73,C.cedar,.045,.012);slab(g,w/2-.43,1.03,-.79,.68,.085,.73,C.cedar,.045,.012);
 for(const x of [-w/2+.43,w/2-.42])for(const z of [-1.08,-.56])rod(g,[x,.08,z],[x,.99,z],.044,C.wood,8);
 // Stockpot has a hollow rolled rim, broth, handles and a floating ladle.
 const potX=-w/2+.44;lathe(g,[[.18,0],[.214,.035],[.218,.34],[.235,.35],[.237,.372],[.209,.378],[.198,.349],[.195,.052],[0,.052]],0xa9b5ab,potX,1.075,-.81,14);lathe(g,[[0,.324],[.198,.324]],0xa48242,potX,1.075,-.81,14);for(const dx of [-.29,.29]){part(g,new THREE.TorusGeometry(.066,.015,5,12),0x58695f,potX+dx,1.35,-.81).rotation.y=Math.PI/2;rod(g,[potX+dx*.71,1.32,-.81],[potX+dx,1.32,-.81],.018,0x899b92);}rod(g,[potX+.06,1.40,-.81],[potX+.16,1.78,-.82],.015,C.wood,8);lathe(g,[[0,0],[.056,.007],[.079,.044],[.074,.054],[.059,.023],[0,.018]],0xa6b0a5,potX+.06,1.40,-.81,10);
 const steamPot=steam(d,potX,1.45,-.81,.3,1.0);
 // Deep shelving endcap: thin bevelled ledges, real joinery and stacked ceramic bowls.
 const sx=w/2-.46;for(const xx of [sx-.32,sx+.32])slab(g,xx,1.47,-1.13,.07,.80,.1,C.wood,.016,.008);for(const yy of [1.1,1.49,1.87])slab(g,sx,yy,-1.08,.72,.065,.32,C.cedar,.022,.009);
 for(let i=0;i<3;i++)lathe(g,[[.055,0],[.07,.02],[.128,.095],[.14,.108],[.125,.115],[.06,.034],[0,.025]],C.ivory,sx,1.54+i*.045,-1.05,12);
 lathe(g,[[.073,0],[.085,.03],[.085,.25],[.066,.258],[.061,.04],[0,.033]],C.indigo,sx,1.145,-1.05,12);for(let i=0;i<6;i++)rod(g,[sx-.04+i*.014,1.33,-1.03],[sx-.09+i*.034,1.64,-1.01],.006,C.honey);
 const fixedBowls=[];for(const x of [-1.37,1.29]){plate(g,x,height+.043,.075,.29,C.lacquer);const b=createRamenBowl();b.position.set(x,height+.095,.08);g.add(b);fixedBowls.push([x,height+.35,.08]);chopsticks(g,x+.39,height+.06,.12,.20);teacup(g,x-.39,height+.055,.15);}
 // The serving bowl travels forward from the chef onto the customer edge and back.
 const served=createRamenBowl();served.name='Animated serving bowl';compact(served);d.add(served);const servingSteam=steam(served,0,.25,0,.7,.72);const animateChef=()=>{};k.npcPosition=[0,0,-.83];k.workTarget=[.16,1.07,-.23];k.npcYaw=0;const steamFixed=fixedBowls.map((p,i)=>steam(d,...p,i*.37,.73));
 const seats=[];if(seating)for(const x of [-1.45,0,1.45]){wovenStool(g,x,1.15,.68);obstacle(k,x,.375,1.15,.58,.75,.58,false);seats.push([x,0,1.15]);}
 obstacle(k,0,.52,0,w,1.05,.87);obstacle(k,potX,.93,-.83,.76,1.86,.78);obstacle(k,sx,.95,-.89,.78,1.90,.58);
 k.footprint={minX:-w/2,maxX:w/2,minZ:-1.24,maxZ:seating?1.46:.44,maxY:1.99,seats,customerSide:'+Z',approach:[0,0,2.03],chefFeet:[0,0,-.83],recommendedExternalClearance:1.1};
 k.update=(_dt,time=0)=>{const t=Number.isFinite(time)?time:0,phase=((t%8)+8)%8;let forward=0,lift=0;if(phase<2){forward=phase/2;lift=Math.sin(forward*Math.PI)*.055;}else if(phase<5)forward=1;else if(phase<7){forward=1-(phase-5)/2;lift=Math.sin(forward*Math.PI)*.055;}served.position.set(.16,1.045+lift,-.25+forward*.46);animateChef(t);steamPot(t);servingSteam(t);steamFixed.forEach(f=>f(t));};k.animation={servingPeriod:8,chefPeriod:4};k.update(0,0);return k;
}
function quiltPoint(angle,t,half,outer,height){const c=Math.cos(angle),s=Math.sin(angle),m=Math.max(Math.abs(c),Math.abs(s)),rr=half+(outer-half)*t;const x=c/m*rr,z=s/m*rr;const fold=Math.sin(angle*20+Math.sin(angle*4)*.8)*.048*Math.sin(Math.PI*t);const drop=t*t*(3-2*t);const knee=Math.pow(Math.max(0,Math.cos(angle*4)),16)*.095*t;return [x,Math.max(.065,height-.10-(height-.18)*drop+fold+knee),z];}
function quiltBand(g,t0,t1,half,outer,height,color,name){const p=[],ind=[],segments=80,rows=t0===0?5:1;for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++)p.push(...quiltPoint(i/segments*Math.PI*2,t0+(t1-t0)*j/rows,half,outer,height));for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+1,c=a+segments+1;ind.push(a,c,b,b,c,c+1);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ind);geo.computeVertexNormals();const m=part(g,geo,color,0,0,0,{side:THREE.DoubleSide});m.name=name;return m;}
function teaService(g,y){const tray=slab(g,0,y,0,.89,.058,.63,C.lacquer,.09,.012);tray.name='Lacquer tea tray';lathe(g,[[0,0],[.08,.01],[.145,.04],[.162,.13],[.133,.22],[.08,.245],[.04,.25]],C.tile,-.085,y+.033,0,14);lathe(g,[[0,.005],[.095,.005],[.105,.02],[.083,.045],[0,.05]],C.tile,-.085,y+.273,0,14);sphere(g,-.085,y+.334,0,.027,C.gold);tube(g,[[.035,y+.11,0],[.16,y+.17,0],[.19,y+.235,0]],.036,C.tile,10,7);tube(g,[[-.207,y+.12,0],[-.30,y+.11,0],[-.31,y+.235,0],[-.194,y+.251,0]],.019,C.wood,12,5);for(const x of [-.30,.27])teacup(g,x,y+.035,.19,C.ivory);}
function floorSeat(g,x,z,angle=0){const q=new THREE.Group();q.position.set(x,0,z);q.rotation.y=angle;g.add(q);q.name='Zabuton cushion and bentwood zaisu';slab(q,0,.033,0,.78,.055,.79,C.wood,.12,.018);slab(q,0,.102,0,.75,.10,.73,0xd4bc8e,.15,.026);slab(q,0,.151,0,.67,.018,.64,0xdfcbaa,.12,.006);for(const side of [-1,1])tube(q,[[side*.33,.08,.25],[side*.34,.075,-.27],[side*.32,.27,-.40],[side*.26,.59,-.40]],.035,C.cedar,12,6);const back=slab(q,0,.40,-.397,.58,.32,.065,C.cedar,.08,.017);back.rotation.x=-.15;for(const xx of [-.18,0,.18])slab(q,xx,.39,-.355,.038,.21,.02,C.honey,.014,.006);for(let i=0;i<15;i++){const a=i/15*Math.PI*2;const xx=Math.cos(a)/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)))*.31,zz=Math.sin(a)/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)))*.295;rod(q,[xx-.012,.163,zz],[xx+.012,.163,zz],.0045,C.cedar,4);}return q;}
export function createKotatsu({size=2.45,quiltSize=3.6,height=.70,seating=true,color=C.cloth,quiltColor=color,borderColor=null}={}){const k=kit('Square quilted kotatsu'),g=k.staticRoot,d=k.dynamicRoot,s=Math.max(1.8,size),q=Math.max(s+.7,quiltSize),half=s/2-.016,outer=q/2;
 // A proper open trestle, mortise sleeves and inset radiant heater sit underneath.
 for(const x of [-1,1])for(const z of [-1,1]){const xx=x*(s/2-.15),zz=z*(s/2-.15);slab(g,xx,.30,zz,.105,.55,.105,C.cedar,.027,.009);slab(g,xx,.12,zz,.124,.08,.124,C.wood,.024,.007);slab(g,xx,.51,zz,.137,.052,.13,C.honey,.02,.006);}
 for(const z of [-1,1])slab(g,0,.52,z*(s/2-.15),s-.25,.16,.105,C.cedar,.025,.009);for(const x of [-1,1])slab(g,x*(s/2-.15),.52,0,.105,.16,s-.25,C.cedar,.025,.009);
 slab(g,0,height-.19,0,.73,.14,.73,0x3d3731,.07,.013);slab(g,0,height-.275,0,.59,.026,.59,0x873a24,.025,.006);
 for(const x of [-.18,-.09,0,.09,.18])rod(g,[x,height-.291,-.25],[x,height-.291,.25],.015,0xe87e3e,6);for(const z of [-.25,-.12,0,.12,.25])rod(g,[-.29,height-.31,z],[.29,height-.31,z],.011,0x45423b,6);
 const border=borderColor??(quiltColor===C.cloth?C.clothLight:new THREE.Color(quiltColor).lerp(new THREE.Color(C.ivory),.28).getHex());quiltBand(g,0,.78,half,outer,height,quiltColor,'Folded continuous square quilt');quiltBand(g,.78,.91,half,outer,height,border,'Woven outer border');quiltBand(g,.91,1,half,outer,height,C.wood,'Thick dark stitched textile hem');
 // Low-relief sashiko circles track the curved textile, not planar decal boxes.
 for(let i=0;i<16;i++){const points=[];for(let j=0;j<=16;j++){const a=j/16*Math.PI*2,p=quiltPoint((i+.5)/16*Math.PI*2+Math.cos(a)*.065,.43+Math.sin(a)*.14,half,outer,height);p[1]+=.009;points.push(p);}tube(g,points,.006,0xd6a481,16,4);}
 const hem=[];for(let i=0;i<=96;i++){const p=quiltPoint(i/96*Math.PI*2,.951,half,outer,height);p[1]+=.009;hem.push(p);}tube(g,hem,.011,C.grain,96,4);
 for(let i=0;i<64;i++){const a=(i+.2)/64*Math.PI*2,p=quiltPoint(a,.90,half,outer,height),b=quiltPoint(a+.013,.91,half,outer,height);p[1]+=.01;b[1]+=.01;rod(g,p,b,.0045,C.ivory,4);}
 slab(g,0,height-.0785,0,s,.105,s,C.wood,.072,.016);slab(g,0,height-.02,0,s-.045,.04,s-.045,C.honey,.060,.014);
 // Joinery and understated grain strips give a broad pale slab, never a chunky cube.
 for(let i=-3;i<=3;i++){const x=i*s/8;rod(g,[x,height+.005,-s*.45],[x+.025,height+.005,s*.45],.0045,i%2?0xc79760:0xaa7449,4);}for(const z of [-1,1])for(const x of [-.8,.8])slab(g,x*s*.4,height-.063,z*(s/2+.005),.071,.025,.008,C.grain,.003,.002);
 teaService(g,height+.032);const seats=[];if(seating){const offset=s/2+.495;for(const [x,z,rot] of [[0,offset,Math.PI],[0,-offset,0],[offset,0,-Math.PI/2],[-offset,0,Math.PI/2]]){floorSeat(g,x,z,rot);const backX=x?Math.sign(x)*(offset+.40):0,backZ=z?Math.sign(z)*(offset+.40):0;obstacle(k,backX,.32,backZ,x?.095:.66,.64,x?.66:.095,false);seats.push([x,0,z]);}}
 obstacle(k,0,.38,0,s,.76,s);k.footprint={minX:-(seating?s/2+.96:outer),maxX:seating?s/2+.96:outer,minZ:-(seating?s/2+.96:outer),maxZ:seating?s/2+.96:outer,maxY:height+.41,tabletopSize:s,tabletopHeight:height,quiltSize:q,cushionTop:.16,seats,actorSeatOffset:s/2+.425,recommendedExternalClearance:1.1};
 k.update=()=>{};return k;
}
export function createWashSet(){const k=kit('Hinoki washing stool and open stave pail'),g=k.staticRoot;
 slab(g,0,.29,0,.58,.095,.39,C.honey,.045,.01);for(const x of [-.205,.205])slab(g,x,.145,0,.074,.27,.29,C.cedar,.025,.008);slab(g,0,.12,0,.44,.07,.063,C.honey,.016,.007);
 const bx=.48,bz=.035;lathe(g,[[0,0],[.165,0],[.185,.035],[.213,.32],[.208,.345],[.179,.344],[.172,.31],[.147,.045],[0,.045]],C.honey,bx,0,bz,14);
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;rod(g,[bx+Math.cos(a)*.176,.05,bz+Math.sin(a)*.176],[bx+Math.cos(a)*.21,.324,bz+Math.sin(a)*.21],.005,C.cedar,4);}for(const [y,r]of[[.08,.184],[.28,.206]])part(g,new THREE.TorusGeometry(r,.012,4,14),C.wood,bx,y,bz).rotation.x=Math.PI/2;
 slab(g,-.11,.355,0,.32,.044,.28,C.ivory,.037,.009);slab(g,-.11,.385,.022,.31,.025,.22,0xd6cfb0,.03,.007);for(const x of [-.23,.01])rod(g,[x,.402,-.08],[x,.402,.13],.009,C.indigo,4);
 lathe(g,[[0,0],[.04,.002],[.08,.06],[.079,.082],[.066,.081],[.056,.035],[0,.017]],C.honey,bx+.08,.356,bz,12);rod(g,[bx+.07,.405,bz],[bx-.17,.55,bz-.08],.019,C.cedar,7);
 obstacle(k,.14,.30,.025,1.17,.60,.46,false);k.footprint={minX:-.30,maxX:.73,minZ:-.23,maxZ:.25,maxY:.58,recommendedExternalClearance:.8};return k;}
export function createOnsenTub({width=3.4,depth=2.7,height=.63}={}){const k=kit('Rounded stone-rim private onsen bath'),g=k.staticRoot,d=k.dynamicRoot,w=width,dep=depth;
 slab(g,0,.08,0,w-.15,.16,dep-.15,0x536b60,.36,.018);ring(g,0,height/2,0,w,dep,w-.38,dep-.38,height-.05,0x7e8574,.43,.32);ring(g,0,height-.017,0,w+.055,dep+.055,w-.36,dep-.36,.115,0xa0a18a,.47,.34);
 const water=slab(g,0,height-.16,0,w-.41,.045,dep-.41,C.water,.29,.009);water.material=G.material(C.water,{transparent:true,opacity:.86,depthWrite:false});water.renderOrder=6;
 for(const side of [-1,1])slab(g,side*(w/2-.50),.285,0,.46,.12,dep-.63,C.cedar,.05,.009);
 for(const side of [-1,1])for(let i=0;i<6;i++)rod(g,[-w/2+.30+i*(w-.6)/5,height+.044,side*(dep/2+.012)],[-w/2+.305+i*(w-.6)/5,height+.044,side*(dep/2-.18)],.005,0x5f6b5e,4);
 // Water inlet: a curved bamboo spout, copper band and a thin falling stream.
 const x=-w/2-.10;rod(g,[x,.06,-.45],[x,.97,-.45],.07,C.cedar,10);rod(g,[x,.88,-.45],[x+.46,.73,-.45],.058,C.honey,10);lathe(g,[[.058,0],[.064,.014],[.064,.055],[.057,.068]],C.gold,x,.71,-.45,10);
 const stream=rod(d,[x+.46,.72,-.45],[x+.46,height-.135,-.45],.017,0xa5d5c4,7);stream.material=G.material(0xa5d5c4,{transparent:true,opacity:.55,depthWrite:false});stream.renderOrder=8;const mist=steam(d,0,height-.04,0,.4,1.1);
 obstacle(k,0,height/2,0,w+.07,height+.09,dep+.07);obstacle(k,x,.51,-.45,.16,1.03,.16);k.footprint={minX:-w/2-.18,maxX:w/2+.05,minZ:-dep/2-.05,maxZ:dep/2+.05,maxY:1.21,approach:[0,0,dep/2+1],recommendedExternalClearance:1.0};k.update=(_dt,t=0)=>mist(Number.isFinite(t)?t:0);return k;}
export function createChangingLockers({width=2.9,columns=4}={}){const k=kit('Joinery-framed changing lockers'),g=k.staticRoot,w=width,h=1.82,cell=w/columns;
 slab(g,0,h/2,0,w,h,.47,C.wood,.034,.011);for(const yy of [.06,.89,1.78])slab(g,0,yy,.012,w+.055,.075,.54,C.honey,.025,.008);
 for(let r=0;r<2;r++)for(let i=0;i<columns;i++){const x=(i-(columns-1)/2)*cell,y=.46+r*.84;slab(g,x,y,.249,cell-.055,.745,.058,(i+r)%3?C.cedar:C.honey,.032,.008);slab(g,x,y,.29,cell-.16,.59,.024,0x9b7048,.023,.006);for(const dx of [-.16,.16])rod(g,[x+dx,y-.26,.307],[x+dx,y+.26,.307],.004,C.grain,4);slab(g,x,y+.21,.321,.18,.08,.021,C.ivory,.01,.004);part(g,new THREE.TorusGeometry(.035,.009,4,10),C.gold,x+.16,y-.04,.34);for(const side of [-1,1])slab(g,x-cell*.40,y+side*.22,.289,.025,.066,.037,C.gold,.006,.003);}
 obstacle(k,0,h/2,.04,w+.08,h,.64);k.footprint={minX:-w/2-.05,maxX:w/2+.05,minZ:-.29,maxZ:.36,maxY:1.83,approach:[0,0,1.1],recommendedExternalClearance:1.1};return k;}
