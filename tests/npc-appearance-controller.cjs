// Actual main handlers + actual Three character geometry, fresh DOM/renderer-stub
// VMs on both loads. No claim about browser layout, WebGL or physical devices.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
(async()=>{
 const legacy=JSON.parse(fs.readFileSync('tests/fixtures/appearance-r12-player-samples.json'))[2].state;
 const child=process.argv.includes('--npc-reload-child');
 let stored=process.env.NPC_RELOAD_SAVE||JSON.stringify({visited:[],stamps:{},outfit:0,appearance:legacy});
 if(!child){
  const runs=[];
  // One region per process, and a genuinely fresh process for its saved reload.
  // Do not retain two renderer/lot/module graphs together in the test runner.
  for(const region of ['japan','china','egypt','france'].filter(id=>!process.argv[2]||process.argv[2]===id)){
   let prior=null;
   for(let reload=0;reload<2;reload++){
    const result=spawnSync(process.execPath,['--experimental-vm-modules',__filename,region,'--npc-reload-child'],{encoding:'utf8',env:{...process.env,NPC_RELOAD_SAVE:stored},maxBuffer:4*1024*1024});
    assert.equal(result.status,0,region+' reload '+reload+' subprocess '+(result.signal||'')+' '+result.stderr);
    const value=JSON.parse(result.stdout),current={looks:value.looks,rosters:value.rosters};if(prior)assert.deepEqual(current,prior,'fresh startup reload keeps all residents, scores and task anchors');prior=current;stored=value.save;runs.push({region,reload,report:value.report});
   }
  }
  console.log(JSON.stringify({status:'PASS',scope:'Actual main NPC creation, existing information affordances, old-save migration, fresh process/VM reload and region reentry; CPU/DOM harness only',npcShapeVersion:JSON.parse(stored).appearance.npcShapeVersion,runs},null,2));return;
 }
 for(let reload=0;reload<1;reload++){
  let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
  harness=harness.replace(/const storage=\{.*?\};let context/,`const storage={'worlds-days-v1':${JSON.stringify(stored)}};let context`);
  harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function npcReview(){return {saved,player,npcs,lot};}`:''),");
  const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
  const body=String.raw`
const report=[],looks={},rosters={},review=()=>main.namespace.npcReview(),serial=x=>JSON.stringify(x),scoreOf=mod(path.join(root,'game/character-traits.js')).namespace.shapePreferenceScore;
assert.equal(review().saved.appearance.npcShapeVersion,1,'old save migrates and persists durable NPC generation version');
for(const id of ['japan','china','egypt','france'].filter(id=>!process.argv[2]||process.argv[2]===id)){
 const open=()=>{all.find(e=>e.dataset.region===id).onclick();ids.travel.onclick();tick(1);};open();
 const r=review(),initial=serial(state().npcLooks);looks[id]=JSON.parse(initial);rosters[id]=r.lot.stations.map(s=>({id:s.id,name:s.npcName,position:s.position,npcPosition:s.npcPosition,workTarget:s.workTarget,playerWorkTarget:s.playerWorkTarget}));
 let nearby=0;
 for(let i=0;i<r.npcs.length;i++){
  const n=r.npcs[i],score=scoreOf(n.root.userData.appearance.shapeTraits);assert.equal(n.preferenceScore,score,'same shared shape score');assert(n.root.userData.appearance.shapeTraits,'actual rendered NPC receives its shape');
  assert.equal(n.label.children.find(x=>x.className==='npc-preference-score').textContent,'游戏审美 '+score+' / 100','world information shows correct score');
  const row=ids['station-list'].children[i];assert(row.querySelector('small').textContent.includes('游戏审美 '+score+'/100'),'activity information shows score');assert(row.getAttribute('aria-label').includes('游戏审美偏好分 '+score+'/100'));assert(row.getAttribute('title').includes('不是真实人物的美丑标准'));
  r.player.root.position.set(...n.station.position);tick(1);if(state().nearest===n.station.id){assert(ids['interact-npc'].textContent.includes('游戏审美 '+score+'/100'));nearby++;}
  if(n.station.id==='jp-omamori'){assert.equal(n.root.userData.appearance.wardrobePreset,'miko-hakama');assert.equal(n.root.userData.appearance.hairStyle,'low-bun');}
 }
 assert(nearby>0,'nearby information exposes scores');
 ids['appearance-button'].onclick();ids['random-character'].onclick();ids['outfit-confirm'].onclick();assert.equal(serial(state().npcLooks),initial,'player reroll cannot affect existing residents');ids['appearance-button'].onclick();ids['random-character'].onclick();ids['outfit-cancel'].onclick();assert.equal(serial(state().npcLooks),initial);
 ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);open();assert.equal(serial(state().npcLooks),initial,'leaving and reentering cannot reroll residents');assert.equal(serial(review().lot.stations.map(s=>({id:s.id,name:s.npcName,position:s.position,npcPosition:s.npcPosition,workTarget:s.workTarget,playerWorkTarget:s.playerWorkTarget}))),serial(rosters[id]),'task identities and anchors stay exact');ids['return-world'].onclick();report.push({region:id,residents:looks[id].length,nearbyScores:nearby,labels:true,activityInfo:true,playerRerollStable:true,reentryStable:true});
}
reportRun(looks,rosters,storage['worlds-days-v1'],report);
`;
  harness=harness.slice(0,begin)+body+`})().catch(e=>{throw e});`;
  let completed=false;
  await new vm.Script(harness,{filename:path.join(__dirname,'npc-appearance-controller-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename,reportRun:(looks,rosters,save,report)=>{console.log(JSON.stringify({looks,rosters,save,report}));completed=true;}});
  assert(completed);
 }
})().catch(e=>{console.error(e);process.exit(1)});
