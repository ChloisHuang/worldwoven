import * as THREE from 'three';
// Small original geometric paintings. Colours and composition are persisted
// through designId, not random on reload; every finished canvas remains visible.
export function createFranceArtProps(parent,P){
 const root=new THREE.Group();root.name='卢西安原画展览';root.userData.dynamic=true;parent.add(root);
 const resources=[],gallery=new Map();let work=null,workKey=null;
 function box(g,x,y,z,w,h,d,c){const geometry=new THREE.BoxGeometry(w,h,d),material=new THREE.MeshToonMaterial({color:c});resources.push(geometry,material);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
 function painting(id,outlined=false){
  const g=new THREE.Group(),evening=id.endsWith('evening'),garden=id.startsWith('garden');
  const sky=evening?0xe9bba4:0xc8dedb,light=evening?0xf6d08b:0xf0e9c6,green=evening?0x697b60:0x739584;
  box(g,0,0,0,1.85,1.72,.07,0xb38f52);box(g,0,0,.047,1.73,1.60,.028,outlined?0xefe4cf:sky);
  if(outlined){for(const x of [-.55,-.18,.18,.55])box(g,x,-.05,.068,.012,.88,.009,0x9b9b89);box(g,0,-.38,.068,1.55,.012,.009,0x9b9b89);return g;}
  box(g,0,-.49,.07,1.70,.57,.018,green);
  box(g,.54,.47,.08,.23,.23,.014,light);
  if(garden){
   // Palace garden: a narrowing central path, bordered beds and tall topiary.
   for(let row=0;row<4;row++){const y=-.64+row*.18,w=.53-row*.095;box(g,0,y,.10,w,.18,.018,light);for(const side of [-1,1])box(g,side*(.54-row*.08),y+.015,.105,.30-row*.04,.085,.024,row%2?0xa6b99a:0x426954);}
   for(const x of [-.64,.64]){box(g,x,-.1,.10,.04,.46,.015,0x89774d);box(g,x,.10,.12,.20,.38,.018,0x527562);}
   box(g,0,.05,.09,.62,.26,.017,evening?0xe4d3b0:0xe7e9d8);box(g,0,.22,.11,.76,.065,.019,0x9caa90);
  }else{
   // Architectural view: a clear entablature, four columns and foreground steps.
   box(g,0,.33,.095,1.30,.12,.023,light);box(g,0,-.31,.095,1.46,.08,.024,light);
   for(const x of [-.52,-.17,.17,.52]){box(g,x,.01,.11,.115,.58,.025,0xf0e3c4);box(g,x+.04,.01,.128,.025,.55,.008,0xb8b99d);box(g,x,.26,.13,.18,.045,.015,light);}
   for(let j=0;j<3;j++)box(g,0,-.39-j*.075,.11,1.45+j*.1,.055,.025,j%2?0xc3c2a0:0xe4dcc0);
  }
  return g;
 }
 function update(state,player,artist){
  for(const entry of state.completed){if(gallery.has(entry.id))continue;const g=painting(entry.designId);g.name=entry.title;g.userData={orderId:entry.id,designId:entry.designId,artist:entry.artist,title:entry.title};const i=Number(entry.id.split('-').at(-1))-1;g.scale.setScalar(.52);g.position.set(10.59,1.48+Math.floor(i/3)*1.10,-8.9-(i%3)*1.4);g.rotation.y=-Math.PI/2;root.add(g);gallery.set(entry.id,g);}
  const o=state.order?.supplyReceipt?state.order:null,key=o?`${o.id}:${o.designId}:${o.stage==='outline'?'outline':'paint'}`:null;
  if(key!==workKey){work?.removeFromParent();work=o?painting(o.designId,o.stage==='outline'):null;if(work){work.name='同号创作原画';work.userData={orderId:o.id,designId:o.designId};root.add(work);}workKey=key;}
  if(!work)return;
  const holder=o.holder==='player'?player:o.holder==='npc'?artist:null;
  if(holder){holder.root.updateWorldMatrix(true,true);const hands=holder.root.userData.hands;if(hands?.length>=2)work.position.copy(hands[0].getWorldPosition(new THREE.Vector3())).add(hands[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);else work.position.copy(holder.root.position).add(new THREE.Vector3(0,1.15,.4));work.rotation.y=holder.root.rotation.y;work.scale.setScalar(.38);}
  else{work.position.set(...P.top);work.rotation.y=0;work.scale.setScalar(1);}
 }
 return {update,dispose(){root.removeFromParent();resources.forEach(r=>r.dispose());}};
}
