// Independent CPU/DOM controller review; uses actual event handlers, not start/request hooks.
const fs=require('fs'),path=require('path'),vm=require('vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures','hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("const root=path.resolve('source')","const root=path.resolve(process.env.SOURCE_ROOT||'source')");
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function inputReview(){return {player,furniture,lot,camera,cameraSolids,npcs,navOptions,nearest,seated,joy,keys,automaticDoors};} export {blocked,updateFurnitureLabels};`:''),");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report=[],T=three.namespace,review=()=>main.namespace.inputReview();
const step=(ms=100)=>{now+=ms;raf();};
const key=(code,repeat=false)=>events.keydown({code,repeat,preventDefault(){}});
const tap=()=>{const e={button:0,pointerId:7,clientX:422,clientY:195,preventDefault(){},stopPropagation(){}};ids.world.listeners.pointerdown(e);ids.world.listeners.pointerup(e);};
const drain=()=>{let n=0;while(state().pathLength&&n++<150)step();step();assert.equal(state().pathLength,0,'short approach finished');};
const dist=(a,b)=>Math.hypot(a.x-b[0],a.y-b[1],a.z-b[2]);
for(const id of ['china','france','japan','egypt'].filter(id=>!process.argv[2]||process.argv[2]===id)){
 all.find(e=>e.dataset.region===id).onclick();ids.travel.onclick();step();const r=review(),out={region:id,seats:[],canopy:{}};
 ids['daybook-furniture'].onclick();assert.equal(state().daybook.tab,'furniture');assert.equal(ids['furniture-list'].hidden,false);assert.equal(ids['station-list'].hidden,true);
 assert.equal(ids['furniture-list'].children.length,r.furniture.items.length,'all items listed');
 for(const item of r.furniture.items.filter(i=>i.kind==='seat')){
  // Fixture places the player at the authored approach; all actions then go through DOM input.
  r.player.root.position.set(...item.position);step();
  const b=ids['furniture-list'].children.find(b=>b.dataset.furnitureId===item.id);b.onclick();
  assert.equal(state().seated,item.id,item.id+' list clicks mount specific seat');assert.equal(state().playerPose.seated,true);assert(dist(state().player,item.anchor)<.0001,'mounted exact anchor');
  assert.equal(state().daybook.open,false,'mobile list auto-closes');
  key('KeyE',true);step(250);assert.equal(state().seated,item.id,'key repeat must not stand');assert(Math.hypot(state().player.x-item.anchor[0],state().player.z-item.anchor[2])<.001,item.id+' substeps keep seat XZ');assert(Math.abs(r.player.root.position.y+r.player.poseContext.visualFloorOffset+r.player.poseContext.seatHeight-item.seatY)<1e-8,'world seat height fixed');
  // A real NPC occupies every fallback stand approach. E must refuse without losing the seat.
  const atSeat=state().player,npc=r.npcs[0],oldNpc=npc.root.position.clone();npc.root.position.set(...item.position);key('KeyE');assert.equal(state().seated,item.id,'occupied landing must refuse');assert.deepEqual(state().player,atSeat,'refusal preserves player anchor');npc.root.position.copy(oldNpc);
  key('KeyE');assert.equal(state().seated,null,'one E stands');assert(!main.namespace.blocked(state().player.x,state().player.z,r.lot.colliders,.34,{...r.navOptions,y:state().player.y}),'stand is clear');
  key('KeyE',true);step(250);assert.equal(state().seated,null,'held E never reseats during substeps');
  // Projected label is actually rendered visible before its real click callback.
  r.player.root.position.set(...item.position);const marker=r.furniture.markerPoint(item);r.camera.position.set(item.position[0],item.position[1]+1.45,item.position[2]);r.camera.lookAt(marker);r.camera.updateMatrixWorld(true);main.namespace.updateFurnitureLabels();
  const label=ids['furniture-labels'].children.find(l=>l.dataset.furnitureId===item.id);assert(label&&!label.hidden,item.id+' projected label visible');label.onclick();assert.equal(state().seated,item.id,'label mounts exact seat');ids['touch-action'].onclick();assert.equal(state().seated,null,'touch action stands');
  // A true down/up canvas tap on the seat front-center must hit that seat.
  r.player.root.position.set(...item.position);r.camera.position.set(item.position[0],item.position[1]+1.45,item.position[2]);r.camera.lookAt(new T.Vector3(item.center[0],item.center[1]+item.size[1]*.52,item.center[2]));r.camera.updateMatrixWorld(true);tap();assert.equal(state().seated,item.id,item.id+' canvas pick');key('KeyE');
  out.seats.push({id:item.id,list:true,label:true,canvas:true,repeatedE:true,occupiedStandRefusal:true,clearStand:true});
 }
 if(id!=='japan'){
 const canopy=r.furniture.items.find(i=>i.kind==='canopy');r.player.root.position.set(...canopy.position);step();assert.equal(state().nearest,canopy.id,'canopy is reachable via contextual action');let toggles=0;const oldToggle=r.furniture.toggleCurtain;r.furniture.toggleCurtain=()=>{toggles++;return oldToggle();};
 const before=state().furniture.curtainsOpen;ids['touch-action'].onclick();step(250);assert.equal(toggles,1,'touch click toggles once across eight substeps');assert.equal(state().furniture.curtainsOpen,!before);
 key('KeyE');key('KeyE',true);step(250);key('KeyE',true);step(250);assert.equal(toggles,2,'held E must produce exactly one further toggle');assert.equal(state().furniture.curtainsOpen,before);r.camera.position.set(canopy.position[0],canopy.position[1]+1.45,canopy.position[2]);r.camera.lookAt(new T.Vector3(canopy.center[0],canopy.center[1]+(canopy.top-canopy.center[1])*.62,canopy.center[2]));r.camera.updateMatrixWorld(true);tap();ids.world.listeners.pointerup({pointerId:7,clientX:422,clientY:195});step(250);assert.equal(toggles,3,'canvas pair and duplicate up toggle exactly once');out.canopy={touchClickOnce:true,heldEOnce:true,canvasClickOnce:true};
 }else{assert.equal(state().furniture.hasCanopy,false);assert(!r.furniture.items.some(i=>i.kind==='canopy'));}
 // Real nearby action chooses a short safe walk before posing, instead of seating remotely.
 const item=r.furniture.items.find(i=>i.kind==='seat'),start=new T.Vector3(...item.position);start.x+=Math.sin(item.yaw)*.1;start.z+=Math.cos(item.yaw)*.1;r.player.root.position.copy(start);step();assert.equal(state().nearest,item.id);ids['touch-action'].onclick();assert.equal(state().seated,null);assert.equal(state().pendingInteraction,item.id);drain();assert.equal(state().seated,item.id,'context action finishes approach');out.contextApproach=true;key('KeyE');
 // Hidden/resume clears held keyboard and joystick and never replays two-minute gap.
 key('KeyW');ids.joystick.listeners.pointerdown({pointerId:99,clientX:54,clientY:18});step();document.hidden=true;events.visibilitychange();const beforePause=state().player;step(120000);assert.deepEqual(state().player,beforePause);document.hidden=false;events.visibilitychange();step();assert.deepEqual(state().player,beforePause);assert.equal(Math.hypot(review().joy.x,review().joy.y),0);out.resumeSafe=true;
 // Region exit removes labels and interaction state; return constructs fresh usable controls.
 ids['return-world'].onclick();assert.equal(ids['furniture-labels'].children.length,0);assert.equal(state().pendingInteraction,null);assert.equal(state().seated,null);ids.travel.onclick();step();assert(ids['furniture-labels'].children.length>=3);ids['return-world'].onclick();out.leaveReturn=true;report.push(out);
}
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
new vm.Script(harness,{filename:path.join(__dirname,'independent-input-review-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename});
