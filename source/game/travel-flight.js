import * as THREE from 'three';

// Presentation only: this clock never advances the game calendar or commits
// an arrival. Main sends both the animation's finish and Skip to the journey.
export const TRAVEL_FLIGHT_SECONDS=8;
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export function createTravelArc(markers,from,to){
 const end=markers.find(m=>m.id===to)?.anchor?.clone();
 if(!end)throw Error('unknown-flight-destination');
 const original=from==null?null:markers.find(m=>m.id===from)?.anchor?.clone();
 if(from!=null&&!original)throw Error('unknown-flight-origin');
 const radius=end.length(),b=end.normalize(),a=original?original.normalize():b.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-.42);
 let axis=new THREE.Vector3().crossVectors(a,b);
 if(axis.lengthSq()<1e-12)axis=new THREE.Vector3().crossVectors(a,Math.abs(a.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0));
 axis.normalize();const angle=Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1));
 const point=progress=>{const p=clamp(progress);return a.clone().applyAxisAngle(axis,angle*p).multiplyScalar(radius+.8+Math.sin(Math.PI*p)*.75);};
 return {from,to,knownOrigin:from!=null,point};
}

export function createTravelFlight({globe}){
 const group=new THREE.Group();group.name='Current passport journey flight';group.visible=false;globe.group.add(group);
 const plane=new THREE.Group();plane.name='Travel airplane';group.add(plane);
 const paper=new THREE.MeshToonMaterial({color:0xfff4da}),ink=new THREE.MeshToonMaterial({color:0x467876});
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.45,3,8),paper);body.rotation.x=Math.PI/2;plane.add(body);
 const triangle=(vertices,material)=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);plane.add(mesh);return mesh;};
 paper.side=THREE.DoubleSide;ink.side=THREE.DoubleSide;
 triangle([-.38,0,-.03,.38,0,-.03,0,0,.15],paper);
 triangle([-.15,.015,-.23,.15,.015,-.23,0,.015,-.12],ink);
 triangle([0,0,-.3,0,.18,-.26,0,0,-.12],ink);
 const glass=new THREE.Mesh(new THREE.SphereGeometry(.055,8,5),ink);glass.position.set(0,.04,.18);glass.scale.set(.85,.7,1.1);plane.add(glass);
 const routeMaterial=new THREE.LineDashedMaterial({color:0xffedb4,dashSize:.1,gapSize:.055,transparent:true,opacity:.85});
 let route=null,arc=null,journey=null,seconds=0,disposed=false;
 const position=()=>{
  if(!arc)return;
  const p=seconds/TRAVEL_FLIGHT_SECONDS,at=arc.point(p),next=arc.point(Math.min(1,p+.001)),previous=arc.point(Math.max(0,p-.001));
  const forward=next.sub(previous).normalize(),up=at.clone().normalize(),right=new THREE.Vector3().crossVectors(up,forward).normalize();
  up.crossVectors(forward,right).normalize();
  plane.position.copy(at);plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,forward));
 };
 function start(value){
  if(disposed||!value?.id||value.stage!=='flying')return false;
  if(journey?.id===value.id){if(journey.from!==value.from||journey.to!==value.to)return false;group.visible=true;return true;}
  const next=createTravelArc(globe.markers,value.from,value.to);
  if(route){route.geometry.dispose();route.removeFromParent();}
  route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:49},(_,i)=>next.point(i/48))),routeMaterial);route.computeLineDistances();group.add(route);
  arc=next;journey={id:value.id,from:value.from,to:value.to};seconds=0;group.visible=true;position();return true;
 }
 function advance(dt){if(!disposed&&group.visible&&journey&&Number.isFinite(dt)&&dt>0){seconds=Math.min(TRAVEL_FLIGHT_SECONDS,seconds+Math.min(.25,dt));position();}return view();}
 function view(){return {journey:journey?{...journey}:null,visible:group.visible&&!disposed,progress:seconds/TRAVEL_FLIGHT_SECONDS,complete:seconds>=TRAVEL_FLIGHT_SECONDS,position:journey?plane.position.clone():null};}
 function dispose(){if(disposed)return;disposed=true;group.removeFromParent();const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});materials.add(routeMaterial);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 return {start,advance,view,pause(){group.visible=false;},clear(){group.visible=false;journey=null;arc=null;seconds=0;},dispose};
}
