import * as THREE from 'three';

const WIDTH=288,HEIGHT=384;

// Keep geometry/material ownership with the live actor. Object3D.copy normally
// JSON-clones userData, but this rig's metadata contains live Object3D links.
function cloneActor(root){
  const nodes=new Map(),skeletons=new Map();
  function copy(source){
    const node=new source.constructor().copy({...source,userData:{}},false);
    nodes.set(source,node);
    for(const child of source.children)node.add(copy(child));
    return node;
  }
  const clone=copy(root);
  for(const [source,node] of nodes){
    if(!source.isSkinnedMesh)continue;
    let skeleton=skeletons.get(source.skeleton);
    if(!skeleton){
      const bones=source.skeleton.bones.map(bone=>nodes.get(bone));
      if(bones.some(bone=>!bone))throw new Error('Player skeleton extends outside its display tree');
      skeleton=new THREE.Skeleton(bones,source.skeleton.boneInverses.map(matrix=>matrix.clone()));
      skeletons.set(source.skeleton,skeleton);
    }
    node.skeleton=skeleton;
  }
  return {root:clone,nodes,skeletons:[...skeletons.values()]};
}

// Read the parent transform without updating or reparenting the live player.
function parentMatrix(root){
  const chain=[];for(let parent=root.parent;parent;parent=parent.parent)chain.push(parent);
  const matrix=new THREE.Matrix4(),local=new THREE.Matrix4();
  for(const parent of chain.reverse()){
    if(!parent.matrixWorldAutoUpdate){matrix.copy(parent.matrixWorld);continue;}
    local.copy(parent.matrix);
    if(parent.matrixAutoUpdate)local.compose(parent.position,parent.quaternion,parent.scale);
    matrix.multiply(local);
  }
  return matrix;
}

function appearanceKey(root){
  const meshes=[];
  root.traverse(node=>{
    if(!node.isMesh)return;
    const geometry=node.geometry,materials=Array.isArray(node.material)?node.material:[node.material];
    meshes.push([node.uuid,node.visible,geometry.uuid,node.morphTargetInfluences,
      Object.entries(geometry.attributes).map(([name,attribute])=>[name,attribute.version]),
      materials.map(material=>[material.uuid,material.version,material.color?.getHex(),material.opacity,material.visible,
        material.map?.uuid,material.map?.version])]);
  });
  return JSON.stringify([root.userData.characterModel,root.userData.appearance,root.scale.toArray(),meshes]);
}

function portraitCamera(actor,source){
  const head=actor.nodes.get(source.userData.head)||actor.root.getObjectByName('head');
  if(!head)return null;
  const orientation=head.getWorldQuaternion(new THREE.Quaternion()),origin=head.getWorldPosition(new THREE.Vector3());
  const up=new THREE.Vector3(0,1,0).applyQuaternion(orientation),forward=new THREE.Vector3(0,0,1).applyQuaternion(orientation);
  const scale=head.getWorldScale(new THREE.Vector3()),unit=Math.max(.01,Math.abs(scale.y));
  const point=new THREE.Vector3();let top=-Infinity;
  // Measure the current deformed head and hair, including hats, in the camera's
  // upright direction. Long hair cannot drag the portrait down to the waist.
  actor.root.traverseVisible(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const headIndex=mesh.skeleton.bones.indexOf(head),{position,skinIndex,skinWeight}=mesh.geometry.attributes;
    if(headIndex<0||!position||!skinIndex||!skinWeight)return;
    for(let i=0;i<position.count;i++){
      let weight=0;
      for(let j=0;j<4;j++)if(skinIndex.array[i*4+j]===headIndex)weight+=skinWeight.array[i*4+j];
      if(weight<.5)continue;
      mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).sub(origin);
      top=Math.max(top,point.dot(up));
    }
  });
  // Borrowed hats are rigid children of the existing head bone. Include their
  // actual vertices in the same upright frame; no change to the live actor.
  head.traverseVisible(mesh=>{
    if(!mesh.isMesh||mesh.isSkinnedMesh)return;
    const position=mesh.geometry?.attributes.position;if(!position)return;
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).sub(origin);
      top=Math.max(top,point.dot(up));
    }
  });
  if(!Number.isFinite(top))return null;
  const height=Math.max(.78*unit,top+.43*unit),width=height*WIDTH/HEIGHT;
  const center=origin.clone().addScaledVector(up,top+.055*unit-height/2);
  const camera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.01,20*unit);
  camera.up.copy(up);camera.position.copy(center).addScaledVector(forward,3*unit);camera.lookAt(center);
  return {camera,center,up,forward,unit};
}

