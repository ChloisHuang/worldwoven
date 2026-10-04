// One representative real handoff → committed tea → duty, followed by one
// requested-facility cancellation. Existing fourteen-body route evidence stays
// applicable; this scene verifies the changed decision boundary in production.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let last='',handoff=false,substitution=false,teaSeen=false,capture;
exports.seed=({state,Orders})=>{const b=Orders.createJapanServiceOrders({worldSeed:1});state.saved.japanOperations={...b.state(),staffLife:{version:5,next:10,dueIn:.75,completed:14,interrupted:1}};b.dispose();};
exports.observe=state=>{
 const s=state.japanService.state(),a=s.staffLife.active,n=a&&state.npcs.find(n=>n.station.id===a.id),cover=a&&state.npcs.find(n=>n.station.id===a.reliefId),phase=a?.id+':'+a?.phase;
 if(phase!==last){last=phase;console.log(JSON.stringify({time:+state.elapsed.toFixed(2),phase,choice:a?.choice?.id,position:n?.root.position.toArray()}));}
 if(a?.id==='jp-omamori'&&a.covering&&!['returning','reclaiming'].includes(a.phase)){
  if(!handoff){assert(cover.root.position.distanceTo(n.home)<.15);handoff=true;}
  if(cover.serviceTask?.idle&&cover.serviceTask.arrived){assert.equal(cover.root.userData.appearance.wardrobePreset,'miko-hakama');assert.equal(cover.serviceTask.action,n.station.npcAction);substitution=true;}
 }
 if(a?.id==='jp-omamori'&&a.phase==='tea'&&n.serviceTask?.arrived){assert.equal(n.getPoseMetrics().action,'tea');assert.equal(a.choice.id,'tea');teaSeen=true;capture?.();}
};
exports.run=async({state,T,furniture,frame,until,report})=>{
 const looks=state.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>({id:n.station.id,appearance:JSON.stringify(n.root.userData.appearance)}));assert.equal(looks.length,14);
 let renderer,canvas;const output=process.env.OUT_DIR,frames=[];
 try{
  if(output){fs.mkdirSync(output,{recursive:true});const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(960,720);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(960,720,false);renderer.outputColorSpace=T.SRGBColorSpace;const scene=new T.Scene();scene.background=new T.Color(0xa7c3bf);scene.add(state.lot.group,new T.HemisphereLight(0xfff4d8,0x6e8a7b,.85));const sun=new T.DirectionalLight(0xffedcd,1.6);sun.position.set(-10,26,8);scene.add(sun,sun.target);
   capture=()=>{if(frames.length)return;state.updateCamera(1,true);scene.updateMatrixWorld(true);renderer.render(scene,state.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync(path.join(output,'chosen-tea-tps.png'),canvas.toBuffer('image/png'));frames.push({name:'chosen-tea-tps',player:state.player.root.position.toArray(),camera:state.camera.position.toArray(),target:state.camTarget.toArray()});};
  }
  state.player.root.position.set(-4.9,11.4,5.25);state.yaw=Math.PI;state.pitch=.22;state.distance=4.6;state.navigateTo(new T.Vector3(-6.1,11.4,4.15));assert(state.path.length,'Purposeful walk to watch tea from the normal TPS view');until(()=>!state.path.length,300);assert(state.player.root.position.distanceTo(new T.Vector3(-6.1,11.4,4.15))<.15);
  if(process.env.LIFE_CHOICES_CAPTURE_ONLY==='1'){until(()=>teaSeen,6000);report.status='PASS';report.scope='Normal TPS chosen-tea capture only; completed lifecycle evidence reused. Simulated DOM + Three/Mesa, not browser/iOS.';report.frames=frames;return;}
  until(()=>state.japanService.state().staffLife.completed===15,13500);
  const final=state.japanService.state();assert(handoff&&substitution&&teaSeen);assert.equal(final.staffLife.active,null);assert.equal(final.staffLife.nextWorkerId,'jp-garden-onsen');assert.equal(final.staffLife.interrupted,1);assert.equal(final.staffLife.decisions.people['jp-omamori'].choices,1);assert.equal(final.staffLife.decisions.people['jp-omamori'].last,'tea');assert(!final.staffLife.events.some(e=>['eating','sleeping'].includes(e.event)),'A chosen tea break does not force a meal or sleep');
  for(const look of looks)assert.equal(JSON.stringify(state.npcs.find(n=>n.station.id===look.id).root.userData.appearance),look.appearance);
  until(()=>!!state.japanService.state().staffLife.active?.choice,8000);const before=state.japanService.state().staffLife.active;assert.equal(before.id,'jp-garden-onsen');assert(before.covering);state.japanService.playerRequest(before.choice.facilityId);const cancelled=state.japanService.state().staffLife.active;assert.equal(cancelled.phase,'returning');assert(cancelled.covering,'Real replacement remains on duty until the cancelled worker returns');assert.equal(cancelled.choice,null);
  until(()=>state.japanService.state().staffLife.interrupted===2,8000);assert.equal(state.japanService.state().staffLife.active,null);
  state.disposeLot();assert.equal(state.saved.japanOperations.staffLife.version,6);assert.equal(state.saved.japanOperations.staffLife.decisions.people[before.id].current,null);assert(!furniture.facilities.state().some(f=>f.reservations.length||f.queue.length));
  report.status='PASS';report.scope='One actual shrine handoff, weighted committed tea, safe return and next-worker facility cancellation with continuing coverage; purposeful normal TPS walk/capture. Simulated DOM + Three/Mesa, not actual browser/iOS.';report.simulatedSeconds=state.elapsed;report.frames=frames;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;
 }finally{renderer?.dispose();canvas?.dispose();if(output)fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify(frames,null,2));}
};
