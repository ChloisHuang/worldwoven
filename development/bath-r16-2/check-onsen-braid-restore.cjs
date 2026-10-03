// Real main UI handlers with existing DOM harness; renderer stub, no image claim.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const TESTS=path.resolve(__dirname,'../../tests');
let harness=fs.readFileSync(path.join(TESTS,'fixtures/hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("const root=path.resolve('source')","const root=path.resolve(process.env.SOURCE_ROOT||'source')");
harness=harness.replace('eyeColor:7573415,variant:2','eyeColor:7573415,variant:2,hairStyle:\'braided-tail\'');
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function braidReview(){return {player,furniture,lot,npcs};}`:''),");
harness=harness.replace('(async()=>{await three.link',"const braidEvidence={status:'RUNNING',rows:[]};\n(async()=>{await three.link");
harness=harness.replace(".catch(e=>{console.error(e);process.exit(1)});",".catch(e=>{fs.writeFileSync(process.env.OUT_FILE,JSON.stringify({...braidEvidence,status:'FAIL',error:e.stack||String(e)},null,2));console.error(e);process.exit(1)});");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report=braidEvidence.rows,review=()=>main.namespace.braidReview(),step=()=>{now+=100;raf();},key=code=>events.keydown({code,repeat:false,preventDefault(){}});
function fingerprint(){const hash=require('crypto').createHash('sha256');review().player.root.traverse(m=>{if(!m.isSkinnedMesh)return;for(const r of m.geometry.userData.sourceRanges||[])if(/^hair-braid/.test(r.name)){hash.update(r.name);hash.update(Buffer.from(m.geometry.attributes.position.array.slice(r.start*3,(r.start+r.count)*3).buffer));}});return hash.digest('hex');}
all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();step();ids['daybook-furniture'].onclick();
const original=JSON.parse(JSON.stringify(state().playerLook)),originalHair=fingerprint(),originalSaved=JSON.stringify(JSON.parse(storage['worlds-days-v1']).appearance);assert.equal(original.hairStyle,'braided-tail');
function normal(stage){assert.equal(state().seated,null);assert.deepEqual(state().playerLook,original,stage+' appearance');assert.equal(fingerprint(),originalHair,stage+' exact original braid vertices');assert.equal(JSON.stringify(JSON.parse(storage['worlds-days-v1']).appearance),originalSaved,stage+' saved appearance');report.push({stage,status:'PASS',braidSHA256:fingerprint()});}
function mount(bath){review().player.root.position.set(...bath.position);step();ids['furniture-list'].children.find(e=>e.dataset.furnitureId===bath.id).onclick();step();assert.equal(state().seated,bath.id);assert.equal(state().playerLook.wardrobePreset,'onsen-swimwear');assert.equal(state().playerLook.hairStyle,'braided-tail');assert.notEqual(fingerprint(),originalHair,'original braid temporarily bound');for(const key of['skin','hair','eyeColor','bodyPreset','hairStyle','clothes','shapeTraits'])assert.deepEqual(state().playerLook[key],original[key]);assert.equal(JSON.stringify(JSON.parse(storage['worlds-days-v1']).appearance),originalSaved);report.push({stage:'mounted '+bath.id,status:'PASS',braidSHA256:fingerprint()});}
for(const bath of [...review().furniture.items.filter(d=>d.kind==='bath')]){
 braidEvidence.stage=bath.id;mount(bath);ids['touch-action'].onclick();normal(bath.id+' touch exit');
 mount(bath);key('Escape');normal(bath.id+' Escape cancel');
 mount(bath);ids['appearance-button'].onclick();assert(state().wardrobePreview.open);ids['outfit-cancel'].onclick();normal(bath.id+' clothing-preview cancel');
 const start=new three.namespace.Vector3(...bath.position);start.z+=.15;review().player.root.position.copy(start);step();ids['furniture-list'].children.find(e=>e.dataset.furnitureId===bath.id).onclick();assert.equal(state().pendingInteraction,bath.id);ids['touch-action'].onclick();assert.equal(state().pendingInteraction,null);normal(bath.id+' pending approach cancel');
}
const bath=review().furniture.items.find(d=>d.kind==='bath');mount(bath);ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);assert.equal(state().seated,null);ids.travel.onclick();step();ids['daybook-furniture'].onclick();normal('leave and reenter Japan');
mount(review().furniture.items.find(d=>d.kind==='bath'));context.location.hash='#france';events.hashchange();step();assert.equal(state().region,'france');assert.equal(state().seated,null);assert.equal(state().playerLook.hairStyle,'braided-tail');assert.equal(fingerprint(),originalHair,'new region original braid vertices');assert.equal(JSON.stringify(JSON.parse(storage['worlds-days-v1']).appearance),originalSaved);report.push({stage:'change region while soaking',status:'PASS',braidSHA256:fingerprint()});ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
braidEvidence.status='PASS';braidEvidence.scope='Real production main list activation, touch and Escape exit, preview cancel, pending approach cancel, lot return and active-region change. Exact original braid vertex signature and appearance/save preservation, renderer stub.';fs.writeFileSync(process.env.OUT_FILE,JSON.stringify(braidEvidence,null,2)+'\n');console.log(JSON.stringify({status:'PASS',events:report.length,out:process.env.OUT_FILE}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
new vm.Script(harness,{filename:path.join(TESTS,'braid-restore-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname:TESTS,__filename});
