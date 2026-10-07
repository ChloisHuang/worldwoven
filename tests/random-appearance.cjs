const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const A=await import('../source/game/appearance.js'),T=await import('../source/game/character-traits.js');
 const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const neutral={...T.DEFAULT_SHAPE_TRAITS},base=A.createAppearanceState(42),unchanged=JSON.stringify(base),regions=['japan','china','egypt','france'];
 assert.deepEqual(base.player.shapeTraits,neutral);assert.equal(base.npcShapeVersion,2);assert.equal(base.playerScoreVersion,2);assert.equal(base.npcScoreVersion,2);
 const sixBase=A.createAppearanceState(42,{extended:false}),sixBytes=JSON.stringify(sixBase);assert.deepEqual(Object.keys(sixBase.player.shapeTraits),T.LEGACY_SHAPE_KEYS);assert.equal(sixBase.npcShapeVersion,1);assert(!Object.hasOwn(sixBase,'playerScoreVersion'));assert(!Object.hasOwn(sixBase,'npcScoreVersion'));assert.equal(A.migrateAppearanceState(sixBase,{extended:false}),sixBase);
 const upgraded=A.migrateAppearanceState(sixBase);assert.equal(upgraded.seed,sixBase.seed);assert.equal(upgraded.playerScoreVersion,1);assert.equal(upgraded.npcScoreVersion,1);for(const key of T.LEGACY_SHAPE_KEYS)assert.equal(upgraded.player.shapeTraits[key],sixBase.player.shapeTraits[key]);for(const key of Object.keys(neutral).filter(k=>!T.LEGACY_SHAPE_KEYS.includes(k)))assert.equal(upgraded.player.shapeTraits[key],1);assert.equal(JSON.stringify(sixBase),sixBytes);
 const sixRoll=A.randomizePlayerAppearance(sixBase,seeded(912),{extended:false});assert.deepEqual(Object.keys(sixRoll.player.shapeTraits),T.LEGACY_SHAPE_KEYS);assert(!Object.hasOwn(sixRoll,'playerScoreVersion'));assert(!Object.hasOwn(sixRoll,'npcScoreVersion'));
 const migratedRoll=A.randomizePlayerAppearance(upgraded,seeded(912));assert.equal(migratedRoll.playerScoreVersion,2);assert.equal(migratedRoll.npcScoreVersion,1);assert.equal(migratedRoll.npcShapeVersion,1);
 const candidate={...base};delete candidate.playerScoreVersion;delete candidate.npcScoreVersion;assert.equal(A.migrateAppearanceState(candidate).playerScoreVersion,2);assert.equal(A.migrateAppearanceState(candidate).npcScoreVersion,2);const oldCandidate={...candidate,npcShapeVersion:1};assert.equal(A.migrateAppearanceState(oldCandidate).playerScoreVersion,2);assert.equal(A.migrateAppearanceState(oldCandidate).npcScoreVersion,2);assert.equal(A.migrateAppearanceState(oldCandidate).npcShapeVersion,1);assert.equal(A.migrateAppearanceState({...oldCandidate,playerScoreVersion:1,npcScoreVersion:1}).npcScoreVersion,1);
 const legacy=JSON.parse(fs.readFileSync('tests/fixtures/appearance-r12-player-samples.json'));
 for(const {state,looks}of legacy){
  const migrated=A.migrateAppearanceState(state);assert(A.validAppearanceState(migrated));assert.equal(migrated.seed,state.seed);assert.equal(migrated.playerScoreVersion,1);assert.equal(migrated.npcScoreVersion,1);
  assert.deepEqual(migrated.player,{...state.player,shapeTraits:neutral});assert(!('shapeTraits'in state.player),'migration never mutates old state');
  for(const {region,outfit,look}of looks)assert.deepEqual(A.playerAppearance(migrated,region,outfit),{...look,shapeTraits:neutral},'R12 colors, cuts and faces preserved');
  const v1={version:1,seed:state.seed,player:Object.fromEntries(['skin','hair','eyeColor','variant'].map(k=>[k,state.player[k]]))};
  assert.deepEqual(A.migrateAppearanceState(v1),migrated,'v1 and v2 converge to the exact same neutral identity');
 }
 const invalid={...base,player:{...base.player,shapeTraits:{jawWidth:-99,legLength:99,eyeSize:'1.1',noseSize:null,noseWidth:NaN,socketDepth:Infinity}}};
 assert(!A.validAppearanceState(invalid));const fixed=A.migrateAppearanceState(invalid);assert(A.validAppearanceState(fixed));assert.equal(fixed.player.shapeTraits.jawWidth,T.SHAPE_RANGES.jawWidth.min);assert.equal(fixed.player.shapeTraits.legLength,T.SHAPE_RANGES.legLength.max);for(const key of['eyeSize','noseSize','noseWidth','socketDepth'])assert.equal(fixed.player.shapeTraits[key],1);
 assert.deepEqual(A.migrateAppearanceState({...base,player:{...base.player,shapeTraits:undefined}}).player.shapeTraits,neutral);
 const first=A.randomizePlayerAppearance(base,seeded(912)),same=A.randomizePlayerAppearance(base,seeded(912));assert.deepEqual(first,same,'seeded roll is deterministic');assert.equal(JSON.stringify(base),unchanged,'roll never mutates original or its traits');first.player.shapeTraits.jawWidth=999;assert.deepEqual(base.player.shapeTraits,neutral,'draft is independent');
 const diversity=Object.fromEntries(['bodyPreset','hairStyle','wardrobeIndex','gaitPreset','skin','hair','eyeColor',...Object.keys(T.SHAPE_RANGES)].map(key=>[key,new Set()]));const scores=[],legacyScores=[],sexScores={feminine:[],masculine:[]},rng=seeded(891);
 const npcBefore=regions.map(r=>A.npcRoleAppearance(r,r==='japan'?'jp-omamori':'resident',base.seed));
 for(let i=0;i<2048;i++){
  const rolled=A.randomizePlayerAppearance(base,rng);assert(A.validAppearanceState(rolled));assert.equal(rolled.seed,base.seed,'NPC world seed remains unchanged');
  const restored=A.migrateAppearanceState(JSON.parse(JSON.stringify(rolled)));assert.deepEqual(restored,rolled,'stable JSON save roundtrip');
  for(const key of Object.keys(diversity))diversity[key].add(rolled.player[key]??rolled.player.shapeTraits[key]);
  const score=T.shapePreferenceScore(rolled.player.shapeTraits,{version:rolled.playerScoreVersion});assert(score>=0&&score<=100);scores.push(score);legacyScores.push(T.shapePreferenceScore(rolled.player.shapeTraits,{version:1}));sexScores[rolled.player.bodyPreset.startsWith('masculine')?'masculine':'feminine'].push(score);
  for(const region of regions){const look=A.playerAppearance(rolled,region,i%8);assert.deepEqual(look.shapeTraits,rolled.player.shapeTraits);assert.equal(T.shapePreferenceScore({...look.shapeTraits,culture:region,bodyPreset:look.bodyPreset,skin:look.skin},{version:rolled.playerScoreVersion}),score,'score ignores cultural/color/presentation metadata');}
 }
 assert.equal(diversity.bodyPreset.size,4);assert.equal(diversity.hairStyle.size,6);assert.equal(diversity.wardrobeIndex.size,2);assert.equal(diversity.gaitPreset.size,4);
 for(const key of['skin','hair','eyeColor'])assert(diversity[key].size>=15,'pooled color variety '+key);
 for(const key of Object.keys(T.SHAPE_RANGES))assert(diversity[key].size>500,'actual random shape variety '+key);
 const mean=scores.reduce((a,b)=>a+b,0)/scores.length;assert(mean>47&&mean<53,'unbiased average, no high-score forcing');assert(Math.min(...legacyScores)<20&&Math.max(...legacyScores)>80,'historical six-term score retains its sampled tail contract; v2 endpoints are checked causally in appearance-score-independence');
 assert.deepEqual(regions.map(r=>A.npcRoleAppearance(r,r==='japan'?'jp-omamori':'resident',base.seed)),npcBefore,'all rolls preserve NPCs');
 for(const n of[0,1,-10,NaN,Infinity])assert(A.validAppearanceState(A.randomizePlayerAppearance(base,()=>n)),'bounded RNG handling');
 assert.equal(JSON.stringify(base),unchanged);
 console.log(JSON.stringify({status:'PASS',scope:'Pure player randomization, independent color/presentation/shape traits, exact neutral legacy migrations and persistence',legacyPlayers:legacy.length,legacyOutfitLooks:legacy.reduce((n,x)=>n+x.looks.length,0),randomPeople:scores.length,scoreRange:[Math.min(...scores),Math.max(...scores)],meanScore:mean,diversity:Object.fromEntries(Object.entries(diversity).map(([k,v])=>[k,v.size]))},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
