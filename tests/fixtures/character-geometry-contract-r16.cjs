// Proposed additive R16 fixture consumer. The reviewed fixture is created
// separately from a verified historical source and the final accepted source.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const fields=['position','normal','color','skinIndex','skinWeight','sourceY'];
function snapshot(actor){
 const meshes=[];actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry;meshes.push({name:mesh.name,vertices:g.attributes.position.count,indices:g.index.count,ranges:JSON.parse(JSON.stringify(g.userData.sourceRanges)),hashes:Object.fromEntries(fields.map(k=>{assert(g.attributes[k],'R16 anatomical source Y is required');return[k,digest(bytes(g.attributes[k].array))];}).concat([['index',digest(bytes(g.index.array))]]))});});return meshes;
}
exports.verifyNeutralR16Fixture=function(C,legacy){
 const legacyBytes=fs.readFileSync(path.join(__dirname,'miko-baseline.json')),fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'character-geometry-r16.json'),'utf8'));
 assert.equal(fixture.revision,'R16');assert.equal(fixture.legacyFixtureSha256,digest(legacyBytes),'historical fixture remains unchanged');
 assert.deepEqual(fixture.geometry.map(r=>r.opts),legacy.geometry.map(r=>r.opts),'retain all sixteen historical inputs');
 const bodies=['feminine-balanced','masculine-lean','feminine-slender','masculine-broad'];
 assert.deepEqual(fixture.mikoGeometry.map(r=>r.opts),bodies.map(bodyPreset=>({culture:'japan',bodyPreset,wardrobePreset:'miko-hakama',hairStyle:'low-bun'})),'explicit neutral role cut coverage');
 let count=0;
 for(const [i,row]of fixture.geometry.entries())assert.equal(row.legacyCombinedSha256,legacy.geometry[i].sha256,'old geometry hashes are references, never overwritten');
 for(const row of [...fixture.geometry,...fixture.mikoGeometry]){
  // Kept inside this helper so the shape-contact wrapper cannot inject traits.
  const actor=C.createCharacter({...row.opts,shapeTraits:null});
  try{const actual=snapshot(actor);assert.deepEqual(actual,row.current,'accepted R16 neutral geometry, normals, topology and anatomical Y');assert.equal(actual.length,row.legacyInvariant.length);
   for(let i=0;i<actual.length;i++)for(const key of ['color','skinIndex','skinWeight','index'])assert.equal(actual[i].hashes[key],row.legacyInvariant[i][key],'historical '+key+' bytes are preserved');count++;
  }finally{actor.dispose();}
 }
 return count;
};
function effectiveHandBone(indices,weights,offset,part,label){
 const side=/^(?:relaxed-palm|relaxed-finger|thumb)-(-?1)(?:-\d+)?$/.exec(part);assert(side,label+' recognized hand part');
 const expected=side[1]==='-1'?6:9;let joint=null;
 for(let slot=0;slot<4;slot++)if(weights[offset+slot]!==0){assert.equal(weights[offset+slot],1,label+' effective hand weight exactly one');assert.equal(joint,null,label+' exactly one nonzero hand influence');joint=indices[offset+slot];}
 assert.equal(joint,expected,label+' correct unique left/right hand bone');return joint;
}
exports.assertRoleHandShape=function(a,b,T){
 const skin=actor=>actor.root.getObjectByName('approved-face-skin'),left=skin(a),right=skin(b);
 const ranges=mesh=>mesh.geometry.userData.sourceRanges.filter(r=>/^(relaxed-palm|relaxed-finger|thumb-)/.test(r.name));
 const aa=ranges(left),bb=ranges(right);assert.deepEqual(aa.map(r=>[r.name,r.count]),bb.map(r=>[r.name,r.count]));
 for(let j=0;j<aa.length;j++){
  const ar=aa[j],br=bb[j],p=left.geometry.attributes.position,q=right.geometry.attributes.position;
  // Every hand vertex has one full hand-bone weight. Bone inverse * bindMatrix
  // removes the intentional rest translation without ignoring attachment.
  const joint=effectiveHandBone(left.geometry.attributes.skinIndex.array,left.geometry.attributes.skinWeight.array,ar.start*4,ar.name,'role hand');assert.equal(effectiveHandBone(right.geometry.attributes.skinIndex.array,right.geometry.attributes.skinWeight.array,br.start*4,br.name,'ordinary hand'),joint);const ma=new T.Matrix4().copy(left.skeleton.boneInverses[joint]).multiply(left.bindMatrix),mb=new T.Matrix4().copy(right.skeleton.boneInverses[joint]).multiply(right.bindMatrix);
  for(let i=0;i<ar.count;i++){
   const ai=ar.start+i,bi=br.start+i;
   for(const key of ['color','skinIndex','skinWeight']){const x=left.geometry.attributes[key],y=right.geometry.attributes[key];assert.equal(x.itemSize,y.itemSize);for(let k=0;k<x.itemSize;k++)assert.equal(x.array[ai*x.itemSize+k],y.array[bi*y.itemSize+k],ar.name+' '+key);}
   assert.equal(effectiveHandBone(left.geometry.attributes.skinIndex.array,left.geometry.attributes.skinWeight.array,ai*4,ar.name,'role hand'),joint);assert.equal(effectiveHandBone(right.geometry.attributes.skinIndex.array,right.geometry.attributes.skinWeight.array,bi*4,br.name,'ordinary hand'),joint);
   const u=new T.Vector3().fromBufferAttribute(p,ai).applyMatrix4(ma),v=new T.Vector3().fromBufferAttribute(q,bi).applyMatrix4(mb);
   assert(u.distanceTo(v)<1e-7,ar.name+' dimensions and hand-bone attachment; Float32 translation tolerance');
  }
 }
};
