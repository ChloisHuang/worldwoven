// Local construction only: catches finite-bed overlap, an obstructed upper
// approach and a stair that strands a citizen or erases the perimeter passage.
// It deliberately does not instantiate the palace scene or run life/court AI.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),context=vm.createContext({console,Float32Array,Uint32Array,Uint16Array,Uint8Array}),cache=new Map();
function mod(file){file=file.split('?')[0];if(cache.has(file))return cache.get(file);let s=fs.readFileSync(file,'utf8');if(file.endsWith('/regions-east.js'))s+='\nexport {palaceWall,palaceCeiling,palaceRoof,beam,boundBook,foldedCloth,packStatic};';const m=new vm.SourceTextModule(s,{identifier:file,context});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?path.join(base,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s));
(async()=>{
 const r=mod(path.join(base,'game/regions-east.js'));await r.link(linker);await r.evaluate();
 const G=cache.get(path.join(base,'game/geometry.js')).namespace,H=r.namespace,T=G.THREE;
 const bureau=cache.get(path.join(base,'game/china-official-bureau.js')).namespace,B=bureau.CHINA_OFFICIAL_BUREAU;
 const nav=mod(path.join(base,'game/navigation.js'));if(nav.status==='unlinked')await nav.link(linker);if(nav.status==='linked')await nav.evaluate();
 const group=new T.Group(),roofGroup=new T.Group(),colliders=[],cameraColliders=[],walkableSurfaces=[{minX:14,maxX:29,minZ:28,maxZ:38,y:.115}],characterFootSurfaces=[],stairways=[],interiorRooms=[],doorways=[],explorationTargets=[],buildings=[],levels=[],lightingZones=[];
 const C={wood:0x805137,dark:0x50362d,red:0xac3b2d,gold:0xd7af56,cream:0xdbc5a0};
 const door=(id,name,axis,at,from,to,top,rooms,bottom)=>{doorways.push({id,name,axis,at,from,to,top,rooms,bottom});return {id,from,to,top,bottom};};
 const solid3=(g,x,y,z,w,h,d,color)=>{G.box(g,x,y,z,w,h,d,color);colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y-h/2,maxY:y+h/2});};
 const result=bureau.buildChinaOfficialBureau(G,{H,C,group,roofGroup,colliders,cameraColliders,walkableSurfaces,characterFootSurfaces,stairways,interiorRooms,doorways,explorationTargets,buildings,levels,lightingZones,palaceWall:H.palaceWall,door,upperFixture(){},solid3});
 // Exact adjacent palace wall and its wider lower trim, without a full scene.
 colliders.push({minX:28.615,maxX:29.385,minZ:28,maxZ:38,minY:0,maxY:.7},{minX:28.675,maxX:29.325,minZ:28,maxZ:38,minY:.7,maxY:4.8},{minX:14,maxX:29,minZ:37.615,maxZ:38.385,minY:0,maxY:.7},{minX:14,maxX:29,minZ:37.675,maxZ:38.325,minY:.7,maxY:4.8});
 const options={surfaces:walkableSurfaces,legacyGround:false,bounds:{minX:14,maxX:29,minZ:28,maxZ:38},bodyHeight:1.95,maxStep:.4,radius:.39,pathRadius:.39};
 const point=p=>({x:p[0],y:p[1],z:p[2]});
 const checkSegment=(a,b,label)=>assert(nav.namespace.canTraverse(point(a),point(b),colliders,options),label+' '+JSON.stringify([a,b]));
 assert.equal(B.offices.length,6);assert.equal(new Set(B.beds).size,6);assert.deepEqual(Array.from(B.offices.slice(0,2),p=>Array.from(p)),[[18,.215,32.5],[24,.215,32.5]]);
 assert.equal(result.additionalFurniture.length,6);assert.equal(B.privateRoomIds.slice(2).filter(Boolean).length,0);
 for(const [i,bed]of result.additionalFurniture.entries()){
  assert.equal(bed.id,B.beds[i]);assert(bed.ownerId);assert(!nav.namespace.blocked(bed.position[0],bed.position[2],colliders,.39,{...options,y:bed.position[1]}),bed.id+' approach is blocked');
  if(i>=2){assert(!bed.privateRoomId,bed.id+' cannot reserve a shared dorm');assert.equal(bed.sharedRoomId,B.roomIds[i]);assert.equal(bed.anchor[1],B.upperFloorY);}
 }
 for(let i=0;i<B.stairRoute.length-1;i++){checkSegment(B.stairRoute[i],B.stairRoute[i+1],'stair ascent');checkSegment(B.stairRoute[i+1],B.stairRoute[i],'stair descent');}
 checkSegment([28.17,.115,28.5],[28.17,.115,36.9],'existing east passage');
 for(const p of B.offices.slice(2))checkSegment(B.upperHall,p,'upper desk reach');
 for(const [i,bed]of result.additionalFurniture.slice(2).entries()){const room=B.dorms[i<2?0:1],front=[room.aisleX,B.upperFloorY,32.15];checkSegment(B.upperHall,front,'dorm approach');checkSegment(front,bed.position,'bed approach');}
 for(const d of B.dorms){const beds=result.additionalFurniture.filter(f=>f.sharedRoomId===d.id);assert.equal(beds.length,2);assert(Math.abs(beds[0].center[0]-beds[1].center[0])>(beds[0].size[0]+beds[1].size[0])/2+.78,'two bed hulls retain a body-width aisle');assert.equal(interiorRooms.find(r=>r.id===d.id).capacity,2);}
 assert.equal(stairways.length,1);assert.equal(characterFootSurfaces.length,20);assert(stairways[0].rise<=.20);assert(stairways[0].tread>=.28);
 assert(bureau.isChinaOfficialUpperFloor(point(B.upperHall)));assert(!bureau.isChinaOfficialUpperFloor({x:22,y:7.815,z:14}));
 group.updateMatrixWorld(true);roofGroup.updateMatrixWorld(true);let meshCount=0;group.traverse(o=>{if(!o.isMesh)return;meshCount++;assert(o.geometry.attributes.position.array.every(Number.isFinite),'non-finite geometry');});
 console.log(JSON.stringify({status:'PASS',scope:'local bureau builder, no palace scene',beds:result.additionalFurniture.length,desks:B.offices.length,dorms:B.dorms.length,steps:characterFootSurfaces.length,meshCount,maxRssMiB:process.resourceUsage().maxRSS/1024}));
})().catch(e=>{console.error(e);process.exitCode=1;});
