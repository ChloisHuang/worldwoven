// Added CN04 lanes only: seed after the already accepted front-stair descent,
// then use production path planning, movement, scheduler and relief. This catches
// routes cut through private rooms/platforms and player overlap in narrow lanes.
// Run: node --experimental-vm-modules tests/china-guard-lanes.cjs
// Add PATROL_MESA=1 for the two normal TPS witnesses (simulated DOM, not browser).
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const mainReview="\nexport function laneReview(){return {player,lot,camera,scene,sun,lighting,npcs,chinaArchery,npcSocial,navOptions};} export function laneView(a){yaw=a;pitch=.16;distance=4.6;updateCamera(1,true);} export {configureStableShadows,blocked};";
const fixture="seedLane(i){active=1-i;phase='relief';phaseTime=0;shiftPending=true;rounds++;request=false;complete=false;for(const [j,actor]of guards.entries()){resetTravel(actor);Object.assign(patrol.get(actor),{stage:'ready',index:0,time:0,paused:false,yielding:false,visited:[]});actor.root.position.set(...HANDOFF[j]);}const n=guards[i],p=patrol.get(n);n.root.position.set(-3,.14,11);Object.assign(p,{stage:'travel',index:7});},";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule((file.endsWith('/game/china-archery-routine.js')?fs.readFileSync(file,'utf8').replace('owns:n=>owned.has(n)',"+JSON.stringify(fixture+"owns:n=>owned.has(n)")+"):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(mainReview)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const out='qa/china-guard-lanes',report={status:'RUNNING',scope:'Added side/rear segments, seeded after accepted front-stair descent; production main in simulated DOM',checks:[],circuits:[],frames:[]};fs.mkdirSync(out,{recursive:true});
const record=(label,data={})=>{report.checks.push({label,...data});fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(label);};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();tick(3);const review=main.namespace.laneReview(),T=three.namespace,guards=review.npcs.filter(n=>['cn-archery','cn-range-warden'].includes(n.station.id));assert.equal(state().npcCount,7);
let actual=null,canvas=null;if(process.env.PATROL_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,650);actual=new T.WebGLRenderer({canvas,antialias:true});actual.setSize(1100,650,false);actual.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(actual,review.sun);review.camera.aspect=1100/650;review.camera.updateProjectionMatrix();
 report.scope+='; actual Three/Mesa normal TPS, not browser/iOS';
}
const capture=(name,yaw)=>{if(!actual)return;main.namespace.laneView(yaw);review.scene.updateMatrixWorld(true);review.lighting.update(review.player.root.position);actual.render(review.scene,review.camera);actual.getContext().finish();assert.equal(actual.getContext().getError(),0);fs.writeFileSync(out+'/'+name+'.png',canvas.toBuffer('image/png'));report.frames.push({name,camera:review.camera.position.toArray(),player:review.player.root.position.toArray(),guards:state().chinaArchery.guards});};
const privateRooms=review.lot.interiorRooms.filter(r=>/guest|bedroom|bath|washroom|residence-living|residence-dressing|residence-sitting/.test(r.id));
let tracked=null,steps=0,visited=new Set(),minRangeGap=Infinity;
const frame=()=>{
 const before=tracked?.root.position.clone();now+=33.333;raf();if(!tracked)return;steps++;
 const p=tracked.root.position,s=state().chinaArchery,g=s.guards.find(g=>g.id===tracked.station.id),trainer=s.guards.find(g=>g.id===s.active);
 assert(before.distanceTo(p)<.13,'continuous movement, no teleport '+JSON.stringify({before:before.toArray(),after:p.toArray()}));
 assert(!main.namespace.blocked(p.x,p.z,review.lot.colliders,.25,{...review.navOptions,y:p.y}),'wall/platform collision '+JSON.stringify({checkpoint:g.patrol.checkpoint,p:p.toArray()}));
 assert(!privateRooms.some(r=>p.x>r.minX&&p.x<r.maxX&&p.z>r.minZ&&p.z<r.maxZ&&Math.abs(p.y-(r.floorY??.215))<.6),'private room shortcut');
 assert(!(p.x<-20&&p.x>-25.5&&p.z>8.8&&p.z<20.2),'patrol enters shooting lane');
 assert(trainer.position[0]<-16.3&&trainer.position[0]>-19.8&&trainer.position[2]>=9&&trainer.position[2]<=20.5,'range remains occupied during patrol');
 minRangeGap=Math.min(minRangeGap,Math.hypot(...[s.guards[0].position[0]-s.guards[1].position[0],s.guards[0].position[2]-s.guards[1].position[2]]));
 for(const id of g.patrol.visited)visited.add(id);
};
const wait=(predicate,label,max=6500)=>{let i=0;for(;i<max&&!predicate();i++)frame();assert(predicate(),label+' '+JSON.stringify(state().chinaArchery));record(label,{frames:i});};
const pstate=()=>state().chinaArchery.guards.find(g=>g.id===tracked.station.id).patrol;
for(const i of [1,0]){
 review.chinaArchery.seedLane(i);tracked=guards[i];steps=0;visited=new Set();review.player.root.position.set(-19.5,.13,17.2);const routeId=pstate().routeId;
 if(routeId==='west'){
  wait(()=>pstate().checkpoint==='west-blind-turn'&&tracked.root.position.z<2&&tracked.root.position.z>-3,'west guard turns into the side lane');
  const before=tracked.root.position.clone();review.player.root.position.copy(before).add(new T.Vector3(0,0,-.83));frame();assert(pstate().yielding);assert(tracked.root.position.distanceTo(before)<.0001);for(let k=0;k<25;k++)frame();assert(tracked.root.position.distanceTo(before)<.0001);assert(review.npcSocial.look(tracked));
  review.player.root.position.x+=1.6;frame();assert(!pstate().yielding);assert(tracked.root.position.distanceTo(before)>.01);review.player.root.position.set(-19.5,.13,17.2);record('nearby player gets space in the west lane; guard resumes the same route');
  wait(()=>pstate().checkpoint==='west-blind-turn'&&pstate().stage==='observe','west guard stops and looks into the hidden corner');
  const observation=tracked.root.position.clone(),observedTime=pstate().time;for(let k=0;k<20;k++)frame();assert(tracked.root.position.distanceTo(observation)<.0001);assert(pstate().time>observedTime+.6);assert(Math.abs(tracked.root.rotation.y-Math.atan2(-13.8-observation.x,-9.4-observation.z))<.001);
  review.player.root.position.copy(tracked.root.position).add(new T.Vector3(.25,0,2));frame();capture('01-west-side-lane',0);review.player.root.position.set(-19.5,.13,17.2);
 }else{
  wait(()=>pstate().checkpoint==='kitchen-rear'&&pstate().stage==='observe','east guard stops behind the kitchen');
  review.player.root.position.copy(tracked.root.position).add(new T.Vector3(-1.7,0,1.5));frame();capture('02-kitchen-rear',-.5);review.player.root.position.set(-19.5,.13,17.2);
 }
 const expected=routeId==='west'?['west-blind-turn','residence-rear','west-quiet-path','archive-west-back','northwest-watch']:['east-blind-turn','kitchen-rear','east-quiet-path','archive-east-back','northeast-watch'];
 wait(()=>pstate().stage==='ready'&&state().chinaArchery.phase==='handover'&&state().chinaArchery.phaseTime>.4,routeId+' patrol actually returns for face-to-face relief');
 assert(expected.every(id=>visited.has(id)),routeId+' missing rear checkpoint');assert.equal(state().chinaArchery.failures.length,0);assert(state().chinaArchery.guards.every(g=>g.patrol.stage==='ready'));report.circuits.push({routeId,frames:steps,visited:[...visited]});
 // Only the short physical exchange/departure changes the duty owner.
 tracked=null;const handoffs=state().chinaArchery.handoffs;for(let k=0;k<90&&state().chinaArchery.handoffs===handoffs;k++){now+=33.333;raf();}assert.equal(state().chinaArchery.handoffs,handoffs+1);assert.equal(state().chinaArchery.active,guards[i].station.id);record(routeId+' actual return releases the waiting guard');
}
assert(minRangeGap>.5,'body clearance at returned handoff');actual?.dispose();canvas?.dispose();ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);report.status='PASS';record('both distinct public circuits pass; no wall, private-room or shooting-lane shortcut',{minRangeGap});
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,"console.log(JSON.stringify({status:report.status,checks:report.checks.length,circuits:report.circuits,frames:report.frames.length},null,2));");
new vm.Script(harness,{filename:'tests/china-guard-lanes-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
