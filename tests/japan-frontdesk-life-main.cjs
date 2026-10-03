// A legal saved registration and post-bath meal skip replaying arrivals/baths.
// Everything after restoration uses production main/controller, actor routes,
// service board and player UI handlers. DOM output alone is stubbed by the host.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let renderer,canvas,scene,camera,output,capture,initialIds,looks,firstRegister,servingPlayer=false,playerVisitId,mealServed=false,lastPhase='',handoff=false,secondHandoff=false;
const frames=[],seen=new Set();
exports.seed=({state,Orders,V,furniture})=>{
 const board=Orders.createJapanServiceOrders({worldSeed:1}),seats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
 for(let i=0;i<2;i++)board.spawn({...V.createJapanVisitorIdentity(board.nextIdentity(),1),restPoint:seats[i].anchor,diningPoint:seats[i].anchor,servePoint:[seats[i].position[0]+.7,seats[i].position[1],seats[i].position[2]-.12],restSeatId:seats[i].id});
 const saved=board.state();saved.staffLife={version:2,next:2,dueIn:.75,completed:2,interrupted:1};
 const [first,second]=saved.visits;first.stage='check-in';first.position=Orders.JAPAN_SERVICE_POINTS.reception.slice();
 second.stage='waiting-meal';second.mealRequested=true;second.tokenId=second.id+':token';second.mixtureId=second.id+':mixture';
 saved.items.push({id:second.tokenId,visitId:second.id,tokenId:second.tokenId,kind:'token',blendId:second.blendId,location:{type:'guest',id:second.id}},{id:second.mixtureId,visitId:second.id,tokenId:second.tokenId,kind:'mixture',blendId:second.blendId,location:{type:'used',id:second.poolId}});
 initialIds=[first.id,second.id];state.saved.japanOperations=saved;board.dispose();
};
exports.observe=state=>{
 const s=state.japanService.state(),life=s.staffLife,a=life.active,n=a&&state.npcs.find(n=>n.station.id===a.id),phase=a?.id+':'+a?.phase;
 if(phase!==lastPhase){lastPhase=phase;console.log(JSON.stringify({phase,time:+state.elapsed.toFixed(2),staff:life,actors:s.actors.filter(n=>['jp-welcome','jp-market-tea'].includes(n.id))}));}
 if(s.history.some(e=>e.visit===initialIds[0]&&e.event==='register'))firstRegister=true;
 if(s.history.some(e=>e.visit===initialIds[1]&&e.event==='serve'))mealServed=true;
 const registration=s.claims.find(j=>j.kind==='register'&&j.visitId===initialIds[0]);
 if(registration&&a?.phase==='draining')assert.equal(registration.workerId,'jp-welcome','Existing registration is retained until physically complete');
 if(a?.phase==='handoff'&&a.id==='jp-welcome'){
  const partner=state.npcs.find(n=>n.station.id==='jp-market-tea');
  if((a.retireReady||n.serviceTask?.arrived)&&(a.reliefReady||partner.serviceTask?.arrived)){
   assert.ok(firstRegister,'Handoff waits for the original registration');assert.ok(n.root.position.distanceTo(partner.root.position)>1,'Distinct real counter positions');handoff=true;capture?.('counter-handoff',[[-2.4,1.85,2.5],[-5.8,1.05,5.7]]);
  }
 }
 if(a?.id==='jp-market-tea'&&a.phase==='preparing')secondHandoff=true;
 if(a&&!['draining','handoff'].includes(a.phase))assert.equal(s.claims.some(j=>j.workerId===a.id),false,'Off-duty staff cannot claim new customer work');
 const job=s.claims.find(j=>j.visitId===playerVisitId&&j.kind==='register');
 if(job&&state.npcs.find(n=>n.station.id===job.workerId).serviceTask?.arrived){assert.equal(job.workerId,'jp-market-tea');assert.equal(a?.id,'jp-welcome');servingPlayer=true;capture?.('relief-player-registration',[[-2.4,1.85,2.5],[-5.5,1.05,5.7]]);}
 if(!n?.serviceTask?.arrived||a.id!=='jp-welcome')return;
 if(a.phase==='meal'){
  assert.equal(n.serviceMount?.kind,'seat');assert.equal(n.getPoseMetrics().action,'chair-sit');seen.add('meal');capture?.('staff-meal',[[-4.6,13.05,-9.8],[-6.8,12.35,-7.8]]);
 }else if(a.phase==='tea'){assert.equal(n.getPoseMetrics().action,'tea');seen.add('tea');}
 else if(a.phase==='sleep'){
  assert.equal(n.serviceMount?.kind,'bed');const contact=n.getPoseMetrics().lieContact;assert.ok(contact);
  for(const [part,p]of Object.entries(contact))assert.ok(Number.isFinite(p.gap)&&Math.abs(p.gap)<.04,part+' contact gap');
  seen.add('sleep');capture?.('staff-bunk',[[-2.2,13.2,-8.5],[-4.3,12.5,-11.4]]);
 }
};
exports.run=async({state,T,Orders,furniture,doors,frame,until,card,key,report})=>{
 output=process.env.OUT_DIR;looks=state.npcs.map(n=>({id:n.station.id,appearance:JSON.stringify(n.root.userData.appearance)}));assert.equal(looks.length,16,'14 existing residents plus two saved guests');
 if(output){
  fs.mkdirSync(output,{recursive:true});const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(960,720);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(960,720,false);renderer.outputColorSpace=T.SRGBColorSpace;scene=new T.Scene();scene.background=new T.Color(0xa7c3bf);scene.add(state.lot.group,new T.HemisphereLight(0xfff4d8,0x6e8a7b,.85));const sun=new T.DirectionalLight(0xffedcd,1.6);sun.position.set(-10,26,8);scene.add(sun,sun.target);camera=new T.PerspectiveCamera(50,4/3,.08,180);
  capture=(name,[position,target])=>{if(frames.some(f=>f.name===name))return;camera.position.set(...position);camera.lookAt(new T.Vector3(...target));const vis=state.npcs.map(n=>[n.root,n.root.visible]);for(const [root]of vis)root.visible=Math.abs(root.position.y-target[1])<4;state.lot.group.traverse(o=>{if(o.userData.serviceItemId){vis.push([o,o.visible]);const actor=state.npcs.find(n=>n.station.id===o.userData.visitId);if(actor)o.visible=actor.root.visible;}});scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync(path.join(output,name+'.png'),canvas.toBuffer('image/png'));for(const [object,v]of vis)object.visible=v;frames.push({name,position,target});};
 }
 try{
  if(process.env.RECEPTION_LEDGER_FRAME==='1'){
   frame(20);const clerk=state.npcs.find(n=>n.station.id==='jp-welcome'),brush=clerk.root.userData.tools.brush;
   assert.equal(clerk.serviceTask.orderJobId,initialIds[0]+':register');assert.equal(clerk.getPoseMetrics().action,'calligraphy');assert.equal(brush.visible,true);assert.equal(clerk.root.userData.tools.cloth.visible,false);
   capture?.('reception-ledger-writing',[[-4,2.25,4.8],[-5.4,1.15,6.35]]);
   clerk.root.updateWorldMatrix(true,true);const mesh=brush.children[0],tip=mesh.localToWorld(new T.Vector3(0,mesh.geometry.boundingBox.min.y,0));console.log(JSON.stringify({penTip:tip.toArray(),paperTop:1.191}));assert.ok([tip.x,tip.y,tip.z].every(Number.isFinite));assert.ok(tip.x>-5.79&&tip.x<-4.99&&tip.z>6.13&&tip.z<6.60,'Pen tip lies over open ledger paper');assert.ok(Math.abs(tip.y-1.191)<.035,'Pen reaches the paper surface');
   report.status='PASS';report.scope='One actual main registration frame, existing calligraphy brush, open paper contact; prior route/order/lifecycle evidence reused';report.penTip=tip.toArray();report.frames=frames;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;return;
  }
  until(()=>state.japanService.state().staffLife.active?.phase==='preparing',4000);assert.ok(handoff);
  // Actual player UI navigation from the normal arrival spawn to the counter.
  card().onclick();until(()=>!state.path.length,2400);frame(2);key('KeyE');card().onclick();playerVisitId=state.japanPlayerService.state().visit.id;
  until(()=>!!state.japanPlayerService.state().visit?.tokenId,2400);assert.ok(servingPlayer);assert.equal(state.japanPlayerService.state().visit.id,playerVisitId);
  assert.ok(state.japanService.state().history.some(e=>e.visit===playerVisitId&&e.event==='register'));
  // Move through the real controller clear of the counter; then cancel the
  // player's optional onward bath order and retain both NPC customer chains.
  state.navigateTo(new T.Vector3(0,0,10));until(()=>!state.path.length,1200);assert.ok(state.player.root.position.z>9,'Player physically clears the counter aisle');assert.ok(state.japanPlayerService.cancel().ok);frame();
  assert.equal(state.japanService.state().claims.some(j=>j.visitId===playerVisitId),false);
  until(()=>state.japanService.state().staffLife.completed===3,15000);
  assert.deepEqual([...seen],['meal','tea','sleep']);assert.ok(mealServed,'Kitchen completes the existing visitor meal while front desk is on break');
  const s=state.japanService.state();assert.equal(s.staffLife.nextWorkerId,'jp-market-tea');assert.equal(s.staffLife.interrupted,1);assert.equal(s.staffLife.active,null);
  assert.ok(s.history.some(e=>e.event==='checkout'),'Relief also returns an NPC token during the break');
  until(()=>secondHandoff,8000);assert.equal(state.japanService.state().staffLife.active.id,'jp-market-tea');
  // Exit during Tomo's break. Keep the same four identities and next turn;
  // restore only state/claims, without building a second full scene.
  for(const look of looks.filter(x=>!x.id.startsWith('jp-visitor-')))assert.equal(JSON.stringify(state.npcs.find(n=>n.station.id===look.id).root.userData.appearance),look.appearance,look.id+' identity unchanged');
  const before=state.japanService.state(),staffIds=['jp-ramen','jp-sushi','jp-welcome','jp-market-tea'];state.disposeLot();
  const saved=state.saved.japanOperations;assert.equal(saved.staffLife.version,3);assert.equal(saved.staffLife.next,3);assert.equal(saved.staffLife.completed,3);assert.equal(saved.staffLife.interrupted,1);
  assert.equal(furniture.facilities.state().some(f=>f.reservations.some(r=>staffIds.includes(r.actor))||f.queue.some(id=>staffIds.includes(id))),false);
  const restored=Orders.createJapanServiceOrders({saved,worldSeed:1});assert.equal(restored.state().claims.length,0);assert.equal(restored.state().nextVisit,before.nextVisit);restored.dispose();
  report.status='PASS';report.scope='Legal saved check-in/post-bath fixtures; actual main/controller front-desk handoff, player token, NPC meal/checkout, Koharu meal/tea/night sleep/return, Tomo next handoff and real disposeLot';report.simulatedSeconds=state.elapsed;report.frames=frames;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;
 }finally{renderer?.dispose();canvas?.dispose();if(output)fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify(frames,null,2));}
};
