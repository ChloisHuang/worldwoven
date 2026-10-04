import * as T from 'three';
import * as G from './geometry.js';
import {FRANCE_GARDENER as P} from './france-gardener-place.js';

// One can and one pair of shears, shared between rack and hands. No emitted
// object survives the action; the six water threads / five leaves are reused.
export function createFranceGardenerProps(parent){
 const root=new T.Group();root.name='Live west garden tools';root.userData.dynamic=true;parent.add(root);
 const can=new T.Group(),shears=new T.Group(),water=new T.Group(),clippings=new T.Group();root.add(can,shears,water,clippings);
 can.name='Garden watering can';shears.name='Garden pruning shears';
 G.cyl(can,0,-.23,0,.15,.14,.27,0x789589,18);G.torus(can,0,-.093,0,.146,.012,0xb4b9a0);
 const handle=G.mesh(can,new T.TorusGeometry(.125,.014,7,24,Math.PI),0x425e54,0,-.12,0);handle.rotation.y=Math.PI/2;
 const up=new T.Vector3(0,1,0),v=new T.Vector3(),w=new T.Vector3(),handL=new T.Vector3(),handR=new T.Vector3(),tip=new T.Vector3();
 function rod(g,a,b,r,color){const m=G.cyl(g,0,0,0,r,r,1,color,8);fit(m,new T.Vector3(...a),new T.Vector3(...b));return m;}
 function fit(m,a,b){v.subVectors(b,a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=v.length();m.quaternion.setFromUnitVectors(up,v.normalize());}
 rod(can,[0,-.25,.08],[0,-.035,.42],.027,0x6b887c);const rose=G.cyl(can,0,-.026,.43,.061,.035,.045,0xc3b48a,12);rose.rotation.x=1.08;
 const spout=new T.Object3D();spout.position.set(0,-.015,.465);can.add(spout);
 const grips=[rod(shears,[-.17,0,0],[0,0,.26],.027,0x7b6044),rod(shears,[.17,0,0],[0,0,.26],.027,0x7b6044)];
 const blades=[G.box(shears,-.016,0,.43,.036,.014,.37,0xbdc3b7),G.box(shears,.016,.014,.43,.036,.014,.37,0xd2d4c8)];
 G.cyl(shears,0,.014,.26,.036,.036,.039,0x8e8d76,12);
 const streams=Array.from({length:6},()=>rod(water,[0,0,0],[0,1,0],.005,0xb9d8d3));
 const leaves=Array.from({length:5},(_,i)=>G.sphere(clippings,0,0,0,.035,i%2?0x6d875a:0x52754e,.6,.18,1));
 root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 let disposed=false,held=null,streamTarget=null,gripError=0;
 const bladeTip=new T.Vector3(),rackCan=new T.Vector3(P.standTop[0]+.14,P.standTop[1]+.365,P.standTop[2]-.22),rackShears=new T.Vector3(P.standTop[0]+.32,1.12,P.standTop[2]+.30);
 function update({actor,tool=null,action=null,target=null,phase=0,transfer=null,paused=false}={}){
  if(disposed)return;held=tool;water.visible=action==='water'&&!paused;clippings.visible=action==='prune'&&!paused;streamTarget=water.visible?target.slice():null;gripError=0;
  can.position.copy(rackCan);can.rotation.set(0,Math.PI/2,0);shears.position.copy(rackShears);shears.rotation.set(Math.PI/2,0,0);
  if(actor){actor.root.updateWorldMatrix(true,true);actor.root.userData.hands[0].getWorldPosition(handL);actor.root.userData.hands[1].getWorldPosition(handR);
   if(tool==='can'||transfer?.tool==='can'){
    const amount=transfer?(transfer.pickup?transfer.ratio:1-transfer.ratio):1;can.position.lerp(handR,amount);can.rotation.set(0,actor.root.rotation.y,0);can.rotateX(action==='water'&&!paused?.42+Math.sin(phase*.9)*.035:0);
    if(!transfer)gripError=can.position.distanceTo(handR);
   }
   if(tool==='shears'||transfer?.tool==='shears'){
    const amount=transfer?(transfer.pickup?transfer.ratio:1-transfer.ratio):1;
    if(action==='prune'&&!paused){shears.position.copy(handL).add(handR).multiplyScalar(.5);w.set(...target).sub(shears.position).normalize();shears.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),w);shears.updateWorldMatrix(true,false);w.copy(handL);shears.worldToLocal(w);const left=w.clone();w.copy(handR);shears.worldToLocal(w);const right=w.clone();fit(grips[0],left,new T.Vector3(0,0,.26));fit(grips[1],right,new T.Vector3(0,0,.26));}
    else{shears.position.lerp(handR,amount);shears.rotation.set(0,actor.root.rotation.y,0);fit(grips[0],new T.Vector3(-.04,0,0),new T.Vector3(0,0,.26));fit(grips[1],new T.Vector3(.04,0,0),new T.Vector3(0,0,.26));}
   }
  }
  const spread=action==='prune'&&!paused?.04+(Math.sin(phase*5)+1)*.20:.025;
  for(let i=0;i<2;i++){blades[i].rotation.y=(i?1:-1)*spread;blades[i].position.x=(i?1:-1)*(.016+Math.sin(spread)*.17);}
  shears.updateWorldMatrix(true,false);bladeTip.set(0,0,.61).applyMatrix4(shears.matrixWorld);
  if(water.visible){can.updateWorldMatrix(true,true);spout.getWorldPosition(tip);for(let i=0;i<streams.length;i++){const angle=i*Math.PI/3;w.set(target[0]+Math.cos(angle)*.065,target[1],target[2]+Math.sin(angle)*.065);fit(streams[i],tip,w);}}
  if(clippings.visible)for(let i=0;i<leaves.length;i++){const f=(phase*1.2+i/5)%1;leaves[i].position.set(target[0]-.06-f*.12,target[1]-.45*f*f,target[2]+(i-2)*.036+Math.sin(i)*f*.10);leaves[i].rotation.set(f*4,i,f*6);}
 }
 update();
 return {update,state:()=>({held,canPosition:can.position.toArray(),shearsPosition:shears.position.toArray(),waterVisible:water.visible,clippingsVisible:clippings.visible,streamTarget,spoutPosition:tip.toArray(),bladeTipPosition:bladeTip.toArray(),gripError}),
  dispose(){if(disposed)return;disposed=true;root.traverse(o=>o.geometry?.dispose());root.removeFromParent();}};
}
