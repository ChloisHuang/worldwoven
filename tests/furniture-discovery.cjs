// Production input-path regression at the supported 844 × 390 touch viewport.
// The renderer is stubbed, but production controller handlers, Three.js raycasts,
// navigation, furniture transactions and camera occlusion are unchanged.
// Fixture instrumentation exposes scene state and refresh functions only. All
// interaction requests originate from canvas pointers, buttons or touch action.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const regions = ['china', 'france', 'japan', 'egypt'];
if (!process.argv[2]) {
  const results = regions.map(region => {
    const r = spawnSync(process.execPath, ['--experimental-vm-modules', __filename, region], {
      encoding: 'utf8', maxBuffer: 12 * 1024 * 1024,
    });
    if (r.status !== 0) { process.stderr.write(r.stderr || r.stdout); process.exit(r.status || 1); }
    return JSON.parse(r.stdout);
  });
  console.log(JSON.stringify({ status: 'PASS', scope: 'Production input handlers and real raycaster in simulated DOM; not browser layout or WebGL proof', regions: results }, null, 2));
  process.exit(0);
}
if (!regions.includes(process.argv[2])) throw new Error('Expected a region: ' + regions.join(', '));
if (!process.execArgv.includes('--experimental-vm-modules')) {
  const r = spawnSync(process.execPath, ['--experimental-vm-modules', __filename, process.argv[2]], { stdio: 'inherit' });
  process.exit(r.status === 0 ? 0 : (r.status || 1));
}
const sourceRoot = path.resolve(process.env.SOURCE_ROOT || 'source');
const html = fs.readFileSync(path.join(sourceRoot, 'game/index.html'), 'utf8');
for (const id of ['daybook-activities', 'daybook-furniture', 'furniture-list', 'furniture-labels']) {
  if (!html.includes('id="' + id + '"')) throw new Error('Missing discoverable furniture UI: #' + id);
}
const css = fs.readFileSync(path.join(sourceRoot, 'game/game.css'), 'utf8');
for (const [name, pattern] of [
  ['clickable world labels', /\.furniture-label\{[^}]*pointer-events:auto/],
  ['44px world label touch targets', /\.furniture-label\{[^}]*min-height:44px/],
  ['scrollable dedicated inventory', /#furniture-list\{[^}]*overflow-y:auto/],
]) if (!pattern.test(css)) throw new Error('Missing mobile CSS contract: ' + name);
let harness = fs.readFileSync(path.join(__dirname, 'game-controller.cjs'), 'utf8');
harness = harness.replace("const root=path.resolve('source')", "const root=path.resolve(process.env.SOURCE_ROOT||'source')");
harness = harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", `new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?\`\nexport function discoveryReview(){return {player,furniture,lot,camera,cameraSolids,npcs,navOptions,nearest,seated,ray};}\nexport {cameraDistanceToObstacle,updateLabels,updateFurnitureLabels,updatePlayer};\`:''),`);
const begin = harness.indexOf('const report=[];for(let round=0;');
const end = harness.indexOf('\nconsole.log(JSON.stringify(', begin);
if (begin < 0 || end < 0) throw new Error('Shared production DOM harness markers changed');
const body = String.raw`
const T=three.namespace,id=process.argv[2],report=[];
const review=()=>main.namespace.discoveryReview();
const press=element=>{assert.equal(typeof element?.onclick,'function','public button handler exists');element.onclick({preventDefault(){},stopPropagation(){}});};
const refresh=()=>{if(state().pathLength)tick(1);else main.namespace.updatePlayer(0,now/1000);main.namespace.updateLabels();main.namespace.updateFurnitureLabels();};
const cancel=()=>{if(state().wardrobePreview.open)press(ids['outfit-cancel']);if(state().pendingInteraction||state().performing||state().seated)events.keydown({code:'Escape',preventDefault(){}});else if(state().pathLength){events.keydown({code:'KeyW',preventDefault(){}});main.namespace.updatePlayer(0,now/1000);events.keyup({code:'KeyW'});}};
const drain=()=>{let frames=0;while(state().pathLength&&frames<18000){tick(30);frames+=30;}assert.equal(state().pathLength,0,id+' approach route terminates');tick(2);return frames;};
const clickCanvas=(x=422,y=195)=>{const e={button:0,pointerId:7,pointerType:'touch',clientX:x,clientY:y,preventDefault(){},stopPropagation(){}};ids.world.listeners.pointerdown(e);ids.world.listeners.pointerup(e);};
const pointCamera=(origin,target)=>{const r=review();r.camera.position.copy(origin);r.camera.lookAt(target);r.camera.updateMatrixWorld(true);};
const itemTarget=item=>new T.Vector3(item.center[0],item.center[1]+(item.kind==='canopy'?(item.top-item.center[1])*.62:item.size[1]*.52),item.center[2]);
const originFor=item=>new T.Vector3(item.position[0],item.position[1]+1.45,item.position[2]);
const placeAt=item=>{cancel();review().player.root.position.set(...item.position);refresh();};
const assertActivated=(item,before)=>{const s=state();assert.equal(s.pendingInteraction,null,id+' '+item.id+' activates only on reaching approach');if(item.kind==='seat')assert.equal(s.seated,item.id);else if(item.kind==='canopy')assert.notEqual(s.furniture.curtainsOpen,before,item.id+' '+JSON.stringify({player:s.player,nearest:review().nearest?.id,ray:review().ray.ray,raw:review().furniture.pick(review().ray.ray)?.id,toast:ids.toast.textContent}));else assert(s.wardrobePreview.open,id+' wardrobe opens from public input');};
const resetActivation=()=>{if(state().wardrobePreview.open)press(ids['outfit-cancel']);if(state().seated){refresh();press(ids['touch-action']);assert.equal(state().seated,null,'touch safely stands from seat');}cancel();};
all.find(e=>e.dataset.region===id).onclick();press(ids.travel);tick(1);
let r=review();const original=(id==='japan'?['seat','wardrobe']:['seat','canopy','wardrobe']).map(kind=>r.furniture.items.find(item=>item.id===id+'-furniture-'+kind));assert(original.every(Boolean),'original authored targets retain stable IDs');
const originalSeat=original[0];
// Furniture can be discovered independently of activity-list scroll position.
assert.equal(state().region,id);assert.equal(context.innerWidth,844);assert.equal(context.innerHeight,390);
assert(!ids['daybook-furniture'].hidden,'furniture tab remains discoverable with daybook collapsed');
press(ids['daybook-furniture']);assert(!ids['furniture-list'].hidden,'tab exposes inventory');assert(ids['station-list'].hidden,'inventory has its own panel');
const inventory=()=>ids['furniture-list'].children.filter(e=>e.dataset.furniture);
assert.equal(inventory().length,r.furniture.items.length,'every registered item is discoverable in furniture inventory');
const rowFor=item=>inventory().find(e=>e.dataset.furnitureId===item.id)||inventory().find(e=>e.dataset.furniture===item.kind&&e.textContent.includes(item.name));
for(const item of r.furniture.items)assert(rowFor(item),'inventory row for '+item.id);
press(ids['daybook-activities']);assert(!ids['station-list'].hidden);assert(ids['furniture-list'].hidden);
// A touch action without a nearby object opens the furniture inventory.
r.player.root.position.set(r.lot.bounds.minX+1,0,r.lot.bounds.minZ+1);refresh();assert.equal(review().nearest,null,'empty-space touch fixture');press(ids['touch-action']);assert(!ids['furniture-list'].hidden);
report.push({check:'mobile discoverability',items:inventory().length,viewport:'844x390',dedicatedTab:true,emptyTouchOpensFurniture:true});
// Begin a real route from the region entrance through the inventory. Nothing is
// applied until arrival, and the visible touch action cancels a pending route.
press(ids['return-world']);press(ids.travel);tick(1);r=review();press(ids['daybook-furniture']);ids.joystick.listeners.pointerdown({pointerId:99,clientX:85,clientY:54});events.keydown({code:'KeyW',preventDefault(){}});press(rowFor(originalSeat));assert.equal(state().pendingInteraction,originalSeat.id);assert(state().pathLength>0);assert.equal(state().seated,null);events.keydown({code:'KeyW',repeat:true,preventDefault(){}});tick(3);assert.equal(state().pendingInteraction,originalSeat.id,'furniture request clears stale held joystick and key repeat');ids.joystick.listeners.pointermove({pointerId:99,clientX:86,clientY:54});tick(2);assert.equal(state().pendingInteraction,originalSeat.id,'one-pixel held-thumb jitter preserves furniture route');ids.joystick.listeners.pointerup({pointerId:99});events.keyup({code:'KeyW'});
refresh();assert(/取消/.test(ids['touch-action'].textContent+' '+ids['touch-action'].getAttribute('aria-label')),'pending touch action explicitly says cancel');press(ids['touch-action']);assert.equal(state().pendingInteraction,null);assert.equal(state().pathLength,0);
press(ids['daybook-furniture']);press(rowFor(originalSeat));const approachFrames=drain();assert.equal(state().seated,originalSeat.id,'inventory pending route sits on arrival');assert(state().playerPose.seated);
// A crowded landing must keep the player seated; touch stand succeeds after the
// obstructing resident moves, without disabling any furniture or wall collider.
refresh();assert(/起身|站起/.test(ids['touch-action'].textContent+' '+ids['touch-action'].getAttribute('aria-label')),'seated touch action explicitly says stand');
r=review();const seatedAt={...state().player},actor=r.npcs[0],npcAt=actor.root.position.clone();actor.root.position.set(...originalSeat.position);press(ids['touch-action']);assert.equal(state().seated,originalSeat.id);assert.deepEqual(state().player,seatedAt,'blocked stand preserves seat anchor');actor.root.position.copy(npcAt);press(ids['touch-action']);assert.equal(state().seated,null);assert.equal(state().playerPose.seated,false);assert(Math.hypot(state().player.x-originalSeat.position[0],state().player.z-originalSeat.position[2])<.35,'stand lands on a safe approach');
report.push({check:'pending arrival and safe touch stand',approachFrames,cancelledViaTouch:true,blockedStandStayedSeated:true,staleHeldInputCleared:true,heldThumbJitterIgnored:true});
// Exercise production pointerdown/up, including the actual raycaster and every
// original furniture kind. Test setup changes viewpoint and approach position.
for(const item of original){
 placeAt(item);pointCamera(originFor(item),itemTarget(item));const before=state().furniture.curtainsOpen;clickCanvas();assertActivated(item,before);resetActivation();
 // Intervening non-target wall geometry must still block that same ray.
 placeAt(item);const origin=originFor(item),target=itemTarget(item);pointCamera(origin,target);const midpoint=origin.clone().lerp(target,.18),wall={minX:midpoint.x-.10,maxX:midpoint.x+.10,minY:midpoint.y-.10,maxY:midpoint.y+.10,minZ:midpoint.z-.10,maxZ:midpoint.z+.10};r=review();r.cameraSolids.push(wall);const beforeWall=state().furniture.curtainsOpen;clickCanvas();assert.equal(state().pendingInteraction,null,'wall blocks furniture request');assert.equal(state().seated,null);assert(!state().wardrobePreview.open);assert.equal(state().furniture.curtainsOpen,beforeWall,'wall blocks canopy toggle');r.cameraSolids.splice(r.cameraSolids.indexOf(wall),1);cancel();
 report.push({check:'production canvas pointer and through-wall rejection',kind:item.kind});
}
// Reproduce the R11 regression with an external camera grazing the Japan bench:
// the original 8.2m collider rejected the descriptor hit at its 8.17m top.
if(id==='japan'){
 const item=originalSeat,origin=new T.Vector3(-7.41481456572267,8.6,-12.447047612756302),target=new T.Vector3(-5,8.3,-11.8);placeAt(item);pointCamera(origin,target);
 const probe=new T.Ray(origin,target.clone().sub(origin).normalize()),raw=review().furniture.pick(probe),legacy=review().furniture.pick(probe,p=>main.namespace.cameraDistanceToObstacle(origin,p,review().cameraSolids,0)>=origin.distanceTo(p)-.3);
 assert.equal(raw?.id,item.id,'fixture ray hits authored bench');assert.equal(legacy,null,'legacy full-collider predicate reproduces own-collider rejection');clickCanvas();assert.equal(state().seated,item.id,'production pointer now accepts visible bench despite its own coarse collider');resetActivation();report.push({check:'own-collider rejection reproduced and repaired',kind:'seat',legacyRejected:true,productionPointerAccepted:true});
}
// Actual world label buttons are reachable, announced, and dispatched through
// their production onclick handlers. Labels must never inherit aria-hidden.
assert(!/id="furniture-labels"[^>]*aria-hidden="true"/.test(fs.readFileSync(path.join(root,'game/index.html'),'utf8')),'interactive labels are not aria-hidden');
for(const item of original){
 placeAt(item);const origin=originFor(item);pointCamera(origin,review().furniture.markerPoint(item));main.namespace.updateLabels();main.namespace.updateFurnitureLabels();
 const label=ids['furniture-labels'].children.find(e=>e.dataset.furnitureId===item.id);assert(label,'world label exists for '+item.id);assert.equal(label.tagName,'button');assert(!label.hidden,id+' '+item.kind+' visible from clear local viewpoint');assert(label.getAttribute('aria-label')||label.textContent,'world label is named');const marker=review().furniture.markerPoint(item),mid=origin.clone().lerp(marker,.2),wall={minX:mid.x-.1,maxX:mid.x+.1,minY:mid.y-.1,maxY:mid.y+.1,minZ:mid.z-.1,maxZ:mid.z+.1};review().cameraSolids.push(wall);main.namespace.updateLabels();main.namespace.updateFurnitureLabels();assert(label.hidden,'world label hidden behind unrelated wall');review().cameraSolids.splice(review().cameraSolids.indexOf(wall),1);main.namespace.updateLabels();main.namespace.updateFurnitureLabels();assert(!label.hidden);const before=state().furniture.curtainsOpen;press(label);assertActivated(item,before);resetActivation();
 // Dedicated inventory is independently actionable for each original kind.
 placeAt(item);press(ids['daybook-furniture']);const beforeList=state().furniture.curtainsOpen;press(rowFor(item));assertActivated(item,beforeList);resetActivation();
 placeAt(item);assert.equal(review().nearest?.id,item.id,'touch fixture selects exact nearby furniture');const touchBefore=state().furniture.curtainsOpen;press(ids['touch-action']);assertActivated(item,touchBefore);resetActivation();report.push({check:'world label, dedicated inventory and named touch controls',kind:item.kind,wallHidesLabel:true});
}
// Every advertised seat must really work through its inventory control, including
// additional authored chairs/benches. This catches accidental first-seat-only use.
const npcFixtures=review().npcs.map(actor=>({actor,position:actor.root.position.clone()}));for(const {actor}of npcFixtures)actor.root.position.set(100,100,100);let advertisedSeats=0;for(const item of review().furniture.items.filter(item=>item.kind==='seat')){placeAt(item);press(ids['daybook-furniture']);press(rowFor(item));assert.equal(state().seated,item.id,'advertised chair is usable: '+item.id);resetActivation();advertisedSeats++;}
report.push({check:'all advertised chairs usable with clear landing',count:advertisedSeats});
// Proximity discovery uses navigable separation, not just a distance radius.
// A navigation wall between a nearby avatar and the authored approach must
// remove that object from nearest and keep the public touch action from using it.
for(const item of original){
 placeAt(item);r=review();const approach=new T.Vector3(...item.position),away=approach.clone().sub(new T.Vector3(...item.center));away.y=0;away.normalize();const directions=[away,new T.Vector3(1,0,0),new T.Vector3(-1,0,0),new T.Vector3(0,0,1),new T.Vector3(0,0,-1)];let fixture=null;
 outer:for(const distance of[1.1,.9,1.3])for(const direction of directions){const candidate=approach.clone().addScaledVector(direction,distance);r.player.root.position.copy(candidate);refresh();if(review().nearest?.id===item.id&&r.furniture.nearbyClear(item,candidate,r.navOptions,[])){fixture=candidate;break outer;}}
 assert(fixture,'clear same-floor nearby approach fixture for '+item.id);const midpoint=fixture.clone().lerp(approach,.5),wall={minX:midpoint.x-.045,maxX:midpoint.x+.045,minY:approach.y-.05,maxY:approach.y+2.4,minZ:midpoint.z-.045,maxZ:midpoint.z+.045};r.lot.colliders.push(wall);refresh();assert.notEqual(review().nearest?.id,item.id,'navigation wall excludes furniture from proximity action');const before=state().furniture.curtainsOpen;press(ids['touch-action']);assert.notEqual(state().pendingInteraction,item.id,'touch cannot request furniture through a navigation wall');assert.notEqual(state().seated,item.id);if(item.kind==='canopy')assert.equal(state().furniture.curtainsOpen,before);if(item.kind==='wardrobe')assert(!state().wardrobePreview.open);r.lot.colliders.splice(r.lot.colliders.indexOf(wall),1);cancel();refresh();assert.equal(review().nearest?.id,item.id,'removing fixture restores nearby discovery');report.push({check:'proximity navigation-wall rejection through touch',kind:item.kind});
}
for(const {actor,position}of npcFixtures)actor.root.position.copy(position);
press(ids['return-world']);assert.equal(state().furniture,null);assert.equal(state().pendingInteraction,null);assert.equal(state().characterResources.activeReferences,0);assert.equal(ids['furniture-labels'].children.length,0,'world furniture labels removed on exit');
console.log(JSON.stringify({status:'PASS',region:id,scope:'Production controls in simulated DOM with real raycasts and navigation; no browser, DOM layout or WebGL claim',report},null,2));
`;
harness = harness.slice(0, begin) + body + harness.slice(end);
const tail = harness.indexOf('\nconsole.log(JSON.stringify({status:\'PASS\',scope:\'Production controller');
if (tail < 0) throw new Error('Shared harness reporting marker changed');
const catchStart = harness.indexOf('})().catch(', tail);
harness = harness.slice(0, tail) + harness.slice(catchStart);
new vm.Script(harness, { filename: path.join(__dirname, 'furniture-discovery-harness.cjs') })
  .runInNewContext({ require, console, process, Buffer, __dirname, __filename });
