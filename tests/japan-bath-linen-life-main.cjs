// Two bounded side-specific continuations reuse the production main/controller
// fixture. Saved prepared bath orders skip unrelated, previously checked work.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const side=process.env.BATH_SIDE||'men',primary=side==='men'?'jp-onsen':'jp-women-onsen',relief=side==='men'?'jp-steam':'jp-rest',index=side==='men'?6:8;
let initialIds,looks,firstDelivered=false,reliefDelivered=false,handoff=false,reverseHandoff=false,lastPhase='',capture;
const frames=[],seen=new Set();
exports.seed=({state,Orders,V,furniture})=>{
 const board=Orders.createJapanServiceOrders({worldSeed:1}),seats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 for(let i=0;i<2;i++)board.spawn({...V.createJapanVisitorIdentity(board.nextIdentity(),1),side,restPoint:seats[i].anchor,diningPoint:seats[i].anchor,servePoint:[seats[i].position[0]+.7,seats[i].position[1],seats[i].position[2]-.12],restSeatId:seats[i].id});
 const saved=board.state();saved.staffLife={version:4,next:index,dueIn:.75,completed:10,interrupted:1};
 for(const v of saved.visits){v.stage='waiting-bath';v.position=[side==='men'?-3.5:1.3,3.8,-4.7];v.tokenId=v.id+':token';v.mixtureId=v.id+':mixture';saved.items.push({id:v.tokenId,visitId:v.id,tokenId:v.tokenId,kind:'token',blendId:v.blendId,location:{type:'guest',id:v.id}},{id:v.mixtureId,visitId:v.id,tokenId:v.tokenId,kind:'mixture',blendId:v.blendId,location:{type:'point',id:'apothecaryPickup'}});}
 initialIds=saved.visits.map(v=>v.id);state.saved.japanOperations=saved;board.dispose();
};
exports.observe=state=>{
 const s=state.japanService.state(),life=s.staffLife,a=life.active,n=a&&state.npcs.find(n=>n.station.id===a.id),phase=a?.id+':'+a?.phase;
 if(phase!==lastPhase){lastPhase=phase;console.log(JSON.stringify({phase,time:+state.elapsed.toFixed(2),staff:life,actors:s.actors.filter(n=>[primary,relief].includes(n.id))}));}
 for(const job of s.claims.filter(j=>j.kind==='deliverMix'))assert.ok((job.side==='men'?['jp-onsen','jp-steam']:['jp-women-onsen','jp-rest']).includes(job.workerId),'Every live bath claim uses its assigned duty side');
 const first=s.claims.find(j=>j.kind==='deliverMix'&&j.visitId===initialIds[0]);
 if(first&&a?.phase==='draining')assert.equal(first.workerId,primary,'Original claimed tray finishes before leaving');
 if(s.history.some(e=>e.visit===initialIds[0]&&e.event==='deliverMix'))firstDelivered=true;
 if(a?.phase==='handoff'){
  const partner=state.npcs.find(n=>n.station.id===a.reliefId);
  if((a.retireReady||n.serviceTask?.arrived)&&(a.reliefReady||partner.serviceTask?.arrived)){
   assert.ok(firstDelivered);assert.ok(n.root.position.distanceTo(partner.root.position)>1,'Distinct actual foyer positions');
   for(const actor of [n,partner]){assert.ok(state.canTraverse(actor.root.position,actor.root.position,state.lot.colliders,{...state.navOptions,radius:.25}));assert.ok(Math.abs(actor.root.position.y-3.8)<.05);assert.ok(actor.root.position.z>5.9&&actor.root.position.z<6.5);assert.ok(Math.abs(actor.root.position.x-(side==='men'?-6.5:3))>1.5,'Shared foyer handoff stays beside entrance');}
   if(a.id===primary){handoff=true;capture?.(side+'-bath-foyer-handoff',[[-.2,5.7,9.3],side==='men'?[-3.1,4.8,6.2]:[.1,4.8,6.2]]);}else reverseHandoff=true;
  }
 }
 if(a&&!['draining','handoff'].includes(a.phase))assert.equal(s.claims.some(j=>j.workerId===a.id),false,'Off-duty worker cannot claim new jobs');
 const second=s.claims.find(j=>j.kind==='deliverMix'&&j.visitId===initialIds[1]);
 if(second){assert.equal(second.workerId,relief);assert.equal(a?.id,primary);assert.ok(handoff);assert.equal(second.side,side);const carrier=state.npcs.find(n=>n.station.id===relief);if(carrier.serviceTask?.arrived&&carrier.serviceTask.to[1]===3.8)capture?.(side+'-relief-delivery',[side==='men'?[-1.9,5.65,-.65]:[3.6,5.65,-.65],side==='men'?[-4.2,4.65,-2.3]:[1.35,4.65,-2.3]]);}
 if(!reliefDelivered&&s.history.some(e=>e.visit===initialIds[1]&&e.event==='deliverMix')){
  const visit=s.visits.find(v=>v.id===initialIds[1]),mix=s.items.find(i=>i.id===visit.mixtureId);assert.equal(mix.visitId,visit.id);assert.equal(mix.tokenId,visit.tokenId);assert.equal(mix.blendId,visit.blendId);assert.equal(mix.location.id,side+'Service');assert.equal(a?.id,primary);reliefDelivered=true;console.log(JSON.stringify({reliefDelivered:{worker:relief,visit:visit.id,token:mix.tokenId,blend:mix.blendId,side,phase:a.phase}}));
 }
 if(!n?.serviceTask?.arrived||a.id!==primary)return;
 if(a.phase==='meal'){assert.equal(n.serviceMount?.kind,'seat');assert.equal(n.getPoseMetrics().action,'chair-sit');seen.add('meal');}
 if(a.phase==='tea'){assert.equal(n.getPoseMetrics().action,'tea');seen.add('tea');}
 if(a.phase==='sleep'){assert.equal(n.serviceMount?.kind,'bed');seen.add('sleep');}
};
exports.run=async({state,T,Orders,furniture,frame,until,report})=>{
 let renderer,canvas;const output=process.env.OUT_DIR;
 looks=state.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>({id:n.station.id,appearance:JSON.stringify(n.root.userData.appearance)}));assert.equal(looks.length,14);
 try{
  if(output){
   fs.mkdirSync(output,{recursive:true});const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(960,720);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(960,720,false);renderer.outputColorSpace=T.SRGBColorSpace;
   const scene=new T.Scene();scene.background=new T.Color(0xa7c3bf);scene.add(state.lot.group,new T.HemisphereLight(0xfff4d8,0x6e8a7b,.85));const sun=new T.DirectionalLight(0xffedcd,1.6);sun.position.set(-10,26,8);scene.add(sun,sun.target);const camera=new T.PerspectiveCamera(50,4/3,.08,180);
   capture=(name,[position,target])=>{if(frames.some(f=>f.name===name))return;camera.position.set(...position);camera.lookAt(new T.Vector3(...target));const vis=state.npcs.map(n=>[n.root,n.root.visible]);for(const [root]of vis)root.visible=Math.abs(root.position.y-target[1])<4;scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync(path.join(output,name+'.png'),canvas.toBuffer('image/png'));for(const [object,v]of vis)object.visible=v;frames.push({name,position,target});};
  }
  frame();const standby=state.npcs.find(n=>n.station.id===relief);assert.equal(standby.serviceTask.action,standby.station.npcAction);assert.deepEqual(standby.serviceTask.workTarget,standby.station.workTarget);assert.deepEqual(standby.serviceTask.to,standby.home.toArray(),'Relief starts at original boiler or linen work');
  until(()=>state.japanService.state().staffLife.completed===11,18000);
  const final=state.japanService.state();assert.ok(handoff);assert.ok(reliefDelivered);assert.deepEqual([...seen],['meal','tea','sleep']);assert.equal(final.staffLife.nextWorkerId,relief);assert.equal(final.staffLife.active,null);assert.equal(final.staffLife.interrupted,1);
  const returned=state.npcs.find(n=>n.station.id===primary);assert.ok(returned.root.position.distanceTo(returned.home)<.15,'Primary physically returns to original bath post');
  frame(2);assert.deepEqual(standby.serviceTask.to,standby.home.toArray(),'Replacement resumes original home work between turns');assert.equal(standby.serviceTask.action,standby.station.npcAction);
  until(()=>reverseHandoff,9000);assert.equal(state.japanService.state().staffLife.active.id,relief);
  for(const look of looks)assert.equal(JSON.stringify(state.npcs.find(n=>n.station.id===look.id).root.userData.appearance),look.appearance,look.id+' identity unchanged');
  state.disposeLot();const saved=state.saved.japanOperations;assert.equal(saved.staffLife.version,5);assert.equal(saved.staffLife.next,index+1);assert.equal(saved.staffLife.completed,11);assert.equal(saved.staffLife.interrupted,1);
  assert.equal(furniture.facilities.state().some(f=>f.reservations.some(r=>looks.some(n=>n.id===r.actor))||f.queue.some(id=>looks.some(n=>n.id===id))),false);
  const restored=Orders.createJapanServiceOrders({saved,worldSeed:1});assert.equal(restored.state().claims.length,0);restored.dispose();
  report.status='PASS';report.scope='Actual main/controller '+side+' bath claimed tray drain, physical foyer handoff, correct relief token/cargo delivery, shared meal/tea/night rest/return, home work and reverse handoff. Simulated DOM plus Three/Mesa, not browser/iOS.';report.simulatedSeconds=state.elapsed;report.frames=frames;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;
 }finally{renderer?.dispose();canvas?.dispose();if(output)fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify(frames,null,2));}
};
