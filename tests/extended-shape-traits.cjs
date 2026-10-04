// Focused schema/generation contract: no scene or render/body matrix.
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const S=await import('../source/game/character-traits.js'),A=await import('../source/game/appearance.js'),V=await import('../source/game/japan-visitors.js');
 const added=['chinLength','chinProjection','noseBridgeHeight','noseTipSize'];
 assert.deepEqual(Object.keys(S.SHAPE_RANGES),[...S.LEGACY_SHAPE_KEYS,...added]);
 for(const key of added){const {min,max}=S.SHAPE_RANGES[key];assert(min<1&&max>1);assert.equal(S.normalizeShapeTraits({[key]:-100})[key],min);assert.equal(S.normalizeShapeTraits({[key]:100})[key],max);for(const value of [undefined,NaN,Infinity,null,'1.1'])assert.equal(S.normalizeShapeTraits({[key]:value})[key],1);}
 const samples=JSON.parse(fs.readFileSync('tests/fixtures/npc-shapes-v1-samples.json'));
 for(const row of samples){
  const before=A.npcShapeTraits(row.region,row.id,row.seed,1);assert.deepEqual(before,row.shapeTraits);assert.equal(S.shapePreferenceScore(before),row.score);
  const next=A.npcShapeTraits(row.region,row.id,row.seed,2);for(const key of S.LEGACY_SHAPE_KEYS)assert.equal(next[key],before[key]);
  assert.equal(S.shapePreferenceScore({...before,...Object.fromEntries(added.map(key=>[key,S.SHAPE_RANGES[key].max]))}),row.score,'new terms do not invent score weights');
 }
 const oldPlayer={...A.createAppearanceState(42),npcShapeVersion:1};oldPlayer.player.shapeTraits={...samples[0].shapeTraits};
 const snapshot=structuredClone(oldPlayer),migrated=A.migrateAppearanceState(oldPlayer);assert(A.validAppearanceState(migrated));assert.deepEqual(oldPlayer,snapshot);assert.equal(migrated.seed,oldPlayer.seed);assert.equal(migrated.npcShapeVersion,1);
 for(const key of S.LEGACY_SHAPE_KEYS)assert.equal(migrated.player.shapeTraits[key],oldPlayer.player.shapeTraits[key]);for(const key of added)assert.equal(migrated.player.shapeTraits[key],1);
 assert.deepEqual({...migrated.player,shapeTraits:undefined},{...oldPlayer.player,shapeTraits:undefined});assert.equal(S.shapePreferenceScore(migrated.player.shapeTraits),S.shapePreferenceScore(oldPlayer.player.shapeTraits));
 assert.deepEqual(A.migrateAppearanceState(JSON.parse(JSON.stringify(migrated))),migrated);
 let seed=33;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),diversity=Object.fromEntries(added.map(k=>[k,new Set()]));
 for(let i=0;i<16;i++){
  const rolled=A.randomizePlayerAppearance(migrated,rng);assert(A.validAppearanceState(rolled));assert.equal(rolled.npcShapeVersion,1);assert.equal(rolled.seed,migrated.seed);
  for(const[key,{min,max}]of Object.entries(S.SHAPE_RANGES))assert(rolled.player.shapeTraits[key]>=min&&rolled.player.shapeTraits[key]<=max);
  for(const key of added)diversity[key].add(rolled.player.shapeTraits[key]);
 }
 assert(Object.values(diversity).every(values=>values.size>8));assert.equal(A.createAppearanceState(42).npcShapeVersion,2);
 const id={id:'jp-visitor-7',number:7},oldVisitor=V.createJapanVisitorIdentity(id,42,1),defaultVisitor=V.createJapanVisitorIdentity(id,42),nextVisitor=V.createJapanVisitorIdentity(id,42,2);
 assert.deepEqual(defaultVisitor,oldVisitor,'omitted world context stays conservative');assert.deepEqual(oldVisitor.appearance.shapeTraits,A.npcShapeTraits('japan',id.id,42,1));
 for(const key of S.LEGACY_SHAPE_KEYS)assert.equal(oldVisitor.appearance.shapeTraits[key],nextVisitor.appearance.shapeTraits[key]);
 assert.deepEqual({...oldVisitor.appearance,shapeTraits:undefined},{...nextVisitor.appearance,shapeTraits:undefined});for(const key of added)assert.equal(S.normalizeShapeTraits(oldVisitor.appearance.shapeTraits)[key],1);
 for(const n of [NaN,Infinity,-10,10]){const traits=S.randomShapeTraits(()=>n);for(const [key,{min,max}]of Object.entries(S.SHAPE_RANGES))assert(traits[key]>=min&&traits[key]<=max);}
 console.log(JSON.stringify({status:'PASS',legacySamples:samples.length,playerRolls:16,controls:Object.keys(S.SHAPE_RANGES),oldWorldVersion:1,newWorldVersion:2,visitorVersionThreaded:true,score:'original six terms unchanged'}));
})().catch(e=>{console.error(e);process.exit(1);});
