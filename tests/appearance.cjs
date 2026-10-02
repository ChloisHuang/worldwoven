const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const m=new vm.SourceTextModule(fs.readFileSync('source/game/appearance.js','utf8'));await m.link(()=>{});await m.evaluate();const A=m.namespace,regions=['japan','china','egypt','france'];let checks=0;
 assert.equal(A.APPEARANCE_VERSION,2);
 for(const seed of[0,1,42,731821,4294967295]){
  const state=A.createAppearanceState(seed);assert(A.validAppearanceState(state));assert(A.validAppearanceState(JSON.parse(JSON.stringify(state))));
  const old={version:1,seed,player:Object.fromEntries(['skin','hair','eyeColor','variant'].map(k=>[k,state.player[k]]))},migrated=A.migrateAppearanceState(old);assert(A.validAppearanceState(migrated));for(const[k,v]of Object.entries(old.player))assert.equal(migrated.player[k],v,'migration preserves '+k);assert.equal(migrated.seed,seed);
  for(const r of regions){
   const colors={skin:new Set(),hair:new Set(),eyeColor:new Set(),clothes:new Set()},shapes={bodyPreset:new Set(),hairStyle:new Set(),wardrobePreset:new Set(),gaitPreset:new Set()};
   for(let i=0;i<64;i++){const one=A.npcAppearance(r,'station-'+i,seed),two=A.npcAppearance(r,'station-'+i,seed);assert.equal(JSON.stringify(one),JSON.stringify(two));for(const k of Object.keys(colors)){assert(Number.isInteger(one[k])&&one[k]>=0&&one[k]<=0xffffff);colors[k].add(one[k]);}for(const k of Object.keys(shapes))shapes[k].add(one[k]);assert(A.BODY_PRESETS.includes(one.bodyPreset));assert(A.HAIR_STYLES.includes(one.hairStyle));assert(Object.values(A.WARDROBE_PRESETS[r]).flat().includes(one.wardrobePreset));checks++;}
   for(const[k,v]of Object.entries(colors))assert(v.size>=3,r+' '+k+' meaningful independent color variation');
   for(const[k,v]of Object.entries(shapes))assert(v.size>=4,r+' '+k+' actual structural variation');
   const cuts=new Set();for(let i=0;i<16;i++){const look=A.playerAppearance(state,r,i);for(const k of['skin','hair','eyeColor','variant','bodyPreset','hairStyle','gaitPreset'])assert.equal(look[k],state.player[k],'outfit does not change identity');cuts.add(look.wardrobePreset);checks++;}assert.equal(cuts.size,2,'outfit cycle includes two cultural cuts');
  }
 }
 const legacy=JSON.parse(fs.readFileSync('tests/fixtures/appearance-r9-samples.json'));for(const s of legacy.samples){const look=A.npcAppearance(s.region,s.id,s.seed);for(const[k,v]of Object.entries(s.look))assert.equal(look[k],v,'R9 NPC color/variant retained '+s.region+'/'+s.id+'/'+k);}
 for(const bad of[null,{}, {version:99},{version:1,seed:-1,player:{}}]){assert(!A.validAppearanceState(bad));assert.equal(A.migrateAppearanceState(bad),null);}
 console.log(JSON.stringify({status:'PASS',checks,regions,priorReleaseIdentitiesPreserved:legacy.samples.length,colorTraits:['clothes','hair','eyes','skin'],structuralTraits:['bodyPreset','hairStyle','wardrobePreset','gaitPreset'],identity:'independent deterministic salts, color-preserving v1 migration; persisted player across outfits and regions',scope:'Fictional appearance and persistence contracts; no real-person inference'}));
})().catch(e=>{console.error(e);process.exit(1)});
