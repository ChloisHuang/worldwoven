import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=process.cwd();registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(r+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),C=await import(pathToFileURL(r+'/source/game/characters.js')),A=await import(pathToFileURL(r+'/source/game/appearance.js')),P=await import(pathToFileURL(r+'/source/game/china-salon-reception-props.js'));await import(pathToFileURL(r+'/source/game/character-live-entry.js'));
const results=[];
for(const seed of [1,42,12345]){
 const scene=new T.Group(),n=C.createCharacter({...A.npcRoleAppearance('china','cn-tavern-reception',seed),culture:'china',scale:.96});n.root.position.set(24.15,7.815,5.45);n.root.rotation.y=0;scene.add(n.root);const props=P.createSalonReceptionProps(scene);
 const session={id:'cn-salon-1-1',roomId:'tavern-guest-lan',receptionWork:{cardId:'salon-reception-card:cn-salon-1-1',steps:{registerSeconds:0,reserveSeconds:0,closeSeconds:0}}};
 for(const phase of ['register','reserve','close']){session.receptionWork.phase=phase;for(let j=0;j<=20;j++){session.receptionWork.seconds=j*.1;const s=props.apply(session,n,1+j*.1,{visualFloorOffset:0});results.push({seed,...s});}session.receptionWork.steps[phase+'Seconds']=2;}
 props.dispose();n.dispose();
}
const bad=results.filter(r=>!r.observed),summary={samples:results.length,bad:bad.length,maxGap:Math.max(...results.map(s=>s.gap)),maxWritingGap:Math.max(...results.filter(s=>s.writing).map(s=>s.gap)),maxCardGap:Math.max(...results.filter(s=>!s.writing).map(s=>s.gap)),remainingReferences:C.characterResourceStats().activeReferences};console.log(JSON.stringify({summary,bad}));
if(process.env.OUT){fs.mkdirSync(process.env.OUT,{recursive:true});fs.writeFileSync(process.env.OUT+'/contact.json',JSON.stringify({scope:'Actual production complete-adult rig/brush and original-session props; three representative seeded original Wenwan appearances. No body relocation or limb scaling; no browser/navigation claim.',summary,samples:results},null,2));}
assert.equal(bad.length,0);assert.equal(summary.remainingReferences,0);
