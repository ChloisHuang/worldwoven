// Production canvas handlers + floor picking + navigation, using the portable
// VM fixture. Only observation exports and a start-position route export are
// appended. No production picker, handler, camera or collision logic is replaced.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
let harness=fs.readFileSync(path.join(__dirname,'fixtures','hotfix-input-harness.cjs'),'utf8');
function replaceOnce(from,to){assert.equal(harness.split(from).length-1,1,'fixture anchor changed: '+from);harness=harness.replace(from,to);}
replaceOnce("const root=path.resolve('source')","const root=path.resolve(process.env.SOURCE_ROOT||'source')");
const observation=String.raw`
export function observeChinaInput(){return {camera,yaw,pitch,distance,lot,navOptions,path:path.map(p=>({x:p.x,y:p.y,z:p.z})),ray:ray.ray.clone(),cameraSolids};}
export {navigateTo,blocked};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file===path.join(root,'game','main.js')?"+JSON.stringify(observation)+":''),");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
assert(begin>0&&end>begin,'fixture test body anchors changed');
const body=String.raw`
const T=three.namespace,observe=()=>main.namespace.observeChinaInput(),records=[];
const report={status:'RUNNING',scope:'Unmodified production canvas pointer handlers, pickWalkPoint, follow-camera and main frame loop in simulated 844x390 coarse-pointer DOM; renderer stub, not browser/WebGL or physical touchscreen QA',cases:records};
const output=path.resolve(process.env.R14_INPUT_REPORT||'qa/r14-palace/input-levels-report.json');
const write=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));};
const point=a=>new T.Vector3(...a),norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
const advance=(n=1,ms=100)=>{for(let i=0;i<n;i++){now+=ms;raf();}};
const closeTo=(actual,expected,label)=>{assert(Math.hypot(actual.x-expected[0],actual.z-expected[2])<.15,label+' horizontal destination '+JSON.stringify({actual,expected}));assert(Math.abs(actual.y-expected[1])<.085,label+' floor '+JSON.stringify({actual,expected}));};
const finishRoute=(expected,label)=>{let frames=0;while(state().pathLength&&frames++<10000)advance();assert.equal(state().pathLength,0,label+' route timeout');closeTo(state().player,expected,label);advance(40,16.666);return frames;};
// navigateTo is used ONLY to reach a legitimate start pose. The checked target
// is supplied to canvas events as a screen pixel, never to this setup helper.
const setup=position=>{main.namespace.navigateTo(point(position));finishRoute(position,'setup');};
let pointerId=300;
const event=(x,y,type,id)=>({button:0,buttons:1,pointerType:type,isPrimary:true,pointerId:id,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
const tap=(pixel,type,cancel=false)=>{const e=event(pixel.x,pixel.y,type,++pointerId);ids.world.listeners.pointerdown(e);ids.world.listeners[cancel?'pointercancel':'pointerup']({...e,buttons:0});};
// Set orientation solely through the installed drag handlers. Each captured
// gesture stays inside this mobile landscape viewport. A preliminary 12px move
// ensures even a tiny correction crosses the production drag threshold.
const orient=(wantYaw,wantPitch=.22)=>{for(let i=0;i<12;i++){const r=observe(),dx=Math.max(-180,Math.min(180,-norm(wantYaw-r.yaw)/.007)),dy=Math.max(-80,Math.min(80,(wantPitch-r.pitch)/.004));if(Math.abs(dx)+Math.abs(dy)<1e-5)break;const id=++pointerId;ids.world.listeners.pointerdown(event(422,195,'touch',id));ids.world.listeners.pointermove(event(434,195,'touch',id));ids.world.listeners.pointermove(event(422+dx,195+dy,'touch',id));ids.world.listeners.pointerup({...event(422+dx,195+dy,'touch',id),buttons:0});assert.equal(state().pathLength,0,'camera drag release must not navigate');}advance(60,16.666);const r=observe();assert(Math.abs(norm(r.yaw-wantYaw))<1e-6,'actual drag yaw');assert(Math.abs(r.pitch-wantPitch)<1e-6,'actual drag pitch');assert(!state().roofShown,'close follow camera');assert(state().playerVisible,'character remains readable in settled TPS');const distance=point(state().camera).distanceTo(point(state().cameraTarget));assert(distance>.8&&distance<=r.distance+.025,'controller-resolved camera distance');};
const pixelFor=position=>{const p=point(position).project(observe().camera);assert(p.z>-1&&p.z<1&&Math.abs(p.x)<.97&&Math.abs(p.y)<.97,'target must genuinely project inside the viewport '+JSON.stringify({position,ndc:p.toArray(),camera:state().camera}));return{x:(p.x*.5+.5)*context.innerWidth,y:(-.5*p.y+.5)*context.innerHeight,ndc:p.toArray()};};
const snapshot=()=>({player:state().player,camera:state().camera,cameraTarget:state().cameraTarget,yaw:observe().yaw,pitch:observe().pitch});
const cases=[
 {id:'main-ground-under-east-gallery',start:[9.7,1.415,0],target:[9.7,1.415,-3.5],yaw:0,ceiling:5.785,hiddenUpper:[9.7,6.015,-3.5],hiddenPitch:-.12},
 {id:'main-upper-east-gallery',start:[9.7,6.015,0],target:[9.7,6.015,-3.5],yaw:0,ceiling:9.215},
 {id:'rear-ground-under-loft',start:[3.8,.815,-29],target:[4.6,.815,-26],yaw:Math.PI,ceiling:3.985,hiddenUpper:[4.6,4.215,-26],hiddenPitch:.22},
 {id:'rear-upper-viewing-loft',start:[3.8,4.215,-29],target:[4.6,4.215,-26],yaw:Math.PI,ceiling:7.215}
];
try{
 all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();advance(3);assert(state().multilevel,'China height-aware entry');
 for(const c of cases){
  for(const [label,p]of[['start',c.start],['target',c.target]])assert(!main.namespace.blocked(p[0],p[2],observe().lot.colliders,.34,{...observe().navOptions,y:p[1]}),c.id+' '+label+' is a real supported, body-clear position');
  for(const type of ['mouse','touch']){
   console.error('INPUT LEVEL',c.id,type);setup(c.start);orient(c.yaw);const before=snapshot();assert(before.camera[1]<c.ceiling-.10,'follow camera below actual storey soffit');assert(before.camera[1]>c.start[1]+.3,'follow camera above its floor');const pixel=pixelFor(c.target);
   tap(pixel,type,true);assert.equal(state().pathLength,0,'cancelled touch/click must not navigate');closeTo(state().player,c.start,'cancelled input unchanged');
   tap(pixel,type);assert.equal(state().pendingInteraction,null,'floor tap must not select furniture on another floor');assert.equal(state().seated,null);let selected=observe().path.at(-1);assert(selected,c.id+' '+type+' produced a path from the real canvas ray');closeTo(selected,c.target,c.id+' '+type+' selected endpoint');assert(Math.abs(selected.y-c.target[1])<.035,'pick retains the intended storey');
   // A repeated tap before advancing is deterministic and does not switch floor.
   tap(pixel,type);const repeated=observe().path.at(-1);assert(repeated,'repeated tap still navigates');closeTo(repeated,c.target,c.id+' repeated');assert(Math.abs(repeated.y-selected.y)<.001,'repeated tap floor stable');
   const ray=observe().ray,frames=finishRoute(c.target,c.id+' '+type);records.push({id:c.id,pointerType:type,before,screen:pixel,ray:{origin:ray.origin.toArray(),direction:ray.direction.toArray()},selected,frames,arrived:state().player,cancelledTap:true,repeatedTap:true});write();
  }
  if(c.hiddenUpper){
   setup(c.start);orient(c.yaw,c.hiddenPitch);const before=snapshot(),pixel=pixelFor(c.hiddenUpper);tap(pixel,'touch');assert.equal(state().pathLength,0,c.id+' must not select a hidden upper floor through its real slab');assert.equal(state().pendingInteraction,null,'hidden upper tap cannot pick furniture');advance(8);closeTo(state().player,c.start,'occluded upper tap unchanged');records.push({id:c.id+'-slab-occlusion',pointerType:'touch',before,screen:pixel,hiddenTarget:c.hiddenUpper,selected:null});write();
  }
 }
 ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0,'actor cleanup');assert.equal(state().player,null);report.status='PASS';report.cleanup='zero active character references';write();console.log(JSON.stringify(report,null,2));
}catch(error){report.status='FAIL';report.error=error.stack||String(error);report.lastState=state();write();throw error;}
`;
harness=harness.slice(0,begin)+body+'\n})().catch(e=>{console.error(e);process.exit(1)});\n';
const compiled=new vm.Script(harness,{filename:path.join(__dirname,'china-input-levels-harness.cjs')});
if(process.argv.includes('--check-only')){console.log(JSON.stringify({status:'SYNTAX_ONLY_PASS',productionSceneExecuted:false,transformedHarnessCompiled:true,observationOnlyExports:true}));}
else compiled.runInNewContext({require,console,process,Buffer,__dirname,__filename});
