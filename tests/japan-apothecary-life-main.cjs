// Bounded actual main/controller run. Legal saved bath customers skip already
// verified arrival/check-in; all worker travel, handoff and service run normally.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let initialIds,looks,firstPrepared=false,secondPrepared=false,handoff=false,lastPhase='',capture;
const frames=[],seen=new Set();
exports.seed=({state,Orders,V,furniture})=>{
 const board=Orders.createJapanServiceOrders({worldSeed:1}),seats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 for(let i=0;i<2;i++)board.spawn({...V.createJapanVisitorIdentity(board.nextIdentity(),1),restPoint:seats[i].anchor,diningPoint:seats[i].anchor,servePoint:[seats[i].position[0]+.7,seats[i].position[1],seats[i].position[2]-.12],restSeatId:seats[i].id});
 const saved=board.state();saved.staffLife={version:3,next:4,dueIn:.75,completed:8,interrupted:1};
 for(const v of saved.visits){v.stage='waiting-bath';v.position=Orders.JAPAN_SERVICE_POINTS[v.side+'Washing'].slice();v.tokenId=v.id+':token';saved.items.push({id:v.tokenId,visitId:v.id,tokenId:v.tokenId,kind:'token',blendId:v.blendId,location:{type:'guest',id:v.id}});}
 initialIds=saved.visits.map(v=>v.id);state.saved.japanOperations=saved;board.dispose();
};
exports.observe=state=>{
 const s=state.japanService.state(),life=s.staffLife,a=life.active,n=a&&state.npcs.find(n=>n.station.id===a.id),phase=a?.id+':'+a?.phase;
 if(phase!==lastPhase){lastPhase=phase;console.log(JSON.stringify({phase,time:+state.elapsed.toFixed(2),staff:life,actors:s.actors.filter(n=>['jp-incense','jp-herb-workshop'].includes(n.id))}));}
 const first=s.claims.find(j=>j.kind==='prepare'&&j.visitId===initialIds[0]);
 if(first&&a?.phase==='draining')assert.equal(first.workerId,'jp-incense','Itsuki finishes the original claimed blend before leaving');
 if(s.history.some(e=>e.visit===initialIds[0]&&e.event==='prepare'))firstPrepared=true;
 if(a?.phase==='handoff'&&a.id==='jp-incense'){
  const relief=state.npcs.find(n=>n.station.id==='jp-herb-workshop');
  if((a.retireReady||n.serviceTask?.arrived)&&(a.reliefReady||relief.serviceTask?.arrived)){
   assert.ok(firstPrepared,'Original bath blend finishes before handoff');assert.ok(n.root.position.distanceTo(relief.root.position)>1,'Distinct actual counter positions');
   for(const actor of [n,relief])assert.ok(state.canTraverse(actor.root.position,actor.root.position,state.lot.colliders,{...state.navOptions,radius:.25}),'Handoff point clears real pharmacy geometry');
   handoff=true;capture?.('apothecary-shift-handoff',[[-1.8,13.35,.5],[-4.8,12.25,-1.7]]);
  }
 }
 if(a&&!['draining','handoff'].includes(a.phase))assert.equal(s.claims.some(j=>j.workerId===a.id),false,'Off-duty employee cannot claim customer jobs');
 const second=s.claims.find(j=>j.kind==='prepare'&&j.visitId===initialIds[1]);
 if(second){assert.equal(second.workerId,'jp-herb-workshop');assert.equal(a?.id,'jp-incense');assert.ok(handoff);}
 if(!secondPrepared&&s.history.some(e=>e.visit===initialIds[1]&&e.event==='prepare')){
  const visit=s.visits.find(v=>v.id===initialIds[1]),mix=s.items.find(i=>i.id===visit.mixtureId);
  assert.ok(mix);assert.equal(mix.visitId,visit.id);assert.equal(mix.tokenId,visit.tokenId);assert.equal(mix.blendId,visit.blendId);
  assert.equal(a?.id,'jp-incense');assert.ok(!['draining','handoff'].includes(a.phase));secondPrepared=true;
  console.log(JSON.stringify({reliefPreparedCorrectBlend:{worker:'jp-herb-workshop',visit:visit.id,token:mix.tokenId,blend:mix.blendId,phase:a.phase}}));
 }
 if(!n?.serviceTask?.arrived||a.id!=='jp-incense')return;
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
  frame();const supply=state.npcs.find(n=>n.station.id==='jp-herb-workshop');assert.equal(supply.serviceTask.action,'tidy');assert.equal(supply.serviceTask.label,supply.station.npcLabel,'Nao retains actual supply work before covering');
  until(()=>state.japanService.state().staffLife.completed===9,15000);
  const final=state.japanService.state();assert.ok(handoff);assert.ok(secondPrepared);assert.deepEqual([...seen],['meal','tea','sleep']);assert.equal(final.staffLife.nextWorkerId,'jp-herb-workshop');assert.equal(final.staffLife.active,null);assert.equal(final.staffLife.interrupted,1);
  const itsuki=state.npcs.find(n=>n.station.id==='jp-incense');assert.ok(Math.hypot(itsuki.root.position.x+5.25,itsuki.root.position.z+.3)<.15&&Math.abs(itsuki.root.position.y-11.4)<.05,'Itsuki actually returns to the pharmacy');
  for(const look of looks)assert.equal(JSON.stringify(state.npcs.find(n=>n.station.id===look.id).root.userData.appearance),look.appearance,look.id+' identity unchanged');
  // When coverage ends, Nao is routed back toward his original supply post.
  frame(2);const returnedSupply=state.npcs.find(n=>n.station.id==='jp-herb-workshop');assert.equal(returnedSupply.serviceTask.action,'tidy');assert.deepEqual(returnedSupply.serviceTask.to,returnedSupply.home.toArray());
  state.disposeLot();const saved=state.saved.japanOperations;assert.equal(saved.staffLife.version,3);assert.equal(saved.staffLife.completed,9);assert.equal(saved.staffLife.interrupted,1);
  assert.equal(furniture.facilities.state().some(f=>f.reservations.some(r=>looks.some(n=>n.id===r.actor))||f.queue.some(id=>looks.some(n=>n.id===id))),false);
  const restored=Orders.createJapanServiceOrders({saved,worldSeed:1});assert.equal(restored.state().claims.length,0);restored.dispose();
  report.status='PASS';report.scope='Legal saved bath customers; production main/controller actual pharmacy handoff, correct relief blend while Itsuki is away, shared meal/tea/night-rest/return and Nao retains his supply role. Simulated DOM plus Three/Mesa, not browser/iOS.';report.simulatedSeconds=state.elapsed;report.frames=frames;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;
 }finally{renderer?.dispose();canvas?.dispose();if(output)fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify(frames,null,2));}
};
