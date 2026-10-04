// ORIGINAL composition study, not a production court or copied game asset.
// Visual reference personally viewed: official Road to Empress II trailer,
// ~01:00.2: two kneeling groups, clear central axis, upright hu tablets.
import {init,createCanvas,installDOM} from '/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js';
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const source=path.resolve('source');registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(source+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
installDOM({fetch:false});init({api:'gles'});
const T=await import(source+'/vendor/three/build/three.module.js'),G=await import(source+'/game/geometry.js'),C=await import(source+'/game/characters.js'),A=await import(source+'/game/appearance.js'),O=await import(source+'/game/china-court-official-costume.js'),P=await import(source+'/game/china-palace-costume.js'),S=await import(source+'/game/china-royal-seating.js');
const {createCourtPosture}=await import('./posture.js');
const out='qa/china-court-prototype';fs.mkdirSync(out,{recursive:true});
const canvas=createCanvas(1440,1000),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1440,1000,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color(0xd1d6c7);scene.add(new T.HemisphereLight(0xffefda,0x687d72,1.38));const sun=new T.DirectionalLight(0xffe9c1,2.1);sun.position.set(-7,11,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:30});sun.shadow.bias=-.0002;sun.shadow.normalBias=.015;scene.add(sun);
const hall=new T.Group();scene.add(hall);G.box(hall,0,-.13,-1.5,13,.26,15,0xbab8a2);
for(let x=-6;x<=6;x+=1.5)G.box(hall,x,.008,-1.5,.018,.012,15,0x929587);for(let z=-8;z<=6;z+=1.5)G.box(hall,0,.008,z,13,.012,.018,0x929587);
G.box(hall,0,.018,1.6,2.4,.022,8.7,0x8e3a32);for(const x of[-1.13,1.13])G.box(hall,x,.033,1.6,.035,.012,8.6,0xc3a159);
// Raised throne, clear steps and a solid painted backdrop create a coherent
// miniature hall. The existing throne/imperial actor are used once only.
G.box(hall,0,.25,-6.25,7,.5,3.5,0x9a9480);
for(const[i,z]of[-4.05,-4.43,-4.81].entries())G.box(hall,0,(i+1)*.083,z,5.1,(i+1)*.166,.75,0xb3ad95);
G.box(hall,0,2.72,-8.04,8.3,5.44,.3,0x584133);G.box(hall,0,2.7,-7.84,6.8,4.6,.11,0x345b58);
for(const x of[-3.45,3.45])G.box(hall,x,2.7,-7.73,.08,4.6,.08,0xd3ad65);for(const y of[.43,4.98])G.box(hall,0,y,-7.73,7,.075,.08,0xd3ad65);
for(const y of[1.65,2.6,3.55])for(const side of[-1,1]){const p=[[-.72,-.18],[-.25,-.18],[-.42,.06],[-.23,.30],[.02,.27],[.12,.02],[.39,.14],[.62,-.01],[.44,-.18],[.89,-.18]].map(([x,z])=>new T.Vector3(side*(x+.82),y+z,-7.65));G.mesh(hall,new T.TubeGeometry(new T.CatmullRomCurve3(p),32,.022,6,false),0xc3a562);}
for(const x of[-5.8,5.8])for(const z of[-7.25,-2.25,3.25]){G.cyl(hall,x,2.36,z,.19,.23,4.72,0x963c31,12);G.cyl(hall,x,.19,z,.31,.31,.38,0xa3a28e,12);G.cyl(hall,x,4.48,z,.25,.25,.13,0xc4a261,12);}
for(const z of[-7.25,-2.25,3.25]){G.box(hall,0,4.7,z,12.2,.33,.33,0x684132);G.box(hall,0,4.7,z+.19,11.7,.18,.025,0x2d6664);}
for(const x of[-6.15,6.15]){G.box(hall,x,2.3,-2.2,.15,4.6,10.9,0xc8c6b0);for(const z of[-5.4,-.4,3.2]){G.box(hall,x+(x<0?.09:-.09),2.65,z,.025,2.6,2.3,0xdce0c7);for(let zz=z-1;zz<z+1.01;zz+=.24)G.box(hall,x+(x<0?.12:-.12),2.65,zz,.03,2.65,.045,0x615243);}}
const throne=S.buildChinaDragonThrone(hall,{x:0,y:.5,z:-6.5}),foot=S.buildChinaThroneFootrest(hall,{x:0,y:.5,z:-6.4});
const emperor=C.createCharacter({...A.npcRoleAppearance('china','cn-emperor',42),culture:'china',scale:.96});emperor.station={id:'cn-emperor',royalRole:'emperor'};emperor.root.position.set(0,1.349,-6.5);scene.add(emperor.root);const emperorCostume=P.attachPalaceCostume(emperor);emperor.animate(0,false,'chair-sit',{groundHeightAt:()=>1.349,seatHeight:1.99-1.349,visualFloorOffset:0});
const roster=['cn-minister-works','cn-minister-granary','court-study-clerk-chen','court-study-clerk-zhao','court-study-clerk-song','court-study-clerk-li'];
const actors=roster.map((id,i)=>{const look=A.npcAppearance('china',id,42),a=C.createCharacter({...look,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'court-official-long-robe',clothes:[0x526e7b,0x814b45,0x735049,0x496777,0x765146,0x526c76][i],accent:0xb49c65,culture:'china',scale:.96});a.station={id,courtRole:'composition-study'};const side=i%2?1:-1,row=Math.floor(i/2);a.root.position.set(side*2.35,0,-2.1+row*1.75);a.root.rotation.y=Math.PI;scene.add(a.root);a.costume=O.attachCourtOfficialCostume(a);a.posture=createCourtPosture(a);a.animate(i*.41,false,null,{groundHeightAt:()=>0});a.posture.apply({kneeling:1,raised:i===0?1:.32+.10*(i%3),time:3+i*.67});return a;});
// A normal 4.6m player-orbit camera, with the observer at the front-right aisle.
// No top-down miniature projection; the nearest kneeling people stay legible.
const camera=new T.PerspectiveCamera(50,1440/1000,.08,45),observer=new T.Vector3(-2.4,1.45,3.8),yaw=-.32,pitch=.32,dist=4.6;camera.position.set(observer.x+Math.sin(yaw)*Math.cos(pitch)*dist,observer.y+Math.sin(pitch)*dist,observer.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(observer);
scene.updateMatrixWorld(true);scene.traverse(o=>o.isSkinnedMesh&&o.skeleton.update());renderer.render(scene,camera);renderer.getContext().finish();fs.writeFileSync(out+'/whole-court-design.png',canvas.toBuffer('image/png'));
const report={scope:'Unwired design study,6 illustrative officials and the one existing emperor; actual production bodies/wardrobes, original platform/hall/hu; no production-life completion claimed',camera:camera.position.toArray(),target:observer.toArray(),orbitDistance:dist,officials:actors.map(a=>({id:a.station.id,position:a.root.position.toArray(),pose:a.root.userData.courtPosture||null})),maxRSSMiB:process.resourceUsage().maxRSS/1024};fs.writeFileSync(out+'/composition.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
for(const a of actors){a.posture.dispose();a.costume.dispose();a.dispose();}emperorCostume.dispose();emperor.dispose();renderer.dispose();canvas.dispose();
