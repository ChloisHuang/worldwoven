/** Bounded same-identity comparison against the source checkpoint under review. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=process.cwd(),before=path.resolve(process.env.BEFORE_ROOT||''),out=path.resolve(process.env.OUT||'qa/nose-brow-profile/unchanged-ranges.json');assert(process.env.BEFORE_ROOT,'BEFORE_ROOT must name the actual checked-out baseline');
const loader=require(root+'/tests/fixtures/browser-module-loader.cjs').createBrowserModuleLoader;
function ranges(a){const r=new Map();a.root.traverse(m=>{if(m.isSkinnedMesh)for(const s of m.geometry.userData.sourceRanges)r.set(s.name,{g:m.geometry,r:s});});return r;}
function values(o,key){const a=o.g.attributes[key];return a?.array.slice(o.r.start*a.itemSize,(o.r.start+o.r.count)*a.itemSize);}
(async()=>{const versions=[];for(const base of [before,root]){const load=loader(base+'/source'),C=await load('game/characters.js');await load('game/character-live-entry.js');versions.push(C);}const results=[];
 for(const bodyPreset of ['masculine-lean','feminine-balanced']){
  const look={culture:'china',bodyPreset,hairStyle:bodyPreset.startsWith('masculine')?'side-part':'chin-bob',skin:0xbe9a74,hair:0x201c19,clothes:0x766078,accent:0xc6ab67,eyeColor:0x493525,shapeTraits:{jawWidth:.9,legLength:1.03,eyeSize:1.12,noseSize:.87,noseWidth:.91,socketDepth:1.4}},snapshot=JSON.stringify(look),actors=versions.map(C=>C.createCharacter(look));
  assert.equal(JSON.stringify(look),snapshot);assert.deepEqual(actors[0].root.userData.appearance,actors[1].root.userData.appearance,'saved genotype and appearance stay exact');
  const old=ranges(actors[0]),next=ranges(actors[1]);assert.deepEqual([...old.keys()],[...next.keys()]);let untouched=0;
  for(const [name,a] of old){const b=next.get(name);for(const attr of ['skinIndex','skinWeight','sourceY','color','featureCoord'].filter(k=>k!=='sourceY'||!/^soft-brow-anatomical/.test(name)))assert.deepEqual(values(a,attr),values(b,attr),name+' '+attr+' unchanged');
   if(/^(continuous-head-anatomical|soft-brow-anatomical)/.test(name))continue;
   for(const attr of ['position','normal'])assert.deepEqual(values(a,attr),values(b,attr),name+' '+attr+' unchanged');untouched++;
  }
  assert.deepEqual(actors[0].root.userData.characterModel.attachmentFit,actors[1].root.userData.characterModel.attachmentFit,'hair/hat and facial-hair landmarks stay exact outside local profile');
  results.push({bodyPreset,unchangedNonProfileSurfaces:untouched,skinWeightsColorsSavedTraitsAndNonBrowSourceHeightsExact:true});actors.forEach(a=>a.dispose());
 }
 versions.forEach(C=>assert.equal(C.characterResourceStats().activeReferences,0));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({status:'PASS',before,after:root,results},null,2));console.log(fs.readFileSync(out,'utf8'));
})().catch(e=>{console.error(e);process.exit(1)});
