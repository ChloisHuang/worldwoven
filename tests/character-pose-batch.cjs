// Candidate-only CPU contract: preserve every simulation pose, defer only the
// ordinary matrix commit. No browser, scene, frame-rate or mobile claim.
const assert=require('node:assert/strict');
const {createBrowserModuleLoader}=require('./fixtures/browser-module-loader.cjs');
(async()=>{
 const load=createBrowserModuleLoader('source'),C=await load('game/characters.js'),T=await load('vendor/three/build/three.module.js');
 const opts={culture:'china',bodyPreset:'feminine-slender',wardrobePreset:'ruqun-long-skirt',shapeTraits:{legLength:1.06}};
 const meshOf=a=>{let mesh;a.root.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});return mesh;};
 function snapshot(a){
  const mesh=meshOf(a),points=[];
  a.root.traverse(o=>{if(o.isSkinnedMesh)for(let i=0;i<o.geometry.attributes.position.count;i+=137)points.push(o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld).toArray());});
  return {metrics:a.getPoseMetrics(),world:mesh.skeleton.bones.map(b=>b.matrixWorld.toArray()),matrices:Array.from(mesh.skeleton.boneMatrices),points};
 }
 function sequence(steps,batch){
  const a=C.createCharacter(opts),parent=new T.Group(),frames=[],reads=[];parent.position.set(2,.2,-3);parent.rotation.y=.4;parent.add(a.root);let time=0;
  for(let f=0;f<13;f++){
   if(batch)C.beginCharacterPoseBatch();
   try{for(let step=0;step<steps;step++){
    time+=1/30;const walking=f<4||f>=10,action=f<4||f>=9?null:f<7?'chair-sit':'lie-rest';
    if(walking){a.root.position.z+=.018;a.root.rotation.y+=.015;}
    a.animate(time,walking,action,{seatHeight:.6,supportY:.8,lieSupport:{hip:.8,back:.82,head:.86,heel:.8},headLook:{yaw:f<9?.25:0,pitch:.08,weight:f<9?1:0}});
    // A real mid-batch hand consumer uses the same refresh as service props.
    // Other frames deliberately do no implicit matrix refresh before snapshot.
    if(f===2){a.root.updateWorldMatrix(true,true);reads.push(a.root.userData.hands.map(h=>h.getWorldPosition(new T.Vector3()).toArray()));}
    reads.push(a.getPoseMetrics());
   }}finally{if(batch)C.endCharacterPoseBatch();}
   frames.push(snapshot(a));
  }
  a.dispose();return {frames,reads};
 }
 for(const steps of[1,3,8])assert.deepEqual(sequence(steps,true),sequence(steps,false),steps+' steps preserve turns, start/stop, chair fit, shaped bed fit, hand reads and actual skinned vertices');
 const a=C.createCharacter(opts),mesh=meshOf(a),update=mesh.skeleton.update.bind(mesh.skeleton);let commits=0;
 mesh.skeleton.update=()=>{commits++;update();};
 C.beginCharacterPoseBatch();C.beginCharacterPoseBatch();
 for(let i=1;i<=8;i++){a.root.position.z+=.018;a.animate(i/30,true);}
 assert.equal(commits,0,'ordinary poses defer matrix commits');C.endCharacterPoseBatch();assert.equal(commits,0,'nested batch retains outer ownership');C.endCharacterPoseBatch();assert.equal(commits,1,'one final commit per actor');
 a.animate(9/30,true);assert.equal(commits,2,'default API still commits immediately');
 assert.throws(()=>{C.beginCharacterPoseBatch();try{a.animate(10/30,true);throw Error('cancelled simulation');}finally{C.endCharacterPoseBatch();}},/cancelled/);assert.equal(commits,3,'aborted simulation still flushes');
 C.beginCharacterPoseBatch();a.animate(11/30,true);a.dispose();C.endCharacterPoseBatch();assert.equal(commits,3,'destroyed dirty actor is removed before flush');C.endCharacterPoseBatch();
 const b=C.createCharacter(opts);b.animate(.1,true);assert.equal(C.characterResourceStats().activeReferences,1,'new actor can be created after cancellation/disposal');b.dispose();assert.equal(C.characterResourceStats().activeReferences,0);
 console.log(JSON.stringify({status:'PASS',scope:'Isolated production-character CPU equality, 1/3/8 steps, seated and shaped bed fit, world hands, skinned vertices, nested/aborted batch and dirty disposal; no browser or device validation'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