/** A lazy photo of the actual player; call only when opening its identity page. */
export function createPassportPortrait({renderer,getPlayer,document:doc=globalThis.document}={}){
  let disposed=false,target=null,cachedRoot=null,cachedKey=null,cachedPhoto=null;
  function capture(){
    if(disposed||!renderer||!doc?.createElement)return null;
    let actor=null,state=null;
    try{
      const root=getPlayer?.()?.root;
      if(!root?.isObject3D||!root.visible){cachedRoot=null;cachedKey=null;cachedPhoto=null;return null;}
      const key=appearanceKey(root);
      if(root===cachedRoot&&key===cachedKey&&cachedPhoto)return cachedPhoto;
      const canvas=doc.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
      const context=canvas.getContext('2d');if(!context)return null;
      actor=cloneActor(root);
      const scene=new THREE.Scene(),parent=new THREE.Group();
      parent.matrixAutoUpdate=false;parent.matrix.copy(parentMatrix(root));parent.add(actor.root);scene.add(parent);
      scene.updateMatrixWorld(true);
      for(const skeleton of actor.skeletons)skeleton.update();
      const framed=portraitCamera(actor,root);if(!framed)return null;
      const {camera,center,up,forward,unit}=framed;
      scene.background=new THREE.Color(0xe5e8e2);
      const hemi=new THREE.HemisphereLight(0xfff8ee,0x7a877a,1.05),keyLight=new THREE.DirectionalLight(0xfff6e9,1.6);
      const right=new THREE.Vector3().crossVectors(up,forward);
      keyLight.position.copy(center).addScaledVector(forward,3*unit).addScaledVector(up,2*unit).addScaledVector(right,-2*unit);
      keyLight.target.position.copy(center);scene.add(hemi,keyLight,keyLight.target);
      target??=new THREE.WebGLRenderTarget(WIDTH,HEIGHT,{depthBuffer:true,stencilBuffer:false,samples:2});
      // An sRGB render attachment encodes the linear shader output on the GPU;
      // readback bytes can go straight into the canvas without double gamma.
      target.texture.colorSpace=THREE.SRGBColorSpace;
      state={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),
        viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),
        clearColor:renderer.getClearColor(new THREE.Color()),clearAlpha:renderer.getClearAlpha(),
        autoClear:renderer.autoClear,autoClearColor:renderer.autoClearColor,autoClearDepth:renderer.autoClearDepth,autoClearStencil:renderer.autoClearStencil,
        output:renderer.outputColorSpace,tone:renderer.toneMapping,exposure:renderer.toneMappingExposure,
        shadowEnabled:renderer.shadowMap.enabled,shadowAutoUpdate:renderer.shadowMap.autoUpdate,shadowNeedsUpdate:renderer.shadowMap.needsUpdate,xr:renderer.xr.enabled};
      renderer.xr.enabled=false;renderer.shadowMap.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
      renderer.autoClear=true;renderer.autoClearColor=true;renderer.autoClearDepth=true;renderer.autoClearStencil=true;
      renderer.toneMapping=THREE.NoToneMapping;
      // The target owns its physical-pixel viewport/scissor; leave the game
      // canvas's logical viewport and pixel ratio alone throughout capture.
      renderer.setRenderTarget(target);renderer.render(scene,camera);
      const pixels=new Uint8Array(WIDTH*HEIGHT*4),image=context.createImageData(WIDTH,HEIGHT);
      renderer.readRenderTargetPixels(target,0,0,WIDTH,HEIGHT,pixels);
      for(let y=0;y<HEIGHT;y++)image.data.set(pixels.subarray((HEIGHT-y-1)*WIDTH*4,(HEIGHT-y)*WIDTH*4),y*WIDTH*4);
      context.putImageData(image,0,0);
      const photo=canvas.toDataURL('image/png');
      if(!/^data:image\/png;base64,/.test(photo))return null;
      cachedRoot=root;cachedKey=key;cachedPhoto=photo;
      return photo;
    }catch{return null;}
    finally{
      if(state){
        renderer.autoClear=state.autoClear;renderer.autoClearColor=state.autoClearColor;renderer.autoClearDepth=state.autoClearDepth;renderer.autoClearStencil=state.autoClearStencil;
        renderer.outputColorSpace=state.output;renderer.toneMapping=state.tone;renderer.toneMappingExposure=state.exposure;
        renderer.shadowMap.enabled=state.shadowEnabled;renderer.shadowMap.autoUpdate=state.shadowAutoUpdate;renderer.shadowMap.needsUpdate=state.shadowNeedsUpdate;renderer.xr.enabled=state.xr;
        renderer.setClearColor(state.clearColor,state.clearAlpha);
        renderer.setViewport(state.viewport);renderer.setScissor(state.scissor);renderer.setScissorTest(state.scissorTest);
        renderer.setRenderTarget(state.target,state.face,state.mip);
      }
      // Skeletons own their temporary bone textures. Geometry and material
      // disposal here would corrupt the live player and the template cache.
      for(const skeleton of actor?.skeletons||[])skeleton.dispose();
    }
  }
  function dispose(){
    if(disposed)return;disposed=true;target?.dispose();target=null;cachedRoot=null;cachedKey=null;cachedPhoto=null;
  }
  return {capture,dispose};
}
