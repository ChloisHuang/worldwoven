import {insetClosureSection} from './inset-closures.js';
import {buildChinaDragonBed} from './china-dragon-bed.js';
import {registerNightFixture} from './night-lighting.js';

// R11 painted and furnished original procedural palace. The entire estate was replanned as separate
// roofed buildings within four palace walls, rather than enlarging one house.
// Visual study: mareasia, SGLY t182446 (creator effect images, 2026-10-02).
// No third-party geometry, texture, download, or traced plan is used.
export function buildChinaPalace(G,H){
 const {THREE}=G;
 const {palaceBox,palaceWall:rawPalaceWall,palaceCeiling,palaceRoof,beam,teaSet,bowl,scroll,openShelf,boundBook,foldedCloth,flowerBranches,cherry,bamboo,packStatic}=H;
 const C={red:0xac3b2d,dark:0x50362d,wood:0x805137,gold:0xd7af56,stone:0xc9c3b0,cream:0xdbc5a0,jade:0x287879,roof:0xc39341};
 const group=new THREE.Group(),roofGroup=new THREE.Group(),exterior=new THREE.Group();
 group.name='China — Four Courts Palace';roofGroup.name='China palace roofs and real ceilings';exterior.name='China outer walls and open courts';group.add(exterior,roofGroup);
 const additionalFurnitureSeats=[],colliders=[],cameraColliders=[],walkableSurfaces=[],characterFootSurfaces=[],stairways=[],interiorRooms=[],doorways=[],explorationTargets=[],buildings=[],perimeterWalls=[],courts=[];
 const bounds={minX:-30,maxX:30,minZ:-40,maxZ:40};
 // Source walls are actually cut to house each inset closure. Functional
 // aperture IDs/widths remain separate from the rough masonry opening.
 const insetSections=new Map();
 const insetKinds={
  'cn-south-gate':['hinge',1,.65],'cn-south-gate-west':['hinge',1,.65],'cn-south-gate-east':['hinge',1,.65],
  'cn-north-gate':['hinge',1,.65],'cn-north-gate-west':['hinge',1,.65,.13],'cn-north-gate-east':['hinge',1,.65,.13],'cn-west-gate':['hinge',-1,.65],'cn-east-gate':['hinge',1,.65],
 };
 function palaceWall(parent,nav,camera,options){
  for(const op of options.openings||[]){const section=insetSections.get(op.id);if(!section||section.group.parent)continue;parent.add(section.group);section.group.updateWorldMatrix(true,true);
   for(const local of section.localSolids){const b=new THREE.Box3(new THREE.Vector3(local.minX,local.minY,local.minZ),new THREE.Vector3(local.maxX,local.maxY,local.maxZ)).applyMatrix4(section.group.matrixWorld),world={minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z,closureSection:op.id};if(local.walkBlock)nav.push({...world});camera.push({...world});}
  }
  rawPalaceWall(parent,nav,camera,options);
 }

 const box=(g,x,y,z,w,h,d,color,block=false)=>palaceBox(g,colliders,cameraColliders,x,y,z,w,h,d,color,block);
 const floor=(g,x,z,w,d,y=.2,color=C.stone)=>{if(!(y===.2&&['China building hall','China building archive'].includes(g.name)))box(g,x,y/2,z,w,y,d,color);walkableSurfaces.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y:y+.015,owner:g.name});};
 const target=(id,name,x,z,roomId)=>explorationTargets.push({id,name,roomId,position:[x,0,z]});
 const door=(id,name,axis,at,from,to,top,rooms,bottom=.2)=>{const center=(from+to)/2;const point=off=>axis==='x'?[center,0,at+off]:[at+off,0,center];const d={id,name,axis,at,from,to,bottom,top,width:to-from,height:top-bottom,rooms,a:point(-.85),b:point(.85)};doorways.push(d);const choice=insetKinds[id];if(choice){const[kind,swing,wallDepth,authoredHingeOffset]=choice,section=insetClosureSection({kind,axis,at,lateral:center,bottom,top,width:to-from,wallDepth,style:'palace',swing,hingeNormalOffset:authoredHingeOffset??(wallDepth===.65?.18:.155)});section.group.name='China inset closure '+id;insetSections.set(id,section);d.closureMount=section.mount;d.roughOpening={...section.roughOpening};return {id,...section.roughOpening};}return {id,from,to,top,bottom};};

 // Original, low-relief painted decoration. Every composition belongs to an
 // existing wall, beam or furniture support. R14 elevations and circulation
 // are authored explicitly below, with matching geometry and engine surfaces.
 const ornaments=[],ink=0x245564,teal=0x3d9590,ivory=0xf2d999,bronze=0x75633b;
 const ornament=(g,id,kind,support,build)=>{const q=new THREE.Group();q.name='China R11 '+id;g.add(q);build(q);q.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(q);let meshes=0,triangles=0;q.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});ornaments.push({id,kind,support,groupName:q.name,meshes,triangles,bounds:{min:b.min.toArray(),max:b.max.toArray()}});return q;};
 // A bezier silhouette creates a continuous cut petal, not stacked primitives.
 const petal=(g,x,y,z,w,h,c,angle=0)=>{const p=new THREE.Shape();p.moveTo(0,0);p.bezierCurveTo(-w*.64,h*.32,-w*.4,h*.83,0,h);p.bezierCurveTo(w*.4,h*.83,w*.64,h*.32,0,0);const m=G.mesh(g,new THREE.ExtrudeGeometry(p,{depth:.016,bevelEnabled:false,curveSegments:5}),c,x,y,z);m.rotation.z=angle;return m;};
 const stroke=(g,points,r,c)=>G.mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(5,points.length*2),r,4,false),c);
 const cloud=(g,x,y,z,s=1,c=C.gold)=>{const pts=[[-.55,-.03],[-.28,-.03],[-.39,.10],[-.34,.25],[-.17,.27],[-.09,.12],[.02,.22],[.18,.21],[.24,.08],[.10,-.04],[.52,-.04]];stroke(g,pts.map(([a,b])=>[x+a*s,y+b*s,z]),.027*s,c);stroke(g,[[x-.48*s,y-.15*s,z],[x-.16*s,y-.15*s,z],[x+.07*s,y-.10*s,z],[x+.37*s,y-.15*s,z]],.018*s,ivory);};
 const lotus=(g,x,y,z,s=1)=>{for(const a of [-1.10,-.62,0,.62,1.10])petal(g,x,y,z,.28*s,.54*s,a===0?ivory:C.gold,a);for(const a of [-1.1,-.55,.55,1.1])petal(g,x,y-.035*s,z+.020,.20*s,.33*s,teal,a);};
 const frame=(g,x,y,z,w,h,c=C.gold)=>{for(const dx of [-w/2,w/2])G.box(g,x+dx,y,z,.045,h,.036,c);for(const dy of [-h/2,h/2])G.box(g,x,y+dy,z,w,.045,.036,c);};
 function paintedBand(g,id,x,y,z,w,angle=0){
  return ornament(g,id,'painted-frieze','existing transom',q=>{q.position.set(x,y,z);q.rotation.y=angle;
   G.box(q,0,0,0,w,.43,.026,ink);for(const yy of [-.205,.205])G.box(q,0,yy,.026,w,.033,.035,C.gold);
   const n=Math.max(2,Math.floor(w/(id.startsWith('main-gallery-')||id.startsWith('loft-frieze-')?4.2:1.65))),step=w/n;
   for(let i=0;i<n;i++){const xx=-w/2+step*(i+.5);frame(q,xx,0,.030,step-.14,.31,C.gold);G.box(q,xx,0,.052,.21,.21,.018,teal).rotation.z=Math.PI/4;cloud(q,xx,-.07,.078,.45);for(const side of [-1,1])petal(q,xx+side*(step*.30),-.1,.066,.11,.21,C.gold,side*.9);}
  });
 }
 function dado(g,id,axis,at,from,to,face=1){
  const w=to-from;if(w<.28)return;ornament(g,id,'vermillion-wainscot','existing masonry wall',q=>{q.position.set(axis==='x'?(from+to)/2:at,.76,axis==='x'?at:(from+to)/2);q.rotation.y=axis==='x'?(face===1?0:Math.PI):(face===1?Math.PI/2:-Math.PI/2);
   G.box(q,0,0,.177,w,1.08,.028,C.red);for(const yy of [-.50,.50])G.box(q,0,yy,.205,w,.046,.035,C.gold);const n=Math.max(1,Math.ceil(w/1.65)),step=w/n;
   for(let i=0;i<n;i++){const xx=-w/2+(i+.5)*step;frame(q,xx,0,.219,step-.20,.79,C.dark);frame(q,xx,0,.240,step-.31,.67,C.gold);const rr=G.box(q,xx,0,.261,.21,.21,.018,C.gold);rr.rotation.z=Math.PI/4;}
  });
 }
 function silkLantern(g,id,x,y,z,s=.38){
  return ornament(g,id,'ribbed-palace-lantern','existing overhead beam or lamp post',q=>{q.position.set(x,y,z);const h=.72;
   // Eight faceted silk panels, continuous curved ribs, a raised cap and tassel.
   const profile=[[.20,-.47],[.34,-.37],[.42,-.12],[.42,.12],[.34,.37],[.20,.47]];
   G.mesh(q,new THREE.LatheGeometry(profile.map(([r,yy])=>new THREE.Vector2(r*s/.38,yy)),8),C.red,0,0,0,{emissive:0xffa550,emissiveIntensity:.48});
   for(let i=0;i<8;i++){const a=i*Math.PI/4;stroke(q,profile.map(([r,yy])=>[Math.sin(a)*(r*s/.38+.018),yy,Math.cos(a)*(r*s/.38+.018)]),.017,C.gold);}
   for(const yy of [-.45,.45])G.cyl(q,0,yy,0,s*.63,s*.8,.075,C.gold,8);G.cyl(q,0,.515,0,s*.48,s*.7,.055,C.dark,8);G.cyl(q,0,.72,0,.018,.018,.36,C.gold,6);
   for(const side of [-1,1]){petal(q,side*.025,-.19,s*1.10,.13,.31,ivory,side*.4);}
   G.cyl(q,0,-.63,0,.025,.025,.28,C.gold,6);G.cyl(q,0,-.83,0,.09,.045,.22,C.red,8);for(const a of [-.05,0,.05])G.cyl(q,a,-1.0,0,.012,.012,.23,C.gold,5);
  });
 }
 function incense(g,id,x,y,z,s=1){
  return ornament(g,id,'bronze-incense-vessel','existing ceremonial console top',q=>{q.position.set(x,y,z);q.scale.setScalar(s);
   const profile=[[.18,.08],[.26,.10],[.35,.22],[.39,.45],[.34,.55],[.34,.59],[.29,.59],[.29,.54],[.32,.44],[.27,.23],[.18,.16]];
   G.mesh(q,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),16),bronze);for(const yy of [.11,.52,.59])G.torus(q,0,yy,0,yy===.11?.25:.345,.027,C.gold);
   for(let i=0;i<3;i++){const a=i*2*Math.PI/3;stroke(q,[[Math.sin(a)*.27,.27,Math.cos(a)*.27],[Math.sin(a)*.28,.13,Math.cos(a)*.28],[Math.sin(a)*.32,.02,Math.cos(a)*.32]],.045,bronze);}
   for(const side of [-1,1])stroke(q,[[side*.32,.46,0],[side*.49,.52,0],[side*.46,.72,0],[side*.30,.69,0]],.035,C.gold);
   G.mesh(q,new THREE.LatheGeometry([[0,.92],[.11,.89],[.18,.81],[.30,.76],[.34,.66]].map(p=>new THREE.Vector2(...p)),16),bronze);G.sphere(q,0,.96,0,.055,C.gold);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;petal(q,Math.sin(a)*.322,.63,Math.cos(a)*.322,.09,.14,teal,a);}
  });
 }
 function dragon(g,x,y,z,s=1,mirror=1){
  const q=new THREE.Group();q.position.set(x,y,z);q.scale.set(mirror*s,s,s);g.add(q);
  stroke(q,[[-.74,-.58,0],[-.30,-.35,0],[.38,-.42,0],[.65,-.09,0],[.43,.29,0],[-.17,.25,0],[-.40,.63,0],[-.21,.89,0],[.12,.92,0]],.115,C.gold);
  stroke(q,[[-.66,-.59,.055],[-.28,-.40,.055],[.38,-.46,.055],[.58,-.11,.055],[.39,.22,.055],[-.20,.18,.055],[-.45,.57,.055]],.022,ivory);
  petal(q,.01,.68,.04,.38,.39,C.gold,-.55);G.sphere(q,.16,.91,.025,.14,C.gold,1.35,.72,.38);G.sphere(q,.15,.94,.096,.025,C.dark);stroke(q,[[.24,.86,.06],[.40,.92,.06],[.50,.89,.06]],.018,ivory);
  for(const side of [-1,1]){stroke(q,[[-.06,.93,0],[-.13,1.14,0],[-.02,1.22,0]],.034,C.gold);stroke(q,[[.32*side,.10,0],[.48*side,.02,0],[.70*side,.14,0]],.049,C.gold);for(const j of [-1,0,1])stroke(q,[[.65*side,.12,0],[(.80+j*.05)*side,.14+j*.08,0]],.020,C.gold);}
  for(let i=0;i<6;i++)petal(q,-.20+i*.12,-.39,.10,.07,.13,teal,-.6);
 }
 const column=(g,x,z,h=4.5,r=.18)=>{G.cyl(g,x,(h+.2)/2,z,r,r,h-.2,C.red,12);box(g,x,.28,z,r*2.9,.3,r*2.9,0xb3b6a7,true);for(const y of [.6,h-.3])G.cyl(g,x,y,z,r*1.12,r*1.12,.12,C.gold,12);cameraColliders.push({minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r,minY:.2,maxY:h});};
 const fixture=(g,x,y,z,kind='palace-pendant',size=.30,compact=false)=>{G.cyl(g,x,y+(compact?.34:.52),z,.024,.024,compact?.26:.52,C.gold,6);const lamp=silkLantern(g,'fixture-'+x+'-'+z+'-'+y,x,y,z,size);if(compact)lamp.scale.y=.38;G.mesh(g,new THREE.SphereGeometry(size*.54,10,6),0xffce8a,x,y,z,{emissive:0xffa550,emissiveIntensity:.48});registerNightFixture(g,x,y-.10,z,{kind,intensity:22,distance:12,floorY:0});};
 const standingLamp=(x,z)=>{column(exterior,x,z,3.25,.085);G.box(exterior,x,3.25,z,.9,.13,.72,C.dark);fixture(exterior,x,2.6,z,'court-lantern',.31);};
 const window=(g,x,z,w,axis='x',h=2.35,y=2.62)=>{const q=new THREE.Group();q.position.set(x,y,z);if(axis==='z')q.rotation.y=Math.PI/2;g.add(q);for(const a of [-w/2,w/2])G.box(q,a,0,0,.13,h,.2,C.red);for(const b of [-h/2,h/2,0])G.box(q,0,b,0,w,.11,.2,C.red);for(let a=-w/2+.34;a<w/2-.1;a+=.46){G.box(q,a,0,0,.052,h-.12,.1,C.dark);for(const b of [-.59,.59]){const d=G.box(q,a,b,.03,.31,.31,.055,C.gold);d.rotation.z=Math.PI/4;}}ornament(q,'lattice-'+x+'-'+z+'-'+axis,'lotus-lattice','existing window frame',d=>{for(const sign of [-1,1]){const f=new THREE.Group();f.rotation.y=sign<0?Math.PI:0;d.add(f);G.box(f,0,-.88,.065,w-.16,.42,.028,C.jade);for(const yy of [-1.06,-.69])G.box(f,0,yy,.086,w-.12,.035,.032,C.gold);lotus(f,0,-1.00,.106,.43);for(const xx of [-w*.28,w*.28]){frame(f,xx,.11,.066,w*.30,h*.49,C.gold);cloud(f,xx,.64,.09,.39);}}});cameraColliders.push({minX:x-(axis==='x'?w/2:.10),maxX:x+(axis==='x'?w/2:.10),minY:y-h/2,maxY:y+h/2,minZ:z-(axis==='x'?.10:w/2),maxZ:z+(axis==='x'?.10:w/2)});};
 const stool=(g,x,z)=>{box(g,x,.45,z,.75,.5,.75,C.wood,true);G.box(g,x,.76,z,.86,.12,.86,0xb19068);};
 const table=(g,x,z,w,d,h=1)=>{G.table(g,x,z,w,d,C.wood,h);G.collider(colliders,x,z,w,d);cameraColliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:.2,maxY:h+.09});};
 const shelf=(g,x,z,w=3.2,h=2.8,d=.7,rot=0)=>{const s=openShelf(g,colliders,x,z,w,h,d,C.wood,rot);s.position.y=.2;cameraColliders.push({minX:x-(rot?d:w)/2,maxX:x+(rot?d:w)/2,minZ:z-(rot?w:d)/2,maxZ:z+(rot?w:d)/2,minY:.2,maxY:h+.2});for(const xx of [-w*.30,0,w*.30]){for(let j=0;j<3;j++)boundBook(s,xx,.35+j*.11,0,w*.20,.46,[0x738d7b,0xb69d6a,0x9a6350][j]);G.vessel(s,xx,1.51,0,0xa9c2b5,.55);}return s;};
 // All four enclosing walls are tall masonry palace walls. South entry is on
 // the spawn axis; secondary east/west/north gates are usable from both sides.
 G.box(exterior,0,-.5,0,60,1,80,0x859b79);floor(exterior,0,0,58,76,.10,0xbdbca9);
 const perimeter=(side,axis,at,from,to,gap)=>{
  const w=new THREE.Group();w.name='China perimeter '+side;exterior.add(w);
  // The rear terrace/stair excludes a six-metre inward swing. Three
  // outward bays retain the central axis and fit wholly inside the north
  // boundary; their real0.30m piers house both neighboring inset jambs.
  const bays=side==='south'?[['south-gate-west',-5,-2.8],['south-gate',-2.2,2.2],['south-gate-east',2.8,5]]:side==='north'?[['north-gate-west',-3,-1.4],['north-gate',-1.1,1.1],['north-gate-east',1.4,3]]:[[side+'-gate',gap[0],gap[1]]];
  const ops=bays.map(([suffix,a,b])=>{const op=door('cn-'+suffix,side==='south'?'承礼门 '+(suffix==='south-gate'?'中轴正门':suffix.endsWith('west')?'西掖门':'东掖门'):side==='north'?'北苑门 '+(suffix==='north-gate'?'中轴正门':suffix.endsWith('west')?'西侧门':'东侧门'):side+' palace gate',axis,at,a,b,4.1,['outside','compound'],.10);if(axis==='z'){doorways.at(-1).a[0]=at-.55;doorways.at(-1).b[0]=at+.55;}return op;});
  // The north/east/west courtyard supplies the inner half of the 100mm sill.
  // Cut the duplicate lower wall and keep only the exterior supported step.
  // This is a strict subset of the former solid; leaf/frame levels do not move.
  if(side!=='south')for(const op of ops){const mid=(op.from+op.to)/2,outer=at+Math.sign(at)*.1625;floor(w,axis==='x'?mid:outer,axis==='x'?outer:mid,axis==='x'?op.to-op.from:.325,axis==='x'?.325:op.to-op.from,.10,C.red);doorways.find(d=>d.id===op.id).wallCut={...op,bottom:0};}
  palaceWall(w,colliders,cameraColliders,{axis,at,from,to,bottom:0,top:4.8,depth:.65,color:C.red,openings:side!=='south'?ops.map(op=>({...op,bottom:0})):ops});
  const pieces=[];let cursor=from;for(const op of ops){pieces.push([cursor,op.from]);cursor=op.to;}pieces.push([cursor,to]);
  for(const[a,b]of pieces){const mid=(a+b)/2;G.box(w,axis==='x'?mid:at,.35,axis==='x'?at:mid,axis==='x'?b-a:.77,.7,axis==='x'?.77:b-a,0xa6aaa0);G.box(w,axis==='x'?mid:at,4.88,axis==='x'?at:mid,axis==='x'?b-a:1.04,.22,axis==='x'?1.04:b-a,C.roof);for(let t=a+.22;t<b;t+=.56){const m=G.cyl(w,axis==='x'?t:at,5.02,axis==='x'?at:t,.13,.13,1.13,0xd0ac60,8);m.rotation.x=axis==='x'?Math.PI/2:0;m.rotation.z=axis==='z'?Math.PI/2:0;}}
  const bb=axis==='x'?{minX:from,maxX:to,minZ:at-.325,maxZ:at+.325}:{minX:at-.325,maxX:at+.325,minZ:from,maxZ:to};perimeterWalls.push({side,groupName:w.name,bounds:{...bb,minY:0,maxY:4.8},openings:bays.map(([suffix,a,b])=>({id:'cn-'+suffix,from:a,to:b,width:b-a}))});return w;
 };
 perimeter('south','x',38,-29,29,[-5,5]);perimeter('north','x',-38,-29,29,[-3,3]);perimeter('west','z',-29,-38,38,[-20,-16]);perimeter('east','z',29,-38,38,[-20,-16]);
 // Formal axis and open courts are intentionally broad and lightly furnished.
 floor(exterior,0,19,12,38,.125,0xd6d0bc);for(const x of [-5.75,5.75])G.box(exterior,x,.141,19,.15,.025,38,0x9fa696);
 for(let z=1;z<37;z+=2)G.box(exterior,0,.147,z,10.9,.02,.035,0xb6b8aa);
 const court=(id,name,b)=>courts.push({id,name,bounds:b,openToSky:true});
 court('grand-court','承礼广庭',{minX:-15,maxX:15,minZ:6,maxZ:31});court('inner-garden','后苑荷庭',{minX:-15,maxX:15,minZ:-22,maxZ:-12});court('north-court','北庭',{minX:-27,maxX:27,minZ:-37,maxZ:-34.5});
 // A wide south gatehouse gives a roofed, legible threshold without concealing
 // the ceremonial hall. No leaf or raised step blocks the ten-metre passage.
 const gate=new THREE.Group(),gateRoof=new THREE.Group();gate.name='China building south-gatehouse';gateRoof.name='China roof south-gatehouse';group.add(gate);roofGroup.add(gateRoof);floor(gate,0,35,17,6,.2,0xc2bca6);
 for(const x of [-7.5,-5.7,5.7,7.5])for(const z of [32.5,37.5])column(gate,x,z,5.9,.25);
 for(const x of [-6.3,6.3])box(gate,x,2.6,35,2.5,5.2,5,C.red,true);
 palaceCeiling(gateRoof,colliders,cameraColliders,0,35,17,6,5.9,true);palaceRoof(gateRoof,0,6.12,35,19,7.8,1.5,C.roof);G.box(gate,0,5.02,32.36,4.5,.8,.18,C.jade);for(const x of [-1.4,-.47,.47,1.4])G.box(gate,x,5.02,32.24,.12,.48,.05,C.gold);
 fixture(gate,0,5.1,35,'gate-lantern',.45);door('cn-gatehouse-court','宫门入庭','x',32.5,-4.5,4.5,5.4,['gatehouse','grand-court']);buildings.push({id:'south-gatehouse',name:'承礼门',groupName:gate.name,roofGroupName:gateRoof.name,bounds:{minX:-8.5,maxX:8.5,minZ:32,maxZ:38},roomIds:['gatehouse'],openGatehouse:true});
 interiorRooms.push({id:'gatehouse',name:'承礼门门廊',minX:-5,maxX:5,minZ:32,maxZ:38,ceiling:5.9});
 const structures=[{id:'hall',name:'承礼正殿',x:0,z:-3,w:22,d:16,h:5.7,ceremony:true},{id:'tea',name:'西苑茶厅',x:-21,z:14.5,w:10,d:13,h:4.35},{id:'study',name:'东苑书斋',x:21,z:14.5,w:10,d:13,h:4.35},{id:'bedroom',name:'静宜寝殿',x:-21,z:-5,w:10,d:14,h:4.35},{id:'kitchen',name:'御膳与餐厅',x:21,z:-5,w:10,d:14,h:4.35},{id:'bath',name:'竹苑浴房',x:-21,z:-28,w:10,d:10,h:4.0},{id:'archive',name:'北苑藏书殿',x:0,z:-28.5,w:22,d:11,h:3.6},{id:'guest',name:'东苑客居',x:21,z:-28,w:10,d:10,h:4.0}];
 const rooms={};
 function hall(s){const {x,z,w,d,h,id,name}=s,g=new THREE.Group(),r=new THREE.Group();g.name='China building '+id;r.name='China roof '+id;group.add(g);roofGroup.add(r);rooms[id]={g,r,...s};const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2;
  floor(g,x,z,w,d,.20,s.ceremony?0xbdb6a0:0xbba684);floor(g,x,z1+.65,w+1,1.3,.20,0xc4b69b);
  const entryWidth=s.ceremony?6:3.2,entryX=id==='bath'?x-1.5:x,entry=door('cn-'+id+'-front',name+'正门','x',z1,entryX-entryWidth/2,entryX+entryWidth/2,id==='archive'?3.33:s.ceremony?4.53:3.5,[id,'court']);
  const back=['bedroom','bath','guest'].includes(id)?null:door('cn-'+id+'-rear',name+'后门','x',z0,s.ceremony?x+4.5:id==='bedroom'?x-4.6:id==='kitchen'?x-.3:x-1.6,s.ceremony?x+7.5:id==='bedroom'?x-1.4:id==='kitchen'?x+2.9:x+1.6,id==='archive'?3.33:s.ceremony?4.2:3.5,[id,'rear-court']);
  const frontWindows=s.ceremony?[[-8.3,3.1],[-4.7,2],[4.7,2],[8.3,3.1]]:[[-3.35,2.1],[3.35,2.1]];for(let i=frontWindows.length-1;i>=0;i--){const[dx,ww]=frontWindows[i];if(x+dx+ww/2>entry.from&&x+dx-ww/2<entry.to)frontWindows.splice(i,1);}
  const wins=frontWindows.map(([dx,ww])=>({from:x+dx-ww/2,to:x+dx+ww/2,bottom:1.45,top:id==='archive'?2.85:3.795}));
  palaceWall(g,colliders,cameraColliders,{at:z1,from:x0,to:x1,bottom:.2,top:h,depth:.32,color:C.cream,openings:[entry,...wins]});for(const[dx,ww]of frontWindows)window(g,x+dx,z1,ww,'x',id==='archive'?1.4:2.35,id==='archive'?2.15:2.62);
  palaceWall(g,colliders,cameraColliders,{at:z0,from:x0,to:x1,bottom:.2,top:h,depth:.32,color:C.cream,openings:back?[back]:[]});
  for(const side of [-1,1]){const at=x+side*w/2,entryZ=id==='hall'&&side<0?z-4.5:id==='kitchen'?z+2.5:id==='bath'&&side<0?z+2.7:z,sideEntry=door('cn-'+id+(side<0?'-west':'-east'),name+(side<0?'西门':'东门'),'z',at,entryZ-1.6,entryZ+1.6,id==='archive'?3.33:s.ceremony?4.2:3.5,[id,'side-court']);const offsets=(d>12?[-4.7,4.7]:[-3.5,3.5]).filter(zz=>Math.abs(z+zz-entryZ)>2.7),windows=offsets.map(zz=>({from:z+zz-1,to:z+zz+1,bottom:1.45,top:id==='archive'?2.85:3.795}));palaceWall(g,colliders,cameraColliders,{axis:'z',at,from:z0,to:z1,bottom:.2,top:h,depth:.32,color:C.cream,openings:[sideEntry,...windows]});for(const zz of offsets)window(g,at,z+zz,2,'z',id==='archive'?1.4:2.35,id==='archive'?2.15:2.62);}
  for(const xx of [x0,x0+w*.25,x0+w*.75,x1])for(const zz of [z0,z1])if(!((back&&zz===z0&&xx>back.from-.3&&xx<back.to+.3)||(zz===z1&&xx>entry.from-.3&&xx<entry.to+.3)))column(g,xx,zz,h,.19);for(const side of [-1,1])for(const zz of [z-3,z+3])if(!doorways.some(d=>d.axis==='z'&&d.at===x+side*w/2&&zz>d.from-.3&&zz<d.to+.3))column(g,x+side*w/2,zz,h,.17);
  // Paint and bracket clusters frame actual openings instead of hanging
  // through their clear height. Low rooms keep a shallower header over doors.
  for(const zz of [z0,z1]){
   const opening=zz===z1?entry:back,bandLow=h-.71,bandHigh=h-.19,clear=opening?opening.top+.03:bandLow;
   const crosses=(xx,half)=>opening&&xx+half>opening.from-.04&&xx-half<opening.to+.04;
   if(opening&&bandLow<clear){
    for(const[a,b]of [[x0,opening.from-.04],[opening.to+.04,x1]])if(b>a)G.box(g,(a+b)/2,h-.45,zz,b-a,.52,.36,C.jade);
    if(bandHigh>clear)G.box(g,(opening.from+opening.to)/2,(clear+bandHigh)/2,zz,opening.to-opening.from+.08,bandHigh-clear,.36,C.jade);
   }else G.box(g,x,h-.45,zz,w,.52,.36,C.jade);
   for(let xx=x0+.6;xx<x1;xx+=1.15){
    if(!crosses(xx,.24)||h-.535>=clear)G.box(g,xx,h-.45,zz+(zz===z1?.21:-.21),.48,.17,.055,C.gold);
    for(const yy of [h-.85,h-.66])if(!crosses(xx,.32)||yy-.065>=clear)G.box(g,xx,yy,zz,.64,.13,.54,C.red);
   }
  }

  for(const [side,at,opening,face]of[['front',z1,entry,1],['rear',z0,back,-1]]){
   // Leave a real exposed jamb return for hinge straps; projecting wainscot
   // and its moulding must not occupy the hardware sweep outside the wall.
   for(const[a,b]of opening?[[x0,opening.from-.24],[opening.to+.24,x1]]:[[x0,x1]])dado(g,id+'-'+side+'-'+a,'x',at,a,b,face);
   if(opening&&h-.45-.2215<opening.top+.03){
    for(const [part,a,b]of [['left',x0,opening.from-.04],['right',opening.to+.04,x1]])if(b-a>.28)paintedBand(g,id+'-'+side+'-beam-'+part,(a+b)/2,h-.45,at+face*.227,b-a,face>0?0:Math.PI);
   }else paintedBand(g,id+'-'+side+'-beam',x,h-.45,at+face*.227,w,face>0?0:Math.PI);
  }
  // Paired facade lanterns hang in the window bays, away from every door swing.
  for(const side of [-1,1]){const nominal=x+side*(s.ceremony?7.9:3.35),lampX=side<0?Math.min(nominal,entry.from-.60):Math.max(nominal,entry.to+.60);silkLantern(g,id+'-entry-lantern-'+side,lampX,h-.70,z1+.32,s.ceremony?.42:.27);}
  if(id!=='archive'&&id!=='hall'){palaceCeiling(r,colliders,cameraColliders,x,z,w,d,h,!!s.ceremony);palaceRoof(r,x,h+.25,z,w+2,d+2,s.ceremony?2.45:1.55,C.roof);}
  if(s.ceremony){for(const xx of [-4,0,4])fixture(g,xx,4.5,z+1,'ceremonial-pendant',.40);}
  else if(id==='archive')fixture(g,x,2.92,z,'lower-library-lantern',.30,true);else fixture(g,x,h-.82,id==='kitchen'?z+3.1:z,'chamber-lantern',.30); // The split kitchen's dining lamp hangs over its table, not the partition doorway.
  const room={id,name,minX:x0,maxX:x1,minZ:z0,maxZ:z1,ceiling:h};interiorRooms.push(room);buildings.push({id,name,groupName:g.name,roofGroupName:r.name,bounds:{minX:x0,maxX:x1,minZ:z0,maxZ:z1},roomIds:[id]});
  return g;
 }
 for(const s of structures)hall(s);
 // Ceremonial hall: a deep freestanding throne composition with generous lanes
 // to both sides, not an aisle sharing floor space with a bed and stove.
 {const g=rooms.hall.g;floor(g,0,-7.25,8,4.6,.36,0xc8b688);
  // Keep the raised brocade outside the entire ceremonial door sweep. The
  // original front edge z=3.3 caught the leaf at 35.3% opening; z=1.4 leaves
  // a real stone entrance bay without lifting the door off its floor.
  G.rug(g,0,-1.75,5.4,6.3,0xa44936,0xd5b66f);
  box(g,0,.9,-8,3.3,.85,1.7,0x8c482d,true);G.box(g,0,1.39,-8,3.1,.2,1.55,0xc99a51);for(const x of [-1.43,1.43]){G.box(g,x,1.8,-8,.2,1,1.6,C.gold);G.sphere(g,x,2.37,-7.38,.19,0xe0bb66);}
  box(g,0,2.18,-8.78,3.3,2.1,.22,0x9e4d32,true);G.box(g,0,2.22,-8.62,2.98,1.83,.065,0xcfa55b);G.torus(g,0,2.32,-8.54,.63,.085,0x835034,0);for(let i=0;i<9;i++)G.sphere(g,Math.sin(i*2.2)*.45,2.32+Math.cos(i*2.2)*.45,-8.48,.13,0xe0bd77,1.3,.7,.3);
  box(g,0,2.95,-10.4,7.7,4.7,.25,0x763a2c,true);for(const x of [-3.55,-2.4,-1.2,0,1.2,2.4,3.55])G.box(g,x,2.97,-10.22,.08,4.42,.11,C.gold);for(const x of [-2.5,2.5])scroll(g,x,3.13,-10.2,.68,2.7,true);
  for(const x of [-6.7,6.7]){table(g,x,-7,2.6,1.15,1.08);G.vessel(g,x,1.19,-7,0xabbfaf,.95);G.vessel(g,x+.75,1.19,-7,0xc6aa65,.66);}
  for(const x of [-5.8,8.6])for(const z of [-3,1]){G.chair(g,x,z,C.wood,x<0?Math.PI/2:-Math.PI/2).position.y=.2;G.collider(colliders,x,z,.9,.9);additionalFurnitureSeats.push({name:'正殿木扶椅',x,y:1.4,z,yaw:x<0?Math.PI/2:-Math.PI/2,width:.9,depth:.9,seatY:2.075});}
  target('cn-hall-front','正殿中央前厅',0,3,'hall');target('cn-hall-throne','仪座前礼仪空间',0,-4.25,'hall');target('cn-hall-west','正殿西宽廊',-4.6,-3,'hall');target('cn-hall-east','正殿东宽廊',5,-3,'hall');target('cn-hall-rear','正殿后门',6,-9.6,'hall');}
 // Tea reception occupies a separate south-west pavilion, with a real room
 // around its social setting and a wide central cross-passage through the doors.
 {const g=rooms.tea.g;G.rug(g,-21,12,7.8,5.8,0xb78c59,0x5c7a70);table(g,-21,11.8,4.2,1.8,1.02);teaSet(g,-21,1.10,11.8,0xaac5c6);for(const x of [-22.3,-19.7])stool(g,x,10.05);stool(g,-23.85,11.8);shelf(g,-24.8,18.6,2.7,2.65,.7,Math.PI/2);table(g,-17.25,18.6,.7,3.5,1.1);flowerBranches(g,-17.25,1.18,18.0);G.vessel(g,-17.25,1.18,19.3,0xa4bcb2,.8);scroll(g,-21,2.9,8.19,1.1,2,true);target('cn-tea-front','茶厅门内',-21,19.4,'tea');target('cn-tea-work','茶案南侧',-20,13.3,'tea');target('cn-tea-west','茶厅西侧',-24.5,15.8,'tea');target('cn-tea-east','茶厅东侧',-17.5,11.8,'tea');}
 // East calligraphy pavilion: two supported working sheets at the near edge,
 // with R9 actor-to-target reach preserved at .75 m in world coordinates.
 {const g=rooms.study.g;table(g,21,11.8,6.2,2.16,.97);for(const x of [19.55,22.15]){G.box(g,x,1.054,12.79,.62,.018,.18,0xefe1bf);for(let i=0;i<3;i++)G.box(g,x-.16+i*.16,1.067,12.79,.036,.005,.12,0x37463b);G.box(g,x+.5,1.086,12.42,.34,.06,.28,0x424f45);beam(g,[x-.5,1.075,12.2],[x-.19,1.075,12.5],.021,C.wood);}for(const x of [18,24])shelf(g,x,8.65,2.4,2.9,.7);G.vessel(g,24,1.06,11.7,0x799b8b,.53);for(let i=0;i<5;i++)beam(g,[23.95+i*.025,1.3,11.7],[23.82+i*.085,1.95+(i%2)*.1,11.7],.014,C.wood);for(const x of [18.2,23.8])scroll(g,x,2.9,20.81,1.3,2,true);table(g,24.85,18,.7,3.7,1.1);boundBook(g,24.85,1.21,17.2,.5,1,0x6f8c76);flowerBranches(g,24.85,1.19,18.9);target('cn-study-front','书斋门内',21,18.4,'study');target('cn-study-work','书案书写侧',21,13.32,'study');target('cn-study-west','书斋西侧',17.7,16,'study');target('cn-study-east','书斋东侧',24,15.3,'study');}
 // Separate private sleeping hall: canopy bed, dressing furniture and reading
 // chair. All bedpost textiles remain attached to their support, not floating.
 {const g=rooms.bedroom.g;buildChinaDragonBed(g);G.collider(colliders,-21,-9,4,4.2);cameraColliders.push({minX:-23,maxX:-19,minZ:-11.1,maxZ:-6.9,minY:.2,maxY:3.3});G.rug(g,-21,-3,6.4,4.5,0x71887e,0xc2ae7d);table(g,-24.8,-1.4,.75,3.1,.98);G.vessel(g,-24.8,1.08,-1.8,0x91acaa,.65);shelf(g,-17.05,-8.6,3.3,2.75,.65,-Math.PI/2);G.chair(g,-18.1,-2.1,C.wood,Math.PI*.75).position.y=.2;G.collider(colliders,-18.1,-2.1,.9,.9);target('cn-bedroom-front','寝殿前厅',-21,.5,'bedroom');target('cn-bedroom-west','床西通道',-24.2,-8.8,'bedroom');target('cn-bedroom-east','床东通道',-18.2,-8.8,'bedroom');target('cn-bedroom-reading','寝殿书榻前',-19,-3.6,'bedroom');}
 // Dining and food preparation are separate rooms within a detached service
 // hall, with a three-metre internal doorway and their own exterior entrances.
 {const g=rooms.kitchen.g;interiorRooms.splice(interiorRooms.findIndex(r=>r.id==='kitchen'),1);interiorRooms.push({id:'kitchen',name:'御膳备餐间',minX:16,maxX:26,minZ:-12,maxZ:-5,ceiling:4.35},{id:'dining',name:'御膳餐厅',minX:16,maxX:26,minZ:-5,maxZ:2,ceiling:4.35});buildings.find(b=>b.id==='kitchen').roomIds=['kitchen','dining'];palaceWall(g,colliders,cameraColliders,{at:-5,from:16,to:26,bottom:.2,top:4.35,color:C.cream,openings:[door('cn-kitchen-dining','备膳餐厅门','x',-5,19.4,22.6,3.5,['kitchen','dining'])]});
  box(g,18.1,.79,-10.8,3.8,1.18,1.35,0xa29372,true);G.box(g,18.1,1.43,-10.8,3.94,.13,1.49,0xc9c0a1);G.cyl(g,17.2,1.54,-10.8,.48,.48,.08,0x343e37);G.sphere(g,17.2,1.64,-10.8,.42,0x46534b,1,.4,1);for(let j=0;j<3;j++)G.cyl(g,19.1,1.57+j*.18,-10.8,.3,.31,.16,0xbba26e,12);G.cone(g,19.1,2.13,-10.8,.34,.15,0xd2b780,12);
  // A 12.5 cm tabletop overhang lets hands reach the supported dough while
  // the actual leg footprint keeps the .39 navigation cylinder clear.
  G.table(g,22.7,-8.65,4.7,1.8,C.wood,1);G.collider(colliders,22.7,-8.65,4.7,1.55);cameraColliders.push({minX:20.35,maxX:25.05,minY:.2,maxY:1.08,minZ:-9.55,maxZ:-7.75});for(const x of [21.3,23.6]){G.box(g,x,1.099,-8.05,.85,.04,.60,0xd5b680);for(let i=0;i<3;i++)G.sphere(g,x-.2+i*.2,1.19,-7.84,.1,0xeee0bc,1,.6,.72);}bowl(g,24.3,1.12,-8.8,0x99b7a8,.3,0x76905a);
  table(g,21,-1.7,3.8,2.1,1);for(const x of [19.9,21,22.1]){bowl(g,x,1.09,-1.15,0xc3d1bd,.2);bowl(g,x,1.09,-2.25,0xc3d1bd,.2);}for(const x of [19.8,22.2])for(const z of [-3.2,.3])stool(g,x,z);shelf(g,25.1,-10.6,2,2.6,.7,-Math.PI/2);target('cn-kitchen-prep','御膳备餐案前',22.7,-7.45,'kitchen');target('cn-kitchen-stove','灶前',17.8,-9.35,'kitchen');target('cn-kitchen-rear','御膳后门内',21,-11.05,'kitchen');target('cn-dining-west','餐厅西侧',17.8,-1.2,'dining');target('cn-dining-east','餐厅东侧',23.9,-1.2,'dining');target('cn-dining-door','餐厅门内',21,.6,'dining');}
 // Bath hall has a distinct screened washroom with its own real threshold.
 {const g=rooms.bath.g;interiorRooms.splice(interiorRooms.findIndex(r=>r.id==='bath'),1);interiorRooms.push({id:'bath',name:'竹苑浴间',minX:-26,maxX:-20,minZ:-33,maxZ:-23,ceiling:4},{id:'washroom',name:'竹苑净室',minX:-20,maxX:-16,minZ:-33,maxZ:-23,ceiling:4});buildings.find(b=>b.id==='bath').roomIds=['bath','washroom'];palaceWall(g,colliders,cameraColliders,{axis:'z',at:-20,from:-33,to:-23,bottom:.2,top:4,color:C.cream,openings:[door('cn-bath-washroom','浴间净室门','z',-20,-27,-24,3.3,['bath','washroom'])]});
  // R12: genuine hollow stone basin inside its preserved movement/camera envelope.
  G.collider(colliders,-23.6,-30,3.2,4.15);cameraColliders.push({minX:-23.6-3.2/2,maxX:-23.6+3.2/2,minY:.65-.85/2,maxY:.65+.85/2,minZ:-30-4.15/2,maxZ:-30+4.15/2});
  G.box(g,-23.6,.255,-30,3.2,.1,4.15,0x8f9d92);for(const x of[-25.09,-22.11])G.box(g,x,.75,-30,.22,1.0,4.15,0x8f9d92);for(const z of[-31.965,-28.035])G.box(g,-23.6,.75,z,3.2,1.0,.22,0x8f9d92);
  G.box(g,-23.6,1.15,-30,2.5,.025,3.44,0x72a79e);for(const x of [-25.12,-22.08])G.box(g,x,1.2,-30,.18,.23,4.22,0xd7d4bb);for(const z of [-32,-28])G.box(g,-23.6,1.2,z,3.25,.23,.18,0xd7d4bb);foldedCloth(g,-24.1,1.32,-32,1.0,.34,0xe0d7bb);shelf(g,-24.88,-23.6,1.8,2.1,.65); //27mm west-leaf clearance; front left-edge .39m body probe remains clear.
  box(g,-17.25,.78,-30.9,1.7,1.12,1.15,C.wood,true);G.box(g,-17.25,1.39,-30.9,1.82,.1,1.24,0xb8c3b5);G.sphere(g,-17.25,1.48,-30.9,.36,0xd7d8c2,1.3,.35,1);G.box(g,-17.25,2.52,-32.8,1.45,1.4,.09,C.wood);G.box(g,-17.25,2.52,-32.73,1.25,1.2,.045,0xa8bdb1);G.cyl(g,-17.4,.61,-24.8,.36,.31,.72,0xc6c9b7,12);G.torus(g,-17.4,.99,-24.8,.31,.08,0xe5dec5);G.box(g,-17.4,1.13,-25.3,.72,.7,.26,0xc6c9b7);G.collider(colliders,-17.4,-24.9,.9,1.2);target('cn-bath-tub','浴池步道',-21,-30,'bath');target('cn-bath-linens','更衣布草区',-22.8,-25,'bath');target('cn-bath-basin','净室洗手盆前',-17.3,-29,'washroom');target('cn-bath-toilet','净室屏后',-18.4,-24.8,'washroom');}
 // Rear library and quiet guest residence are independent buildings. Rear
 // passage and garden lanes give every facade room to breathe.
 {const g=rooms.archive.g;for(const x of [-8,-4,4,8])shelf(g,x,-32.8,3,3.2,.72);for(const [x,zz] of [[-1.6,-30.2],[7,-28]]){table(g,x,zz,4.2,1.7,1);for(const dx of [-1.1,0,1.1])boundBook(g,x+dx,1.13,zz,.8,.6,0x7d9583);}G.rug(g,0,-27.5,4.5,5,0xa28f69,0xd2bf90);target('cn-archive-center','藏书殿中央',0,-28,'archive');target('cn-archive-west','西书案前',-1.6,-28.5,'archive');target('cn-archive-east','东书案前',7,-26.3,'archive');target('cn-archive-rear','北门书廊',0,-32,'archive');}
 {const g=rooms.guest.g;const b=new THREE.Group();b.position.y=.2;g.add(b);G.bed(b,23,-30.5,0x728f89,2.8,3.3);G.collider(colliders,23,-30.5,2.9,3.4);table(g,18.3,-25.8,2.7,1.4,.95);teaSet(g,18.3,1.04,-25.8,0x9cbfb5);shelf(g,17,-31.4,2.1,2.5,.7,Math.PI/2);target('cn-guest-front','客居门内',21,-24.3,'guest');target('cn-guest-bed','客榻侧',20.7,-30.5,'guest');target('cn-guest-tea','客居茶席',18.2,-24.3,'guest');}
 // Rear lotus court. Broad cross lanes continue to both side gates, and a
 // four-metre level bridge crosses the water without hidden sine-wave footing.
 floor(exterior,0,-18,30,7.5,.13,0xc9c3ad);for(const side of [-1,1]){box(exterior,side*5.1,.18,-18,6.1,.16,4.5,0x7d9685,true);G.box(exterior,side*5.1,.273,-18,5.8,.025,4.2,0x75a69d);for(const z of [-19.2,-16.9])for(const x of [side*3.6,side*6.5]){G.cyl(exterior,x,.3,z,.37,.37,.025,0x78916b,12);G.sphere(exterior,x,.39,z,.19,0xdea6a4,1,.5,1);}}
 floor(exterior,0,-18,4.2,8,.28,0xad8a5c);for(let z=-21.5;z<-14.3;z+=.65)G.box(exterior,0,.294,z,4.12,.022,.035,0xd3b276);for(const x of [-2.05,2.05]){G.box(exterior,x,1,-18,.08,.12,4.5,C.red);for(const z of [-20.2,-18,-15.8])column(exterior,x,z,1.2,.065);G.collider(colliders,x,-18,.13,4.5);cameraColliders.push({minX:x-.065,maxX:x+.065,minY:.28,maxY:1.3,minZ:-20.25,maxZ:-15.75});}
 door('cn-lotus-bridge-south','荷桥南口','x',-14.3,-1.8,1.8,5,['rear-court','bridge']);door('cn-lotus-bridge-north','荷桥北口','x',-21.7,-1.8,1.8,5,['bridge','archive-court']);
 for(const[x,z]of [[-10,-18],[10,-18],[-22,27],[22,27],[-11,27],[11,27]]){cherry(exterior,colliders,x,z,.95);G.cyl(exterior,x,.16,z,1.8,1.8,.16,0x929f80,12);}
 for(const[x,z]of [[-27.3,-35],[27.3,-35],[-27.3,-14],[27.3,-14],[-27.3,5],[27.3,5],[-27.3,24],[27.3,24]])bamboo(exterior,colliders,x,z,1.2);
 for(const x of [-8,8])for(const z of [29,22,10])standingLamp(x,z);for(const x of [-12,12])for(const z of [-35,-18,-5])standingLamp(z===-5?Math.sign(x)*14:x,z===-5?-13.5:z);
 for(const x of [-19,19]){table(exterior,x,30,5,.72,.63);for(const a of [-1.4,1.4])G.box(exterior,x+a,1.05,30.25,.1,.7,.11,C.wood);G.box(exterior,x,1.37,30.25,4.7,.13,.11,C.wood);}
 for(const [id,name,x,z]of [['cn-south-gate','承礼门外',0,39],['cn-gatehouse','承礼门廊',0,35],['cn-processional-court','开阔仪庭',0,23],['cn-court-west','广庭西侧',-12,16],['cn-court-east','广庭东侧',12,16],['cn-hall-approach','正殿前露台',0,7],['cn-west-lane','西内庭宽巷',-13.5,-5],['cn-east-lane','东内庭宽巷',13.5,-5],['cn-west-crosscourt','西苑横庭',-21,5],['cn-east-crosscourt','东苑横庭',21,5],['cn-garden','后苑荷桥',0,-18],['cn-garden-west','荷庭西岸',-10,-14],['cn-garden-east','荷庭东岸',10,-14],['cn-north-court','藏书殿后庭',0,-36],['cn-west-gate','西苑侧门',-28,-18],['cn-east-gate','东苑侧门',28,-18]])target(id,name,x,z,'outdoors');
 for(const d of doorways){if(['cn-kitchen-front','cn-kitchen-west','cn-kitchen-east'].includes(d.id))d.rooms[0]='dining';if(d.id==='cn-bath-east')d.rooms[0]='washroom';}
 const facilities=[{id:'entrance',name:'迎宾与入口',targets:['cn-south-gate','cn-gatehouse','cn-processional-court'],furnishings:['承礼门','开阔仪庭','迎宾长椅']},{id:'reception',name:'会客与礼仪',targets:['cn-hall-front','cn-hall-throne','cn-tea-work'],furnishings:['独立正殿','云纹仪座','宫苑茶厅']},{id:'dining-kitchen',name:'用餐与备膳',targets:['cn-dining-west','cn-kitchen-prep','cn-kitchen-stove'],furnishings:['独立餐厅','蒸笼灶台','双人备餐案']},{id:'sleeping',name:'寝居',targets:['cn-bedroom-east','cn-guest-bed'],furnishings:['雕龙龙榻','客居卧榻','阅读椅']},{id:'bathing',name:'沐浴与更衣',targets:['cn-bath-tub','cn-bath-linens'],furnishings:['石浴池','布草柜']},{id:'washroom',name:'盥洗与净室',targets:['cn-bath-basin','cn-bath-toilet'],furnishings:['水盆','壁镜','屏后坐便']},{id:'storage-service',name:'储藏与勤务',targets:['cn-archive-center','cn-study-work','cn-kitchen-rear'],furnishings:['藏书殿','书法案','御膳后门']}];

 // Throne backdrop is one cohesive, shallow lacquer-and-gilt relief composition,
 // fitted to the existing seven-metre screen instead of filling the central aisle.
 ornament(rooms.hall.g,'throne-dragon-screen','dragon-cloud-screen','existing solid throne backdrop',q=>{
  G.box(q,0,3.06,-10.225,6.9,3.85,.035,ink);frame(q,0,3.06,-10.190,7.1,4.02);frame(q,0,3.06,-10.162,6.75,3.64);
  for(const side of [-1,1]){dragon(q,side*1.48,3.10,-10.110,1.06,side);for(const yy of [1.62,4.50])cloud(q,side*1.50,yy,-10.10,.94);}
  G.torus(q,0,3.53,-10.10,.36,.050,C.gold,0);lotus(q,0,1.65,-10.10,.90);
  // Folded side hangings use tapered extruded profiles; hems remain attached.
  for(const side of [-1,1]){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(side*.31,0);sh.quadraticCurveTo(side*.40,-1.2,side*.20,-2.2);sh.lineTo(side*.01,-2.11);sh.closePath();G.mesh(q,new THREE.ExtrudeGeometry(sh,{depth:.032,bevelEnabled:false,curveSegments:6}),C.red,side*3.21,4.86,-10.11);stroke(q,[[side*3.22,4.80,-10.06],[side*3.29,3.72,-10.06],[side*3.25,2.68,-10.06]],.025,C.gold);}
 });
 ornament(rooms.hall.g,'throne-carved-apron','gilded-throne','existing throne seat and back',q=>{frame(q,0,.93,-7.125,2.93,.57);for(const x of [-1.03,0,1.03])cloud(q,x,.86,-7.09,.53);for(const side of [-1,1])dragon(q,side*.70,2.25,-8.50,.48,side);});
 for(const x of [-6.7,6.7])incense(rooms.hall.g,'hall-incense-'+x,x-.63,1.17,-7,.82);
 // Symmetric court-side display consoles use the two existing bench footprints.
 // Their depth never exceeds the original .72 m support; the 12 m axis is clear.
 for(const x of [-19,19]){
  ornament(exterior,'court-console-'+x,'paired-court-console','existing courtyard bench',q=>{G.box(q,x,.59,30,4.8,.14,.69,C.red);for(const yy of [.45,.65])G.box(q,x,yy,30.372,4.7,.042,.025,C.gold);for(const dx of [-1.7,0,1.7])cloud(q,x+dx,.51,30.392,.60);});
  for(const dx of [-1.85,1.85])incense(exterior,'court-incense-'+x+'-'+dx,x+dx,.725,30,.60);
 }
 // Room-scaled surface compositions: hanging paintings, framed silk panels,
 // brocade runners, tea trays, bound folios, and supported fine porcelain.
 const hanging=(g,id,x,y,z,w,h,motif='lotus')=>ornament(g,id,'framed-silk-panel','existing solid wall',q=>{G.box(q,x,y,z,w,h,.045,ink);frame(q,x,y,z+.039,w+.07,h+.08);G.box(q,x,y,z+.05,w-.13,h-.13,.018,C.jade);if(motif==='lotus'){lotus(q,x,y-h*.25,z+.083,Math.min(w*.75,h*.70));for(const dx of [-w*.28,w*.28])cloud(q,x+dx,y+h*.30,z+.091,w*.27);}else{for(const k of [-1,0,1]){stroke(q,[[x+k*w*.2,y-h*.35,z+.086],[x+k*w*.12,y+h*.34,z+.086]],.015,C.gold);for(const j of [-1,0,1])petal(q,x+k*w*.14,y+j*h*.19,z+.09,w*.13,h*.20,ivory,(k+j)%2*.9);}}});
 hanging(rooms.tea.g,'tea-floral-panel',-23.7,2.65,8.19,1.2,1.75);hanging(rooms.tea.g,'tea-floral-panel-pair',-18.3,2.65,8.19,1.2,1.75);
 const studyPanel=hanging(rooms.study.g,'study-bamboo-panel',0,2.77,0,1.7,1.62,'bamboo');studyPanel.position.set(25.81,0,11.85);studyPanel.rotation.y=-Math.PI/2; // Solid east-wall bay, clear of front/side doors and both windows.
 hanging(rooms.bedroom.g,'bedroom-silk-panel',-24.05,2.50,-11.81,1.3,1.9);hanging(rooms.guest.g,'guest-silk-panel',19,2.45,-32.81,1.9,1.8);
 for(const x of [-8,-4,4,8])hanging(rooms.archive.g,'archive-painted-panel-'+x,x,3.22,-33.81,2.6,.46,'bamboo');
 ornament(rooms.tea.g,'tea-brocade-tray','tabletop-vignette','existing tea table outside work approach',q=>{G.box(q,-21,1.11,11.05,3.2,.018,.32,C.red);for(const z of [10.91,11.19])G.box(q,-21,1.124,z,3.18,.015,.022,C.gold);for(const x of [-22,-21,-20]){G.cyl(q,x,1.14,11.06,.12,.12,.025,C.gold,12);}});
 ornament(rooms.study.g,'scholar-scroll-vignette','tabletop-vignette','existing study table behind supported working papers',q=>{for(const x of [20.2,21.1]){const m=G.cyl(q,x,1.13,11.03,.085,.085,.70,0xe8d5a7,10);m.rotation.z=Math.PI/2;for(const dx of [-.36,.36]){const cap=G.cyl(q,x+dx,1.13,11.03,.103,.103,.06,C.dark,10);cap.rotation.z=Math.PI/2;}}G.box(q,21.9,1.17,10.95,.90,.24,.50,C.red);frame(q,21.9,1.18,11.21,.77,.15);});
 // R12.1 dragon bed includes its own joined crown and headboard relief.
 ornament(rooms.kitchen.g,'dining-brocade-setting','dining-vignette','existing dining tabletop',q=>{G.box(q,21,1.084,-1.7,.70,.014,2.01,C.red);for(const x of [20.68,21.32])G.box(q,x,1.096,-1.7,.025,.014,1.95,C.gold);for(const x of [19.9,21,22.1])for(const z of [-1.15,-2.25]){G.cyl(q,x,1.085,z,.29,.29,.026,C.jade,16);for(const dx of [.34,.40])G.box(q,x+dx,1.111,z,.02,.023,.45,C.dark);}});
 ornament(rooms.bath.g,'bath-lotus-border','lotus-bath-frieze','existing tub rim',q=>{for(const x of [-24.5,-23.6,-22.7]){lotus(q,x,.58,-27.905,.40);G.box(q,x,.98,-27.900,.7,.025,.020,C.gold);}});
 for(const [x,zz] of [[-1.6,-30.2],[7,-28]])ornament(rooms.archive.g,'library-brush-tray-'+x,'scholar-vignette','existing library table',q=>{G.box(q,x,1.10,zz+.51,2.6,.05,.35,C.red);for(const dx of [-.65,.65])G.vessel(q,x+dx,1.14,zz+.50,teal,.35);});
 // R14: independent ceremonial plinths and a real two-storey rear library.
 // Translation is per building, never global mesh scaling. Existing living
 // halls, work objects and courts retain their authored dimensions and places.
 const raised={hall:1.2,archive:.6};
 for(const [id,dy] of Object.entries(raised)){
  const room=rooms[id],b=buildings.find(b=>b.id===id).bounds;
  room.g.position.y+=dy;room.r.position.y+=dy;room.floorY=.215+dy;
  const owns=c=>c.minX>=b.minX-.51&&c.maxX<=b.maxX+.51&&c.minZ>=b.minZ-.51&&c.maxZ<=b.maxZ+1.31;
  for(const c of colliders)if(owns(c)){c.minY=(c.minY??.2)+dy;c.maxY=(c.maxY??3.5)+dy;}
  for(const c of cameraColliders)if(owns(c)){c.minY+=dy;c.maxY+=dy;}
  for(const f of walkableSurfaces)if(f.owner===room.g.name)f.y+=dy;
  for(const f of room.g.userData.rugSurfaces||[])f.y+=dy;
  for(const r of interiorRooms)if(r.id===id){r.floorY=.215+dy;r.ceiling+=dy;}
  for(const d of doorways)if(d.rooms[0]===id){d.bottom+=dy;d.top+=dy;d.a[1]+=dy;d.b[1]+=dy;}
  for(const t of explorationTargets)if(t.roomId===id)t.position[1]=.215+dy;
  room.g.traverse(o=>{if(o.userData.nightFixture)o.userData.nightFixture.floorY=.215+dy;});
 }
 const levels=[{id:'court',name:'宫苑庭院',y:.115},{id:'rear-hall',name:'藏书殿台基',y:.815},{id:'main-hall',name:'正殿台基',y:1.415},{id:'viewing-loft',name:'北苑观景阁',y:4.215}];
 const lightingZones=[
  {id:'main-hall',minX:-11.4,maxX:11.4,minZ:-11.4,maxZ:5.4,minY:.9,maxY:8.8,floorY:1.415},
  {id:'archive-lower',minX:-11.4,maxX:11.4,minZ:-34.4,maxZ:-22.6,minY:.5,maxY:4.19,floorY:.815},
  {id:'archive-loft',minX:-11.4,maxX:11.4,minZ:-34.4,maxZ:-22.6,minY:4.19,maxY:9.5,floorY:4.215}
 ];
 // The outer paths are real terrain too: strict surface navigation has no
 // implicit floor that could hide a hole or teleport an actor between levels.
 walkableSurfaces.unshift({...bounds,y:.015,owner:'estate terrain'});
 const r14=new THREE.Group();r14.name='China raised platforms and continuous stairs';group.add(r14);
 const upperFixture=(g,id,x,y,z,floorY)=>{const lamp=silkLantern(g,id,x,y,z,.26);lamp.scale.y=.38;registerNightFixture(g,x,y-.07,z,{kind:'upper-gallery-lantern',intensity:22,distance:12,floorY});};
 const solid3=(g,x,y,z,w,h,d,color)=>{box(g,x,y,z,w,h,d,color);colliders.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});};
 const slab=(g,id,minX,maxX,minZ,maxZ,y,thickness=.20,color=C.stone)=>{
  box(g,(minX+maxX)/2,y-thickness/2-.015,(minZ+maxZ)/2,maxX-minX,thickness,maxZ-minZ,color);
  walkableSurfaces.push({id,minX,maxX,minZ,maxZ,y});
 };
 const rail=(g,id,a,b,y0,y1=y0,stone=false)=>{
  const color=stone?0xc8c3af:C.red,trim=stone?0xe0d8be:C.gold;
  beam(g,[a[0],y0+.98,a[1]],[b[0],y1+.98,b[1]],.067,trim);
  beam(g,[a[0],y0+.28,a[1]],[b[0],y1+.28,b[1]],.045,color);
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(len/.68));
  for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=y0+(y1-y0)*t;G.box(g,x,y+.51,z,.095,1.02,.095,color);G.mesh(g,new THREE.OctahedronGeometry(.10,0),trim,x,y+1.055,z);}
  for(let i=0;i<n;i++){const t=(i+.5)/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=y0+(y1-y0)*t;const c={minX:x-(Math.abs(b[0]-a[0])/n+.14)/2,maxX:x+(Math.abs(b[0]-a[0])/n+.14)/2,minZ:z-(Math.abs(b[1]-a[1])/n+.14)/2,maxZ:z+(Math.abs(b[1]-a[1])/n+.14)/2,minY:y-.03,maxY:y+1.13,owner:id};colliders.push(c);cameraColliders.push({...c});}
 };
 // Level landing returns join existing end posts. Keep an avatar guard along
 // the edge, but give the camera only the visible bars, balusters and finials.
 const landingRail=(g,id,a,b,y,stone=false)=>{
  const color=stone?0xc8c3af:C.red,trim=stone?0xe0d8be:C.gold;
  const cameraSolid=m=>{m.updateWorldMatrix(true,false);const q=new THREE.Box3().setFromObject(m);cameraColliders.push({minX:q.min.x,maxX:q.max.x,minY:q.min.y,maxY:q.max.y,minZ:q.min.z,maxZ:q.max.z,owner:id});};
  cameraSolid(beam(g,[a[0],y+.98,a[1]],[b[0],y+.98,b[1]],.067,trim));
  cameraSolid(beam(g,[a[0],y+.28,a[1]],[b[0],y+.28,b[1]],.045,color));
  const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.68));
  for(let i=1;i<n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;cameraSolid(G.box(g,x,y+.51,z,.095,1.02,.095,color));cameraSolid(G.mesh(g,new THREE.OctahedronGeometry(.10,0),trim,x,y+1.055,z));}
  colliders.push({minX:Math.min(a[0],b[0])-.07,maxX:Math.max(a[0],b[0])+.07,minY:y-.03,maxY:y+1.13,minZ:Math.min(a[1],b[1])-.07,maxZ:Math.max(a[1],b[1])+.07,owner:id});
 };
 const stairs=(g,id,axis,minX,maxX,minZ,maxZ,y,endY,count,stone=false)=>{
  const s={id,axis,minX,maxX,minZ,maxZ,y,endY};walkableSurfaces.push(s);
  const low=axis==='x'?minX:minZ,high=axis==='x'?maxX:maxZ,step=(high-low)/count;
  for(let i=0;i<count;i++){
   const a=low+i*step,b=a+step,top=y+(endY-y)*(i+.5)/count;
   const footprint={minX:axis==='x'?a:minX,maxX:axis==='x'?b:maxX,minZ:axis==='z'?a:minZ,maxZ:axis==='z'?b:maxZ};
   // Closed risers and 18 cm solid treads, not floating thin decorative plates.
   const h=Math.max(.18,Math.abs(endY-y)/count+.08),x=(footprint.minX+footprint.maxX)/2,z=(footprint.minZ+footprint.maxZ)/2;
   box(g,x,top-h/2-.015,z,footprint.maxX-footprint.minX,h,footprint.maxZ-footprint.minZ,stone?C.stone:C.wood);
   characterFootSurfaces.push({...footprint,y:top-.015});
  }
  const sides=axis==='z'?[[[minX,minZ],[minX,maxZ]],[[maxX,minZ],[maxX,maxZ]]]:[[[minX,minZ],[maxX,minZ]],[[minX,maxZ],[maxX,maxZ]]];
  for(const [i,[a,b]] of sides.entries())rail(g,id+'-rail-'+i,a,b,y,endY,stone);
  stairways.push({...s,count,width:axis==='z'?maxX-minX:maxZ-minZ,rise:Math.abs(endY-y)/count,tread:step});return s;
 };
 // Main plinth: 24 m front and rear terraces, with a ten-metre axial stair.
 slab(r14,'cn-hall-platform',-12,12,-12,7,1.415,1.40);
 stairs(r14,'cn-main-front-stair','z',-5.4,5.4,7,10.2,1.415,.140,8,true);
 rail(r14,'main-front-west',[-12,7],[-5.4,7],1.415,1.415,true);rail(r14,'main-front-east',[5.4,7],[12,7],1.415,1.415,true);
 // Side access turns along each facade rather than filling the five-metre
 // court-to-wing gaps with long outward stairs; 2.2 m side lanes remain open.
 for(const side of [-1,1]){
  const lo=side<0?-13.85:11,hi=side<0?-11:13.85;
  const back=side<0?-9.2:-4.7,front=side<0?-5.8:-1.3;slab(r14,'cn-main-side-landing-'+side,lo,hi,back,front,1.415,.30);
  const sx0=side<0?-13.85:12.05,sx1=side<0?-12.05:13.85;
  stairs(r14,'cn-main-side-stair-'+side,'z',sx0,sx1,front,front+3.2,1.415,.115,8,true);
  rail(r14,'main-side-outer-'+side,[side*13.85,back],[side*13.85,front],1.415,1.415,true);
  rail(r14,'main-side-back-'+side,[side*12,back],[side*13.85,back],1.415,1.415,true);
  landingRail(r14,'main-side-plinth-'+side,[side*12,front],[side*12,front+3.2],1.415,true);
  rail(r14,'main-side-south-'+side,[side*12,front+3.2],[side*12,7],1.415,1.415,true);
  rail(r14,'main-side-north-'+side,[side*12,-12],[side*12,back],1.415,1.415,true);
 }
 stairs(r14,'cn-main-rear-stair','z',4.2,7.8,-14.8,-12,.115,1.415,7,true);
 rail(r14,'main-rear-west',[-12,-12],[4.2,-12],1.415,1.415,true);rail(r14,'main-rear-east',[7.8,-12],[12,-12],1.415,1.415,true);
 // Rear library sits on a lower stone terrace, with approaches from all four
 // existing doors and a level landward route behind the lotus bridge.
 slab(r14,'cn-archive-platform',-12,12,-35,-21.7,.815,.8);
 stairs(r14,'cn-archive-front-stair','z',-2.05,2.05,-21.7,-20.5,.815,.295,4,true);
 // The stair joins the raised 4.2 m bridge; outer wings land on stone at .145.
 // Only the middle bridge-width section continues as an elevated path.
 slab(r14,'cn-archive-bridge-landing',-2.1,2.1,-20.5,-20.25,.295,.16,0xad8a5c);
 stairs(r14,'cn-archive-rear-stair','z',-1.9,1.9,-36.6,-35,.115,.815,4,true);
 for(const side of [-1,1])stairs(r14,'cn-archive-side-stair-'+side,'x',side<0?-13.85:12,side<0?-12:13.85,-30.3,-26.7,side<0?.115:.815,side<0?.815:.115,4,true);
 for(const [id,a,b] of [
  ['archive-front-west',[-12,-21.7],[-2.05,-21.7]],['archive-front-east',[2.05,-21.7],[12,-21.7]],
  ['archive-rear-west',[-12,-35],[-1.9,-35]],['archive-rear-east',[1.9,-35],[12,-35]],
  ['archive-west-south',[-12,-26.7],[-12,-21.7]],['archive-west-north',[-12,-35],[-12,-30.3]],
  ['archive-east-south',[12,-26.7],[12,-21.7]],['archive-east-north',[12,-35],[12,-30.3]]])rail(r14,id,a,b,.815,.815,true);
 // The central hall's visible second tier is usable too. A U-shaped viewing
 // gallery surrounds the ceremonial void; its west indoor flight is a real
 // 4.6 m ascent, and the throne remains in a full-height central room.
 const gallery=new THREE.Group();gallery.name='China central hall upper viewing gallery';group.add(gallery);
 for(const [id,a]of [
  ['front',[-11,11,2,5]],['east',[7.8,11,-11,2]],
  ['west-inner',[-7.8,-6,-11,2]],['west-outer',[-11,-10.5,-11,2]],
  ['west-north',[-10.5,-7.8,-11,-8]],['west-south',[-10.5,-7.8,1.2,2]]
 ])slab(gallery,'cn-main-gallery-'+id,...a,6.015,.215,C.wood);
 stairs(gallery,'cn-main-indoor-stair','z',-10.25,-8.05,-8,1.2,6.015,1.415,26);
 for(const[id,a,b]of [
  ['main-gallery-front-void',[-6,2],[7.8,2]],['main-gallery-east-void',[7.8,-11],[7.8,2]],['main-gallery-west-void',[-6,-11],[-6,2]],
  ['main-stair-hole-east',[-7.8,-8],[-7.8,1.2]],['main-stair-hole-west',[-10.5,-8],[-10.5,1.2]],['main-stair-hole-south',[-10.5,1.2],[-7.8,1.2]]
 ])rail(gallery,id,a,b,6.015);
 // Existing lower walls reach 6.9 m and become the gallery's deep parapets;
 // the new upper bays above them are genuinely open at standing eye height.
 // Door/window headers already have camera masonry. Clip avatar-only guards
 // to those same solids at the gallery level, leaving every lower opening.
 // Reading actual header spans also keeps a relocated inset doorway aligned.
 for(const c of cameraColliders){
  const front=Math.abs(c.minZ-4.84)<.001&&Math.abs(c.maxZ-5.16)<.001;
  const side=Math.abs(Math.abs((c.minX+c.maxX)/2)-11)<.001&&[.32,.50].some(depth=>Math.abs(c.maxX-c.minX-depth)<.001)&&c.minZ>=-11&&c.maxZ<=5;
  if((front||side)&&c.minY>1.415&&c.minY<6.9&&Math.abs(c.maxY-6.9)<.001)colliders.push({...c,minY:Math.max(6.015,c.minY),owner:'main-gallery-parapet'});
 }
 for(const z of [-11,5]){
  box(gallery,0,9.0,z,22,.43,.32,C.jade);
  for(const x of[-11,-6,-2.6,2.6,7.8,11])solid3(gallery,x,7.97,z,.20,2.16,.30,C.red);
  G.box(gallery,0,6.97,z,22,.12,.34,C.gold);paintedBand(gallery,'main-gallery-frieze-'+z,0,9.0,z+(z===5?.20:-.20),22,z===5?0:Math.PI);
 }
 for(const x of[-11,11]){box(gallery,x,9.0,-3,.32,.43,16,C.jade);for(const z of[-11,-6,0,5])solid3(gallery,x,7.97,z,.30,2.16,.20,C.red);G.box(gallery,x,6.97,-3,.34,.12,16,C.gold);}
 const mainUpperRoof=rooms.hall.r,mainRoofColliderStart=cameraColliders.length;
 // One continuous double-eave envelope: lower roof is an open ring, upper
 // roof has the actual ceiling. Nothing cuts through the gallery or atrium.
 palaceCeiling(mainUpperRoof,colliders,cameraColliders,0,-3,22,16,8.015,true);
 palaceRoof(mainUpperRoof,0,8.27,-3,24,18,2.25,C.roof);for(const c of cameraColliders.slice(mainRoofColliderStart)){c.minY+=1.2;c.maxY+=1.2;}
 const ring=(a,b,c,d)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));geo.computeVertexNormals();G.mesh(mainUpperRoof,geo,C.roof,0,-1.2,0,{side:THREE.DoubleSide});};
 ring([-11.1,6.65,5.1],[11.1,6.65,5.1],[12.2,6.43,6.2],[-12.2,6.43,6.2]);ring([11.1,6.65,-11.1],[-11.1,6.65,-11.1],[-12.2,6.43,-12.2],[12.2,6.43,-12.2]);ring([-11.1,6.65,-11.1],[-11.1,6.65,5.1],[-12.2,6.43,6.2],[-12.2,6.43,-12.2]);ring([11.1,6.65,5.1],[11.1,6.65,-11.1],[12.2,6.43,-12.2],[12.2,6.43,6.2]);
 for(const [x,z]of[[-6.85,-6],[9.2,-6],[0,3.5]])upperFixture(gallery,'main-gallery-lantern-'+x+'-'+z,x,8.615,z,6.015);
 gallery.traverse(o=>{if(o.userData.nightFixture)o.userData.nightFixture.floorY=6.015;});
 interiorRooms.find(r=>r.id==='hall').ceiling=9.215;
 interiorRooms.push({id:'hall-gallery',name:'正殿二层观景回廊',minX:-11,maxX:11,minZ:-11,maxZ:5,floorY:6.015,ceiling:9.215});
 buildings.find(b=>b.id==='hall').roomIds.push('hall-gallery');
 for(const[id,name,p]of[
  ['cn-main-stair-base','正殿室内楼梯口',[-9.15,1.415,2.0]],['cn-main-stair-top','正殿二层梯口',[-9.15,6.015,-9.0]],
  ['cn-main-gallery-west','正殿西侧二层回廊',[-6.85,6.015,-5]],['cn-main-gallery-front','正殿二层庭院视野',[0,6.015,4.35]],['cn-main-gallery-east','正殿东侧二层回廊',[9.2,6.015,-5]]
 ])explorationTargets.push({id,name,roomId:id==='cn-main-stair-base'?'hall':'hall-gallery',position:p});
 levels.push({id:'main-gallery',name:'正殿二层回廊',y:6.015});
 lightingZones.unshift(...[[-11.4,-6,-11.4,5.4],[7.8,11.4,-11.4,5.4],[-6,7.8,2,5.4]].map(([minX,maxX,minZ,maxZ],i)=>({id:'main-gallery-'+i,minX,maxX,minZ,maxZ,minY:5.9,maxY:10.0,floorY:6.015})));
 lightingZones.find(z=>z.id==='main-hall').maxY=10;
 rooms.hall.g.attach(gallery);

 // Actual archive upper storey, at world coordinates. The split floor leaves
 // the whole switchback void open, including every turning landing.
 const loft=new THREE.Group();loft.name='China rear viewing loft and indoor stair';group.add(loft);
 for(const [id,a]of [['east',[-4.05,11,-34,-23]],['west',[-11,-9.2,-34,-23]],['north',[-9.2,-4.05,-34,-32]],['south',[-9.2,-4.05,-25.4,-23]]])slab(loft,'cn-loft-floor-'+id,...a,4.215,.215,C.wood);
 stairs(loft,'cn-loft-west-flight','z',-8.95,-6.75,-30,-25.4,2.515,.815,10);
 slab(loft,'cn-loft-middle-landing',-9.1,-4.05,-32,-30,2.515,.23,C.wood);
 stairs(loft,'cn-loft-east-flight','z',-6.4,-4.2,-30,-25.4,2.515,4.215,10);
 rail(loft,'loft-middle-north',[-9.1,-32],[-4.05,-32],2.515);
 for(const[id,a,b]of[
  ['loft-middle-west',[-9.1,-32],[-9.1,-30]],['loft-middle-east',[-4.05,-32],[-4.05,-30]],
  ['loft-middle-south-west',[-9.1,-30],[-8.95,-30]],['loft-middle-south-center',[-6.75,-30],[-6.4,-30]],['loft-middle-south-east',[-4.2,-30],[-4.05,-30]]
 ])landingRail(loft,id,a,b,2.515);
 rail(loft,'loft-void-west',[-9.2,-32],[-9.2,-25.4],4.215);
 rail(loft,'loft-void-east',[-4.05,-32],[-4.05,-25.4],4.215);
 rail(loft,'loft-void-north',[-9.2,-32],[-4.05,-32],4.215);
 rail(loft,'loft-void-south-west',[-9.2,-25.4],[-6.55,-25.4],4.215);
 // Broad genuine openings frame the lotus court. Solid 85 cm parapets and
 // actual camera/nav rails guard them; no opaque fake window hides the view.
 for(const z of [-34,-23]){
  solid3(loft,0,4.625,z,22,.82,.24,C.red);box(loft,0,7.0,z,22,.43,.30,C.jade);
  for(const x of [-11,-6.8,-2.4,2.4,6.8,11])solid3(loft,x,5.715,z,.18,3.0,.26,C.red);
  G.box(loft,0,5.08,z,22,.10,.29,C.gold);paintedBand(loft,'loft-frieze-'+z,0,7.0,z+(z===-23?.20:-.20),22,z===-23?0:Math.PI);
 }
 for(const x of [-11,11]){
  solid3(loft,x,4.625,-28.5,.24,.82,11,C.red);box(loft,x,7.0,-28.5,.30,.43,11,C.jade);
  for(const z of [-34,-29,-25,-23])solid3(loft,x,5.715,z,.26,3,.18,C.red);
  G.box(loft,x,5.08,-28.5,.29,.10,11,C.gold);
 }
 const loftRoof=new THREE.Group();loftRoof.name='China roof archive viewing loft';roofGroup.add(loftRoof);
 palaceCeiling(loftRoof,colliders,cameraColliders,0,-28.5,22,11,7.215,false);palaceRoof(loftRoof,0,7.48,-28.5,24,13,1.85,C.roof);
 // A continuous lower eave ring has a true central opening. No sloping roof
 // face crosses the upper room or its stairwell at head height.
 const eave=(a,b,c,d)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));geo.computeVertexNormals();G.mesh(loftRoof,geo,C.roof,0,0,0,{side:THREE.DoubleSide});};
 const yI=4.43,yO=4.20;eave([-11.1,yI,-22.9],[11.1,yI,-22.9],[12,yO,-22],[-12,yO,-22]);eave([11.1,yI,-34.1],[-11.1,yI,-34.1],[-12,yO,-35],[12,yO,-35]);eave([-11.1,yI,-34.1],[-11.1,yI,-22.9],[-12,yO,-22],[-12,yO,-35]);eave([11.1,yI,-22.9],[11.1,yI,-34.1],[12,yO,-35],[12,yO,-22]);
 for(const z of [-22,-35])beam(loftRoof,[-12,4.25,z],[12,4.25,z],.09,C.gold);
 for(const x of [-12,12])beam(loftRoof,[x,4.25,-35],[x,4.25,-22],.09,C.gold);
 for(const x of [-1.5,6.2])upperFixture(loft,'viewing-loft-lantern-'+x,x,6.815,-28.8,4.215);
 loft.traverse(o=>{if(o.userData.nightFixture)o.userData.nightFixture.floorY=4.215;});
 // Low supported display furniture leaves both the viewing promenade and
 // stair landing open. Library service remains downstairs.
 for(const x of [1.2,7.6]){const t=new THREE.Group();t.position.y=4.2;loft.add(t);G.table(t,x,-32.5,3.2,.8,C.wood,.88);colliders.push({minX:x-1.6,maxX:x+1.6,minY:4.2,maxY:5.155,minZ:-32.9,maxZ:-32.1});cameraColliders.push({minX:x-1.6,maxX:x+1.6,minY:4.2,maxY:5.155,minZ:-32.9,maxZ:-32.1});for(const dx of[-.7,.7])boundBook(loft,x+dx,5.19,-32.5,.75,.5,0x7d9583);}
 interiorRooms.push({id:'archive-loft',name:'北苑观景阁',minX:-11,maxX:11,minZ:-34,maxZ:-23,floorY:4.215,ceiling:7.215});
 const archiveBuilding=buildings.find(b=>b.id==='archive');archiveBuilding.roomIds.push('archive-loft');archiveBuilding.roofGroupName=rooms.archive.r.name;
 for(const [id,name,p] of [
  ['cn-loft-stair-base','藏书殿室内楼梯口',[-7.85,.815,-24.3]],['cn-loft-midlanding','观景阁转身平台',[-6.6,2.515,-31]],
  ['cn-loft-stair-top','观景阁上层梯口',[-5.3,4.215,-24.3]],['cn-loft-court-view','观景阁荷庭视野',[0,4.215,-23.52]],
  ['cn-loft-east','观景阁东侧回廊',[8,4.215,-26]],['cn-loft-west','观景阁西侧回廊',[-10.1,4.215,-28]],['cn-loft-rear','观景阁北侧书廊',[0,4.215,-31]]])explorationTargets.push({id,name,roomId:id==='cn-loft-stair-base'?'archive':'archive-loft',position:p});
 for(const t of explorationTargets){if(t.id==='cn-hall-approach')t.position=[0,1.415,6.3];if(t.id==='cn-west-lane')t.position=[-14.4,.115,-6];if(t.id==='cn-east-lane')t.position=[14,.115,-6];}
 // Batching remains per building. Stair/platform resources use the same
 // material ownership and disposal contract as every existing static group.
 exterior.attach(r14);rooms.archive.g.attach(loft);rooms.archive.r.attach(loftRoof);

 // Refresh recorded bounds after any support-local transforms, before batching.
 group.updateMatrixWorld(true);for(const o of ornaments){const b=new THREE.Box3().setFromObject(group.getObjectByName(o.groupName));o.bounds={min:b.min.toArray(),max:b.max.toArray()};}
 const decorativeProgram={revision:'R11 painted palace',sourceStudy:{url:'https://www.sglynp.com/t182446',creator:'mareasia',observed:'Public effect images: layered screens, paired lanterns, wall lattices, textiles, displayed porcelain and paired court composition. All geometry and motifs here are newly authored; no assets copied.'},palette:{vermillion:C.red,gold:C.gold,turquoise:C.jade,indigo:ink},ornaments,physicalPolicy:'Decor remains support-attached; R14 raised halls, real upper floors, stair voids and landing heights are explicit; living facilities and 60x80 envelope preserved',newPointLights:0};
 group.userData.decorativeProgram=decorativeProgram;
 // Floors and rugs are explicit height-aware supports. Grounded actors and
 // doors choose their own floor, never the unrelated highest room above them.
 group.userData.rugSurfaces=[];for(const{g}of Object.values(rooms))group.userData.rugSurfaces.push(...(g.userData.rugSurfaces||[]));walkableSurfaces.push(...group.userData.rugSurfaces);
 const floorAt=(x,z,near=0)=>{const ys=[...walkableSurfaces,...group.userData.rugSurfaces].filter(s=>x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ).map(s=>s.axis?s.y+(s.endY-s.y)*((s.axis==='x'?x-s.minX:z-s.minZ)/(s.axis==='x'?s.maxX-s.minX:s.maxZ-s.minZ)):s.y);if(near<.45)return Math.max(.015,...ys.filter(y=>y<1.65));return ys.filter(y=>Math.abs(y-near)<.45).sort((a,b)=>b-a)[0]??ys.sort((a,b)=>Math.abs(a-near)-Math.abs(b-near))[0]??.015;};
 const ground=p=>[p[0],floorAt(p[0],p[2],p[1]),p[2]];for(const t of explorationTargets)t.position=ground(t.position);for(const d of doorways){d.a=ground(d.a);d.b=ground(d.b);d.height=d.top-Math.max(d.a[1],d.b[1]);}
 const stations=[{id:'cn-tea',name:'西苑茶厅 · 宫苑茶叙',action:'沏茉莉花茶',position:[-19.6,0,13.32],playerWorkTarget:[-19.6,1.2,12.57],color:'#96b19a',npcName:'Lin',npcAction:'tea',npcLabel:'温杯沏茉莉花茶',npcPosition:[-22.1,0,13.32],workTarget:[-22.1,1.2,12.57],npcRotation:Math.PI,route:[[-23,0,16.8],[-19,0,16.8]]},{id:'cn-calligraphy',name:'东苑书斋 · 翰墨书房',action:'写书法',position:[19.6,0,13.32],playerWorkTarget:[19.55,1.057,12.57],color:'#baaa84',npcName:'Wen',npcAction:'calligraphy',npcLabel:'正在挥毫习字',npcPosition:[22.2,0,13.32],workTarget:[22.15,1.057,12.57],npcRotation:Math.atan2(-.05,-.75),route:[[22.3,0,16.8],[18.2,0,16.8]]},{id:'cn-cooking',name:'御膳备餐间 · 手作点心',action:'包饺子',position:[23.6,0,-7.46],playerWorkTarget:[23.6,1.2,-8.21],color:'#e3b175',npcName:'Jia',npcAction:'knead',npcLabel:'正在捏出手工饺子',npcPosition:[21.3,0,-7.46],workTarget:[21.3,1.2,-8.21],npcRotation:Math.PI,route:[[18,0,-6.2],[23.5,0,-6.2]]},{id:'cn-rest',name:'静宜寝殿 · 倚窗书席',action:'倚窗读书',position:[-19,0,-3.6],color:'#c99aaa',npcName:'Lan',npcAction:'read',npcLabel:'倚窗静读',npcPosition:[-23.4,0,-3.4],workTarget:[-24.0,1.04,-3.3],npcRotation:Math.atan2(-.6,.1)},{id:'cn-garden',name:'御花园 · 宽桥赏荷',action:'观鱼赏荷',position:[-.8,0,-18],color:'#82bcb2',npcName:'Bo',npcAction:'garden',npcLabel:'在荷塘边观鱼',npcPosition:[.8,0,-18.7],workTarget:[3.6,.3,-19.2],npcRotation:Math.atan2(2.8,-.5),route:[[0,0,-14.3],[10,0,-14],[10,0,-20.9]]}];
 for(const s of stations){s.position=ground(s.position);s.npcPosition=ground(s.npcPosition);s.route=s.route?.map(ground);}
 // swing:1 opens both leaves toward world negative z, into these clear rooms.
 const automaticDoorways=[{id:'cn-hall-front',center:[0,1.415,5],width:6,height:4.315,axis:'x',style:'palace',motion:'hinge',swing:1},{id:'cn-bedroom-front',center:[-21,.215,2],width:3.2,height:3.285,axis:'x',style:'palace',motion:'hinge',swing:1}];
 const architectureProgram={gallery:{building:'hall',room:'hall-gallery',floorY:6.015,slabUnderside:5.785,ceiling:9.215,void:{minX:-6,maxX:7.8,minZ:-11,maxZ:2}},sideLaneWidth:2.15,stairways,levels,lightingZones,raisedBuildings:[{id:'hall',offset:1.2,floorY:1.415},{id:'archive',offset:.6,floorY:.815}],loft:{building:'archive',room:'archive-loft',floorY:4.215,slabUnderside:3.985,ceiling:7.215,stairHole:{minX:-9.2,maxX:-4.05,minZ:-32,maxZ:-25.4}},revision:'R14 raised palace and reachable rear viewing loft',axisWidth:12,perimeterWalls,buildings,courts,minimumBuildingGap:5,sourceStudy:{url:'https://www.sglynp.com/t182446',creator:'mareasia',method:'Effect-image visual study; original procedural geometry; no assets reused'}};
 group.userData.architectureProgram=architectureProgram;group.userData.facilities=facilities;group.userData.interiorRooms=interiorRooms;group.userData.doorways=doorways;group.userData.explorationTargets=explorationTargets;
 // Preserve actual named geometry groups so independent architecture tests can
 // inspect each detached envelope, not only trust declarative metadata.
 for(const {g,r}of Object.values(rooms)){packStatic(g);packStatic(r);}packStatic(gate);packStatic(gateRoof);for(const w of [...exterior.children].filter(o=>o.name.startsWith('China perimeter ')))packStatic(w);
 // Outer ground stays in its own group; omit perimeter groups while batching it.
 const walls=exterior.children.filter(o=>o.name.startsWith('China perimeter '));for(const w of walls)exterior.remove(w);packStatic(exterior);for(const w of walls)exterior.add(w);
 return {requiredInsetDoorIds:Object.keys(insetKinds),group,roofGroup,colliders,cameraColliders,bounds,spawn:ground([0,0,39]),heightAware:true,levels,lightingZones,additionalFurnitureSeats,characterFootSurfaces,walkableSurfaces,interiorRooms,doorways,explorationTargets,facilities,stations,architectureProgram,automaticDoorways};
}
