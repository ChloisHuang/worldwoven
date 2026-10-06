// One normal-entry China assembly. This catches accidental preview storage or
// silent whole-scene legacy fallback without replaying unrelated careers.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Fixture seam changed: '+a);harness=harness.replace(a,b);}
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('const document={body:',"const document={head:new E('head'),body:");
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
replaceOnce('vm.createContext({console,','vm.createContext({Float32Array,Float64Array,Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,DataView,atob,btoa,TextEncoder,TextDecoder,URL,URLSearchParams,console,');
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?'\\nexport function liveCharacterReview(){return {saved,player,npcs,lot};}':''),");
replaceOnce("const main=mod(path.join(root,'game/main.js'));",`
const live=mod(path.join(root,'game/character-live-entry.js'));await live.link(linker);await live.evaluate();
const appearance=mod(path.join(root,'game/appearance.js'));if(appearance.status==='unlinked')await appearance.link(linker);if(appearance.status==='linked')await appearance.evaluate();
const originalAppearance=appearance.namespace.createAppearanceState(41,{extended:false});
Object.assign(originalAppearance.player,{bodyPreset:'feminine-slender',variant:2,hairStyle:'chin-bob',wardrobeIndex:0});
const appearanceBytes=JSON.stringify(originalAppearance);
storage['worlds-days-v1']=JSON.stringify({visited:['france'],stamps:{france:['fr-garden']},outfit:0,appearance:originalAppearance,playerProfile:{ageYears:28}});
const main=mod(path.join(root,'game/main.js'));
`);
replaceOnce("'legacy save migrated before gameplay'","'saved appearance is valid before gameplay'");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const review=()=>main.namespace.liveCharacterReview();
assert.equal(JSON.stringify(review().saved.appearance),appearanceBytes,'normal boot never upgrades/reseeds the appearance');
const gate=mod(path.join(root,'game/character-preview-gate.js')).namespace;
assert.equal(gate.CHARACTER_PREVIEW_ENABLED,false);assert.equal(gate.gameStorage,context.localStorage,'actual unchanged localStorage boundary');
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();tick(2);
assert.equal(state().npcCount,31);assert(state().playerModel.applied,'normal saved player has current model');
assert.equal(state().playerModel.version,'candidate-midface-support-r113-v1');
assert.equal(state().playerLook.hairStyle,'chin-bob');assert.equal(state().playerLook.wardrobePreset,'ruqun-long-skirt');
assert.equal(JSON.stringify(review().saved.appearance),appearanceBytes);
const looks=JSON.stringify(state().npcLooks),rows=review().npcs.map(n=>({id:n.station.id,name:n.station.npcName,style:n.root.userData.appearance.style,hair:n.root.userData.appearance.hairStyle,wardrobe:n.root.userData.appearance.wardrobePreset,model:n.root.userData.characterModel.applied,reason:n.root.userData.characterModel.reason}));
assert.equal(new Set(rows.map(r=>r.id)).size,31);
assert(rows.filter(r=>r.model).length>=25,'model release must visibly reach the existing China residents');
for(const n of review().npcs){const a=n.root.userData.appearance;assert(Number.isInteger(a.skin)&&Number.isInteger(a.hair)&&Number.isInteger(a.eyeColor));const pose=n.getPoseMetrics();assert(pose.feet.flat().every(Number.isFinite));}
const before=JSON.stringify(state().playerLook);ids['appearance-button'].onclick();assert(state().wardrobePreview.open);ids['outfit-next'].onclick();ids['outfit-cancel'].onclick();assert.equal(JSON.stringify(state().playerLook),before,'wardrobe cancel restores the existing person and clothing');
assert(state().playerModel.applied,'rebuild retains new renderer');
ids['appearance-button'].onclick();ids['outfit-confirm'].onclick();assert.equal(JSON.stringify(review().saved.appearance),appearanceBytes,'confirm unchanged appearance retains original six-trait state');
assert.equal(JSON.stringify(state().npcLooks),looks,'wardrobe does not regenerate resident appearances');
const initial=state().player;ids.joystick.listeners.pointerdown({pointerId:99,clientX:85,clientY:54});tick(12);ids.joystick.listeners.pointerup({pointerId:99});
assert(Math.hypot(state().player.x-initial.x,state().player.z-initial.z)>.05,'actual normal player can move');
const written=JSON.parse(storage['worlds-days-v1']);assert.equal(JSON.stringify(written.appearance),appearanceBytes);assert.equal(written.playerProfile.ageYears,28);assert.deepEqual(written.stamps.france,['fr-garden']);
assert(Object.keys(storage).every(k=>!k.startsWith('worldwoven:character-preview:')));assert(!/modelPreview|previewHair|previewHairFlow|headLook/.test(JSON.stringify(written.appearance)));
const report={status:'PASS',scope:'Normal-mode actual main and 31 China NPCs, simulated DOM/renderer, no browser or phone claim',player:state().playerModel,modelCount:rows.filter(r=>r.model).length,rows,unchangedSavedAppearance:true,normalStorageKey:'worlds-days-v1',controls:'wardrobe cancel/confirm and actual joystick move'};
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0,'all live candidates released on exit');
console.log(JSON.stringify(report,null,2));
`;
harness=harness.slice(0,begin)+body+harness.slice(harness.indexOf('})().catch',end));
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
