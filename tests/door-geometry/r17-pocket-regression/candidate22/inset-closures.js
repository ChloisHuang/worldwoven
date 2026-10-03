import {THREE,box} from './geometry.js';

// Architectural sections, authored with an actual opening in the source wall.
// The source builder removes roughOpening first; this helper NEVER conceals a
// solid wall behind moving leaves. Width is the usable nominal aperture.
export function insetClosureSection(options){
 const {kind='hinge',axis='x',at,lateral=0,bottom=0,top,width,style='palace',swing=1}=options;
 const shoji=style==='shoji',wallDepth=options.wallDepth??(kind==='pocket'?(shoji?.38:.50):.32),jambWidth=.08;
 if(!['hinge','pocket'].includes(kind)||!Number.isFinite(at)||!Number.isFinite(top)||!(top>bottom)||!(width>.6)||!(wallDepth>=.20))throw Error('Invalid inset closure section');
 const mount={kind,wallPlane:at,wallDepth,revealDepth:wallDepth,hingeLateralInset:.006,hingeNormalOffset:options.hingeNormalOffset??(wallDepth>=.32?.155:.065),sideOverlap:kind==='pocket'?(shoji?.10:style==='french'?.14:.04):0,slideTravel:width/2+.020};
 const group=new THREE.Group();group.name='Inset '+kind+' section';group.position.set(axis==='x'?lateral:at,bottom,axis==='x'?at:lateral);if(axis==='z')group.rotation.y=Math.PI/2;
 const solids=[],parts=[],h=top-bottom,color=options.color??({shoji:0x765744,palace:0x805137,french:0xe6e0c9,egypt:0x5e503b}[style]);
 function part(name,x,y,z,w,height,depth,c=color,walkBlock=true){const m=box(group,x,y,z,w,height,depth,c);m.name=name;const b={minX:x-w/2,maxX:x+w/2,minY:y-height/2,maxY:y+height/2,minZ:z-depth/2,maxZ:z+depth/2};solids.push({...b,walkBlock});parts.push({name,bounds:b,walkBlock});return m;}
 let roughOpening;
 if(kind==='pocket'){
  const skin=shoji?.06:.07,inner=wallDepth/2-skin,outer=width+mount.sideOverlap+.06,cavityEnd=outer-.02;
  if(inner<(shoji?.1025:.149)+.02)throw Error('Pocket has no physical leaf-face clearance');
  mount.pocketClearDepth=inner*2;mount.pocketEnd=cavityEnd;mount.pocketOuter=outer;
  for(const side of[-1,1]){
   const start=width/2,span=outer-start;
   for(const face of[-1,1])part('Pocket opaque wall skin',side*(start+span/2),(h+.10)/2,face*(inner+skin/2),span,h+.10,skin);
   if(style==='french'){
    // A split jamb closes the mouth around the complete sliding hardware.
    // Both cheeks are housed inside, and overlap, the actual cassette skins.
    // The longer hidden stile overlap preserves the nominal clear opening.
    const mouthInner=.160,mouthWidth=.150,mouthDepth=wallDepth/2-mouthInner;
    if(!(mouthDepth>skin))throw Error('French pocket mouth does not join its wall skin');
    for(const face of[-1,1])part('Integrated pocket mouth jamb',side*(start+mouthWidth/2),(h+.10)/2,face*(mouthInner+mouthDepth/2),mouthWidth,h+.10,mouthDepth);
    mount.pocketMouth={innerFace:mouthInner,depth:mouthDepth,lateralWidth:mouthWidth,clearWidth:width,joinedToBothOpaqueSkins:true};
   }
   part('Pocket closed end cap',side*(outer-.01),(h+.10)/2,0,.02,h+.10,inner*2);
  }
  part('Pocket structural header',0,h+.065,0,outer*2,.07,inner*2,color,false);
  part('Recessed sliding track',0,h-.001,0,outer*2-.07,.018,.05,shoji?0x513c32:0xb79b54,false);
  roughOpening={from:lateral-outer,to:lateral+outer,bottom,top:top+.10};
 }else{
  for(const side of[-1,1]){
   part('Full-depth joined timber jamb',side*(width/2+jambWidth/2),(h+.08)/2,0,jambWidth,h+.08,wallDepth);
   // This positive rebate overlaps the leaf edge in view, behind its closing
   // face. It does not occupy the wood slab or swing-side working volume.
   part('Rebated closure stop',side*(width/2+.0275),h/2,swing*.080,.105,h,.030);
  }
  part('Full-depth joined timber head',0,h+.04,0,width+jambWidth*2,.08,wallDepth,color,false);
  part('Rebated head stop',0,h+.02,swing*.080,width,.12,.030,color,false);
  roughOpening={from:lateral-width/2-jambWidth,to:lateral+width/2+jambWidth,bottom,top:top+.08};
 }
 group.userData.insetClosureSection={mount:{...mount},nominalOpening:{width,bottom,top},roughOpening:{...roughOpening},parts};
 return {group,mount,roughOpening,localSolids:solids,parts};
}

export function addInsetClosureSection(parent,colliders,cameraColliders,options){
 const section=insetClosureSection(options);parent.add(section.group);section.group.updateWorldMatrix(true,true);
 for(const local of section.localSolids){const b=new THREE.Box3(new THREE.Vector3(local.minX,local.minY,local.minZ),new THREE.Vector3(local.maxX,local.maxY,local.maxZ)).applyMatrix4(section.group.matrixWorld),world={minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z};if(local.walkBlock)colliders.push({...world});cameraColliders.push({...world});}
 return section;
}
