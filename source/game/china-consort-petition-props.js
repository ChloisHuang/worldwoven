import * as THREE from 'three';
import {PALACE_EDICT} from './china-palace-edict-place.js';

// The same authored paper, rollers, ink and seal craft as the original edict.
// This document has one stable identity; no second Shen or writing desk exists.
export function createConsortCharterProps(parent){
 const root=new THREE.Group();root.name='Consort charter physical document';root.userData.dynamic=true;parent.add(root);
 const materials=new Map(),geometries=new Set(),v=new THREE.Vector3(),w=new THREE.Vector3();
 const mesh=(q,g,c,p=[0,0,0])=>{geometries.add(g);if(!materials.has(c))materials.set(c,new THREE.MeshToonMaterial({color:c}));const m=new THREE.Mesh(g,materials.get(c));m.position.set(...p);m.castShadow=true;q.add(m);return m;};
 const box=(q,s,c,p)=>mesh(q,new THREE.BoxGeometry(...s),c,p);
 const scroll=new THREE.Group();root.add(scroll);box(scroll,[.64,.018,.43],0xeed79e);
 for(const x of[-.32,.32])mesh(scroll,new THREE.CylinderGeometry(.038,.038,.48,10),0x8e5837,[x,.02,0]).rotation.x=Math.PI/2;
 const marks=[];for(let i=0;i<5;i++)for(let j=0;j<4;j++)marks.push(box(scroll,[.015,.005,.025+(i+j)%2*.012],0x3d4035,[.20-i*.09,.013,-.11+j*.071]));
 const print=box(scroll,[.10,.006,.09],0x99342d,[-.22,.015,.11]);
 let documentId=null,holder=null,sealed=false;
 const hands=n=>{n.root.updateWorldMatrix(true,true);const h=n.root.userData.hands;if(h?.length===2){h[0].getWorldPosition(v);h[1].getWorldPosition(w);return v.clone().add(w).multiplyScalar(.5).add(new THREE.Vector3(0,-.035,0));}return new THREE.Vector3(0,1,.4).applyMatrix4(n.root.matrixWorld);};
 function update(document,{herald,player},phase,elapsed=0){
  documentId=document?.id||null;holder=document?.holder||null;sealed=!!document?.sealed;scroll.visible=!!document&&!document.filed;
  if(!scroll.visible)return;scroll.name=documentId;scroll.userData={documentId,holder};
  const desk=new THREE.Vector3(...PALACE_EDICT.points.seal),ratio=n=>Math.min(1,elapsed/n);
  let p=holder==='desk'?desk:holder==='player'&&player?hands(player):hands(herald);
  if(phase==='place-charter')p=hands(herald).lerp(desk,ratio(1.2));
  if(phase==='pickup-charter')p=desk.lerp(hands(herald),ratio(1.2));
  if(phase==='handoff'&&player)p=hands(herald).lerp(hands(player),ratio(1.5));
  scroll.position.copy(p);scroll.rotation.set(0,holder==='player'&&player?player.root.rotation.y:holder==='desk'?0:herald.root.rotation.y,0);
  marks.forEach((m,i)=>m.visible=document.drafted||phase==='drafting'&&i<Math.ceil(ratio(5)*marks.length));print.visible=sealed;
 }
 return {update,state:()=>({documentId,holder,sealed,scrollCount:scroll.visible?1:0,scrollPosition:scroll.visible?scroll.position.toArray():null}),dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
