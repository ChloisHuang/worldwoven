// Execute the production main.js handlers with actual Three CPU geometry and a
// DOM/renderer stub. This does not claim browser layout, WebGL or phone results.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("const root=path.resolve('source')","const root=path.resolve(process.env.SOURCE_ROOT||'source')");
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function appearanceReview(){return {saved,outfitDraft,player,furniture,lot,camera,cameraSolids,npcs,navOptions,seated,joy,keys};}`:''),");
harness=harness.replace("assert.equal(state().appearanceVersion,3,'legacy save migrated before gameplay');", "assert.equal(state().appearanceVersion,3,'legacy save migrated before gameplay');");
harness=harness.replace('context.window=context;','context.window=context;vm.runInContext("let randomSeed=13013;Math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};",context);');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report=[],review=()=>main.namespace.appearanceReview(),serial=x=>JSON.stringify(x),savedText=()=>serial(review().saved.appearance),draftText=()=>serial(review().outfitDraft),lookText=()=>serial(state().playerLook);
const key=(code,repeat=false)=>events.keydown({code,repeat,preventDefault(){}});
const captureBody=()=>{const r=review(),T=three.namespace;r.player.root.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);let minX=1,maxX=-1,minY=1,maxY=-1,vertices=0;r.player.root.traverseVisible(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld).project(r.camera);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);vertices++;}});assert(vertices>1000,'preview exposes actual full skinned body');assert(minX>-1&&maxX<1&&minY>-1&&maxY<1,'rolled full body stays in frustum');assert((maxX*.5+.5)*context.innerWidth<context.innerWidth-286-16-8,'rolled body stays left of dialog');};
const captureColors=()=>Object.fromEntries(['shirt','skin','hair','eye-left','eye-right'].map(x=>[x,ids['portrait-'+x].getAttribute('fill')]));
const closeHandlers={cancel:()=>ids['outfit-cancel'].onclick(),close:()=>ids['outfit-close'].onclick(),escape:()=>ids['outfit-dialog'].listeners.cancel({preventDefault(){}}),nativeClose:()=>{ids['outfit-dialog'].close();ids['outfit-dialog'].listeners.close();},backdrop:()=>ids['outfit-dialog'].listeners.click({target:ids['outfit-dialog']}),rotation:()=>{context.innerWidth=390;context.innerHeight=844;events.resize();context.innerWidth=844;context.innerHeight=390;events.resize();}};
for(const id of ['china','france','japan','egypt'].filter(id=>!process.argv[2]||process.argv[2]===id)){
 all.find(e=>e.dataset.region===id).onclick();ids.travel.onclick();tick(1);
 const original=savedText(),worldSeed=review().saved.appearance.seed,npcs=serial(state().npcLooks),look=lookText(),outfit=state().savedOutfit,portrait=captureColors();
 for(const[name,close]of Object.entries(closeHandlers)){
  ids['appearance-button'].onclick();assert(state().wardrobePreview.open);assert.equal(draftText(),original);
  // Native dialog keys never leak gameplay movement or interactions.
  key('KeyW');key('KeyE');key('KeyE',true);assert.equal(review().keys.size,0);
  ids['random-character'].onclick();const randomDraft=draftText();assert.notEqual(randomDraft,original);assert.equal(savedText(),original,'preview must not mutate saved appearance');
  assert.equal(serial(review().outfitDraft.player.shapeTraits),serial(state().playerLook.shapeTraits),'actual renderer receives draft shape traits');
  assert.equal(review().saved.appearance.seed,worldSeed);assert.equal(serial(state().npcLooks),npcs);
  assert.match(ids['appearance-presentation'].textContent,/^[男女]性外形$/);assert.match(ids['appearance-score'].textContent,/^\d+ \/ 100$/);
  const selected=state().wardrobePreview.selected;ids['outfit-next'].onclick();assert.equal(draftText(),randomDraft,'outfit choice does not roll identity');assert.equal(state().wardrobePreview.selected,(selected+1)%8);
  tick(12);captureBody();assert.equal(draftText(),randomDraft,'animation loop never randomizes identity');
  close();assert(!state().wardrobePreview.open,name+' dismisses preview');assert(!ids['outfit-dialog'].open);assert.equal(review().outfitDraft,null);
  assert.equal(savedText(),original);assert.equal(lookText(),look,'exact original identity/outfit after '+name);assert.equal(state().savedOutfit,outfit);assert.deepEqual(captureColors(),portrait,'portrait restored '+name);
 }
 // Wardrobe-only browsing retains identity before and after saving.
 ids['appearance-button'].onclick();context.innerHeight=320;events.resize();tick(1);captureBody();assert(state().wardrobePreview.open,'short landscape resize keeps active preview');context.innerHeight=390;events.resize();ids['outfit-choices'].children[3].onclick();assert.equal(draftText(),original);ids['outfit-confirm'].onclick();assert.equal(savedText(),original);
 ids['appearance-button'].onclick();ids['outfit-dialog'].listeners.close();assert(state().wardrobePreview.open,'stale queued close event cannot cancel a newer preview');ids['random-character'].onclick();const first=draftText();ids['random-character'].onclick();const second=draftText();assert.notEqual(first,second,'two discrete taps produce two drafts');
 let prevented=0;for(const code of['Enter','Space']){ids['random-character'].listeners.keydown({code,repeat:true,preventDefault(){prevented++;}});ids['random-character'].listeners.keydown({code,repeat:false,preventDefault(){throw Error('first activation must stay native')}});}assert.equal(prevented,2);assert.equal(draftText(),second,'repeat key handler never adds a second randomization path');
 const confirmedLook=lookText(),confirmedOutfit=state().wardrobePreview.selected;ids['outfit-confirm'].onclick();assert.equal(savedText(),second);assert.equal(lookText(),confirmedLook);assert.equal(state().savedOutfit,confirmedOutfit);assert.equal(serial(JSON.parse(storage['worlds-days-v1']).appearance),second,'confirmed identity persists to existing save key');
 ids['outfit-confirm'].onclick();ids['outfit-cancel'].onclick();assert.equal(savedText(),second,'duplicate terminal events cannot corrupt saved identity');assert.equal(serial(state().npcLooks),npcs);
 ids['appearance-button'].onclick();ids['random-character'].onclick();assert.notEqual(draftText(),second);ids['return-world'].onclick();assert.equal(state().mode,'globe');assert(!ids['outfit-dialog'].open);assert.equal(review().outfitDraft,null);assert.equal(savedText(),second,'region exit discards draft');assert.equal(state().characterResources.activeReferences,0);
 ids.travel.onclick();tick(1);assert.equal(lookText(),confirmedLook,'region rebuild never rerolls confirmed player');assert.equal(serial(state().npcLooks),npcs,'region rebuild retains NPC identities');
 // Held joystick intent is cleared on both opening and closing. Tiny captured
 // pointer jitter cannot move the player after the transaction finishes.
 ids.joystick.listeners.pointerdown({pointerId:77,clientX:85,clientY:54});ids['appearance-button'].onclick();assert.equal(Math.hypot(review().joy.x,review().joy.y),0);ids['random-character'].onclick();ids['outfit-cancel'].onclick();const pos=serial(state().player);ids.joystick.listeners.pointermove({pointerId:77,clientX:86,clientY:54});tick(3);assert.equal(serial(state().player),pos,'held-thumb jitter does not resume movement');ids.joystick.listeners.pointerup({pointerId:77});
 // A seated preview keeps the same seat and safe-exit policy after randomizing.
 const r=review(),seat=r.furniture.items.find(x=>x.kind==='seat');r.player.root.position.set(...seat.position);tick(1);ids['furniture-list'].children.find(b=>b.dataset.furnitureId===seat.id).onclick();assert.equal(state().seated,seat.id);const seatPos=serial(state().player);
 ids['appearance-button'].onclick();ids['random-character'].onclick();tick(1);captureBody();ids['outfit-confirm'].onclick();assert.equal(state().seated,seat.id);assert.equal(serial(state().player),seatPos);key('KeyE',true);assert.equal(state().seated,seat.id);key('KeyE');assert.equal(state().seated,null);
 ids['return-world'].onclick();report.push({region:id,dismissals:Object.keys(closeHandlers),confirm:true,wardrobeOnlyIdentity:true,regionExitRestore:true,NPCsUnchanged:true,heldThumbSafe:true,seatedPreview:true});
}
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
new vm.Script(harness,{filename:path.join(__dirname,'random-appearance-controller-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename});
