// Two bounded representative scenes use production main/controllers, actual
// actors, routes, shared furniture and temporary wardrobe mesh rebuilding.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const hall=process.env.LOCAL_PAIR==='hall',primary=hall?'jp-tea':'jp-omamori',relief=hall?'jp-balcony':'jp-garden-onsen',index=hall?12:10;
let looks,handoff=false,substitution=false,reverse=false,lastPhase='',capture;const seen=new Set(),frames=[];
exports.seed=({state,Orders})=>{const board=Orders.createJapanServiceOrders({worldSeed:1}),saved=board.state();saved.staffLife={version:5,next:index,dueIn:.75,completed:14,interrupted:1};state.saved.japanOperations=saved;board.dispose();};
exports.observe=state=>{
 const s=state.japanService.state(),life=s.staffLife,a=life.active,n=a&&state.npcs.find(n=>n.station.id===a.id),partner=a&&state.npcs.find(n=>n.station.id===a.reliefId),phase=a?.id+':'+a?.phase;
 if(phase!==lastPhase){lastPhase=phase;console.log(JSON.stringify({phase,time:+state.elapsed.toFixed(2),active:a,actors:s.actors.filter(n=>[primary,relief].includes(n.id))}));}
 for(const job of s.claims)assert(!['jp-omamori','jp-garden-onsen','jp-tea','jp-balcony'].includes(job.workerId),'Local hosts never claim customer orders');
 if(a?.id===primary&&a.covering&&!['draining','handoff'].includes(a.phase)){
  if(!handoff){assert.ok(partner.root.position.distanceTo(n.home)<.15,'Relief physically reaches actual covered anchor before retirement');handoff=true;}
  if(partner.serviceTask?.idle&&partner.serviceTask.arrived){
   assert.equal(partner.serviceTask.action,n.station.npcAction);assert.deepEqual(partner.serviceTask.workTarget,n.station.workTarget);
   if(hall){assert.equal(partner.serviceMount?.id,'japan-kotatsu-host');assert.equal(partner.getPoseMetrics().action,'kotatsu');assert.ok(partner.getPoseMetrics().seated);capture?.('kotatsu-relief-at-cushion',[[-3.45,9.65,7.6],[-7,8.3,5.05]]);}
   else{assert.equal(partner.root.userData.appearance.wardrobePreset,'miko-hakama');assert.equal(partner.root.userData.appearance.hairStyle,'low-bun');assert.equal(partner.getPoseMetrics().action,'tidy');capture?.('shrine-relief-red-white-miko',[[8.6,2.35,28.5],[4.7,1.35,31]]);}
   substitution=true;
  }
 }
 if(a?.id===relief&&a.covering&&partner.serviceTask?.idle&&partner.serviceTask.arrived){assert.deepEqual(partner.serviceTask.workTarget,n.station.workTarget);assert.equal(partner.serviceTask.action,n.station.npcAction);assert.ok(partner.root.position.distanceTo(n.home)<.15);reverse=true;}
 if(!n?.serviceTask?.arrived||a.id!==primary)return;
 if(a.phase==='meal'){assert.equal(n.serviceMount?.kind,'seat');assert.equal(n.getPoseMetrics().action,'chair-sit');seen.add('meal');}
 if(a.phase==='tea'){assert.equal(n.getPoseMetrics().action,'tea');seen.add('tea');}
 if(a.phase==='sleep'){assert.equal(n.serviceMount?.kind,'bed');assert.equal(n.getPoseMetrics().action,'lie-rest');for(const part of ['back','hip','head','heel'])assert(Number.isFinite(n.getPoseMetrics().lieContact?.[part]?.gap),part+' bed contact is measurable');seen.add('sleep');}
};
exports.run=async({state,T,Orders,furniture,frame,until,report})=>{
 let renderer,canvas;const output=process.env.OUT_DIR;looks=state.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>({id:n.station.id,appearance:JSON.stringify(n.root.userData.appearance)}));assert.equal(looks.length,14);
 try{
  if(output){fs.mkdirSync(output,{recursive:true});const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(960,720);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(960,720,false);renderer.outputColorSpace=T.SRGBColorSpace;
   const scene=new T.Scene();scene.background=new T.Color(0xa7c3bf);scene.add(state.lot.group,new T.HemisphereLight(0xfff4d8,0x6e8a7b,.85));const sun=new T.DirectionalLight(0xffedcd,1.6);sun.position.set(-10,26,8);scene.add(sun,sun.target);const camera=new T.PerspectiveCamera(50,4/3,.08,180);
   capture=(name,[position,target])=>{if(frames.some(f=>f.name===name))return;camera.position.set(...position);camera.lookAt(new T.Vector3(...target));const vis=state.npcs.map(n=>[n.root,n.root.visible]);for(const[root]of vis)root.visible=Math.abs(root.position.y-target[1])<4;scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync(path.join(output,name+'.png'),canvas.toBuffer('image/png'));for(const[o,v]of vis)o.visible=v;frames.push({name,position,target});};
  }
  until(()=>state.japanService.state().staffLife.completed===15,21000);
  const final=state.japanService.state(),original=state.npcs.find(n=>n.station.id===primary);assert(handoff&&substitution);assert.deepEqual([...seen],['meal','tea','sleep']);assert.equal(final.staffLife.active,null);assert.equal(final.staffLife.nextWorkerId,relief);assert.equal(final.staffLife.interrupted,1);assert.ok(original.root.position.distanceTo(original.home)<.15);
  for(const look of looks)assert.equal(JSON.stringify(state.npcs.find(n=>n.station.id===look.id).root.userData.appearance),look.appearance,look.id+' restored identity');
  frame(2);until(()=>reverse,12000);assert.equal(state.japanService.state().staffLife.active.id,relief);
  const retiring=state.npcs.find(n=>n.station.id===relief),cover=state.npcs.find(n=>n.station.id===primary);assert.equal(cover.serviceTask.action,hall?'read':'garden');assert.deepEqual(cover.serviceTask.workTarget,retiring.station.workTarget);
  const references=state.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-'));state.disposeLot();const saved=state.saved.japanOperations;assert.equal(saved.staffLife.version,5);assert.equal(saved.staffLife.next,index+1);assert.equal(saved.staffLife.completed,15);assert.equal(saved.staffLife.interrupted,1);assert.equal(furniture.facilities.state().some(f=>f.reservations.length||f.queue.length),false);
  for(const look of looks)assert.equal(JSON.stringify(references.find(n=>n.station.id===look.id).root.userData.appearance),look.appearance);
  report.status='PASS';report.scope='Actual main/controller '+(hall?'kotatsu/read':'shrine/garden')+' post handoff, original target/action, shared meal/tea/night rest/return and reverse relief; temporary miko appearance restoration. Simulated DOM plus Three/Mesa, not browser/iOS.';report.simulatedSeconds=state.elapsed;report.frames=frames;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;
 }finally{renderer?.dispose();canvas?.dispose();if(output)fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify(frames,null,2));}
};
