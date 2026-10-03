// Reconstructed from the owner's authored source and explicit patches after
// 2026-10-03 filesystem loss. Re-run syntax/geometry/route gates before release.
export const PALACE_PRACTICE = Object.freeze({
 floorY:.215,
 bounds:{minX:16,maxX:26,minZ:8,maxZ:21},
 downrange:{minX:18.20,maxX:23.80,minY:.2,maxY:3.8,minZ:9.70,maxZ:17.03,id:'cn-practice-public-exclusion'},
 home:[17.10,.215,18.60],checkIn:[20.90,.215,19.65],wait:[18.4,.215,19.70],
 rack:[24.50,.215,19.30],marker:[19.65,.215,17.65],
 maintenanceOutside:[17.10,.215,11.80],maintenanceInside:[19.10,.215,11.80],
 reset:[19.65,.215,11.65],target:[19.65,1.45,10.75],
 patrol:[[17.10,.215,18.60],[17.10,.215,9.00],[24.90,.215,9.00],[24.90,.215,18.90]],
});
export function buildChinaPracticeCourt(G,H,ctx){
 const {THREE}=G,{palaceWall,palaceRoof,palaceCeiling,beam,packStatic}=H;
 const {group,roofGroup,colliders,cameraColliders,walkableSurfaces,doorways,interiorRooms,buildings,explorationTargets,fixture}=ctx;
 const q=new THREE.Group(),r=new THREE.Group(),moving=new THREE.Group();
 q.name='China building archery-court';r.name='China roof archery-court';moving.name='China practice working fixtures';group.add(q,moving);roofGroup.add(r);
 const red=0xac3b2d,dark=0x50362d,gold=0xd7af56,stone=0xc9c3b0,jade=0x287879;
 const solid=(g,x,y,z,w,h,d,c,id)=>{G.box(g,x,y,z,w,h,d,c);const b={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,...(id?{id}:{})};colliders.push(b);cameraColliders.push({...b});return b;};
 G.box(q,21,.1,14.5,10,.2,13,stone);walkableSurfaces.push({...PALACE_PRACTICE.bounds,y:.215,owner:q.name});
 G.box(q,21,.1,21.65,11,.2,1.3,stone);walkableSurfaces.push({minX:15.5,maxX:26.5,minZ:21,maxZ:22.3,y:.215,owner:q.name});
 const aperture=(suffix,axis,at,from,to)=>{const id='cn-archery-'+suffix,center=(from+to)/2,p=off=>axis==='x'?[center,.215,at+off]:[at+off,.215,center];doorways.push({id,name:'习射庭'+({front:'前门',rear:'后门',west:'西廊门',east:'东廊门'}[suffix]),axis,at,from,to,width:to-from,bottom:.2,top:3.35,height:3.15,rooms:['archery-court','court'],a:p(-.85),b:p(.85)});return {from,to,bottom:.2,top:3.35};};
 for(const [side,axis,at,from,to]of[['front','x',21,16,26],['rear','x',8,16,26],['west','z',16,8,21],['east','z',26,8,21]]){
  const cut=aperture(side,axis,at,axis==='x'?19.4:12.9,axis==='x'?22.6:16.1);
  palaceWall(q,colliders,cameraColliders,{axis,at,from,to,bottom:.2,top:2.35,depth:.24,color:0xdbc5a0,openings:[cut]});
  for(const[a,b]of[[from,cut.from],[cut.to,to]]){const mid=(a+b)/2;G.box(q,axis==='x'?mid:at,2.40,axis==='x'?at:mid,axis==='x'?b-a:.36,.16,axis==='x'?.36:b-a,gold);}
  for(const v of[cut.from-.12,cut.to+.12]){const x=axis==='x'?v:at,z=axis==='x'?at:v;solid(q,x,1.85,z,.19,3.3,.19,red);G.cyl(q,x,.34,z,.15,.17,.26,stone,8);}
  G.box(q,axis==='x'?(cut.from+cut.to)/2:at,3.38,axis==='x'?at:(cut.from+cut.to)/2,axis==='x'?3.68:.28,.2,axis==='x'?.28:3.68,red);
 }
 for(const x of[16.3,25.7])for(const z of[18.45,20.7])solid(q,x,1.95,z,.20,3.50,.20,red);
 palaceCeiling(r,colliders,cameraColliders,21,19.7,10,2.7,3.85,false);palaceRoof(r,21,4.08,19.7,11.2,3.8,1.1,0xc39341);
 fixture(q,18.1,3.05,20,'practice-welcome-lantern',.25);fixture(q,24.1,3.05,20,'practice-rack-lantern',.25);
 const screen=(x,z0,z1)=>{const d=z1-z0,z=(z0+z1)/2;solid(q,x,1.33,z,.16,2.23,d,red);G.box(q,x-.091,1.36,z,.027,1.91,d-.14,jade);G.box(q,x+.091,1.36,z,.027,1.91,d-.14,jade);for(let zz=z0+.24;zz<z1;zz+=.50){G.box(q,x-.118,1.8,zz,.023,.8,.055,gold);G.box(q,x+.118,1.8,zz,.023,.8,.055,gold);}for(const zz of[z0,z1])G.cyl(q,x,1.36,zz,.12,.12,2.45,red,8);};
 screen(18.1,9.65,10.95);screen(18.1,12.65,18.25);screen(23.9,9.65,18.25);
 solid(q,21,1.58,9.70,5.80,2.73,.25,dark);G.box(q,21,1.57,9.842,5.48,2.42,.032,0x89734b);for(const x of[18.45,21,23.55])G.box(q,x,1.57,9.871,.065,2.48,.025,gold);
 solid(q,21,.80,16.95,5.80,.13,.11,red);for(const x of[18.1,21,23.9])solid(q,x,.62,16.95,.13,.82,.13,red);
 const gate=new THREE.Group();gate.name='China controlled maintenance gate';gate.position.set(18.3,.215,11.8);moving.add(gate);G.box(gate,0,1.11,0,.16,2.20,1.67,red);for(const x of[-.096,.096]){G.box(gate,x,1.10,0,.025,1.89,1.45,jade);for(const z of[-.52,0,.52])G.box(gate,x*1.2,1.68,z,.018,.62,.05,gold);}
 const gateCollider={id:'cn-practice-maintenance-gate',minX:18.22,maxX:18.38,minY:.215,maxY:2.415,minZ:10.965,maxZ:12.635};colliders.push(gateCollider);cameraColliders.push(gateCollider);
 colliders.push({...PALACE_PRACTICE.downrange});
 G.box(q,18.3,2.51,12.66,.15,.12,3.66,dark);for(const z of[10.92,12.68])G.box(q,18.20,1.33,z,.24,2.24,.08,red);
 for(const [i,x]of[19.65,22.25].entries()){
  const tg=new THREE.Group();tg.name='China straw target '+i;q.add(tg);for(const s of[-1,1])beam(tg,[x+s*.37,.215,10.60],[x+s*.29,1.79,10.77],.07,dark);beam(tg,[x,1.35,10.57],[x,.23,10.05],.06,dark);
  const disc=G.cyl(tg,x,1.45,10.75,.64,.64,.14,0xb89d65,32);disc.rotation.x=Math.PI/2;
  for(const [rad,col]of[[.49,0x8c4030],[.34,0xd7af56],[.17,0x287879]]){const ring=G.torus(tg,x,1.45,10.835,rad,.026,col,0);ring.name='Practice target painted ring';}
  G.sphere(tg,x,1.45,10.842,.07,red,1,1,.18);for(let k=0;k<18;k++){const a=k*Math.PI/9;beam(tg,[x+Math.sin(a)*.55,1.45+Math.cos(a)*.55,10.835],[x+Math.sin(a)*.61,1.45+Math.cos(a)*.61,10.835],.009,0xe3ca86);}
  colliders.push({id:'cn-practice-target-base-'+i,minX:x-.64,maxX:x+.64,minZ:10.02,maxZ:10.85,minY:.215,maxY:2.09});cameraColliders.push({minX:x-.64,maxX:x+.64,minZ:10.60,maxZ:10.85,minY:.215,maxY:2.09});
  G.box(q,x,.229,17.65,1.08,.027,.10,jade);for(const dx of[-.40,.40])G.box(q,x+dx,.229,17.65,.07,.027,.52,gold);
 }
 for(const x of[24.08,25.32])solid(q,x,.92,20.25,.11,1.42,.48,dark);G.box(q,24.7,.42,20.25,1.38,.14,.5,red);G.box(q,24.7,1.53,20.25,1.38,.12,.18,red);
 const rackBows=[];for(const x of[24.35,24.70,25.05]){const b=buildPracticeBow(G);b.position.set(x,1.02,20.25);b.rotation.y=Math.PI/2;moving.add(b);rackBows.push(b);}
 const frames=new THREE.Group();frames.name='China practice records lectern';q.add(frames);solid(frames,17.12,.69,20.12,1.05,.95,.58,dark);G.box(frames,17.12,1.19,20.12,1.17,.1,.70,red);G.box(frames,17.12,1.25,20.12,.70,.035,.44,0xeee0bd);
 interiorRooms.push({id:'archery-court',name:'东苑习射庭',...PALACE_PRACTICE.bounds,floorY:.215,ceiling:3.85,openToSky:true});
 buildings.push({id:'archery-court',name:'东苑习射庭',groupName:q.name,roofGroupName:r.name,bounds:{...PALACE_PRACTICE.bounds},roomIds:['archery-court'],openCourtyard:true});
 for(const[id,name,p]of[['cn-archery-wait','习射庭候练区',PALACE_PRACTICE.wait],['cn-archery-west-walk','习射庭西护廊',[17.1,.215,14.5]],['cn-archery-east-walk','习射庭东护廊',[24.9,.215,14.5]],['cn-archery-rear-walk','箭靶后方护廊',[21,.215,9]]])explorationTargets.push({id,name,roomId:'archery-court',position:[...p]});
 packStatic(q);packStatic(r);
 let gateOpen=0,requested=false,activeBow=false;
 return {group:q,roofGroup:r,dynamicGroup:moving,config:PALACE_PRACTICE,
  requestMaintenance(open){requested=!!open;},
  update(dt){gateOpen+=Math.sign((requested?1:0)-gateOpen)*Math.min(Math.abs((requested?1:0)-gateOpen),Math.max(0,dt)*1.5);gate.position.z=11.8+gateOpen*1.76;gateCollider.minZ=10.965+gateOpen*1.76;gateCollider.maxZ=12.635+gateOpen*1.76;},
  setBowCheckedOut(value){activeBow=!!value;rackBows[0].visible=!activeBow;},
  state(){return {maintenanceGateOpen:gateOpen>=.995,maintenanceGateClosed:gateOpen<=.005,downrangeGateOpen:false,gateOpen,requested,bowCheckedOut:activeBow};},
  runtimeColliders(){return colliders.filter(c=>c.id!=='cn-practice-public-exclusion');},
 };
}
export function buildPracticeBow(G){
 const {THREE}=G,q=new THREE.Group();q.name='Original practice bow';
 const curve=new THREE.CatmullRomCurve3([[-.015,-.59,-.02],[0,-.42,.12],[0,-.18,.10],[0,0,.025],[0,.18,.10],[0,.42,.12],[-.015,.59,-.02]].map(p=>new THREE.Vector3(...p)));
 G.mesh(q,new THREE.TubeGeometry(curve,28,.022,6,false),0x704632);G.cyl(q,0,0,.025,.030,.030,.18,0xc7aa64,8);
 const string=G.mesh(q,new THREE.CylinderGeometry(.0035,.0035,1.18,4),0xe8d9ba,-.015,0,-.02);string.name='practice bow resting string';return q;
}
