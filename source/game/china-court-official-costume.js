/** Original Ming-informed civil dress; see docs/COURT_OFFICIAL_COSTUME.md.
 * Only the two authored officials use this cut. Their seeded face, body, hair
 * color and skeleton remain unchanged; the badge is original bird linework.
 */
import * as THREE from 'three';
import {embroidery} from './china-royal-embroidery.js';
const INK=0x22272c,EDGE=0xbba36d,IVORY=0xe8dcc0,TAU=Math.PI*2;

export function buildCourtOfficialGarments(g,{loft,surface,hand,shoe,conformFront,tone},C){
 // Broad shoulders continue into a nearly straight ankle robe. There is no
 // separate flared skirt, crossed scholar lapel or high decorative sash.
 const body=[[.145,.219,.128,0,-.011],[.34,.214,.124,0,-.008],[.72,.196,.114,0,-.007],[1.03,.177,.109,0,-.006],[1.16,.181,.105,0,-.007],[1.28,.193,.096,0,-.011],[1.338,.197,.082,0,-.012],[1.382,.114,.059,0,-.003],[1.415,.045,.037,0,.002]];
 loft(g,'court-official-straight-long-robe-body',body,C.yukata,{steps:38});
 loft(g,'court-official-ivory-round-inner-collar',[[1.394,.060,.045,0,0],[1.418,.050,.041,0,.002],[1.428,.046,.039,0,.003]],IVORY,{steps:9});
 loft(g,'court-official-round-collar-facing',[[1.391,.067,.049,0,0],[1.407,.058,.045,0,.002],[1.415,.054,.043,0,.002]],tone(C.yukata,.70),{steps:8});
 for(const side of[-1,1]){
  const sleeve=[[.948,.041,.048,side*.300,-.002],[1.005,.063,.071,side*.296,-.010],[1.092,.079,.088,side*.277,-.021],[1.18,.087,.088,side*.250,-.023],[1.277,.081,.079,side*.207,-.017],[1.337,.062,.064,side*.173,-.012]];
  loft(g,'court-official-full-sleeve-'+side,sleeve,C.yukata,{steps:27});
  loft(g,'court-official-ivory-sleeve-cuff-'+side,[[.936,.037,.043,side*.302,-.001],[.956,.043,.050,side*.300,-.003]],IVORY,{steps:5});
  loft(g,'court-official-dark-sleeve-edge-'+side,[[.957,.044,.051,side*.300,-.004],[.980,.051,.059,side*.298,-.006]],tone(C.yukata,.67),{steps:5});
  loft(g,'wrist-court-official-'+side,[[.916,.022,.023,side*.303,0],[.945,.027,.028,side*.301,-.002]],C.skin,{steps:5});
  hand(g,side);shoe(g,side,false);
  loft(g,'court-official-footwear-black-boot-'+side,[[.080,.041,.054,side*.089,-.018],[.17,.041,.046,side*.089,-.019],[.29,.047,.047,side*.089,-.014]],INK,{steps:10});
 }
 g.traverse(m=>{if(m.isMesh&&/^footwear|^sole-/.test(m.name))m.material={color:new THREE.Color(INK),skin:false,isMaterial:false};});
 // The square patch stays on the cloth, so it follows reading and seated poses.
 // Its simplified long-necked bird evokes civil rank without asserting a rank.
 for(const back of[false,true]){
  const made=[],tag=back?'back':'front',panel=embroidery(g,'court-official-square-bird-badge-'+tag,0x35434b);
  panel.fill([[-.106,1.119],[.106,1.119],[.106,1.326],[-.106,1.326]]);made.push(panel.finish());
  const border=embroidery(g,'court-official-badge-gold-border-'+tag,EDGE);
  border.stroke([[-.104,1.121],[.104,1.121],[.104,1.324],[-.104,1.324]],.006,true);
  for(const x of[-.062,0,.062])border.stroke([[x-.020,1.144],[x-.009,1.156],[x+.006,1.153],[x+.024,1.160]],.004);
  border.ellipse(.072,1.292,.011,.011,.004);made.push(border.finish());
  const bird=embroidery(g,'court-official-badge-ivory-bird-'+tag,IVORY);
  bird.fill([[-.035,1.216],[-.075,1.269],[-.045,1.263],[-.016,1.240],[.005,1.258],[.046,1.275],[.026,1.239],[.004,1.216],[-.009,1.196]]);
  bird.stroke([[-.010,1.216],[.027,1.231],[.034,1.272],[.049,1.287],[.061,1.283]],.010);
  bird.fill([[.055,1.287],[.084,1.282],[.058,1.278]]);
  bird.stroke([[-.027,1.214],[-.062,1.192],[-.074,1.181]],.006);
  for(const x of[-.012,.001])bird.stroke([[x,1.204],[x+.008,1.178],[x+.025,1.171]],.0035);
  made.push(bird.finish());
  for(const [i,m]of made.entries()){
   conformFront(m,body,.003+i*.002);
   if(back){const p=m.geometry.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,-p.getZ(j)-.019);m.geometry.computeVertexNormals();}
  }
 }
 loft(g,'court-official-black-plaque-belt',[[1.052,.184,.116,0,-.006],[1.099,.184,.115,0,-.006]],INK,{steps:5});
 for(let i=0;i<12;i++){
  const a=i*TAU/12;
  surface(g,'court-official-belt-gold-setting-'+i,4,3,(u,v)=>{const b=a+(u-.5)*.29;return[Math.sin(b)*.188,1.059+v*.032,-.006+Math.cos(b)*.120];},EDGE);
  surface(g,'court-official-belt-pale-plaque-'+i,4,3,(u,v)=>{const b=a+(u-.5)*.20;return[Math.sin(b)*.189,1.064+v*.022,-.006+Math.cos(b)*.122];},0xc6c7b2);
 }
}

