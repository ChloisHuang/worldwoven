// Actual posed triangles only. Closed horizontal sections support containment;
// unresolved topology is REVIEW. No proxy caps are added.
exports.createGarmentProbe=function(T,positions,indices,metadata={}){
 const epsilon=1e-9,weld=1e-7,bounds=new T.Box3(),triangles=[],cache=new Map();
 for(let i=0;i<indices.length;i+=3){
  const ids=indices.slice(i,i+3),v=ids.map(j=>new T.Vector3().fromArray(positions,j*3));
  for(const p of v)bounds.expandByPoint(p);
  triangles.push({ids,v,triangle:new T.Triangle(...v),index:i/3,minY:Math.min(...v.map(p=>p.y)),maxY:Math.max(...v.map(p=>p.y))});
 }
 const indexedVertices=[...new Set(indices)].map(id=>({id,p:new T.Vector3().fromArray(positions,id*3)}));
 let boundarySupportPlanes=null;
 function outsideSupportProof(point){
  if(boundarySupportPlanes===null){
   boundarySupportPlanes=[];
   const vertices=indexedVertices,nodes=[],buckets=new Map(),sourceNode=new Map(),edgeCounts=new Map();
   // Geometric seam welding only discovers real boundary-loop directions.
   // Every support extremum below still uses ALL original indexed vertices.
   for(const {id,p}of vertices){
    const cell=p.toArray().map(v=>Math.floor(v/weld));let found=-1;
    search:for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const n of buckets.get(`${cell[0]+x}:${cell[1]+y}:${cell[2]+z}`)||[])if(nodes[n].p.distanceTo(p)<=weld){found=n;break search;}
    if(found<0){found=nodes.length;nodes.push({p,sourceIds:[],neighbors:[]});const key=cell.join(':');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(found);}
    nodes[found].sourceIds.push(id);sourceNode.set(id,found);
   }
   for(const t of triangles)for(let e=0;e<3;e++){const a=sourceNode.get(t.ids[e]),b=sourceNode.get(t.ids[(e+1)%3]);if(a===b)continue;const key=[a,b].sort((a,b)=>a-b).join(':');if(!edgeCounts.has(key))edgeCounts.set(key,{a,b,count:0});edgeCounts.get(key).count++;}
   for(const e of edgeCounts.values())if(e.count===1){nodes[e.a].neighbors.push(e.b);nodes[e.b].neighbors.push(e.a);}
   const visited=new Set();
   for(let start=0;start<nodes.length;start++){
    if(!nodes[start].neighbors.length||visited.has(start))continue;
    const component=[],todo=[start];while(todo.length){const id=todo.pop();if(visited.has(id))continue;visited.add(id);component.push(id);todo.push(...nodes[id].neighbors);}
    if(component.length<3||component.some(id=>nodes[id].neighbors.length!==2))continue;
    const loop=[];let current=start,previous=-1;do{if(loop.includes(current))break;loop.push(current);const next=nodes[current].neighbors.find(id=>id!==previous);previous=current;current=next;}while(current!==start);
    if(current!==start||loop.length!==component.length)continue;
    const origin=new T.Vector3();for(const id of loop)origin.add(nodes[id].p);origin.multiplyScalar(1/loop.length);
    const normal=new T.Vector3();for(let i=0;i<loop.length;i++){const a=nodes[loop[i]].p.clone().sub(origin),b=nodes[loop[(i+1)%loop.length]].p.clone().sub(origin);normal.add(a.cross(b));}if(normal.lengthSq()<1e-20)continue;normal.normalize();
    let min=Infinity,max=-Infinity;for(const {p}of vertices){const projection=p.clone().sub(origin).dot(normal);min=Math.min(min,projection);max=Math.max(max,projection);}
    boundarySupportPlanes.push({origin,normal,min,max,verticesChecked:vertices.length,boundaryLoopSourceVertexIndices:loop.flatMap(id=>nodes[id].sourceIds)});
   }
  }
  for(const plane of boundarySupportPlanes){
   const projection=point.clone().sub(plane.origin).dot(plane.normal),above=projection-plane.max,below=plane.min-projection,separation=Math.max(above,below),numericalGuard=1e-6;
   if(separation>numericalGuard)return {candidate:'real-boundary-loop',origin:plane.origin.toArray(),normal:plane.normal.toArray(),minimumProjection:plane.min,maximumProjection:plane.max,pointProjection:projection,separation,side:above>below?'above-maximum':'below-minimum',numericalGuard,verticesChecked:plane.verticesChecked,boundaryLoopSourceVertexIndices:plane.boundaryLoopSourceVertexIndices};
  }
  // The closest surface only proposes a direction. It does not establish
  // outside by itself; verify this direction against every indexed vertex.
  const closest=nearest(point);
  if(closest&&closest.distance>epsilon){
   const origin=new T.Vector3(...closest.point),normal=point.clone().sub(origin).normalize();let min=Infinity,max=-Infinity;
   for(const {p}of indexedVertices){const projection=p.clone().sub(origin).dot(normal);min=Math.min(min,projection);max=Math.max(max,projection);}
   const projection=point.clone().sub(origin).dot(normal),above=projection-max,below=min-projection,separation=Math.max(above,below),numericalGuard=1e-6;
   if(separation>numericalGuard)return {candidate:'closest-actual-surface-to-query',origin:origin.toArray(),normal:normal.toArray(),minimumProjection:min,maximumProjection:max,pointProjection:projection,separation,side:above>below?'above-maximum':'below-minimum',numericalGuard,verticesChecked:indexedVertices.length,nearestActualTriangle:closest};
  }
  return null;
 }
 function sectionAt(y){
  if(cache.has(y))return cache.get(y);
  const nodes=[],buckets=new Map(),edges=new Map();let coplanar=0,ambiguous=0;
  function nodeAt(p){
   const gx=Math.floor(p.x/weld),gz=Math.floor(p.z/weld);
   for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const id of buckets.get(`${gx+dx}:${gz+dz}`)||[]){const q=nodes[id];if(Math.hypot(p.x-q.x,p.z-q.z)<=weld)return id;}
   const id=nodes.length;nodes.push({x:p.x,z:p.z,neighbors:[]});const key=`${gx}:${gz}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);return id;
  }
  for(const t of triangles){
   if(y<t.minY-epsilon||y>t.maxY+epsilon)continue;
   if(t.v.every(p=>Math.abs(p.y-y)<epsilon)){coplanar++;continue;}
   const cuts=[];
   for(let e=0;e<3;e++){const a=t.v[e],b=t.v[(e+1)%3],da=a.y-y,db=b.y-y;
    if(Math.abs(da)<epsilon)cuts.push({x:a.x,z:a.z});
    if(da*db<0){const u=-da/(db-da);cuts.push({x:a.x+u*(b.x-a.x),z:a.z+u*(b.z-a.z)});}
   }
   const ids=[...new Set(cuts.map(nodeAt))];if(ids.length<2)continue;if(ids.length!==2){ambiguous++;continue;}
   const key=ids.slice().sort((a,b)=>a-b).join(':');if(edges.has(key)){edges.get(key).multiplicity++;continue;}
   edges.set(key,{ids,multiplicity:1});
  }
  const segments=[...edges.values()];for(const e of segments){nodes[e.ids[0]].neighbors.push(e.ids[1]);nodes[e.ids[1]].neighbors.push(e.ids[0]);}
  const active=nodes.filter(n=>n.neighbors.length),bad=active.filter(n=>n.neighbors.length!==2),duplicates=segments.filter(e=>e.multiplicity>2);
  let selfIntersections=0;
  const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  function onSegment(a,b,c){return Math.abs(cross(a,b,c))<=1e-12&&c.x>=Math.min(a.x,b.x)-epsilon&&c.x<=Math.max(a.x,b.x)+epsilon&&c.z>=Math.min(a.z,b.z)-epsilon&&c.z<=Math.max(a.z,b.z)+epsilon;}
  if(!coplanar&&!ambiguous&&!bad.length&&!duplicates.length)for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
   const ei=segments[i].ids,ej=segments[j].ids;if(ei.some(n=>ej.includes(n)))continue;
   const [a,b]=ei.map(n=>nodes[n]),[c,d]=ej.map(n=>nodes[n]),ac=cross(a,b,c),ad=cross(a,b,d),ca=cross(c,d,a),cb=cross(c,d,b);
   if((ac*ad<0&&ca*cb<0)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b))selfIntersections++;
  }
  const status=coplanar||ambiguous||bad.length||duplicates.length||selfIntersections?'REVIEW':segments.length?'CLOSED':'EMPTY';
  const result={status,y,segments:segments.length,vertices:active.length,coplanarTriangles:coplanar,ambiguousTriangles:ambiguous,abnormalDegrees:bad.map(n=>n.neighbors.length),excessDuplicateEdges:duplicates.length,selfIntersections,nodes,edges:segments};cache.set(y,result);return result;
 }
 function summary(section){const {nodes,edges,...result}=section;return result;}
 function nearest(point){
  let closest=null;const q=new T.Vector3(),normal=new T.Vector3(),line=new T.Line3();
  for(const t of triangles){
   t.triangle.getNormal(normal);
   if(normal.lengthSq()<1e-20){for(let e=0;e<3;e++){line.set(t.v[e],t.v[(e+1)%3]);line.closestPointToPoint(point,true,q);const distance=point.distanceTo(q);if(!closest||distance<closest.distance)closest={distance,point:q.toArray(),triangleInSourcePart:t.index,triangleInMergedCloth:(metadata.indexStart||0)/3+t.index,clothVertexIndices:t.ids};}}
   else{t.triangle.closestPointToPoint(point,q);const distance=point.distanceTo(q);if(!Number.isFinite(distance))throw new Error('Non-finite closest-triangle distance');if(!closest||distance<closest.distance)closest={distance,point:q.toArray(),triangleInSourcePart:t.index,triangleInMergedCloth:(metadata.indexStart||0)/3+t.index,clothVertexIndices:t.ids};}
  }return closest;
 }
 return {name:metadata.name||'garment',bounds,sectionAt:y=>summary(sectionAt(y)),classify(point){
  if(!bounds.containsPoint(point))return {status:'OUTSIDE',reason:'indexed-bounds'};
  const section=sectionAt(point.y);if(section.status==='REVIEW'){
   const support=outsideSupportProof(point);
   if(support)return {status:'OUTSIDE',reason:'actual-vertex-support-halfspace',support,section:summary(section)};
   return {status:'REVIEW',reason:'unresolved-horizontal-section',section:summary(section)};
  }
  if(section.status==='EMPTY')return {status:'OUTSIDE',reason:'empty-horizontal-section',section:summary(section)};
  let crossings=0;
  for(const {ids}of section.edges){const [a,b]=ids.map(i=>section.nodes[i]);if((a.z>point.z)!==(b.z>point.z)){const x=a.x+(point.z-a.z)*(b.x-a.x)/(b.z-a.z);if(x>point.x)crossings++;}}
  if(crossings%2===0)return {status:'OUTSIDE',reason:'closed-horizontal-section',section:summary(section)};
  return {status:'INSIDE',section:summary(section),nearest:nearest(point)};
 }};
};
exports.classifyGarmentUnion=function(probes,point){
 const results=probes.map(probe=>({garment:probe.name,...probe.classify(point)}));
 return {inside:results.some(r=>r.status==='INSIDE'),review:results.some(r=>r.status==='REVIEW'),results};
};
