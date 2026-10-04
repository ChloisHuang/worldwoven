/** Actual createCharacter single-control endpoint audit; rendering is separate. */
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';import path from 'node:path';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const C=await import('../../source/game/characters.js');
await import('../../source/game/complete-adult/register.js');
const {SHAPE_RANGES,normalizeShapeTraits}=await import('../../source/game/character-traits.js');
const look={culture:'france',bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'court-overgown',previewHair:'gathered-updo',skin:0xdba789,hair:0x44342f,eyeColor:0x594b3f,modelPreview:'complete-adult-head-v1'};
function head(a){let result;a.root.traverse(m=>{if(!m.isSkinnedMesh)return;const range=m.geometry.userData.sourceRanges.find(r=>r.name==='continuous-head-anatomical-head-neck');if(range)result={g:m.geometry,r:range};});return result;}
const report={scope:'Actual merged createCharacter geometry; metres converted to mm. This is not visual acceptance.',rows:[]};
for(const [key,{min,max}]of Object.entries(SHAPE_RANGES)){
 const a=C.createCharacter({...look,shapeTraits:{[key]:min}}),b=C.createCharacter({...look,shapeTraits:{[key]:max}}),lo=head(a),hi=head(b),d=[0,0,0];let count=0,maxDistance=0;
 for(let n=0;n<lo.r.count;n++){let sq=0;for(let axis=0;axis<3;axis++){const delta=hi.g.attributes.position.array[(hi.r.start+n)*3+axis]-lo.g.attributes.position.array[(lo.r.start+n)*3+axis];sq+=delta*delta;d[axis]=Math.max(d[axis],Math.abs(delta));}if(sq>1e-14)count++;maxDistance=Math.max(maxDistance,Math.sqrt(sq));}
 report.rows.push({key,min,max,affectedHeadVertices:count,headVertices:lo.r.count,maxAxisMm:d.map(x=>+(x*1000).toFixed(3)),maxDistanceMm:+(maxDistance*1000).toFixed(3),storedMin:a.root.userData.appearance.shapeTraits[key],storedMax:b.root.userData.appearance.shapeTraits[key],applied:a.root.userData.characterModel.applied&&b.root.userData.characterModel.applied});a.dispose();b.dispose();
}
console.log(JSON.stringify(report,null,2));if(process.env.OUT_FILE)fs.writeFileSync(process.env.OUT_FILE,JSON.stringify(report,null,2));
