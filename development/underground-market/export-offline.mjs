/** Offline QA only: exact production underground geometry and evaluated rig. */
import {registerHooks} from 'node:module';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const root=process.cwd(),view=process.env.VIEW||'counter',out=path.resolve(process.env.OUT||'qa/underground-market-offline/'+view);fs.mkdirSync(out,{recursive:true});
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(root+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),G=await import('../../source/game/geometry.js');
const {buildChinaBlackMarket}=await import('../../source/game/china-black-market.js');
const {blackMarketGroundPieces}=await import('../../source/game/china-black-market-layout.js');
const {createCharacter}=await import('../../source/game/characters.js');await import('../../source/game/character-live-entry.js');
const {npcRoleAppearance}=await import('../../source/game/appearance.js');
const {resolveCameraPosition,cameraClipPlanes}=await import('../../source/game/camera.js');
let ctx={group:new T.Group(),roofGroup:new T.Group(),colliders:[],cameraColliders:[],walkableSurfaces:[],interiorRooms:[],levels:[],lightingZones:[],explorationTargets:[],facilities:[]};ctx.group.add(ctx.roofGroup);
let M;const fullScene=view==='entry';if(fullScene){const {buildChina}=await import('../../source/game/regions-east.js');ctx=buildChina();M=ctx.blackMarket;}else M=buildChinaBlackMarket(G,ctx);
for(const b of fullScene?[]:blackMarketGroundPieces({minX:10,maxX:28,minZ:8,maxZ:23})){
 G.box(ctx.group,(b.minX+b.maxX)/2,-.5,(b.minZ+b.maxZ)/2,b.maxX-b.minX,1,b.maxZ-b.minZ,0x859b79);
 G.box(ctx.group,(b.minX+b.maxX)/2,.05,(b.minZ+b.maxZ)/2,b.maxX-b.minX,.10,b.maxZ-b.minZ,0xc4bca8);
}
const views={entry:{position:[14.3,.115,10.4],yaw:Math.PI-.20,rotation:0},branch:{position:[14.3,-4.1,19.15],yaw:-Math.PI/2,rotation:Math.PI/2},counter:{position:M.interaction.position,yaw:.34,rotation:Math.PI}},v=views[view];if(!v)throw Error('Unknown view');
const player=createCharacter({culture:'china',bodyPreset:'feminine-balanced',wardrobePreset:'hanfu-ruqun'});player.root.position.set(...v.position);player.root.rotation.y=v.rotation;ctx.group.add(player.root);player.animate(1,false,null);
const merchant=createCharacter({...npcRoleAppearance('china','cn-tavern-diner-east',41),culture:'china'});merchant.root.position.set(...M.merchant.position);merchant.root.rotation.y=M.merchant.rotation;ctx.group.add(merchant.root);merchant.animate(1,false,null);
const target=player.root.position.clone().add(new T.Vector3(0,1.45,0)),desired=target.clone().add(new T.Vector3(Math.sin(v.yaw)*Math.cos(.22)*4.6,Math.sin(.22)*4.6,Math.cos(v.yaw)*Math.cos(.22)*4.6)),camera=resolveCameraPosition(target,desired,ctx.cameraColliders,.18),distance=camera.distanceTo(target);player.root.visible=distance>.8;
ctx.group.updateMatrixWorld(true);ctx.group.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
const report={created:new Date().toISOString(),view,scope:(fullScene?'Exact complete production China scene, including civilian tavern and new west-lane entrance; ':'Exact independent cellar and matching cropped street ground; ')+ ' current live-entry rigs, representative player and station-role merchant seed41, not a recovered save or runtime invitation. All walls retained. Blender CPU approximate light/materials, no browser shader, UI, behavior or iOS claim.',meshes:[],lights:[],lightingZones:ctx.lightingZones,files:{},cameras:[{name:view,camera:camera.toArray(),target:target.toArray(),fov:50,aspect:1.5,near:cameraClipPlanes({cameraDistance:distance}).near}],cameraDistance:distance};
for(const f of ['china-palace.js','china-black-market-layout.js','china-black-market.js','china-black-market-lettering.js','characters.js','camera.js','night-lighting.js'])report.files[f]=crypto.createHash('sha256').update(fs.readFileSync(root+'/source/game/'+f)).digest('hex');
ctx.group.traverse(o=>{if(o.userData.nightFixture){report.lights.push({position:o.getWorldPosition(new T.Vector3()).toArray(),...o.userData.nightFixture});}});
ctx.group.traverse(o=>{
 if(!o.isMesh||!o.visible)return;let parent=o.parent;while(parent){if(!parent.visible)return;parent=parent.parent;}
 const geo=o.geometry,p=geo.attributes.position,n=geo.attributes.normal,c=geo.attributes.color,mat=o.material,indices=geo.index?.array||Array.from({length:p.count},(_,i)=>i);
 if(Array.isArray(mat))throw Error('unexpected multimaterial');const arr=new Float32Array(indices.length*9),v=new T.Vector3(),normal=new T.Vector3(),bone=new T.Matrix4(),skin=new T.Matrix4(),combined=new T.Matrix4(),normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld);
 for(let j=0;j<indices.length;j++){const i=indices[j];o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);normal.fromBufferAttribute(n,i);
  if(o.isSkinnedMesh){skin.elements.fill(0);const si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight;for(let k=0;k<4;k++){bone.fromArray(o.skeleton.boneMatrices,si.array[i*4+k]*16);for(let h=0;h<16;h++)skin.elements[h]+=bone.elements[h]*sw.array[i*4+k];}combined.copy(o.bindMatrixInverse).multiply(skin).multiply(o.bindMatrix);normal.transformDirection(combined);}
  normal.applyMatrix3(normalMatrix).normalize();v.toArray(arr,j*9);normal.toArray(arr,j*9+3);arr[j*9+6]=mat.color.r*(c?c.getX(i):1);arr[j*9+7]=mat.color.g*(c?c.getY(i):1);arr[j*9+8]=mat.color.b*(c?c.getZ(i):1);
 }
 const file='mesh-'+report.meshes.length+'.bin';fs.writeFileSync(out+'/'+file,Buffer.from(arr.buffer));const center=new T.Box3().setFromObject(o).getCenter(new T.Vector3()),zone=ctx.lightingZones.find(z=>{const b=z.baseLightBounds||z;return center.x>=b.minX&&center.x<=b.maxX&&center.z>=b.minZ&&center.z<=b.maxZ&&center.y>=b.minY&&center.y<b.maxY;});report.meshes.push({baseLightScale:zone?.baseLightScale??1,file,name:o.name,vertices:indices.length,triangles:indices.length/3,material:{type:mat.type,color:mat.color.toArray(),opacity:mat.opacity,transparent:mat.transparent,side:mat.side,emissive:mat.emissive?.toArray(),emissiveIntensity:mat.emissiveIntensity??0}});
});
fs.writeFileSync(out+'/scene.json',JSON.stringify(report,null,2));player.dispose();merchant.dispose();console.log(JSON.stringify({out,meshes:report.meshes.length,triangles:report.meshes.reduce((n,m)=>n+m.triangles,0),cameraDistance:distance}));
