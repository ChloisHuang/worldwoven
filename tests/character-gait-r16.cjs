// Bounded character-only contract. No lots, renderer, browser, or vertex scans.
const assert=require('node:assert/strict');
const {createBrowserModuleLoader}=require('./fixtures/browser-module-loader.cjs');
(async()=>{
 const load=createBrowserModuleLoader(process.env.SOURCE_ROOT||'source'),C=await load('game/characters.js'),A=await load('game/appearance.js'),S=await load('game/character-traits.js'),T=await load('vendor/three/build/three.module.js');
 const low=Object.fromEntries(Object.entries(S.SHAPE_RANGES).map(([k,v])=>[k,v.min])),high=Object.fromEntries(Object.entries(S.SHAPE_RANGES).map(([k,v])=>[k,v.max]));
 const oldShoulder={'feminine-balanced':.965,'feminine-slender':.935,'masculine-lean':1.08,'masculine-broad':1.135};
 const rows=[],smoke=process.argv.includes('--smoke'),looks=[];
 for(const bodyPreset of A.BODY_PRESETS){
  const sex=bodyPreset.startsWith('masculine')?'masculine':'feminine';
  if(smoke){looks.push({culture:'japan',bodyPreset,wardrobePreset:sex==='feminine'?'kimono-soft-sleeve':'miko-hakama',shapeTraits:bodyPreset.endsWith('slender')||bodyPreset.endsWith('lean')?low:high});continue;}
  for(const shapeTraits of [null,low,high]){
   for(const culture of Object.keys(A.WARDROBE_PRESETS))for(const wardrobePreset of A.WARDROBE_PRESETS[culture][sex])looks.push({culture,bodyPreset,wardrobePreset,shapeTraits});
   looks.push({culture:'japan',bodyPreset,wardrobePreset:'miko-hakama',shapeTraits,locomotionWardrobePreset:'haori-trouser'});
   // The shared temporary bath garment is outside selectable wardrobe catalogs.
   looks.push({culture:'japan',bodyPreset,wardrobePreset:'bath-robe',shapeTraits});
  }
 }
 const inverse=new T.Matrix4(),point=bone=>bone.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
 for(const opts of looks){
  const a=C.createCharacter(opts);a.root.updateMatrixWorld(true);inverse.copy(a.root.matrixWorld).invert();
  const joints=()=>[0,1].map(side=>[a.root.userData.arms[side],a.root.userData.forearms[side],a.root.userData.hands[side]].map(point));
  const rest=joints(),restLengths=rest.map(([s,e,h])=>[s.distanceTo(e),e.distanceTo(h)]),width=rest[0][0].distanceTo(rest[1][0]);
  const oldWidth=.342*(1+(oldShoulder[opts.bodyPreset]-1)*(1.326-1.03)/.30);
  assert(width<oldWidth*.94,'narrower shoulder sculpt, matched by the rig');
  const series=[[],[]],flex=[[],[]],extension=[],handY=[[],[]];let vertexScans=0;
  a.root.traverse(m=>{if(m.isSkinnedMesh){const get=m.getVertexPosition.bind(m);m.getVertexPosition=(...args)=>{vertexScans++;return get(...args);};}});
  // Exactly two stride cycles, small enough increments to avoid discontinuity.
  for(let frame=1;frame<=64;frame++){
   a.root.position.z+=a.locomotion.strideLength/32;a.animate(frame/60,true,null,{groundHeightAt:()=>0,footprintHeightAt:()=>0});a.root.updateMatrixWorld(true);inverse.copy(a.root.matrixWorld).invert();
   const pose=joints();for(let side=0;side<2;side++){
    const [s,e,h]=pose[side],upper=e.clone().sub(s),lower=h.clone().sub(e),lengths=[upper.length(),lower.length()];
    lengths.forEach((length,i)=>assert(Math.abs(length-restLengths[side][i])<1e-8,'walking segment length is constant'));
    extension.push(lengths[0]+lengths[1]-s.distanceTo(h));flex[side].push(upper.angleTo(lower));series[side].push(h.z);handY[side].push(h.y);
    assert([...s.toArray(),...e.toArray(),...h.toArray()].every(Number.isFinite));
   }
  }
  assert(Math.min(...extension)>.002,'elbows do not approach the old reach-limit lock');
  for(let side=0;side<2;side++){
   assert(Math.max(...series[side])-Math.min(...series[side])>.07,'both arms visibly travel front/back');
   assert(Math.max(...flex[side])-Math.min(...flex[side])>.02,'elbow flex changes with shoulder swing');
   assert(Math.max(...handY[side])-Math.min(...handY[side])>.005,'wrist follows an arc rather than a fixed-height rail');
  }
  const means=series.map(v=>v.reduce((n,x)=>n+x,0)/v.length),cov=series[0].reduce((n,v,i)=>n+(v-means[0])*(series[1][i]-means[1]),0);
  assert(cov<0,'left/right hands move in opposing gait phases');
  assert.equal(vertexScans,0,'walking frame loop does not scan or mutate skinned geometry');
  const snapshot=joints().map(side=>side.map(p=>p.toArray()));a.animate(65/60,true);a.root.updateMatrixWorld(true);inverse.copy(a.root.matrixWorld).invert();
  // No distance means no phase advance; only the already-existing torso support
  // calculation may adjust height, so compare each arm relative to its shoulder.
  const stopped=joints();for(let side=0;side<2;side++)for(let joint=1;joint<3;joint++)assert(stopped[side][joint].clone().sub(stopped[side][0]).distanceTo(new T.Vector3(...snapshot[side][joint]).sub(new T.Vector3(...snapshot[side][0])))<1e-8,'blocked walking cannot keep swinging');
  a.animate(66/60,false,'tea');assert(a.root.userData.tools.cup.visible,'existing action still owns the arms and props');
  rows.push({culture:opts.culture,bodyPreset:opts.bodyPreset,wardrobePreset:opts.wardrobePreset,legLength:opts.shapeTraits?.legLength??1,shoulderWidth:width,previousSculptShoulderWidth:oldWidth,minArmExtensionGap:Math.min(...extension),elbowRange:flex.map(v=>[Math.min(...v),Math.max(...v)])});a.dispose();
 }
 assert.equal(C.characterResourceStats().activeReferences,0);
 console.log(JSON.stringify({status:'PASS',scope:'Character-only CPU joint math; no scene, garment clipping, visual acceptance or device performance claim',actors:rows.length,frames:rows.length*64,rows},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
