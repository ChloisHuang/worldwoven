/** Actual production character mesh, including evaluated skeleton, for offline review. */
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const root=path.resolve(process.env.SOURCE_ROOT||process.cwd()),out=path.resolve(process.env.OUT||'qa/nose-brow-profile/before');fs.mkdirSync(out,{recursive:true});
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(root+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),C=await import(pathToFileURL(root+'/source/game/characters.js'));await import(pathToFileURL(root+'/source/game/character-live-entry.js'));
const form=process.env.FORM||'male',traits=JSON.parse(process.env.TRAITS||'{}');
const options={culture:'china',bodyPreset:form==='male'?'masculine-lean':'feminine-balanced',hairStyle:form==='male'?'side-part':'chin-bob',wardrobePreset:form==='male'?'scholar-robe':'cross-collar-ruqun',skin:0xbe9a74,hair:0x201c19,clothes:0x766078,accent:0xc6ab67,eyeColor:0x493525,shapeTraits:traits};
const actor=C.createCharacter(options);actor.animate(0,false,null);actor.root.updateMatrixWorld(true);actor.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
const report={source:root,created:new Date().toISOString(),scope:'Actual live-entry createCharacter geometry with evaluated skeleton; fixed source colors and offline lighting. Representative identity, not recovered user save. No browser or production shader claim.',options,model:actor.root.userData.characterModel,meshes:[],lights:[],files:{}};
for(const f of ['complete-adult/shape-traits.js','complete-adult/runtime-adapter.js','complete-adult/assets/adult-forms-data.js'])report.files[f]=crypto.createHash('sha256').update(fs.readFileSync(root+'/source/game/'+f)).digest('hex');
actor.root.traverse(o=>{
 if(!o.isMesh||!o.visible)return;let parent=o.parent;while(parent){if(!parent.visible)return;parent=parent.parent;}
 const geo=o.geometry,p=geo.attributes.position,n=geo.attributes.normal,c=geo.attributes.color,mat=o.material,indices=geo.index?.array||Array.from({length:p.count},(_,i)=>i);
 if(Array.isArray(mat))throw Error('unexpected multimaterial');const arr=new Float32Array(indices.length*9),v=new T.Vector3(),normal=new T.Vector3(),bone=new T.Matrix4(),skin=new T.Matrix4(),combined=new T.Matrix4(),normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld);
 for(let j=0;j<indices.length;j++){const i=indices[j];o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);normal.fromBufferAttribute(n,i);
  if(o.isSkinnedMesh){skin.elements.fill(0);const si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight;for(let k=0;k<4;k++){bone.fromArray(o.skeleton.boneMatrices,si.array[i*4+k]*16);for(let h=0;h<16;h++)skin.elements[h]+=bone.elements[h]*sw.array[i*4+k];}combined.copy(o.bindMatrixInverse).multiply(skin).multiply(o.bindMatrix);normal.transformDirection(combined);}
  normal.applyMatrix3(normalMatrix).normalize();v.toArray(arr,j*9);normal.toArray(arr,j*9+3);arr[j*9+6]=mat.color.r*(c?c.getX(i):1);arr[j*9+7]=mat.color.g*(c?c.getY(i):1);arr[j*9+8]=mat.color.b*(c?c.getZ(i):1);
 }
 const file='mesh-'+report.meshes.length+'.bin';fs.writeFileSync(out+'/'+file,Buffer.from(arr.buffer));report.meshes.push({file,name:o.name,vertices:indices.length,triangles:indices.length/3,material:{type:mat.type,color:mat.color.toArray(),opacity:mat.opacity,transparent:mat.transparent,side:mat.side,emissive:mat.emissive?.toArray(),emissiveIntensity:mat.emissiveIntensity??0}});
});
report.cameras=[];for(const [name,yaw]of [['profile',-Math.PI/2],['threequarter',-Math.PI/4],['front',0]]){const target=new T.Vector3(0,1.55,0),distance=.60;const camera=target.clone().add(new T.Vector3(Math.sin(yaw)*distance,0,Math.cos(yaw)*distance));report.cameras.push({name,camera:camera.toArray(),target:target.toArray(),fov:50,aspect:1,near:.01});}
// Normal gameplay perspective, with enough torso to keep head scale honest.
const target=new T.Vector3(0,1.2,0),distance=1.8,yaw=-Math.PI/2,pitch=.08;report.cameras.push({name:'profile-game',camera:target.clone().add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance)).toArray(),target:target.toArray(),fov:50,aspect:1.6,near:.04});
actor.dispose();report.remainingReferences=C.characterResourceStats().activeReferences;fs.writeFileSync(out+'/scene.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,form,model:report.model,remainingReferences:report.remainingReferences}));
