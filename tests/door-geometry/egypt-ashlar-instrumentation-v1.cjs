// QA-only source instrumentation. No production file or numeric geometry edits.
const crypto=require('node:crypto');
const SOURCE_SHA='89c08f1c87abbc5b2ff1c5856c3f810c9dfda111fa181e0839ef2aed23e447d7';
const THREE_SHA='9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6';
const specs=[
 ...[14.08,21.72].map((x,i)=>({id:'egypt-private-bedroom-'+i,openingId:'private-bedroom',args:[x,2.35,2.6,4.46,4.7,.22]})),
 ...[-5.85,-12.25].flatMap((z,k)=>[14.03,21.77].map((x,i)=>({id:'egypt-'+['dining-entry','kitchen-entry'][k]+'-'+i,openingId:['dining-entry','kitchen-entry'][k],args:[x,2.3,z,4.55,4.6,.25]}))),
 ...[[-3.5,1.8],[1.545,1.89]].map(([z,d],i)=>({id:'egypt-private-bath-entry-'+i,openingId:'private-bath-entry',args:[16.4,2.35,z,.22,4.7,d]}))
];
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
function hashMesh(m){
 const a=x=>x?{type:x.array.constructor.name,count:x.count,itemSize:x.itemSize,normalized:x.normalized,sha256:digest(Buffer.from(x.array.buffer,x.array.byteOffset,x.array.byteLength))}:null;
 const material=q=>({type:q.type,color:q.color?.toArray(),emissive:q.emissive?.toArray(),emissiveIntensity:q.emissiveIntensity,opacity:q.opacity,transparent:q.transparent,side:q.side,depthWrite:q.depthWrite,vertexColors:q.vertexColors});
 return {attributes:Object.fromEntries(Object.keys(m.geometry.attributes).sort().map(k=>[k,a(m.geometry.attributes[k])])),index:a(m.geometry.index),groups:m.geometry.groups,drawRange:m.geometry.drawRange,materials:(Array.isArray(m.material)?m.material:[m.material]).map(material)};
}
const injected=`
import {hashMesh as __qaHashMesh} from 'qa:ashlar-hash';
const __qaAshlarSpecs=${JSON.stringify(specs)};
const __qaAshlarRegistry=[],__qaAshlarBatchAudits=[];
function __qaCaptureAshlar(mesh,g,cs,cam,args){
 const spec=__qaAshlarSpecs.find(s=>s.args.every((v,i)=>v===args[i]));if(!spec)return;
 if(__qaAshlarRegistry.some(s=>s.id===spec.id))throw Error('Duplicate reviewed ashlar primitive');
 const p=mesh.geometry.attributes.position;if(mesh.geometry.index||p.count!==132)throw Error('Reviewed ashlar is not 44 actual triangles');
 const before=__qaHashMesh(mesh);mesh.updateWorldMatrix(true,false);
 const triangles=[];for(let i=0;i<p.count;i+=3)triangles.push([0,1,2].map(j=>new THREE.Vector3(p.getX(i+j),p.getY(i+j),p.getZ(i+j)).applyMatrix4(mesh.matrixWorld).toArray()));
 const flat=triangles.flat(),actualBounds={min:[0,1,2].map(a=>Math.min(...flat.map(v=>v[a]))),max:[0,1,2].map(a=>Math.max(...flat.map(v=>v[a])))};
 const bounds={min:[cs.minX,cs.minY,cs.minZ],max:[cs.maxX,cs.maxY,cs.maxZ]};
 for(const [i,a]of ['X','Y','Z'].entries())if(!Number.isFinite(cs['min'+a])||!Number.isFinite(cs['max'+a])||cs['min'+a]!==cam['min'+a]||cs['max'+a]!==cam['max'+a]||Math.abs(actualBounds.min[i]-bounds.min[i])>1e-5||Math.abs(actualBounds.max[i]-bounds.max[i])>1e-5)throw Error('Ashlar generated geometry/collider mismatch');
 mesh.userData.qaAshlarRanges=[{primitiveId:spec.id,firstTriangle:0,triangleCount:44}];cs.qaAshlarSupportId=spec.id;cam.qaAshlarSupportId=spec.id;
 __qaAshlarRegistry.push({...spec,bounds,actualBounds,triangles,triangleCount:44,source:'source-locked solid→ashlar reviewed jamb tuple'});
 const after=__qaHashMesh(mesh);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('QA ashlar metadata altered source primitive buffers');
 __qaAshlarBatchAudits.push({stage:'source-primitive',primitiveId:spec.id,before,after,identical:true});
}
function __qaTransferAshlar(o,b,geo){
 const ranges=o.userData.qaAshlarRanges;if(!ranges)return;
 if(geo.index||geo.attributes.position.count!==132)throw Error('Ashlar batch topology changed');
 const start=b.positions.length/9;if(!Number.isInteger(start))throw Error('Ashlar batch offset not triangular');
 b.qaAshlarRanges??=[];for(const r of ranges){if(r.firstTriangle!==0||r.triangleCount!==44)throw Error('Malformed original ashlar range');b.qaAshlarRanges.push({...r,firstTriangle:start});}
}
function __qaFinishAshlarBatch(m,b){
 const before=__qaHashMesh(m);if(b.qaAshlarRanges)m.userData.qaAshlarRanges=b.qaAshlarRanges.map(r=>({...r}));const after=__qaHashMesh(m);
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('QA ashlar batch metadata altered rendered buffers');
 if(b.qaAshlarRanges)__qaAshlarBatchAudits.push({stage:'batch',primitiveIds:b.qaAshlarRanges.map(r=>r.primitiveId),before,after,identical:true});
}
`;
function instrument(source){
 if(digest(source)!==SOURCE_SHA)throw Error('Egypt source changed: ashlar ownership instrumentation is unreviewed');
 let s=source;const edit=(a,b)=>{if(s.split(a).length!==2)throw Error('Egypt instrumentation anchor missing/ambiguous: '+a.slice(0,75));s=s.replace(a,b);};
 edit('function solid(g,cs,cam,x,y,z,w,h,d,c){ashlar(g,x,y,z,w,h,d,c);volume(cs,x,y,z,w,h,d);volume(cam,x,y,z,w,h,d);}', 'function solid(g,cs,cam,x,y,z,w,h,d,c){const __qaMesh=ashlar(g,x,y,z,w,h,d,c);volume(cs,x,y,z,w,h,d);volume(cam,x,y,z,w,h,d);__qaCaptureAshlar(__qaMesh,g,cs[cs.length-1],cam[cam.length-1],[x,y,z,w,h,d]);return __qaMesh;}');
 edit('geo.applyMatrix4(m);const p=geo.attributes.position.array,n=geo.attributes.normal?.array;', 'geo.applyMatrix4(m);__qaTransferAshlar(o,b,geo);const p=geo.attributes.position.array,n=geo.attributes.normal?.array;');
 edit("m.name=zone.name+' / stone & paint';m.castShadow=true;m.receiveShadow=true;zone.add(m);", "m.name=zone.name+' / stone & paint';m.castShadow=true;m.receiveShadow=true;zone.add(m);__qaFinishAshlarBatch(m,b);");
 edit('export function buildEgypt(){', 'export function buildEgypt(){\n  __qaAshlarRegistry.length=0;__qaAshlarBatchAudits.length=0;');
 edit('return {group,colliders,spawn:[0,0,35.5]', 'return {qaAshlarSupports:__qaAshlarRegistry,qaAshlarBatchAudits:__qaAshlarBatchAudits,group,colliders,spawn:[0,0,35.5]');
 return injected+s;
}
module.exports={SOURCE_SHA,THREE_SHA,specs,digest,hashMesh,instrument};
