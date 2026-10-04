import * as THREE from 'three';
import {PALACE_EDICT as E} from './china-palace-edict-place.js';

// One mesh identity travels from the real writing desk through both people's
// hands and the seal stand. Text/replies are original fictional game writing.
export function createPalaceEdictProps(parent){
 const root=new THREE.Group();root.name='Palace live edict and garden work';root.userData.dynamic=true;parent.add(root);
 const materials=new Map(),geometries=new Set(),v=new THREE.Vector3(),w=new THREE.Vector3();
 const mat=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshToonMaterial({color:c}));return materials.get(c);};
 const mesh=(q,g,c,p=[0,0,0])=>{geometries.add(g);const m=new THREE.Mesh(g,mat(c));m.position.set(...p);m.castShadow=true;q.add(m);return m;};
 const box=(q,s,c,p)=>mesh(q,new THREE.BoxGeometry(...s),c,p);
 const scroll=new THREE.Group();scroll.name='One palace edict';root.add(scroll);scroll.visible=false;
 box(scroll,[.64,.018,.43],0xeed79e);for(const x of[-.32,.32]){const m=mesh(scroll,new THREE.CylinderGeometry(.038,.038,.48,10),0x8e5837,[x,.02,0]);m.rotation.x=Math.PI/2;}
 const marks=[];for(let i=0;i<5;i++)for(let j=0;j<4;j++)marks.push(box(scroll,[.015,.005,.025+(i+j)%2*.012],0x3d4035,[.20-i*.09,.013,-.11+j*.071]));
 const print=box(scroll,[.10,.006,.09],0x99342d,[-.22,.015,.11]);
 const seal=new THREE.Group();seal.name='Palace seal block';root.add(seal);box(seal,[.14,.095,.14],0x7f987b);box(seal,[.07,.075,.07],0xc9ac5c,[0,.085,0]);
 const basket=new THREE.Group();basket.name='East shore leaf basket';basket.position.set(...E.points.basket);root.add(basket);
 const profile=[[.23,0],[.30,.08],[.36,.35],[.32,.35],[.27,.09],[.21,.035]].map(p=>new THREE.Vector2(...p));mesh(basket,new THREE.LatheGeometry(profile,16),0xa4844d);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;box(basket,[.022,.31,.025],0xcbb178,[Math.cos(a)*.32,.18,Math.sin(a)*.32]);}
 const leaves=[];for(let i=0;i<9;i++){const leaf=mesh(root,new THREE.SphereGeometry(.10,8,5),i%3===0?0xb18143:0x7e8b48);leaf.scale.set(1,.12,.52);leaf.rotation.y=i*2.4;leaves.push(leaf);}
 const broom=new THREE.Group();broom.name='Bo east shore broom';root.add(broom);const shaft=mesh(broom,new THREE.CylinderGeometry(.021,.021,1,8),0x896239,[0,-.32,0]);shaft.rotation.z=.03;
 for(let i=0;i<7;i++)box(broom,[.035,.26,.05],0xbfa568,[(i-3)*.045,-.85,0]);broom.visible=false;
 let documentId=null,holder=null,sealed=false,workProgress=0;
 const hands=n=>{n.root.updateWorldMatrix(true,true);const h=n.root.userData.hands;if(h?.length===2){h[0].getWorldPosition(v);h[1].getWorldPosition(w);return v.clone().add(w).multiplyScalar(.5).add(new THREE.Vector3(0,-.035,0));}return new THREE.Vector3(0,1,.4).applyMatrix4(n.root.matrixWorld);};
 const setScroll=(p,yaw=0)=>{scroll.position.copy(p);scroll.rotation.set(0,yaw,0);};
 function update(order,actors,phase,cleaned=false,paused=false){
  documentId=order?.id||null;holder=order?.holder||null;sealed=!!order?.sealed;scroll.visible=!!order&&!['preparing','complete','returning'].includes(order.stage);
  scroll.userData={documentId,audienceId:order?.audienceId||null,holder};scroll.name=documentId||'One palace edict';
  const stage=order?.stage,ratio=d=>Math.min(1,phase/d),P=E.points;
  if(order){
   if(stage==='scribe-handoff'){const f=ratio(2.0);setScroll(f<.5?new THREE.Vector3(...P.draft).lerp(hands(actors.scribe),f*2):hands(actors.scribe).lerp(hands(actors.herald),(f-.5)*2));}
   else if(stage==='seal-place')setScroll(hands(actors.herald).lerp(new THREE.Vector3(...P.seal),ratio(1.2)));
   else if(stage==='seal-pickup')setScroll(new THREE.Vector3(...P.seal).lerp(hands(actors.herald),ratio(1.2)));
   else if(stage==='recipient-handoff')setScroll(hands(actors.herald).lerp(hands(actors.recipient),ratio(1.3)));
   else if(stage==='file-receipt')setScroll(hands(actors.recipient).lerp(new THREE.Vector3(...P.basket).add(new THREE.Vector3(0,.4,0)),ratio(1.2)));
   else if(holder==='scribe-desk')setScroll(new THREE.Vector3(...P.draft));
   else if(holder==='seal-stand')setScroll(new THREE.Vector3(...P.seal));
   else if(holder==='recipient')setScroll(hands(actors.recipient),actors.recipient.root.rotation.y);
   else if(holder==='basket')setScroll(new THREE.Vector3(...P.basket).add(new THREE.Vector3(0,.4,0)));
   else setScroll(hands(actors.herald),actors.herald.root.rotation.y);
  }
  marks.forEach((m,i)=>m.visible=stage!=='drafting'||i<Math.ceil(ratio(5)*marks.length));print.visible=sealed;
  seal.position.set(4.60,2.39,-5.06);if(stage==='sealing'){actors.herald.root.updateWorldMatrix(true,true);const right=actors.herald.root.userData.hands?.[1],p=right?right.getWorldPosition(v).clone():hands(actors.herald);p.y-=.13;seal.position.lerp(p,Math.min(1,phase/.4,(2.2-phase)/.4));}
  workProgress=cleaned?1:stage==='sweeping'?ratio(7):stage==='returning'||stage==='complete'?1:0;
  leaves.forEach((leaf,i)=>{const start=new THREE.Vector3(P.sweep[0]+(i%3-1)*.29,.174,P.sweep[2]+(Math.floor(i/3)-1)*.22),end=new THREE.Vector3(P.basket[0]+(i%3-1)*.12,P.basket[1]+.10+Math.floor(i/3)*.035,P.basket[2]+(Math.floor(i/3)-1)*.10);leaf.position.copy(start).lerp(end,Math.max(0,Math.min(1,workProgress*9-i)));});
  broom.visible=stage==='sweeping';if(broom.visible){actors.recipient.root.updateWorldMatrix(true,true);const h=actors.recipient.root.userData.hands?.[1];broom.position.copy(h?h.getWorldPosition(v):hands(actors.recipient));broom.rotation.set(-.23,actors.recipient.root.rotation.y,paused?0:Math.sin(phase*4)*.20);
   // Keep the handle in the actual palm while bristle tips skim this authored
   // ground. Fixed shaft length otherwise left Bo's broom about 10 cm aloft.
   const xY=v.set(1,0,0).applyQuaternion(broom.quaternion).y,yY=v.set(0,1,0).applyQuaternion(broom.quaternion).y,zY=v.set(0,0,1).applyQuaternion(broom.quaternion).y;
   broom.scale.y=(broom.position.y-P.work[1]-.008-.1525*Math.abs(xY)-.025*Math.abs(zY))/(.98*Math.abs(yY));
  }
 }
 return {update,state:()=>({documentId,holder,sealed,scrollCount:scroll.visible?1:0,scrollPosition:scroll.visible?scroll.position.toArray():null,workProgress,broomVisible:broom.visible,leafPositions:leaves.map(l=>l.position.toArray())}),dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