// Add groomed adult facial hair to these officials only. The underlying skin,
// eyes, mouth and seeded shape are unmodified. It receives the same face warp
// and head-bone weight as the existing facial features, avoiding floating props.
export function buildCourtOfficialFacialHair(head,{surface,faceSurface},C){
 const color=new THREE.Color(C.hair).multiplyScalar(.78).getHex();
 for(const side of[-1,1])surface(head,'court-official-facial-hair-moustache-'+side,14,5,(u,v)=>{
  const x=side*(.003+u*.026),top=1.530-.006*u,depth=.007*Math.sin(Math.PI*(.1+.8*u));
  const y=top-v*depth;return[x,y,faceSurface(x,y)+.0017];
 },color);
 surface(head,'court-official-facial-hair-trimmed-goatee',16,10,(u,v)=>{
  const y=1.500-v*.046,w=.017*(1-v*.72)*Math.sin(Math.PI*(.13+.70*v)),x=(u*2-1)*w;
  return[x,y,faceSurface(x,Math.max(y,1.462))+.002+.007*v];
 },color);
}

// The owner disposes this handle before disposing the actor. All cap parts are
// original geometry attached to the existing head; no identity is rewritten.
export function attachCourtOfficialCostume(actor){
 if(actor.root.userData.courtOfficialCostume)return actor.root.userData.courtOfficialCostume;
 const head=actor.root.userData.head,group=new THREE.Group();group.name='Original civil official black winged cap';head.add(group);
 const bands=new THREE.DataTexture(new Uint8Array([90,150,213,255]),4,1,THREE.RedFormat);bands.minFilter=bands.magFilter=THREE.NearestFilter;bands.generateMipmaps=false;bands.needsUpdate=true;
 const materials=new Map(),material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color,gradientMap:bands}));return materials.get(color);};
 const part=(name,geometry,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material(color));m.name=name;m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
 const rings=[[.203,.108,.096,-.012],[.245,.108,.095,-.018],[.307,.094,.082,-.024],[.350,.067,.061,-.030],[.363,.003,.003,-.032]],positions=[],indices=[];
 for(const[y,rx,rz,z]of rings)for(let i=0;i<=24;i++){const a=i/24*TAU;positions.push(Math.sin(a)*rx,y,z+Math.cos(a)*rz);}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<24;i++){const a=j*25+i;indices.push(a,a+1,a+25,a+1,a+26,a+25);}
 const crown=new THREE.BufferGeometry();crown.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));crown.setIndex(indices);crown.computeVertexNormals();part('court-official-rounded-black-crown',crown,INK);
 const band=part('court-official-black-forehead-band',new THREE.CylinderGeometry(.109,.111,.025,24),0x181d22,0,.212,-.012);band.scale.z=.91;
 for(const side of[-1,1]){
  const shape=new THREE.Shape();shape.moveTo(0,-.021);shape.bezierCurveTo(.065,-.027,.124,-.041,.161,-.029);shape.bezierCurveTo(.202,-.018,.199,.027,.167,.035);shape.bezierCurveTo(.127,.049,.061,.026,0,.023);shape.closePath();
  const wing=part('court-official-horizontal-black-wing-'+side,new THREE.ExtrudeGeometry(shape,{depth:.019,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.0025,bevelThickness:.0025,curveSegments:8}),0x2d3339,side*.091,.235,-.063);wing.scale.x=side;
 }
 let disposed=false;const handle={dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of materials.values())m.dispose();bands.dispose();delete actor.root.userData.courtOfficialCostume;}};
 actor.root.userData.courtOfficialCostume=handle;return handle;
}
