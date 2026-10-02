const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const A=await import('../source/game/appearance.js'),T=await import('../source/game/character-traits.js'),regions=['japan','china','egypt','france'];
 assert.equal(A.NPC_SHAPE_VERSION,1);
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/npc-shapes-v1-samples.json'));
 for(const row of fixture){assert.deepEqual(A.npcShapeTraits(row.region,row.id,row.seed,1),row.shapeTraits,'immutable versioned resident generation');assert.equal(T.shapePreferenceScore(row.shapeTraits),row.score);}
 const legacy=JSON.parse(fs.readFileSync('tests/fixtures/miko-baseline.json'));
 for(const row of legacy.appearances){const look=A.npcAppearance(row.region,row.id,row.seed),{shapeTraits,...old}=look;assert.deepEqual(old,row.look,'all pre-R13 NPC identity/cut/color fields remain exact');assert.deepEqual(shapeTraits,A.npcShapeTraits(row.region,row.id,row.seed));}
 const scores=[],counts=Object.fromEntries(Object.keys(T.SHAPE_RANGES).map(k=>[k,new Set()]));
 for(const region of regions)for(let i=0;i<1024;i++){
  const id='resident-'+i,look=A.npcRoleAppearance(region,id,42),shape=look.shapeTraits;
  assert.deepEqual(look,A.npcRoleAppearance(region,id,42),'same per-person seed is stable');assert.deepEqual(shape,JSON.parse(JSON.stringify(shape)));
  for(const[key,{min,max}]of Object.entries(T.SHAPE_RANGES)){assert(Number.isFinite(shape[key])&&shape[key]>=min&&shape[key]<=max);counts[key].add(shape[key]);}
  const score=T.shapePreferenceScore(shape);scores.push(score);for(const bodyPreset of A.BODY_PRESETS)assert.equal(T.shapePreferenceScore({...shape,bodyPreset,skin:i,culture:region}),score,'same parameters always give same score regardless of other traits');
 }
 const mean=scores.reduce((a,b)=>a+b,0)/scores.length;assert(mean>48&&mean<52);assert(Math.min(...scores)<15&&Math.max(...scores)>85);for(const count of Object.values(counts))assert(count.size>1000);
 for(const seed of[0,1,42,731821,4294967295]){
  const base=A.npcAppearance('japan','jp-omamori',seed),role=A.npcRoleAppearance('japan','jp-omamori',seed);assert.equal(role.wardrobePreset,'miko-hakama');assert.equal(role.hairStyle,'low-bun');assert.equal(role.locomotionWardrobePreset,base.wardrobePreset);assert.deepEqual(role.shapeTraits,base.shapeTraits);for(const key of['skin','hair','eyeColor','variant','bodyPreset','gaitPreset'])assert.equal(role[key],base[key]);
  const state=A.createAppearanceState(seed),oldV3={...state};delete oldV3.npcShapeVersion;const migrated=A.migrateAppearanceState(oldV3);assert.equal(migrated.npcShapeVersion,1);assert.equal(migrated.seed,seed);assert.deepEqual(migrated.player,state.player);assert(A.validAppearanceState(migrated));
  const rolled=A.randomizePlayerAppearance(migrated,()=>.95);assert.equal(rolled.npcShapeVersion,1);assert.deepEqual(A.npcRoleAppearance('japan','jp-omamori',rolled.seed,rolled.npcShapeVersion),role,'player reroll never changes resident identity');
 }
 const state=A.createAppearanceState(42);assert(!A.validAppearanceState({...state,npcShapeVersion:99}));assert.equal(A.migrateAppearanceState({...state,npcShapeVersion:99}).npcShapeVersion,1);assert.throws(()=>A.npcShapeTraits('china','cn-tea',42,99),RangeError);
 console.log(JSON.stringify({status:'PASS',scope:'Immutable seeded six-trait NPC generation, legacy identity preservation, independent score, role constraints and save generation-version migration',people:scores.length,legacyIdentities:legacy.appearances.length,lockedSamples:fixture.length,scoreRange:[Math.min(...scores),Math.max(...scores)],meanScore:mean,distinctTraits:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v.size]))},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
