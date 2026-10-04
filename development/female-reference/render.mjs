import {registerHooks} from 'node:module';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),OUT=path.resolve(process.env.OUT_DIR||ROOT+'/qa/female-reference/first');
const assetRef=process.env.ASSET_REF;let comparedAssetUrl;
if(assetRef){assert.match(assetRef,/^[a-f0-9]{7,40}$/);const code=execFileSync('git',['show',assetRef+':source/game/complete-adult/assets/adult-forms-data.js'],{cwd:ROOT,maxBuffer:4e6}).toString();comparedAssetUrl='data:text/javascript;base64,'+Buffer.from(code).toString('base64');}
registerHooks({resolve(s,c,next){if(comparedAssetUrl&&s.endsWith('/assets/adult-forms-data.js'))return{url:comparedAssetUrl,shortCircuit:true};if(s==='three')return{url:pathToFileURL(ROOT+'/source/vendor/three/build/three.module.js').href,shortCircuit:true};return next(s,c);}});
const {init,createCanvas,installDOM}=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');installDOM({fetch:false});init({api:'gles'});
const T=await import('three'),C=await import('../../source/game/characters.js'),{installActorPreview}=await import('../../source/game/complete-adult/selection.js'),{shapePreferenceScore}=await import('../../source/game/character-traits.js');installActorPreview({femaleHair:process.env.HAIR||'gathered-updo'});
const canvas=createCanvas(640,640),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
const scene=new T.Scene();scene.background=new T.Color(0xd9ddcf);const hemi=new T.HemisphereLight(0xfff4df,0x718079,1.05),sun=new T.DirectionalLight(0xfff3dc,1.55),fill=new T.DirectionalLight(0xb7c6d5,.22);sun.position.set(-2,3,4);fill.position.set(3,2,-2);scene.add(hemi,sun,fill);
fs.mkdirSync(OUT,{recursive:true});const frames=[],gl=renderer.getContext();
const high={jawWidth:.868,legLength:1.048,eyeSize:1.162,noseSize:.838,noseWidth:.838,socketDepth:1.55,noseBridgeHeight:1.16,noseTipSize:.84};
const base={culture:'france',bodyPreset:'feminine-balanced',wardrobePreset:'court-overgown',hairStyle:'low-bun',skin:0x744d33,hair:0x34271f,clothes:0x767878,accent:0xc6ab67,eyeColor:0x4b3324};
if(process.env.CLAY==='1')Object.assign(base,{skin:0xb0aaa1,hair:0x383532,eyeColor:0x535353});
const cases=process.env.CASES?.split(',')||['neutral'];
function save(actor,camera,name,w=640,h=640){renderer.setSize(w,h,false);actor.root.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);fs.writeFileSync(OUT+'/'+name+'.png',canvas.toBuffer('image/png'));const landmarks={};const skinTargets={columella:[0,6.8268,1.6033],noseBase:[0,6.8053,1.5732],upperLipBow:[0,6.696,1.5973],lipContact:[0,6.6081,1.553],lowerLip:[0,6.5563,1.5657],lowerLipEdge:[0,6.4885,1.5565],sublabial:[0,6.4583,1.5032],chinFront:[0,6.3268,1.499],chinRound:[0,6.2006,1.4344],chinReturn:[0,6.1588,1.2949]};
 actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh||!mesh.geometry.attributes.featureCoord)return;const g=mesh.geometry,fc=g.attributes.featureCoord,kind=g.attributes.featureKind;
  const project=i=>{const p=new T.Vector3();mesh.getVertexPosition(i,p);p.applyMatrix4(mesh.matrixWorld).project(camera);return[(p.x+1)*w/2,(1-p.y)*h/2];};
  for(const range of g.userData.sourceRanges??[])if(range.name.startsWith('pupil-anatomical'))landmarks[range.name]=project(range.start);
  for(const[label,at]of Object.entries(skinTargets)){let best=-1,distance=Infinity;for(let i=0;i<fc.count;i++){if(kind.getX(i)!==1)continue;const d=(fc.getX(i)-at[0])**2+(fc.getY(i)-at[1])**2+(fc.getZ(i)-at[2])**2;if(d<distance){distance=d;best=i;}}if(best>=0)landmarks[label]={pixel:project(best),source:[fc.getX(best),fc.getY(best),fc.getZ(best)]};}
 });frames.push({name,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,landmarks});}
const report={assetRef:assetRef??'working-tree',scope:'actual createCharacter; complete female neutral sculpt; fixed existing palette, light and camera; not a recovered user save',cases:{},frames};
for(const name of cases){const opts={...base,...(name==='male'?{bodyPreset:'masculine-lean',wardrobePreset:'court-frock-coat',hairStyle:'side-part'}:{}),shapeTraits:name==='high'?high:{}};const actor=C.createCharacter(opts);scene.add(actor.root);actor.animate(0,false,null);report.cases[name]={options:opts,score:shapePreferenceScore(opts.shapeTraits,{version:2}),model:actor.root.userData.characterModel};
 for(const [view,a] of [['front',0],['side',-Math.PI/2],['threequarter',Number(process.env.THREEQUARTER_ANGLE||-Math.PI/4)]].filter(([v])=>!process.env.VIEWS||process.env.VIEWS.split(',').includes(v))){
  const focus=new T.Vector3(0,1.565*actor.root.scale.y,-.01),c=new T.OrthographicCamera(-.19,.19,.19,-.19,.01,10);c.position.copy(focus).add(new T.Vector3(Math.sin(a)*2,0,Math.cos(a)*2));c.lookAt(focus);save(actor,c,name+'-'+view+'-detail');
  if(view==='threequarter'&&process.env.DETAIL_ONLY!=='1'){const f=new T.Vector3(0,.97,0),g=new T.PerspectiveCamera(50,1280/720,.2,150),distance=2.6,pitch=.08;g.position.copy(f).add(new T.Vector3(Math.sin(a)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(a)*Math.cos(pitch)*distance));g.lookAt(f);save(actor,g,name+'-'+view+'-game',1280,720);}
 }
 actor.root.removeFromParent();actor.dispose();}
assert.equal(C.characterResourceStats().activeReferences,0);report.status='RENDERED_PENDING_VISUAL_REVIEW';report.maxRssMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out:OUT,frames:frames.length,maxRssMiB:report.maxRssMiB}));renderer.dispose();canvas.dispose();
