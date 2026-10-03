// Tiny archived-triangle fixtures only. No scene build and no source SHA bypass.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {K,rotateY,sweepTriangle} from './adaptive-rotation-kernel-v1.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/archived-positive-triangles-v1.json',import.meta.url)));
const rows=[];
for(const fixture of fixtures){
 const d=fixture.door,w=fixture.witness;
 assert(w?.leafWorldTriangle&&w?.staticWorldTriangle,'Archive must contain actual two-triangle witness');
 assert.equal(K.triangleContact(w.leafWorldTriangle,w.staticWorldTriangle,1e-5)?.type,'surface-crossing');
 // This is a fixture-specific fitted rigid orbit through the exact witness,
 // not a new approved production source formula. Closed leaf center is +/-1.5
 // for this six-metre hall opening, and archived corresponding local/world
 // vertices independently recover the same fixed pin at the recorded angle.
 const angle=-w.side*Math.PI/2,theta=angle*w.fraction,c=Math.cos(theta),s=Math.sin(theta),den=(1-c)**2+s*s;
 const initial=w.leafLocalTriangle.map(p=>[p[0]+w.side*1.5,p[1]+d.center[1],p[2]+d.center[2]]);
 const fittedPins=initial.map((p,i)=>{const q=w.leafWorldTriangle[i],bx=q[0]-(c*p[0]+s*p[2]),bz=q[2]-(-s*p[0]+c*p[2]);return[((1-c)*bx+s*bz)/den,d.center[1],(-s*bx+(1-c)*bz)/den];});
 const pin=fittedPins[0];assert(fittedPins.every(p=>K.len(K.sub(p,pin))<1e-10));
 const predicted=rotateY(initial,pin,theta);const residual=Math.max(...predicted.map((p,i)=>K.len(K.sub(p,w.leafWorldTriangle[i]))));assert(residual<1e-10);
 const radius=Math.max(...initial.map(p=>Math.hypot(p[0]-pin[0],p[2]-pin[2]))),witnesses=[];
 const result=sweepTriangle({pose:f=>rotateY(initial,pin,angle*f),obstacles:[w.staticWorldTriangle],radius,totalAngle:angle,eps:1e-5,onWitness:w=>{if(witnesses.length<4)witnesses.push(w);}});
 assert.notEqual(result.status,'PASS_SURFACE_SEPARATION','Archived real collision must not become a clearance');
 rows.push({archive:fixture.archive,archiveSha256:fixture.archiveSha256,archiveSourceHashes:fixture.archiveSourceHashes,archivedFraction:w.fraction,archivedLeafTriangle:w.leafTriangle,archivedStaticTriangle:w.staticTriangle,actualWitnessConfirmed:true,fittedPin:pin,fittedPinResidual:residual,scope:'Two-triangle rigid-orbit regression from archived witness, not same-source complete-scene equivalence',result,witnesses});
}
const output={status:'PASS_ARCHIVED_TRIANGLE_POSITIVES_ONLY',sceneBuilt:false,rows};const outputDirectory=process.env.QA_OUT?pathToFileURL(path.resolve(process.env.QA_OUT)+path.sep):new URL('../../qa/door-geometry/tiny/',import.meta.url);fs.mkdirSync(outputDirectory,{recursive:true});fs.writeFileSync(new URL('archived-positives-v1.json',outputDirectory),JSON.stringify(output,null,2));console.log(JSON.stringify({status:output.status,rows:rows.map(r=>({archive:r.archive,archivedFraction:r.archivedFraction,pin:r.fittedPin,adaptive:r.result.status,nodes:r.result.stats.nodes}))},null,2));
