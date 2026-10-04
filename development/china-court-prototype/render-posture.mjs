// Bounded one-actor pose witness: no palace, crowds, or game integration.
import {init,createCanvas,installDOM} from '/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const source=path.resolve('source'),out=path.resolve(process.env.OUT_DIR||'/tmp/worldwoven-court-posture');
assert(!fs.existsSync(out),'Use a fresh evidence directory');fs.mkdirSync(out,{recursive:true});
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(source+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),{createCharacter}=await import(pathToFileURL(source+'/game/characters.js'));
const {attachCourtOfficialCostume}=await import(pathToFileURL(source+'/game/china-court-official-costume.js'));
const {createCourtPosture}=await import('./posture.js');
const canvas=createCanvas(600,640),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(600,640,false);renderer.outputColorSpace=T.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
const scene=new T.Scene();scene.background=new T.Color(0xd5cbb7);
scene.add(new T.HemisphereLight(0xfff1d4,0x646e64,1.65));
const sun=new T.DirectionalLight(0xfff0d2,2.5);sun.position.set(-3,5,4);sun.castShadow=true;sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=-2;sun.shadow.camera.right=2;sun.shadow.camera.top=2;sun.shadow.camera.bottom=-2;sun.shadow.camera.near=.1;sun.shadow.camera.far=10;sun.shadow.bias=-.0004;scene.add(sun);
const floor=new T.Mesh(new T.PlaneGeometry(8,8),new T.MeshToonMaterial({color:0xb3ab96}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const actor=createCharacter({culture:'china',bodyPreset:'masculine-lean',wardrobePreset:'court-official-long-robe',skin:0xc49171,hair:0x312622,clothes:0x733c44,accent:0xc6ad74});
scene.add(actor.root);const cap=attachCourtOfficialCostume(actor),posture=createCourtPosture(actor),report={scope:'One unchanged production male official; kneeling and original two-hand tablet only',frames:[],errors:[]};
const camera=new T.PerspectiveCamera(39,600/640,.05,20),gl=renderer.getContext();
renderer.debug.onShaderError=(g,p)=>report.errors.push(g.getProgramInfoLog(p));
const chains=[['upperArmL','forearmL','handL'],['upperArmR','forearmR','handR'],['thighL','shinL','footL'],['thighR','shinR','footR']];
const lengths=()=>chains.flatMap(chain=>chain.slice(1).map(n=>actor.root.getObjectByName(n).position.length()));
const originalLengths=lengths();
function render(name,raised,cameraPosition,kneeling=1){
 actor.animate(1.7,false,null);posture.apply({kneeling,raised,time:1.7});
 const errors=lengths().map((n,i)=>Math.abs(n-originalLengths[i]));assert(Math.max(...errors)<1e-6,'Preserve exact limb bone lengths');
 camera.position.fromArray(cameraPosition);camera.lookAt(0,.68,.015);scene.updateMatrixWorld(true);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);
 fs.writeFileSync(out+'/'+name+'.png',canvas.toBuffer('image/png'));
 let minimumSkinY=Infinity;const partMin={};const point=new T.Vector3();
 actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;for(const r of m.geometry.userData.sourceRanges){let min=Infinity;for(let i=r.start;i<r.start+r.count;i++){m.getVertexPosition(i,point).applyMatrix4(m.matrixWorld);min=Math.min(min,point.y);}partMin[r.name]=min;minimumSkinY=Math.min(minimumSkinY,min);}});
 const pose=structuredClone(actor.root.userData.courtPosture),palmErrors=pose.palmContacts.map(([x,y,z],side)=>Math.hypot(x-(side?.0506:-.0506),y-(pose.tabletBase[1]+.064+(side?-.004:.004)),z-pose.tabletBase[2]));
 assert(Math.max(...palmErrors)<1e-6,'Both real palm vertices touch the tablet lower sides');assert(minimumSkinY>=0,'Pose stays above the support plane');
 report.frames.push({name,pose,maximumBoneLengthError:Math.max(...errors),maximumPalmContactError:Math.max(...palmErrors),minimumSkinY,lowestParts:Object.entries(partMin).sort((a,b)=>a[1]-b[1]).slice(0,8)});
}
if(process.env.TRANSITIONS==='1'){
 render('descending-quarter',0,[1.55,1.35,2.75],.25);render('descending-half-side',0,[2.9,1.10,.025],.55);render('rising-near-kneel',0,[1.55,1.35,2.75],.8);
}else{render('raised-threequarter',1,[1.55,1.35,2.75]);render('raised-side',1,[2.9,1.10,.025]);render('lower-threequarter',0,[1.55,1.35,2.75]);}
const bones=actor.root.getObjectByName('continuous-tailored-cloth').skeleton.bones;
const snapshot=()=>({bones:bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]),label:actor.root.userData.labelHeight,root:actor.root.position.toArray()});
const matches=expected=>{const now=snapshot();assert(now.bones.every((row,i)=>row.every((v,j)=>Math.abs(v-expected.bones[i][j])<1e-8)));assert.equal(now.label,expected.label);assert.deepEqual(now.root,expected.root);assert(!posture.tablet.visible);};
actor.animate(2,false,null);const before=snapshot();posture.apply({kneeling:.55,raised:0,time:2});posture.stop();matches(before);
actor.animate(2.1,false,null);posture.apply({kneeling:.55,raised:0,time:2.1});actor.animate(2.2,false,null);const fresh=snapshot();posture.stop();matches(fresh);
report.transitionExit='PASS: stop restores exact prior bones/label/nav anchor; stop after animate preserves fresh bones and label';
actor.animate(2,false,null);posture.apply({kneeling:0});assert(!posture.tablet.visible);assert(Math.max(...lengths().map((n,i)=>Math.abs(n-originalLengths[i])))<1e-6);
posture.dispose();cap.dispose();actor.dispose();renderer.dispose();canvas.dispose();
report.maxRSSMiB=process.resourceUsage().maxRSS/1024;report.elapsedSeconds=process.uptime();assert.equal(report.errors.length,0);assert(report.maxRSSMiB<350);assert(report.elapsedSeconds<10);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,maxRSSMiB:report.maxRSSMiB,elapsedSeconds:report.elapsedSeconds,frames:report.frames.map(({name,minimumSkinY,maximumBoneLengthError})=>({name,minimumSkinY,maximumBoneLengthError}))}));
