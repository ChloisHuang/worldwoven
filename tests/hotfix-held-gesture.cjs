// Independent CPU/DOM controller review; uses actual event handlers, not start/request hooks.
const fs=require('fs'),path=require('path'),vm=require('vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures','hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("const root=path.resolve('source')","const root=path.resolve(process.env.SOURCE_ROOT||'source')");
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function inputReview(){return {player,furniture,lot,camera,cameraSolids,npcs,navOptions,nearest,seated,joy,keys,automaticDoors};} export {blocked,updateFurnitureLabels};`:''),");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report=[],review=()=>main.namespace.inputReview(),step=()=>{now+=100;raf();};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();step();const r=review(),item=r.furniture.items.find(i=>i.kind==='seat');
for(const route of ['list','label','touch','canvas']){
 ids.joystick.listeners.pointerup({pointerId:99});r.player.root.position.set(item.position[0]+Math.sin(item.yaw)*.3,item.position[1],item.position[2]+Math.cos(item.yaw)*.3);step();
 ids.joystick.listeners.pointerdown({pointerId:99,clientX:72,clientY:54});const beforeJoy={...review().joy};
 if(route==='list')ids['furniture-list'].children.find(b=>b.dataset.furnitureId===item.id).onclick();
 if(route==='label')ids['furniture-labels'].children.find(b=>b.dataset.furnitureId===item.id).onclick();
 if(route==='touch')ids['touch-action'].onclick();
 if(route==='canvas'){r.camera.position.set(item.position[0],item.position[1]+1.45,item.position[2]);r.camera.lookAt(new three.namespace.Vector3(item.center[0],item.center[1]+.8,item.center[2]));r.camera.updateMatrixWorld(true);const e={button:0,pointerId:7,clientX:422,clientY:195};ids.world.listeners.pointerdown(e);ids.world.listeners.pointerup(e);}
 const immediate={pending:state().pendingInteraction,seated:state().seated,joy:{...review().joy},player:state().player};step();const afterTick={pending:state().pendingInteraction,seated:state().seated,joy:{...review().joy},player:state().player};ids.joystick.listeners.pointerup({pointerId:99});const atRelease=state().player;step();
 report.push({route,beforeJoy,immediate,afterTick,releasedJoyZero:Math.hypot(review().joy.x,review().joy.y)===0});
 if(process.env.EXPECT_FIXED!=='0'){assert.equal(Math.hypot(immediate.joy.x,immediate.joy.y),0,route+' clears held joy synchronously');assert(state().pendingInteraction===item.id||state().seated===item.id,route+' preserves selected action after old pointer release');for(let i=0;i<100&&!state().seated;i++)step();assert.equal(state().seated,item.id,route+' reaches seat after released joystick');const seated=state().player;step();assert.deepEqual(state().player,seated,route+' no renewed movement');}
 if(state().pendingInteraction||state().seated)events.keydown({code:'Escape',preventDefault(){}});
}
if(process.env.EXPECT_FIXED!=='0'){r.player.root.position.set(item.position[0]+Math.sin(item.yaw)*.3,item.position[1],item.position[2]+Math.cos(item.yaw)*.3);step();ids.joystick.listeners.pointerdown({pointerId:99,clientX:72,clientY:54});ids['furniture-list'].children.find(b=>b.dataset.furnitureId===item.id).onclick();step();assert.equal(state().pendingInteraction,item.id);ids.joystick.listeners.pointermove({pointerId:99,clientX:73,clientY:54});step();assert.equal(state().pendingInteraction,item.id,'one-pixel old-thumb jitter must not cancel');ids.joystick.listeners.pointermove({pointerId:99,clientX:74,clientY:54});step();assert(state().pendingInteraction===item.id||state().seated===item.id,'two-pixel old-thumb jitter preserves furniture action');ids.joystick.listeners.pointermove({pointerId:99,clientX:80,clientY:54});step();assert.equal(state().pendingInteraction,null,'new pointer movement intentionally cancels approach');assert.equal(state().seated,null,'new pointer movement intentionally stands');ids.joystick.listeners.pointerup({pointerId:99});const stop=state().player;step();assert.deepEqual(state().player,stop,'release after intentional resume stops movement');report.push({newPointerMovementCancels:true,subsequentReleaseStops:true});}
ids['return-world'].onclick();
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
new vm.Script(harness,{filename:path.join(__dirname,'independent-input-review-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename});
