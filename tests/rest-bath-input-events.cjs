// Independent CPU/DOM controller review; uses actual event handlers, not start/request hooks.
const fs=require('fs'),path=require('path'),vm=require('vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures','hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("const root=path.resolve('source')","const root=path.resolve(process.env.SOURCE_ROOT||'source')");
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function inputReview(){return {player,furniture,lot,camera,cameraSolids,npcs,navOptions,nearest,seated,joy,keys,automaticDoors};} export {blocked,updateFurnitureLabels};`:''),");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report=[],T=three.namespace,review=()=>main.namespace.inputReview();
const step=(ms=100)=>{now+=ms;raf();};const key=(code,repeat=false)=>events.keydown({code,repeat,preventDefault(){}});
const tap=()=>{const e={button:0,pointerId:7,clientX:422,clientY:195,preventDefault(){},stopPropagation(){}};ids.world.listeners.pointerdown(e);ids.world.listeners.pointerup(e);};
const drain=()=>{let n=0;while(state().pathLength&&n++<1000)step();step();assert.equal(state().pathLength,0,'approach finished');};
for(const id of ['china','france','japan','egypt'].filter(id=>!process.argv[2]||process.argv[2]===id)){
 all.find(e=>e.dataset.region===id).onclick();ids.travel.onclick();step();const r=review(),original={...state().playerLook},raw=storage['worlds-days-v1'];ids['daybook-furniture'].onclick();
 for(const item of r.furniture.items.filter(i=>i.kind==='bed'||i.kind==='bath')){
 const action=item.kind==='bed'?'lie-rest':'bathe',b=ids['furniture-list'].children.find(b=>b.dataset.furnitureId===item.id);
 // Approach from a clear nearby floor; all activation uses real UI handlers.
 const start=new T.Vector3(...item.position);start.z+=.09;review().player.root.position.copy(start);step();b.onclick();assert.equal(state().seated,null,'never pose remotely');assert.equal(state().pendingInteraction,item.id);drain();assert.equal(state().seated,item.id);assert.equal(state().playerPose.action,action);assert.equal(state().mountedKind,item.kind);
 assert.deepEqual([state().player.x,state().player.y,state().player.z],item.anchor);if(item.kind==='bath'){assert.equal(state().playerLook.wardrobePreset,id==='japan'?'onsen-swimwear':'bath-robe');assert.deepEqual(state().playerLook.shapeTraits,original.shapeTraits,'bath preserves all body shape controls');for(const k of ['skin','hair','eyeColor','bodyPreset','hairStyle','clothes'])assert.equal(state().playerLook[k],original[k]);assert.equal(storage['worlds-days-v1'],raw);}
 key('KeyE',true);step();assert.equal(state().seated,item.id);const occupied=review().npcs[0],old=occupied.root.position.clone();occupied.root.position.set(...item.position);key('KeyE');assert.equal(state().seated,item.id,'occupied exit refused');occupied.root.position.copy(old);ids['touch-action'].onclick();assert.equal(state().seated,null);assert.deepEqual(state().playerLook,original,'exact original outfit restored');assert(!main.namespace.blocked(state().player.x,state().player.z,r.lot.colliders,.34,{...r.navOptions,y:state().player.y}));
 // Visible authored label and real canvas pick both select this fixture.
 review().player.root.position.set(...item.position);const marker=r.furniture.markerPoint(item);r.camera.position.set(item.position[0],item.position[1]+1.45,item.position[2]);r.camera.lookAt(marker);r.camera.updateMatrixWorld(true);main.namespace.updateFurnitureLabels();const label=ids['furniture-labels'].children.find(l=>l.dataset.furnitureId===item.id);assert(label&&!label.hidden,item.id+' label visible');label.onclick();assert.equal(state().seated,item.id);key('Escape');assert.equal(state().mode,'lot');assert.equal(state().seated,null);
 review().player.root.position.set(...item.position);r.camera.position.set(item.position[0],item.position[1]+1.45,item.position[2]);r.camera.lookAt(new T.Vector3(item.anchor[0],item.kind==='bed'?item.supportY+.02:item.waterY,item.anchor[2]));r.camera.updateMatrixWorld(true);tap();assert.equal(state().seated,item.id,item.id+' canvas pick');key('KeyE');
 // A thumb held before selecting does not cancel the approach or mounted pose.
 review().player.root.position.set(...item.position);ids.joystick.listeners.pointerdown({pointerId:99,clientX:85,clientY:54});b.onclick();ids.joystick.listeners.pointermove({pointerId:99,clientX:86,clientY:55});step(250);assert.equal(state().seated,item.id,'held thumb latch');ids.joystick.listeners.pointermove({pointerId:99,clientX:54,clientY:20});step();ids.joystick.listeners.pointerup({pointerId:99});assert.equal(state().seated,null,'deliberate movement dismounts');
 // Reentry, approach cancellation, temporary outfit cleanup on region exit.
 review().player.root.position.set(...item.position);b.onclick();key('KeyW');step();events.keyup({code:'KeyW'});assert.equal(state().seated,null);review().player.root.position.copy(start);b.onclick();assert(state().pendingInteraction);ids['touch-action'].onclick();assert.equal(state().pendingInteraction,null);assert.equal(state().seated,null);report.push({id:item.id,list:true,approach:true,label:true,canvas:true,touch:true,heldThumb:true,occupiedExit:true,walkInterrupt:true,outfitRestore:true});
 }
 const bath=r.furniture.items.find(i=>i.kind==='bath');review().player.root.position.set(...bath.position);ids['furniture-list'].children.find(b=>b.dataset.furnitureId===bath.id).onclick();assert(state().playerPose.bathing);ids['return-world'].onclick();assert.equal(state().seated,null);assert.equal(state().characterResources.activeReferences,0);assert.equal(state().furniture,null);ids.travel.onclick();step();assert.deepEqual(state().playerLook,original);ids['return-world'].onclick();
}
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
new vm.Script(harness,{filename:path.join(__dirname,'independent-input-review-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename});
