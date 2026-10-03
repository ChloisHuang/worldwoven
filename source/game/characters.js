/** R10 tailored production rig from the user-approved R8 sculpt. Y up; face +Z; metres.
 * All templates are immutable and shared with a bounded, reference-counted cache.
 * Call actor.dispose() and remove actor.root BEFORE generic scene disposal.
 */
import * as THREE from 'three';
import {createApprovedSurfaces,armWidthAtHeight,createRelaxedArmOffset} from './approved-surfaces.js';
import {normalizeShapeTraits,hasShapeTraits,shapeHeight} from './character-traits.js';
import {BODY_PRESETS,HAIR_STYLES,WARDROBE_PRESETS,ROLE_WARDROBE_PRESETS} from './appearance.js';
import {createHandProps,disposeHandProps} from './character-props.js';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const BAND_VALUES=[90,150,213,255],SKIN_VALUES=[140,186,229,255];
function toon(values){const tex=new THREE.DataTexture(new Uint8Array(values),4,1,THREE.RedFormat);tex.minFilter=tex.magFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.needsUpdate=true;const m=new THREE.MeshToonMaterial({vertexColors:true,gradientMap:tex,side:THREE.DoubleSide,shadowSide:THREE.BackSide});m.userData.characterShared=true;tex.userData={characterShared:true};return m;}
const clothMaterial=toon(BAND_VALUES),skinMaterial=toon(SKIN_VALUES);
const cache=new Map(),CACHE_LIMIT=24;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
// Parent-before-child anatomical joints, with absolute rest positions.
const JOINTS=[
 ['pelvis',-1,[0,.965,-.01]],['spine',0,[0,1.18,-.007]],['chest',1,[0,1.335,-.01]],['head',2,[0,1.455,0]],
 ['upperArmL',2,[-.171,1.326,-.010]],['forearmL',4,[-.277,1.099,-.006]],['handL',5,[-.304,.926,0]],
 ['upperArmR',2,[.171,1.326,-.010]],['forearmR',7,[.277,1.099,-.006]],['handR',8,[.304,.926,0]],
 ['thighL',0,[-.085,.965,-.010]],['shinL',10,[-.089,.54,-.015]],['footL',11,[-.089,.108,-.025]],
 ['thighR',0,[.085,.965,-.010]],['shinR',13,[.089,.54,-.015]],['footR',14,[.089,.108,-.025]],
 ['clothShinL',11,[-.089,.54,-.015]],['clothShinR',14,[.089,.54,-.015]]
];
const REST=JOINTS.map(j=>V(...j[2])),ID=Object.fromEntries(JOINTS.map((j,i)=>[j[0],i]));
function sideOf(name,geometry){const a=geometry.attributes.position;let x=0;for(let i=0;i<a.count;i++)x+=a.getX(i);return x<0?0:1;}
function torsoWeights(y){if(y>=1.335)return [[2,1]];if(y>=1.18){const u=(y-1.18)/.155;return [[1,1-u],[2,u]];}const u=clamp((y-.965)/.215,0,1);return [[0,1-u],[1,u]];}
function legWeights(x,y,side=null){
 const s=side===null?clamp((x+.070)/.140,0,1):side;
 const w=[];for(let k=0;k<2;k++){const f=k?s:1-s;if(!f)continue;const ids=k?[13,14,15]:[10,11,12];
 if(y>=.81){const u=clamp((.965-y)/.155,0,1);w.push([0,f*(1-u)],[ids[0],f*u]);}
 else if(y>=.47){const u=clamp((.64-y)/.17,0,1);w.push([ids[0],f*(1-u)],[ids[1],f*u]);}
 else{const u=clamp((.20-y)/.092,0,1);w.push([ids[1],f*(1-u)],[ids[2],f*u]);}}
 // Combine pelvis duplicates and cap to four influences, renormalizing.
 const m=new Map();for(const [i,a]of w)if(a>0)m.set(i,(m.get(i)||0)+a);const r=[...m].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=r.reduce((a,x)=>a+x[1],0);return r.map(([i,w])=>[i,w/sum]);
}
function weights(name,x,y,side){
 if(/continuous-head|^ear-|inset-eye|iris-|pupil-|eye-catchlight|eyelid-|soft-brow|nostril-|lip|mouth|hair|fringe|combed|side-lock|side-flow|cook-.*cap|artist-beret|garden-straw/.test(name))return [[3,1]];
 if(name==='neck'){const u=clamp((y-1.375)/.065,0,1);return [[2,1-u],[3,u]];}
 if(/sleeve|^arm-|bare-arm|wrist-|relaxed-|thumb-/.test(name)){
 const [a,b,c]=side?[7,8,9]:[4,5,6];if(y<=.938)return [[c,1]];
 if(y>=1.295){const u=clamp((y-1.295)/.049,0,1);return [[a,1-u],[2,u]];}
 if(y<=1.15){const u=clamp((y-1.055)/.095,0,1),v=clamp((.99-y)/.05,0,1);return v?[[b,1-v],[c,v]]:[[a,u],[b,1-u]];}
 return [[a,1]];
 }
 if(/footwear|sole-|loafer/.test(name))return [[side?15:12,1]];
 if(/trouser|bare-leg/.test(name))return legWeights(x,y,side);
 return y>=.965?torsoWeights(y):legWeights(x,y).map(([i,w])=>[i===11||i===12?16:i===14||i===15?17:i,w]);
}
function mergeSurfaces(source){const buckets=[{p:[],n:[],c:[],i:[],si:[],sw:[],sy:[],ranges:[]},{p:[],n:[],c:[],i:[],si:[],sw:[],sy:[],ranges:[]}];source.updateMatrixWorld(true);const p=V(),n=V(),nm=new THREE.Matrix3();
 source.traverse(m=>{if(!m.isMesh)return;const b=buckets[m.userData.softSkin?1:0],offset=b.p.length/3,g=m.geometry,pos=g.attributes.position,nor=g.attributes.normal,s=sideOf(m.name,g);nm.getNormalMatrix(m.matrixWorld);b.ranges.push({name:m.name,start:offset,count:pos.count,indexStart:b.i.length,indexCount:g.index?.count??pos.count});
 for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);n.fromBufferAttribute(nor,i).applyMatrix3(nm).normalize();b.p.push(p.x,p.y,p.z);b.n.push(n.x,n.y,n.z);b.c.push(m.material.color.r,m.material.color.g,m.material.color.b);const sourceY=g.attributes.sourceY?.getX(i)??p.y;b.sy.push(sourceY);const w=weights(m.name,p.x,sourceY,s);for(let j=0;j<4;j++){b.si.push(w[j]?.[0]||0);b.sw.push(w[j]?.[1]||0);}}
 const idx=g.index;for(let i=0;i<(idx?.count??pos.count);i++)b.i.push(offset+(idx?idx.getX(i):i));g.dispose();});
 return buckets.map((b,k)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(b.si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(b.sw,4));if(source.userData.shapeLegs||source.userData.relaxedArms)g.setAttribute('sourceY',new THREE.Float32BufferAttribute(b.sy,1));g.setIndex(b.i);g.computeBoundingBox();g.computeBoundingSphere();g.userData={characterShared:true,section:k?'skin':'cloth',sourceRanges:b.ranges};return g;});
}
function getTemplate(opts){const key=JSON.stringify(opts);let t=cache.get(key);if(t){t.refs++;t.last=performance.now();return t;}
 if(cache.size>=CACHE_LIMIT){const free=[...cache.values()].filter(x=>x.refs===0).sort((a,b)=>a.last-b.last);if(free.length){cache.delete(free[0].key);free[0].geometry.forEach(g=>g.dispose());}}
 const source=createApprovedSurfaces(opts);source.userData.shapeLegs=opts.shapeTraits?.legLength!==undefined&&opts.shapeTraits.legLength!==1;const geometry=mergeSurfaces(source);const b=new THREE.Box3();for(const g of geometry)b.union(g.boundingBox);t={key,geometry,height:b.max.y,refs:1,last:performance.now(),cached:cache.size<CACHE_LIMIT};if(t.cached)cache.set(key,t);return t;
}
function releaseTemplate(t){t.refs=Math.max(0,t.refs-1);t.last=performance.now();if(!t.cached&&t.refs===0)t.geometry.forEach(g=>g.dispose());}
function buildSkeleton(root,rest=REST){const bones=JOINTS.map(([name])=>{const b=new THREE.Bone();b.name=name;return b;});JOINTS.forEach(([,parent],i)=>{bones[i].position.copy(rest[i]);if(parent>=0){bones[i].position.sub(rest[parent]);bones[parent].add(bones[i]);}else root.add(bones[i]);});root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);return {bones,skeleton};}
const clonePoint=p=>p.toArray().map(n=>+n.toFixed(5));
function locomotionFor(wardrobe,gaitPreset,scale){
 const restricted=/yukata|kimono/.test(wardrobe),free=/trouser|waistcoat|frock|kilt/.test(wardrobe),long=/gown|ruqun|long-robe/.test(wardrobe);
 const personality=Math.abs(gaitPreset|0)%4,temper=[.90,1,1.08,.97][personality],stepTemper=[.96,1,1.04,.94][personality];
 const stepLength=(restricted?.39:free?.60:long?.53:.46)*stepTemper*scale;
 // Keep garment-specific short steps, but make everyday travel responsive.
 // Phase follows real distance below, so this raises cadence without foot skating.
 const walkSpeed=(restricted?.95:free?1.35:long?1.20:1.06)*temper*scale*1.65;
 return Object.freeze({walkSpeed,hurrySpeed:walkSpeed*1.38,stepLength,strideLength:stepLength*2,label:restricted?'measured garment-limited steps':free?'relaxed open stride':'easy draped stride',lift:(restricted?.065:.090)*scale,armSwing:(restricted?.065:free?.135:.105)*temper});
}
export function createCharacter({skin=0xdba783,hair=0x463328,clothes=0x5d93a8,accent=0xe7cab0,style='casual',culture=null,variant=0,bodyPreset=null,hairStyle=null,wardrobePreset=null,locomotionWardrobePreset=null,gaitPreset=1,scale=1,eyeColor=0x594b3f,receiveShadow=false,shapeTraits=null}={}){
 shapeTraits=normalizeShapeTraits(shapeTraits);const shaped=hasShapeTraits(shapeTraits);
 bodyPreset=BODY_PRESETS.includes(bodyPreset)?bodyPreset:BODY_PRESETS[typeof variant==='string'?(/masculine|male/.test(variant)?1:0):Math.abs(variant|0)%4];
 const masc=bodyPreset.startsWith('masculine');hairStyle=HAIR_STYLES.includes(hairStyle)?hairStyle:(masc?'swept-short':'chin-bob');
 culture=['japan','china','egypt','france'].includes(culture)?culture:null;
 style=['chef','artist','gardener'].includes(style)?style:'casual';scale=Number.isFinite(scale)?clamp(scale,.25,3):1;
 const wardrobeOptions=(WARDROBE_PRESETS[culture]||WARDROBE_PRESETS.france)[masc?'masculine':'feminine'];wardrobePreset=wardrobePreset==='bath-robe'||culture==='japan'&&wardrobePreset==='onsen-swimwear'||(ROLE_WARDROBE_PRESETS[culture]||[]).includes(wardrobePreset)||wardrobeOptions.includes(wardrobePreset)?wardrobePreset:wardrobeOptions[0];
 // Skin, cloth and rig use the same anatomical displacement before leg shaping.
 const armOffset=createRelaxedArmOffset(bodyPreset,wardrobePreset,shapeTraits.legLength);
 const rest=REST.map((p,i)=>{const arm=i>=4&&i<=9,offset=arm&&armOffset?armOffset(p.y):null;return V(p.x*(arm?armWidthAtHeight(p.y,bodyPreset):1)+(offset?Math.sign(p.x)*offset[0]:0),shapeHeight(p.y+(offset?.[1]??0),shapeTraits.legLength),p.z+(offset?.[2]??0));});
 const locomotion=locomotionFor(wardrobeOptions.includes(locomotionWardrobePreset)?locomotionWardrobePreset:wardrobePreset,gaitPreset,scale);
 const root=new THREE.Group();root.name='approved-human-r10';root.scale.set(masc?scale*1.085:scale,masc?scale*1.035:scale,masc?scale*1.065:scale);
 const opts={eyeColor:new THREE.Color(eyeColor).getHex(),skin:new THREE.Color(skin).getHex(),hair:new THREE.Color(hair).getHex(),clothes:new THREE.Color(clothes).getHex(),accent:new THREE.Color(accent).getHex(),style,culture,masc,bodyPreset,hairStyle,wardrobePreset};
 if(shaped)opts.shapeTraits=shapeTraits;
 const template=getTemplate(opts),height=template.height*root.scale.y;
 const rig=new THREE.Group();rig.name='articulated-rig';root.add(rig);const {bones,skeleton}=buildSkeleton(rig,rest);
 const meshes=template.geometry.map((g,i)=>{const mesh=new THREE.SkinnedMesh(g,i?skinMaterial:clothMaterial);mesh.name=i?'approved-face-skin':'continuous-tailored-cloth';mesh.castShadow=true;mesh.receiveShadow=receiveShadow;mesh.frustumCulled=false;rig.add(mesh);mesh.bind(skeleton);return mesh;});
 const props=createHandProps(THREE);props.tools.cup.position.set(-.078,-.025,0);props.tools.brush.position.y=-.015;bones[6].add(props.left);bones[9].add(props.right);
 const posedP=rest.map(p=>p.clone()),posedQ=rest.map(()=>new THREE.Quaternion()),pose=new THREE.Group();
 const tmp=V(),tmp2=V(),dir=V(),pole=V(),restDir=V(),identity=new THREE.Quaternion(),invQ=new THREE.Quaternion(),torsoQ=new THREE.Quaternion(),headQ=new THREE.Quaternion(),inverseRoot=new THREE.Matrix4();
 const previousRoot=V(),velocity=V(),rootWorld=V(),forwardWorld=V(),rightWorld=V(),footProbe=V(),footBack=V(),footFront=V(),footRight=V(),footLeft=V(),footOffset=V(),footNormal=V(),footUp=V(0,1,0),footOrient=[new THREE.Quaternion(),new THREE.Quaternion()],footAnchors=[V(),V()],swingStarts=[V(),V()],lastFootWorld=[V(),V()],lastSupport=[true,false],footTargets=[V(),V()];
 let supportCorrection=0,poseMinY=0,poseMaxY=0,onsenHip=.32,onsenBackOffset=0,onsenArmLift=0;const lieOffsets={back:0,spine:0,head:0,heel:0};
 const onsenLapPoint=V(.09,.40,.23),onsenLapNormal=V(0,1,0),onsenRimPalmQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0,0,-1),V(1,0,0),V(0,-1,0))),onsenLapPalmQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1,0,0),V(0,0,-1),V(0,-1,0)));
 const onsenPalmContact={offset:V(),index:-1};
 const chairHands=[0,1].map(()=>({wrist:V(),rotation:new THREE.Quaternion()}));let fittedChairHeight=null;
 function fitOnsenPalmContact(){for(const geometry of template.geometry)for(const range of geometry.userData.sourceRanges||[])if(range.name==='relaxed-palm-1'){
  let low=Infinity;for(let i=range.start;i<range.start+range.count;i++){tmp.fromBufferAttribute(geometry.attributes.position,i).sub(rest[9]).applyQuaternion(onsenLapPalmQ);const depth=tmp.dot(onsenLapNormal);if(depth<low){low=depth;onsenPalmContact.offset.copy(tmp);onsenPalmContact.index=i;}}
 }}
 if(culture==='japan'&&wardrobePreset==='onsen-swimwear')fitOnsenPalmContact();
 let lastTime=null,wasWalking=false,gaitPhase=0,disposed=false,initializedFeet=false,currentAction=null,visualFloorOffset=0,previousYaw=0;
 const metrics={height,labelHeight:height+.16,headHeight:1.61*root.scale.y,action:null,seated:false,grounded:true,feet:[[],[]],hands:[[],[]]};
 root.userData={characterR9:true,characterR10:true,locomotion,appearance:{skin:opts.skin,hair:opts.hair,clothes:opts.clothes,accent:opts.accent,eyeColor:opts.eyeColor,culture,variant,style,bodyPreset,hairStyle,wardrobePreset,gaitPreset,shapeTraits:{...shapeTraits}},body:rig,head:bones[3],arms:[bones[4],bones[7]],forearms:[bones[5],bones[8]],hands:[bones[6],bones[9]],legs:[bones[10],bones[13]],knees:[bones[11],bones[14]],feet:[bones[12],bones[15]],tools:props.tools,poseQA:metrics,labelHeight:metrics.labelHeight,characterShared:true};
 function orient(i,j,p){restDir.copy(rest[j]).sub(rest[i]).normalize();dir.copy(p).sub(posedP[i]).normalize();posedQ[i].setFromUnitVectors(restDir,dir);}
 function setTorso(hipY,lean=0,sway=0){
  posedP[0].set(0,hipY,-.01);torsoQ.setFromEuler(new THREE.Euler(lean,0,sway));posedQ[0].copy(torsoQ);
  for(const i of [1,2,3,4,7,10,13]){posedP[i].copy(rest[i]).sub(rest[0]).applyQuaternion(torsoQ).add(posedP[0]);posedQ[i].copy(torsoQ);}
  headQ.setFromEuler(new THREE.Euler(0,0,0));
 }
 function solveLimb(a,b,c,target,poleVector){
  const upper=rest[a].distanceTo(rest[b]),lower=rest[b].distanceTo(rest[c]);dir.copy(target).sub(posedP[a]);let distance=clamp(dir.length(),Math.abs(upper-lower)+.002,upper+lower-.0005);dir.normalize();const along=(upper*upper-lower*lower+distance*distance)/(2*distance),high=Math.sqrt(Math.max(0,upper*upper-along*along));
  pole.copy(poleVector).addScaledVector(dir,-poleVector.dot(dir));if(pole.lengthSq()<.0001)pole.set(0,0,1);pole.normalize();
  posedP[c].copy(posedP[a]).addScaledVector(dir,distance);posedP[b].copy(posedP[a]).addScaledVector(dir,along).addScaledVector(pole,high);
  orient(a,b,posedP[b]);orient(b,c,posedP[c]);posedQ[c].copy(posedQ[b]);
 }
 const armPole=[V(-.28,-1,-.2),V(.28,-1,-.2)],legPole=V(0,0,1),armPitchAxis=V(1,0,0),armRotation=new THREE.Quaternion();
 const walkingArmSwing=Math.min(locomotion.armSwing,/yukata|kimono|hakama|ruqun|bath-robe/.test(wardrobePreset)?.09:.15);
 function reach(side,x,y,z){const ids=side?[7,8,9]:[4,5,6];tmp.set(x,y,z);solveLimb(...ids,tmp,armPole[side]);// Neutral wrist keeps hand silhouette attached; vessels are counter-rotated separately.
 }
 function swingArm(side,phase){
  const [a,b,c]=side?[7,8,9]:[4,5,6],phi=phase+(side?Math.PI:0);
  // Distance-driven shoulder swing with a softly flexing, slightly delayed
  // elbow. FK preserves both segment lengths instead of pulling a low wrist
  // target beyond the arm's reach and locking the elbow on every step.
  const shoulderPitch=-Math.sin(phi)*walkingArmSwing/.40;
  const elbowFlex=.14+.12*(.5+.5*Math.sin(phi-.35));
  posedQ[a].copy(torsoQ).multiply(armRotation.setFromAxisAngle(armPitchAxis,shoulderPitch));
  posedP[b].copy(rest[b]).sub(rest[a]).applyQuaternion(posedQ[a]).add(posedP[a]);
  posedQ[b].copy(torsoQ).multiply(armRotation.setFromAxisAngle(armPitchAxis,shoulderPitch-elbowFlex));
  posedP[c].copy(rest[c]).sub(rest[b]).applyQuaternion(posedQ[b]).add(posedP[b]);
  posedQ[c].copy(posedQ[b]);
 }
 function foot(side,target){const ids=side?[13,14,15]:[10,11,12];solveLimb(...ids,target,legPole);posedQ[ids[2]].identity();}
 function fitChairHands(chairHeight){
  // Fit only when entering a seat or changing its height. The lap is the real
  // skinned garment surface; a broad sleeve must not become the hand support.
  root.updateMatrixWorld(true);skeleton.update();const inverseRig=rig.matrixWorld.clone().invert(),a=V(),b=V(),c=V(),hit=V(),normal=V(),forward=V(),sideAxis=V(),basis=new THREE.Matrix4();
  for(let side=0;side<2;side++){
   const thigh=side?13:10,knee=side?14:11,hand=side?9:6,sign=side?1:-1,fit=chairHands[side];
   const lap=posedP[thigh].clone().lerp(posedP[knee],side?.52:.65);lap.x+=sign*.025;
   const ray=new THREE.Ray(V(lap.x,chairHeight+.65,lap.z),V(0,-1,0));let top=-Infinity;const up=V(0,1,0);
   for(const mesh of meshes)for(const range of mesh.geometry.userData.sourceRanges||[]){
    if(!/body|bodice|skirt|trouser|tunic|kilt|robe/.test(range.name)||/sleeve|fold|seam|border|panel|belt|sash/.test(range.name))continue;
    const g=mesh.geometry,indices=g.index,sy=g.attributes.sourceY??g.attributes.position;
    for(let j=range.indexStart;j<range.indexStart+range.indexCount;j+=3){
     const ids=[indices.getX(j),indices.getX(j+1),indices.getX(j+2)],sourceY=ids.reduce((sum,i)=>sum+(g.attributes.sourceY?sy.getX(i):sy.getY(i)),0)/3;if(sourceY<.68||sourceY>.98)continue;
     for(const [point,i]of[[a,ids[0]],[b,ids[1]],[c,ids[2]]])mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRig);
     if(!ray.intersectTriangle(a,b,c,false,hit)||hit.y<=top)continue;
     normal.copy(b).sub(a).cross(tmp2.copy(c).sub(a)).normalize();if(normal.y<0)normal.negate();if(normal.y<.45)continue;
     top=hit.y;lap.copy(hit);up.copy(normal);
    }
   }
   if(!Number.isFinite(top)){lap.copy(posedP[thigh]).lerp(posedP[knee],side?.52:.65);lap.y+=.075;}
   forward.copy(posedP[knee]).sub(posedP[thigh]);forward.x-=sign*.035;forward.addScaledVector(up,-forward.dot(up)).normalize();
   sideAxis.copy(forward).cross(up).normalize();basis.makeBasis(sideAxis,forward.clone().negate(),up.clone().negate());fit.rotation.setFromRotationMatrix(basis);
   // The palm's underside, rather than its wrist pivot, meets the cloth.
   let low=Infinity;const offset=V();for(const geometry of template.geometry)for(const range of geometry.userData.sourceRanges||[])if(range.name==='relaxed-palm-'+sign){
    for(let i=range.start;i<range.start+range.count;i++){const y=geometry.attributes.sourceY?.getX(i)??geometry.attributes.position.getY(i);if(y<.855||y>.895)continue;tmp.fromBufferAttribute(geometry.attributes.position,i).sub(rest[hand]).applyQuaternion(fit.rotation);const depth=tmp.dot(up);if(depth<low){low=depth;offset.copy(tmp);}}
   }
   fit.wrist.copy(lap).sub(offset).addScaledVector(up,.004/root.scale.y);
  }
  fittedChairHeight=chairHeight;
 }
 function poseChairHands(){for(let side=0;side<2;side++){const fit=chairHands[side];reach(side,fit.wrist.x,fit.wrist.y,fit.wrist.z);posedQ[side?9:6].copy(fit.rotation);}}
 function poseOnsen(context,time){
  setTorso(onsenHip,-.12,0);
  foot(0,tmp.set(-.13,.108,.58));foot(1,tmp.set(.13,.108,.58));
  for(const [i,j]of[[16,11],[17,14]]){posedP[i].copy(posedP[j]);posedQ[i].copy(posedQ[j]);}
  // Rest one forearm along the real narrow lumbar ledge. Both limb lengths
  // remain anatomical; the elbow and wrist share its horizontal support.
  const armY=(context.bathPose.backTopY-context.supportY+.039)/root.scale.y-supportCorrection+onsenArmLift,armZ=(context.bathPose.backZ-.012)/root.scale.z-onsenBackOffset;
  const upper=rest[4].distanceTo(rest[5]),lower=rest[5].distanceTo(rest[6]),dy=armY-posedP[4].y,dz=armZ-posedP[4].z,out=Math.sqrt(Math.max(.0004,upper*upper-dy*dy-dz*dz));
  posedP[5].set(posedP[4].x-out,armY,armZ);posedP[6].set(posedP[5].x-lower,armY,armZ);orient(4,5,posedP[5]);orient(5,6,posedP[6]);posedQ[6].copy(onsenRimPalmQ);
  // The other palm rests on an actual deformed thigh vertex, palm down.
  tmp2.copy(onsenLapPoint).sub(onsenPalmContact.offset).addScaledVector(onsenLapNormal,.004/root.scale.y);reach(1,tmp2.x,tmp2.y,tmp2.z);posedQ[9].copy(onsenLapPalmQ);
  headQ.setFromEuler(new THREE.Euler(.07,Math.sin(time*.35)*.02,0));posedQ[3].copy(torsoQ).multiply(headQ);
 }
 function measureOnsenSkin(context){
  const result={min:Infinity,max:-Infinity,hip:Infinity,sole:Infinity,back:Infinity,backY:null,lapY:-Infinity,lapPoint:null,lapNormal:null,lapTriangle:null,palmPoint:null,armSupportMin:Infinity,forearmMin:Infinity,forearmPoint:null};root.updateMatrixWorld(true);skeleton.update();inverseRoot.copy(root.matrixWorld).invert();
  for(const mesh of meshes)for(const range of mesh.geometry.userData.sourceRanges||[]){
   const attr=mesh.geometry.attributes.position,hip=/^onsen-trouser|^onsen-swim-body/.test(range.name),back=range.name==='onsen-swim-body',sole=/^footwear-bath-bare/.test(range.name);
   for(let i=range.start;i<range.start+range.count;i++){
    mesh.getVertexPosition(i,tmp).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot);const sy=mesh.geometry.attributes.sourceY?.getX(i)??attr.getY(i);
    result.min=Math.min(result.min,tmp.y);result.max=Math.max(result.max,tmp.y);
    if(sole)result.sole=Math.min(result.sole,tmp.y);
    if(hip&&sy>.84&&sy<1.01&&attr.getZ(i)<-.012)result.hip=Math.min(result.hip,tmp.y);
    const worldY=context.supportY+(tmp.y+supportCorrection)*root.scale.y;
    if(back&&sy>1.12&&sy<1.335&&attr.getZ(i)<0&&worldY<context.bathPose.backTopY-.01&&tmp.z<result.back){result.back=tmp.z;result.backY=worldY;}
    if(range.name==='relaxed-palm-1'&&i===onsenPalmContact.index)result.palmPoint=tmp.clone();
    const onLedge=tmp.z+onsenBackOffset>(context.bathPose.backZ-.08)/root.scale.z&&tmp.z+onsenBackOffset<context.bathPose.backZ/root.scale.z;
    if(onLedge&&/^(bare-arm-onsen--1|relaxed-palm--1|relaxed-finger--1-|thumb--1)/.test(range.name)){
     result.armSupportMin=Math.min(result.armSupportMin,tmp.y);
     if(range.name==='bare-arm-onsen--1'&&sy<1.10&&sy>.94&&tmp.y<result.forearmMin){result.forearmMin=tmp.y;result.forearmPoint=tmp.clone();}
    }
   }
   if(range.name==='onsen-trouser-1'){
    // A palm lies along the actual posed thigh triangle, not a horizontal
    // world plane. This retains finger clearance on longer bent legs.
    const a=V(),b=V(),c=V(),normal=V(),center=V(),indices=mesh.geometry.index;
    for(let j=range.indexStart;j<range.indexStart+range.indexCount;j+=3){
     const ids=[indices.getX(j),indices.getX(j+1),indices.getX(j+2)],sy=ids.reduce((sum,i)=>sum+(mesh.geometry.attributes.sourceY?.getX(i)??attr.getY(i)),0)/3;if(sy<=.74||sy>=.86)continue;
     for(const [point,i]of[[a,ids[0]],[b,ids[1]],[c,ids[2]]])mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot);
     center.copy(a).add(b).add(c).multiplyScalar(1/3);if(center.y<=result.lapY)continue;
     normal.copy(b).sub(a).cross(tmp2.copy(c).sub(a)).normalize();if(normal.y<0)normal.negate();if(normal.y<.65)continue;
     result.lapY=center.y;result.lapPoint=center.clone();result.lapNormal=normal.clone();result.lapTriangle=ids;
    }
   }
  }return result;
 }
 function applyPose(){
  for(let i=0;i<bones.length;i++){const parent=JOINTS[i][1];if(parent<0){bones[i].position.copy(posedP[i]);bones[i].quaternion.copy(posedQ[i]);}else{invQ.copy(posedQ[parent]).invert();bones[i].position.copy(posedP[i]).sub(posedP[parent]).applyQuaternion(invQ);bones[i].quaternion.copy(invQ).multiply(posedQ[i]);}}
  // World-upright cups, bowls and buckets; hands retain real elbow/wrist rotation.
  props.left.quaternion.copy(posedQ[6]).invert();props.right.quaternion.copy(posedQ[9]).invert();
  rig.updateMatrixWorld(true);skeleton.update();
 }
 function measureLieSkin(){
  const result={min:Infinity,max:-Infinity,hip:Infinity,back:Infinity,head:Infinity,heel:Infinity,points:{}};root.updateMatrixWorld(true);skeleton.update();inverseRoot.copy(root.matrixWorld).invert();
  for(const mesh of meshes)for(const range of mesh.geometry.userData.sourceRanges||[]){
   const n=range.name,body=/body|bodice|skirt|trouser|tunic|kilt|robe/.test(n)&&!/bow|tie|sash|belt|fold|seam|border|panel|sleeve/.test(n),head=/continuous-head/.test(n),heel=/footwear|sole-|loafer/.test(n),attr=mesh.geometry.attributes.position;
   for(let i=range.start;i<range.start+range.count;i++){mesh.getVertexPosition(i,tmp).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot);const y=tmp.y,sy=mesh.geometry.attributes.sourceY?.getX(i)??attr.getY(i);result.min=Math.min(result.min,y);result.max=Math.max(result.max,y);
    if(body&&attr.getZ(i)<0&&Math.abs(attr.getX(i))<.12){if(sy>.87&&sy<1.03&&y<result.hip){result.hip=y;result.points.hip=tmp.clone();}if(sy>1.18&&sy<1.33&&y<result.back){result.back=y;result.points.back=tmp.clone();}}
    if(head&&attr.getZ(i)<0&&y<result.head){result.head=y;result.points.head=tmp.clone();}if(heel&&y<result.heel){result.heel=y;result.points.heel=tmp.clone();}
   }
  }return result;
 }
 function fitShapedLie(context,supportY){
  // Leg proportions move the back across quilt/pillow transitions. Fit the
  // lower and upper back independently instead of treating it as one plane.
  // All samples retain their original anatomical source Y and exact skin weights.
  const zones=['hip','lowerBack','upperBack','head','heel'];
  const influence=(id)=>id===1?1:[2,4,5,6,7,8,9].includes(id)?2:id===3?3:[12,15].includes(id)?4:-1;
  let correction=0,best=null;
  for(let pass=0;pass<12;pass++){
   const samples={};root.updateMatrixWorld(true);skeleton.update();inverseRoot.copy(root.matrixWorld).invert();
   for(const mesh of meshes)for(const range of mesh.geometry.userData.sourceRanges||[]){
    const name=range.name,body=/body|bodice|skirt|trouser|tunic|kilt|robe/.test(name)&&!/bow|tie|sash|belt|fold|seam|border|panel|sleeve/.test(name),head=/continuous-head/.test(name),heel=/footwear|sole-|loafer/.test(name),attr=mesh.geometry.attributes.position,sy=mesh.geometry.attributes.sourceY,si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;
    if(!body&&!head&&!heel)continue;
    for(let i=range.start;i<range.start+range.count;i++){
     const y=sy?.getX(i)??attr.getY(i);let zone=null;
     if(body&&attr.getZ(i)<0&&Math.abs(attr.getX(i))<.12)zone=y>.87&&y<1.03?'hip':y>1.18&&y<1.25?'lowerBack':y>=1.25&&y<1.33?'upperBack':null;
     if(head&&attr.getZ(i)<0)zone='head';if(heel)zone='heel';if(!zone)continue;
     mesh.getVertexPosition(i,tmp).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot);
     if(samples[zone]&&samples[zone].point.y<=tmp.y)continue;
     const row=[1,0,0,0,0];for(let k=0;k<4;k++){const id=si.array[i*4+k],weight=sw.array[i*4+k],column=influence(id);if(column>0)row[column]+=weight;else if([11,14,16,17].includes(id))row[4]+=weight*.4;}
     samples[zone]={point:tmp.clone(),row};
    }
   }
   if(zones.some(z=>!samples[z]))break;
   const matrix=zones.map(zone=>{const sample=samples[zone];tmp2.copy(sample.point).applyMatrix4(root.matrixWorld);const part=zone.includes('Back')?'back':zone,target=context.lieSurfaceHeightAt?.(tmp2.x,tmp2.z)??context.lieSupport[part]??supportY;return [...sample.row,(target-supportY+.004)/root.scale.y-sample.point.y-correction];});
   const residual=Math.max(...matrix.map(row=>Math.abs(row[5])));
   if(!best||residual<best.residual)best={residual,correction,offsets:{...lieOffsets}};
   if(residual<.001)break;
   // Five tiny equations: support translation, spine, chest, head and heels.
   // Pivoting avoids dividing by a weak mixed skin influence.
   let singular=false;for(let j=0;j<5;j++){let pivot=j;for(let k=j+1;k<5;k++)if(Math.abs(matrix[k][j])>Math.abs(matrix[pivot][j]))pivot=k;[matrix[j],matrix[pivot]]=[matrix[pivot],matrix[j]];const d=matrix[j][j];if(Math.abs(d)<1e-5){singular=true;break;}for(let k=j;k<6;k++)matrix[j][k]/=d;for(let r=0;r<5;r++)if(r!==j){const f=matrix[r][j];for(let k=j;k<6;k++)matrix[r][k]-=f*matrix[j][k];}}
   if(singular)break;// Damped updates prevent alternate minimum vertices from oscillating
   // across a folded quilt or pillow seam.
   const change=matrix.map(row=>row[5]*(pass===0?1:.45));correction+=change[0];for(const [key,j]of [['spine',1],['back',2],['head',3],['heel',4]])lieOffsets[key]=clamp(lieOffsets[key]+change[j],-.24,.24);
   for(let i=0;i<posedP.length;i++){posedP[i].copy(rest[i]);posedQ[i].identity();}settleLieJoints();applyPose();
   if(Math.max(...change.map(Math.abs))<.00002)break;
  }
  if(best){correction=best.correction;Object.assign(lieOffsets,best.offsets);for(let i=0;i<posedP.length;i++){posedP[i].copy(rest[i]);posedQ[i].identity();}settleLieJoints();applyPose();}
  const skin=measureLieSkin();supportCorrection=correction;poseMinY=skin.min;poseMaxY=skin.max;metrics.lieContact={};
  for(const part of ['back','hip','head','heel']){tmp2.copy(skin.points[part]).applyMatrix4(root.matrixWorld);const surface=context.lieSurfaceHeightAt?.(tmp2.x,tmp2.z)??context.lieSupport[part]??supportY,body=supportY+(skin[part]+correction)*root.scale.y;metrics.lieContact[part]={surface,body,gap:body-surface};}
 }
 function settleLieJoints(){
  // Small skeletal settling, retaining every original face/outfit vertex. The
  // spine rests across the pillow/quilt transition; heels no longer levitate.
  posedP[1].z+=shapeTraits.legLength===1?lieOffsets.back*.5:lieOffsets.spine;for(const i of[2,4,5,6,7,8,9])posedP[i].z+=lieOffsets.back;posedP[3].z+=lieOffsets.head;
  for(const i of[12,15])posedP[i].z+=lieOffsets.heel;for(const i of[11,14,16,17])posedP[i].z+=lieOffsets.heel*.4;
 }
 function resetTools(){props.tools.knife.rotation.set(0,0,0);for(const prop of Object.values(props.tools))prop.visible=false;props.left.rotation.set(0,0,0);props.right.rotation.set(0,0,0);}
 function show(...names){for(const name of names)if(props.tools[name])props.tools[name].visible=true;}
 function animate(time,walking=false,action=null,context=null){
  if(disposed)return;visualFloorOffset=Number.isFinite(context?.visualFloorOffset)?clamp(context.visualFloorOffset,0,.5):0;rig.rotation.set(0,0,0);rig.position.set(0,visualFloorOffset/root.scale.y,0);time=Number.isFinite(time)?time:0;walking=!!walking;if(walking)action=null;resetTools();
  const rawDt=lastTime===null?0:time-lastTime,dt=clamp(rawDt,0,.2);root.updateWorldMatrix(true,false);root.getWorldPosition(rootWorld);velocity.copy(rootWorld).sub(previousRoot);const travel=Math.hypot(velocity.x,velocity.z),headingDelta=Math.atan2(Math.sin(root.rotation.y-previousYaw),Math.cos(root.rotation.y-previousYaw)),discontinuity=rawDt>.25||rawDt<0||travel>=1.2||Math.abs(headingDelta)>.85;const physical=!discontinuity&&dt>0&&travel>.000001;
  if(physical)velocity.multiplyScalar(1/dt);else velocity.set(0,0,0);
  const poseChanged=currentAction!==action;const mountedPose=action==='lie-rest'||action==='bathe';const supportedOnsen=action==='bathe'&&culture==='japan'&&wardrobePreset==='onsen-swimwear'&&context?.bathPose?.style==='onsen-seat';const leavingSeat=['kotatsu','chair-sit','lie-rest','bathe'].includes(currentAction)&&action!==currentAction;
  if(supportedOnsen&&poseChanged){onsenHip=context.bathHipHeight??.32;onsenBackOffset=0;onsenArmLift=0;supportCorrection=0;onsenLapPoint.set(.09,.40,.23);}
  if(discontinuity||leavingSeat){initializedFeet=false;for(let s=0;s<2;s++){lastFootWorld[s].set(s?.089:-.089,.108,-.025).applyMatrix4(root.matrixWorld);lastFootWorld[s].y+=visualFloorOffset;}wasWalking=false;}
  currentAction=action;metrics.action=action;metrics.gaitReset=discontinuity||leavingSeat;metrics.seated=action==='kotatsu'||action==='chair-sit'||action==='bathe';metrics.lying=action==='lie-rest';metrics.bathing=action==='bathe';
  // Phase is distance-driven, never wall-clock-driven: blocked actors do not skate.
  if(walking&&!wasWalking)gaitPhase=Math.PI*.5;
  const t=walking?(physical?gaitPhase+=travel/locomotion.strideLength*TAU:gaitPhase):0;
  const currentSpeed=physical?travel/dt:0;
  metrics.speed=currentSpeed;metrics.gaitPhase=t;metrics.stepLength=locomotion.stepLength;metrics.strideLength=locomotion.strideLength;metrics.support=[true,true];
  const ankleY=.108,lead=locomotion.stepLength/(2*root.scale.z),lift=locomotion.lift/root.scale.y;
  forwardWorld.set(0,0,1).transformDirection(root.matrixWorld);rightWorld.set(1,0,0).transformDirection(root.matrixWorld);
  function supportHeight(world){const sample=context?.groundHeightAt?.(world.x,world.z);if(Number.isFinite(sample))return sample;
   const grade=currentSpeed>.001?velocity.y/currentSpeed:0,along=(world.x-rootWorld.x)*forwardWorld.x+(world.z-rootWorld.z)*forwardWorld.z;
   return rootWorld.y+visualFloorOffset+clamp(grade*along,-.30,.30);
  }
  tmp.copy(rootWorld).addScaledVector(forwardWorld,.15);tmp2.copy(rootWorld).addScaledVector(forwardWorld,-.15);
  const slope=context?.groundHeightAt?clamp((supportHeight(tmp)-supportHeight(tmp2))/.30,-1.2,1.2):physical?velocity.y/Math.max(.001,currentSpeed):0;
  const bob=walking?Math.abs(Math.sin(t))*.006:Math.sin(time*1.8)*.002;
  // Raised tatami must lift soles without lifting the seated lap through its quilt.
  // Only pelvis/upper cloth settle; IK ankle and absolute wrist targets stay unchanged.
  const seatedDrop=action==='kotatsu'&&culture==='japan'?Math.min(.04,visualFloorOffset/root.scale.y*.5):0;
  const chairHeight=Number.isFinite(context?.seatHeight)?clamp(context.seatHeight/root.scale.y,.35,1):.60;
  setTorso(action==='bathe'?(context?.bathHipHeight??.32):action==='chair-sit'?chairHeight+.14:action==='kotatsu'?.417-seatedDrop:walking?rest[0].y+bob:rest[0].y,action==='calligraphy'?.40:/^(knead|bread|cook|sushi|bake|tidy)$/.test(action||'')?.13:0,walking?Math.sin(t)*.012:0);
  // A shorter thigh sits slightly forward on the same cushion so its knee
  // clears the seat edge; the feet retain their exact floor targets.
  if(action==='chair-sit'&&shapeTraits.legLength<1)for(const i of [0,1,2,3,4,7,10,13])posedP[i].z+=(1-shapeTraits.legLength)*1.2;
  let unevenSupport=false;
  if(action!=='kotatsu'&&action!=='chair-sit'&&action!=='bathe'){
   for(let s=0;s<2;s++){
    const phi=((t+(s?Math.PI:0))%TAU+TAU)%TAU,support=phi<Math.PI,u=support?phi/Math.PI:(phi-Math.PI)/Math.PI;
    const x=s?.089:-.089,target=footTargets[s];target.set(x,.108,-.025);
    if(walking&&physical){
     inverseRoot.copy(root.matrixWorld).invert();
     // Reset planted coordinates only on an actual start or a discontinuous move.
     if(!initializedFeet||!wasWalking){footAnchors[s].copy(lastFootWorld[s]);swingStarts[s].copy(lastFootWorld[s]);lastSupport[s]=support;}
     if(support&&!lastSupport[s]){
      // A frame can cross touchdown. Plant at the exact distance-phase boundary,
      // rather than freezing the previous (still-swinging) frame's short landing.
      // The latter shortened strides at low refresh rates and forced stance glide.
      footAnchors[s].set(x,ankleY,lead).applyMatrix4(root.matrixWorld);
      footAnchors[s].addScaledVector(velocity,-u*locomotion.stepLength/currentSpeed);
      footAnchors[s].y=supportHeight(footAnchors[s])+ankleY*root.scale.y;
     }
     if(!support&&lastSupport[s])swingStarts[s].copy(footAnchors[s]);
     if(support){target.copy(footAnchors[s]).applyMatrix4(inverseRoot);target.y-=visualFloorOffset/root.scale.y;}
     else{
      tmp.set(x,ankleY,lead).applyMatrix4(root.matrixWorld);tmp.y=supportHeight(tmp)+ankleY*root.scale.y;
      target.copy(swingStarts[s]).lerp(tmp,u*u*(3-2*u)).applyMatrix4(inverseRoot);target.y-=visualFloorOffset/root.scale.y;target.y+=Math.sin(u*Math.PI)*lift;
     }
     // Safe reach on tight turns. Straight-line support stays fixed in world space.
     target.x=clamp(target.x,x-.14,x+.14);const reachZ=Math.max(.32,lead+.04);target.z=clamp(target.z,-reachZ,reachZ);
     // Keep both toes and garment clear of the current authored support. No root lift.
     tmp.copy(target).applyMatrix4(root.matrixWorld);const minAnkle=(supportHeight(tmp)-rootWorld.y-visualFloorOffset)/root.scale.y+ankleY;
     target.y=Math.max(target.y,minAnkle);
     lastSupport[s]=support;metrics.support[s]=support;
    }else if(walking){
     target.set(x,ankleY,-.025);lastSupport[s]=true;
    }
    // Fit a sole plane to the authored footprint, then clear heel/toe corners.
    // This also handles a ramp ending on a landing without burying the shoe tip.
    footOrient[s].identity();
    if(context?.groundHeightAt||walking&&physical){
     footProbe.copy(target).applyMatrix4(root.matrixWorld);
     footBack.copy(footProbe).addScaledVector(forwardWorld,-.075);footFront.copy(footProbe).addScaledVector(forwardWorld,.075);
     footLeft.copy(footProbe).addScaledVector(rightWorld,-.06);footRight.copy(footProbe).addScaledVector(rightWorld,.06);
     const gz=clamp((supportHeight(footFront)-supportHeight(footBack))/.15,-1.2,1.2),gx=clamp((supportHeight(footRight)-supportHeight(footLeft))/.12,-1.2,1.2);
     let rough=false,previousSample=null,previousDelta=null;
     for(let k=0;k<5;k++){footFront.copy(footProbe).addScaledVector(forwardWorld,-.12+k*.08);const h=supportHeight(footFront);if(previousSample!==null){const delta=h-previousSample;if(previousDelta!==null&&Math.abs(delta-previousDelta)>.012)rough=true;previousDelta=delta;}previousSample=h;}
     // Real treads take a level sole on the highest contacted step. A continuous
     // ramp takes a pitched sole. Fitting a diagonal through a riser clips its edge.
     unevenSupport||=rough;
     footNormal.set(rough?0:-gx*root.scale.x/root.scale.y,1,rough?0:-gz*root.scale.z/root.scale.y).normalize();footOrient[s].setFromUnitVectors(footUp,footNormal);
     let supportedWorldY=-Infinity;
     for(const xx of[-.054,.054])for(const yy of[-.101,-.078])for(const zz of[-.075,.05,.182]){
      footOffset.set(xx,yy,zz).applyQuaternion(footOrient[s]);footFront.copy(footProbe).addScaledVector(rightWorld,footOffset.x*root.scale.x).addScaledVector(forwardWorld,footOffset.z*root.scale.z);
      supportedWorldY=Math.max(supportedWorldY,supportHeight(footFront)-footOffset.y*root.scale.y+.004);
     }
     if(rough||Math.abs(gx)+Math.abs(gz)<.01){
      footFront.copy(footProbe).addScaledVector(forwardWorld,.0535*root.scale.z);
      const ex=Math.abs(rightWorld.x)*.054*root.scale.x+Math.abs(forwardWorld.x)*.1285*root.scale.z,ez=Math.abs(rightWorld.z)*.054*root.scale.x+Math.abs(forwardWorld.z)*.1285*root.scale.z;
      let maximum=context?.footprintHeightAt?.(footFront.x-ex,footFront.x+ex,footFront.z-ez,footFront.z+ez);
      if(!Number.isFinite(maximum)){maximum=-Infinity;for(let k=0;k<=12;k++){footFront.copy(footProbe).addScaledVector(forwardWorld,(-.075+k*.257/12)*root.scale.z);maximum=Math.max(maximum,supportHeight(footFront));}}
      if(Number.isFinite(maximum)){if(maximum-supportHeight(footProbe)>.012)unevenSupport=true;supportedWorldY=Math.max(supportedWorldY,maximum+.101*root.scale.y+.004);}
     }
     const supportedY=(supportedWorldY-rootWorld.y-visualFloorOffset)/root.scale.y;
     target.y=walking&&physical?Math.max(target.y,supportedY):supportedY;
    }
   }
   // A rear planted foot may still be on a lower tread after the root reaches a
   // landing. Lower the pelvis to both legs' reachable height instead of sliding it.
   let hipLimit=posedP[0].y;
   for(let s=0;s<2;s++){const ids=s?[13,14,15]:[10,11,12],target=footTargets[s],reach=rest[ids[0]].distanceTo(rest[ids[1]])+rest[ids[1]].distanceTo(rest[ids[2]])-.003,horizontal=(target.x-posedP[ids[0]].x)**2+(target.z-posedP[ids[0]].z)**2;hipLimit=Math.min(hipLimit,target.y+Math.sqrt(Math.max(.01,reach*reach-horizontal)));}
   const hipAdjust=Math.min(0,hipLimit-posedP[0].y);if(hipAdjust<0)for(const i of[0,1,2,3,4,7,10,13])posedP[i].y+=hipAdjust;
   for(let s=0;s<2;s++){foot(s,footTargets[s]);posedQ[s?15:12].copy(footOrient[s]);}
  }else if(action==='bathe'){
   // Relaxed bent knees extend into the basin; feet and robe settle on its bottom.
   foot(0,tmp.set(-.13,.108,.62));foot(1,tmp.set(.13,.108,.62));
  }else if(action==='chair-sit'){
   // A raised seat retains planted soles and bends the knees forward. The
   // pelvis height is authored from the measured cushion, not a root teleport.
   const seatFootZ=.40;
   foot(0,tmp.set(-.11,.108,seatFootZ));foot(1,tmp.set(.11,.108,seatFootZ));
  }else{
   // Actual thighs, flexed knees and folded shins; the same continuous robe skins over them.
   foot(0,tmp.set(-.105,.108,-.13));foot(1,tmp.set(.105,.108,-.13));
  }
  for(const [i,j] of [[16,11],[17,14]]){posedP[i].copy(posedP[j]);if(walking&&unevenSupport)posedP[i].y+=.12;else if(walking&&/gown|dress|hakama/.test(wardrobePreset))posedP[i].y+=.016;if(action!=='kotatsu'&&Math.abs(slope)>.01)posedP[i].y+=Math.abs(slope)*.085;if(action==='chair-sit')posedP[i].y+=.055;if(action==='kotatsu'||action==='bathe')posedP[i].y+=/gown|hakama/.test(wardrobePreset)?.098:.045;posedQ[i].copy(posedQ[j]);}
  initializedFeet=walking&&physical;
  if(walking){swingArm(0,t);swingArm(1,t);}
  else if(action){reach(0,-.304,rest[6].y,.008);reach(1,.304,rest[9].y,.008);}
  else{for(const i of [4,5,6,7,8,9]){posedP[i].copy(rest[i]).sub(rest[0]).applyQuaternion(torsoQ).add(posedP[0]);posedQ[i].copy(torsoQ);}}
  let lookX=walking?.035:0,lookY=walking?0:Math.sin(time*.7)*.045;
  if(action==='bathe'){
   const hip=context?.bathHipHeight??.32;reach(0,-.22,hip+.29,.28);reach(1,.22,hip+.29+Math.sin(time*.7)*.006,.28);lookX=-.03;lookY=Math.sin(time*.35)*.025;
  }else if(action==='lie-rest'){lookX=0;lookY=0;
  }else if(action==='chair-sit'){
   reach(0,-.18,chairHeight+.15,.25);reach(1,.18,chairHeight+.15,.25);lookX=.025;lookY=Math.sin(time*.35)*.025;
  }else if(action==='kotatsu'){
   const sip=Math.pow((Math.sin(time*.8)+1)*.5,3);reach(0,-.22,.67,.31);reach(1,.15,.71+sip*.32,.31-sip*.14);show('cup');lookX=.10-sip*.08;lookY=Math.sin(time*.35)*.035;
  }else if(action==='sushi-eat'){
   const sip=Math.pow((Math.sin(time*.95)+1)*.5,2);reach(0,-.14,1.18,.29);reach(1,.08,1.37+sip*.07,.26-sip*.15);show('sushiPlate','chopsticks');lookX=.13-sip*.08;
  }else if(action==='ramen'){
   const serve=(Math.sin(time*1.15)+1)*.5;reach(0,-.15,1.04+serve*.06,.29);reach(1,.07-serve*.045,1.24+serve*.10,.28-serve*.035);show('ramenBowl',serve<.83?'ladle':'chopsticks');lookX=.13;
  }else if(action==='bath-attendant'){
   const sweep=Math.sin(time*1.45);reach(0,-.25+sweep*.055,.92,.26+sweep*.025);reach(1,.32,1.03,.21);show('bathCloth','bathBucket');lookX=.20;
  }else if(/relax/.test(action||'')){reach(0,-.25,.955,.13);reach(1,.25,.955,.13);lookX=-.04;}
  else if(/ritual/.test(action||'')){reach(0,-.19,1.40,.28);reach(1,.18,1.43+Math.sin(time*.7)*.018,.28);show('feather');lookX=.09;}
  else if(/knead|bread/.test(action||'')){const press=Math.sin(time*3.4);reach(0,-.15,1.16+press*.025,.36);reach(1,.15,1.16+Math.sin(time*3.4+.7)*.025,.36);lookX=.20;}
  else if(/cook|sushi|bake/.test(action||'')){reach(0,-.14,1.20,.34);reach(1,.16,1.24+Math.sin(time*5)*.04,.33);show('knife');lookX=.20;}
  else if(/paint|calligraphy|craft|art/.test(action||'')){const low=/calligraphy/.test(action);reach(0,-.19,1.14,.30);reach(1,.12+Math.sin(time*1.2)*.035,low?1.23:1.43+Math.sin(time*1.4)*.027,low?.34:.30);show('brush');if(!low)show('palette');lookX=low?.17:.035;}
  else if(/tea/.test(action||'')){const sip=Math.pow((Math.sin(time*.9)+1)*.5,2);reach(0,-.17,1.10,.29);reach(1,.11,1.12+sip*.30,.30-sip*.145);show('cup');lookX=.09-sip*.065;}
  else if(/read|rest/.test(action||'')){reach(0,-.16,1.13,.29);reach(1,.18,1.13,.29);show('book');lookX=.22;}
  else if(/garden/.test(action||'')){reach(0,-.27,.96,.14);reach(1,.26,1.09,.29);show('can');lookX=.17;}
  else if(action){reach(0,-.18,1.02,.28);reach(1,.18,1.04+Math.sin(time*2.7)*.025,.29);show('cloth');lookX=.18;}
  // Explicit routine carrying is opt-in: keep the vessel upright at a real
  // hand while walking, without changing the normal gait or station poses.
  if(context?.heldProp==='cloth'){
   reach(0,-.18,1.03,context.handoff?.43:.27);show('cloth');
   if(context.handoff)reach(1,.18,1.04,.40);
  }else if(context?.heldProp==='bathBucket'){
   reach(1,.30,.92,.15);show('bathBucket');
  }else if(context?.handoff){reach(0,-.16,1.02,.43);reach(1,.16,1.03,.43);}
  // Optional main-supplied authored work surface in actor-local metres. Distant
  // ritual/reading targets stay observational; only genuine tabletop jobs use it.
  const workHeight=context?.workHeight;
  if(Number.isFinite(workHeight)&&workHeight>.55&&workHeight<1.65&&action!=='kotatsu'){
   const surface=workHeight/(masc?1.035:1)-visualFloorOffset/root.scale.y,forward=clamp(context?.workDistance??.38,.25,action==='calligraphy'?.57:.455);
   if(/knead|bread/.test(action||'')){reach(0,-.15,surface+.065+Math.sin(time*3.4)*.017,forward);reach(1,.15,surface+.065+Math.sin(time*3.4+.7)*.017,forward);}
   else if(/^(cook|sushi|bake)$/.test(action||'')){if(surface>1.30){reach(0,-.14,surface+.045,Math.min(forward,.36));reach(1,.16,surface+.215+Math.sin(time*5)*.018,Math.min(forward,.34));props.tools.knife.rotation.x=-.60;}else{reach(0,-.14,surface+.075,forward);reach(1,.16,surface+.255+Math.sin(time*5)*.030,forward-.01);}}
   else if(/calligraphy/.test(action||'')){reach(0,-.18,surface+.045,forward-.025);reach(1,.12+Math.sin(time*1.2)*.03,surface+.265,forward-.025);}
   else if(action==='bath-attendant'){reach(0,-.25+Math.sin(time*1.45)*.055,surface+.075,forward-.02);}
   else if(/tidy/.test(action||'')){reach(0,-.18,surface+.08,forward-.025);reach(1,.18,surface+.095,forward-.025);}
  }
  if(action){posedQ[6].setFromEuler(new THREE.Euler(-Math.PI/2,0,0));posedQ[9].identity();if(/knead|bread|tidy/.test(action))posedQ[9].setFromEuler(new THREE.Euler(-Math.PI/2,0,0));}
  if(action==='chair-sit'){posedQ[6].setFromEuler(new THREE.Euler(-Math.PI/2,0,0));posedQ[9].copy(posedQ[6]);}
  headQ.setFromEuler(new THREE.Euler(lookX,lookY,0));posedQ[3].copy(torsoQ).multiply(headQ);
  if(action==='lie-rest'){
   // Supine, face upward, head toward the pillow (-local Z). Keep the original
   // body/face/garment surfaces; transform the rig rather than squashing them.
   for(let i=0;i<posedP.length;i++){posedP[i].copy(rest[i]);posedQ[i].identity();}
   if(poseChanged){lieOffsets.back=0;lieOffsets.spine=0;lieOffsets.head=0;lieOffsets.heel=0;}settleLieJoints();rig.rotation.x=-Math.PI/2;rig.position.set(0,0,context?.lieOffset??.70);
  }
  if(supportedOnsen)poseOnsen(context,time);
  applyPose();
  if(action==='chair-sit'&&!context?.heldProp&&!context?.handoff){
   if(poseChanged||fittedChairHeight!==chairHeight)fitChairHands(chairHeight);
   poseChairHands();applyPose();
  }
  if(mountedPose){
   const supportY=Number.isFinite(context?.supportY)?context.supportY:rootWorld.y;
   if(poseChanged){
    // One bounded contact fit on activation; no geometry scan in the frame loop.
    rig.position.y=0;
    if(supportedOnsen){
     // Fit the two real support surfaces independently. The seat carries the
     // posterior while the soles stay on the basin bottom; no whole-body lift
     // is used to put the head above water.
     for(let pass=0;pass<3;pass++){
      const skin=measureOnsenSkin(context),desired=(context.bathPose.seatY-supportY)/root.scale.y+skin.sole;
      onsenHip=clamp(onsenHip+desired-skin.hip,.25,.52);poseOnsen(context,time);applyPose();
     }
     let skin=measureOnsenSkin(context);supportCorrection=-skin.sole+.004/root.scale.y;
     poseOnsen(context,time);applyPose();skin=measureOnsenSkin(context);
     onsenBackOffset=context.bathPose.backZ/root.scale.z-skin.back+.006/root.scale.z;
     if(skin.lapPoint&&skin.lapNormal){
      onsenLapPoint.copy(skin.lapPoint);onsenLapNormal.copy(skin.lapNormal);
      dir.copy(posedP[14]).sub(posedP[13]);dir.addScaledVector(onsenLapNormal,-dir.dot(onsenLapNormal)).normalize();
      onsenLapPalmQ.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir.clone().cross(onsenLapNormal).normalize(),dir.clone().negate(),onsenLapNormal.clone().negate()));fitOnsenPalmContact();
     }
     for(let pass=0;pass<3;pass++){
      poseOnsen(context,time);applyPose();skin=measureOnsenSkin(context);
      if(Number.isFinite(skin.armSupportMin))onsenArmLift=clamp(onsenArmLift+(context.bathPose.backTopY-supportY+.004)/root.scale.y-supportCorrection-skin.armSupportMin,-.04,.09);
     }
     poseOnsen(context,time);applyPose();skin=measureOnsenSkin(context);
     poseMinY=skin.min;poseMaxY=skin.max;metrics.lieContact=null;
     metrics.bathContact={hip:{surface:context.bathPose.seatY,body:supportY+(skin.hip+supportCorrection)*root.scale.y,gap:supportY+(skin.hip+supportCorrection)*root.scale.y-context.bathPose.seatY},sole:{surface:supportY,body:supportY+(skin.sole+supportCorrection)*root.scale.y,gap:.004},back:{surface:context.bathPose.backZ,body:(skin.back+onsenBackOffset)*root.scale.z,gap:.006,height:skin.backY,top:context.bathPose.backTopY},waterY:context.bathPose.waterY};
     const finalPoint=p=>p?p.clone().add(V(0,(supportY-rootWorld.y)/root.scale.y+supportCorrection,onsenBackOffset)).applyMatrix4(root.matrixWorld).toArray():null;
     metrics.bathHandContact={forearm:{surface:context.bathPose.backTopY,body:supportY+(skin.forearmMin+supportCorrection)*root.scale.y,gap:supportY+(skin.forearmMin+supportCorrection)*root.scale.y-context.bathPose.backTopY,point:finalPoint(skin.forearmPoint)},palm:{point:finalPoint(skin.palmPoint),supportPoint:finalPoint(skin.lapPoint),gap:skin.palmPoint?.distanceTo(skin.lapPoint)*root.scale.y,supportNormal:skin.lapNormal?.toArray(),supportTriangle:skin.lapTriangle},palmNormals:[V(0,0,1).applyQuaternion(posedQ[6]).toArray(),V(0,0,1).applyQuaternion(posedQ[9]).toArray()]};
    }else if(action==='lie-rest'&&context?.lieSupport&&shapeTraits.legLength!==1){
     fitShapedLie(context,supportY);
    }else if(action==='lie-rest'&&context?.lieSupport){
     let skin=measureLieSkin(),hipTarget=supportY,target={...context.lieSupport};
     // The same garment cut can place its posterior at a different point on a
     // folded quilt. Raycast those real contact points instead of guessing one plane.
     for(let pass=0;pass<3;pass++){
      for(const part of['hip','back','head','heel'])if(skin.points[part]&&context.lieSurfaceHeightAt){tmp2.copy(skin.points[part]).applyMatrix4(root.matrixWorld);target[part]=context.lieSurfaceHeightAt(tmp2.x,tmp2.z);}
      const hip=Number.isFinite(skin.hip)?skin.hip:skin.min;hipTarget=target.hip;supportCorrection=-hip+.004/root.scale.y;
      for(const part of['back','head','heel']){const delta=Number.isFinite(skin[part])?(target[part]-target.hip)/root.scale.y-(skin[part]-hip):0;lieOffsets[part]=clamp(lieOffsets[part]+delta,-.24,.24);}
      for(let i=0;i<posedP.length;i++){posedP[i].copy(rest[i]);posedQ[i].identity();}settleLieJoints();applyPose();skin=measureLieSkin();
     }
     supportCorrection=(hipTarget-supportY)/root.scale.y-(Number.isFinite(skin.hip)?skin.hip:skin.min)+.004/root.scale.y;poseMinY=skin.min;poseMaxY=skin.max;
     metrics.lieContact={};for(const part of['back','hip','head','heel'])metrics.lieContact[part]={surface:target[part],body:supportY+(skin[part]+supportCorrection)*root.scale.y,gap:supportY+(skin[part]+supportCorrection)*root.scale.y-target[part]};

    }else{
     const skin=measureLieSkin();poseMinY=skin.min;poseMaxY=skin.max;supportCorrection=-poseMinY+.004/root.scale.y;metrics.lieContact=null;
    }
   }
   rig.position.y=(supportY-rootWorld.y)/root.scale.y+supportCorrection;if(supportedOnsen)rig.position.z=onsenBackOffset;root.updateMatrixWorld(true);skeleton.update();
   metrics.contactMinY=supportY+(poseMinY+supportCorrection)*root.scale.y;metrics.contactMaxY=supportY+(poseMaxY+supportCorrection)*root.scale.y;

  }else{metrics.contactMinY=null;metrics.contactMaxY=null;metrics.lieContact=null;metrics.bathContact=null;metrics.bathHandContact=null;}

  if(action==='sushi-eat')props.right.rotation.x-=Math.pow((Math.sin(time*.95)+1)*.5,2)*.55;
  if(/garden/.test(action||''))props.right.rotation.z=-.35;
  // Fixed-size pose data: no per-frame Box3 or scene traversal.
  metrics.height=height+visualFloorOffset;metrics.visualFloorOffset=visualFloorOffset;metrics.headHeight=mountedPose?bones[3].getWorldPosition(tmp).y-rootWorld.y+.16*root.scale.y:(posedP[3].y+.16)*root.scale.y+visualFloorOffset;metrics.labelHeight=mountedPose?metrics.headHeight+.2:(posedP[3].y+template.height-1.455+.16)*root.scale.y+visualFloorOffset;root.userData.labelHeight=metrics.labelHeight;
  for(let s=0;s<2;s++){lastFootWorld[s].copy(posedP[s?15:12]).applyMatrix4(root.matrixWorld);lastFootWorld[s].y+=visualFloorOffset;metrics.feet[s]=clonePoint(posedP[s?15:12]);metrics.hands[s]=clonePoint(posedP[s?9:6]);}
  metrics.grounded=mountedPose||action==='chair-sit'||action==='kotatsu'||posedP[12].y>=footTargets[0].y-.003&&posedP[15].y>=footTargets[1].y-.003;metrics.rigBones=18;metrics.continuousCloth=true;metrics.unevenSupport=unevenSupport;
  previousRoot.copy(rootWorld);lastTime=time;wasWalking=walking;previousYaw=root.rotation.y;
 }
 function dispose(){if(disposed)return;disposed=true;skeleton.dispose();disposeHandProps(props);releaseTemplate(template);const geometry=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry&&!o.geometry.userData.characterShared)geometry.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m&&!m.userData?.characterShared)materials.add(m);});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.userData.disposed=true;}
 function getPoseMetrics(){return {...metrics,feet:metrics.feet.map(x=>x.slice()),hands:metrics.hands.map(x=>x.slice())};}
 animate(0,false,null);
 return {root,animate,dispose,locomotion,get height(){return height+visualFloorOffset;},getPoseMetrics};
}
export function characterResourceStats(){return {cachedTemplates:cache.size,cacheLimit:CACHE_LIMIT,activeReferences:[...cache.values()].reduce((a,t)=>a+t.refs,0),cachedTriangles:[...cache.values()].reduce((a,t)=>a+t.geometry.reduce((s,g)=>s+g.index.count/3,0),0),sharedBodyMaterials:2};}
export function auditCharacter(actor){let meshes=0,visibleMeshes=0,triangles=0,visibleTriangles=0,finite=true;const materials=new Set();actor.root.traverse(o=>{if(!o.isMesh)return;meshes++;let shown=true;for(let p=o;p;p=p.parent)if(!p.visible)shown=false;const t=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;triangles+=t;if(shown){visibleMeshes++;visibleTriangles+=t;}materials.add(o.material);for(const v of o.geometry.attributes.position.array)finite&&=Number.isFinite(v);});return {meshes,visibleMeshes,triangles,visibleTriangles,materials:materials.size,finite,height:actor.height,bones:18,...actor.getPoseMetrics()};}
