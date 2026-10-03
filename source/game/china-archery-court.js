// Original imperial practice court. Arrows are harmless game geometry only.
// All firing faces west into the enclosed backstop, away from palace paths.
export const CHINA_ARCHERY={
 id:'cn-archery',bounds:{minX:-26,maxX:-16,minZ:8,maxZ:21},floorY:.13,
 entry:[-16.0,.13,19],rack:[-17.65,.13,11.2],line:[-19.5,.13,13.2],
 player:[-19.5,.13,17.2],targets:[[-24.7,1.47,13.2],[-24.7,1.47,17.2]],
 waits:[[-17.55,.13,9.9],[-17.55,.13,15.1]],
 range:{minX:-25.5,maxX:-20.0,minZ:8.8,maxZ:20.2},
 roles:['cn-archery','cn-range-warden']
};

export function buildChinaArcheryCourt(G,{group,colliders,cameraColliders,packStatic}){
 const {THREE}=G,A=CHINA_ARCHERY,q=new THREE.Group();q.name='China imperial archery court';group.add(q);
 const C={red:0x943b31,dark:0x44372f,gold:0xc8a35b,straw:0xbda67b,stone:0xbcbba7};
 const box=(x,y,z,w,h,d,c,solid=false)=>{G.box(q,x,y,z,w,h,d,c);if(solid){const b={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,archeryBoundary:true};colliders.push(b);cameraColliders.push({...b});}};
 // A compact sand court inside a continuous masonry/straw stopping wall.
 box(-21,.118,14.5,9.6,.012,12.6,0xc5b799);
 box(-25.7,1.42,14.5,.42,2.6,12.55,C.straw,true);
 for(const z of [8.45,10.5,12.5,14.5,16.5,18.5,20.55])box(-25.43,1.43,z,.12,2.66,.15,C.dark);
 for(const y of [.30,2.69])box(-25.41,y,14.5,.15,.12,12.6,C.red);
 const fence=(axis,at,from,to)=>{const mid=(from+to)/2,len=to-from;
  box(axis==='x'?mid:at,.47,axis==='x'?at:mid,axis==='x'?len:.16,.70,axis==='x'?.16:len,C.red,true);
  box(axis==='x'?mid:at,.85,axis==='x'?at:mid,axis==='x'?len:.20,.075,axis==='x'?.20:len,C.gold);
  for(let p=from;p<=to+.01;p+=Math.min(1.5,len)){box(axis==='x'?p:at,.74,axis==='x'?at:p,.16,1.25,.16,C.dark);G.sphere(q,axis==='x'?p:at,1.40,axis==='x'?at:p,.11,C.gold);}
 };
 fence('x',8.25,-25.5,-16.3);fence('x',20.75,-25.5,-16.3);fence('z',-16.3,8.25,17.6);
 // Entry is a full 2.9 m clear opening in the rear, behind every bow.
 for(const z of [17.6,20.75]){box(-16.3,1.47,z,.18,2.70,.18,C.red,true);G.sphere(q,-16.3,2.88,z,.15,C.gold);}
 for(const z of [9.2,19.8]){box(-24.7,1.7,z,.10,3.2,.10,C.dark,true);box(-24.7,2.54,z+.29,.035,.92,.64,C.red);for(const dz of [-.025,.59])box(-24.67,2.54,z+dz,.02,.90,.026,C.gold);box(-24.67,2.54,z+.28,.025,.26,.26,C.gold);}
 A.targets.forEach(([x,y,z],i)=>{
  for(const dz of [-.62,.62])box(x-.12,.77,z+dz,.14,1.32,.14,C.dark,true);
  box(x-.15,1.02,z,.19,.12,1.55,C.dark);
  // Flat straw faces point into +X; muted ink/gilt rings fit the courtyard.
  for(const [radius,depth,color]of [[.70,0,C.straw],[.52,.10,0x80634b],[.38,.12,C.straw],[.23,.14,C.red],[.09,.16,C.gold]]){
   const disk=G.cyl(q,x+depth,y,z,radius,radius,radius===.70?.16:.018,color,32);disk.rotation.z=-Math.PI/2;
  }
  const pole=G.box(q,x+.10,y+.89,z,.04,.10,1.15,C.red);pole.name='Archery target '+i;
 });
 // Rear waiting strip and two firing marks are all at existing ground height.
 box(-18.05,.139,14.5,2.25,.012,11.4,C.stone);
 for(const z of [13.2,17.2]){box(-19.80,.142,z,.12,.02,2.3,C.gold);for(const dz of [-.25,.25])box(-19.48,.148,z+dz,.44,.02,.10,C.dark);}
 for(const z of [9.9,15.1]){box(-17.55,.15,z,.8,.018,.8,0x8d7860);box(-17.55,.164,z,.60,.01,.05,C.gold);}
 // Bow rack is rear-facing and reached entirely from the waiting strip.
 for(const z of [10.35,12.05])box(-16.90,.96,z,.12,1.65,.12,C.dark,true);
 for(const y of [.47,1.52])box(-16.90,y,11.2,.14,.12,1.84,C.red);
 for(const z of [10.65,11.25,11.85]){const bow=buildPracticeBow(G);bow.group.position.set(-16.98,.96,z);bow.group.rotation.y=Math.PI/2;q.add(bow.group);}
 box(-17.0,.39,16.2,.50,.52,.55,C.dark,true);
 for(const z of [16.05,16.20,16.35]){const shaft=G.cyl(q,-17.0,.88,z,.012,.012,1.07,C.straw,6);shaft.rotation.z=.15;}
 packStatic(q);
 return {...A,group:q};
}

export function buildPracticeBow(G){
 const {THREE}=G,group=new THREE.Group();group.name='Original practice bow';
 const curve=new THREE.CatmullRomCurve3([[-.02,-.63,-.08],[0,-.48,.08],[0,-.26,.12],[0,0,0],[0,.26,.12],[0,.48,.08],[-.02,.63,-.08]].map(p=>new THREE.Vector3(...p)));
 G.mesh(group,new THREE.TubeGeometry(curve,24,.023,5,false),0x6e4430);
 G.box(group,0,0,.009,.052,.20,.053,0xb79553);
 const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.63,-.08),new THREE.Vector3(0,0,-.08),new THREE.Vector3(0,.63,-.08)]);
 const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xebd7a6}));group.add(line);
 return {group,string:line,setDraw(x=0){const a=geometry.attributes.position;a.setZ(1,-.08-x);a.needsUpdate=true;geometry.computeBoundingSphere();}};
}

export function buildPracticeArrow(G){
 const {THREE}=G,q=new THREE.Group();q.name='Fictional practice arrow';
 const shaft=G.cyl(q,0,0,0,.009,.009,.66,0xcdb084,6);shaft.rotation.x=Math.PI/2;
 // Blunt padded training tip; no combat or damage system.
 G.sphere(q,0,0,.35,.027,0x705548,.75,.75,1.5);
 for(const a of [0,Math.PI/2]){const f=G.box(q,0,0,-.24,.065,.012,.13,0xeee0bc);f.rotation.z=a;}
 return q;
}
