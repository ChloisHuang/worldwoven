import {THREE} from './geometry.js?rev=R7-20261002';
import {createWeatherCharmHook} from './japan-weather-charms.js';

const count=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000):0;
// Two authored hooks only. This adapter never owns weather, employee choices,
// inventory or money. A carried charm is temporarily put away during activities
// that already need both hands, then shown again when the player resumes walking.
export function createJapanWeatherCharmService({lot,getPlayer,getBusy=()=>false,saved={},saveState=()=>{},notify=()=>{}}) {
  const points=lot.weatherCharmPoints||[],root=new THREE.Group(),carryAnchor=new THREE.Group();
  root.name='Japan weather charms · two reachable window hooks';root.userData.noStaticBatch=true;lot.group.add(root);root.add(carryAnchor);
  const items=points.map(p=>{const hook=createWeatherCharmHook({kind:p.kind,height:p.height,phase:p.kind==='fair'?.6:1.5});
    hook.group.position.fromArray(p.position);hook.group.rotation.y=p.yaw||0;root.add(hook.group);return {...p,hook};});
  let carried=items.find(p=>p.id===saved?.carriedId)||null,disposed=false;
  const uses=Object.fromEntries(items.map(p=>[p.id,{picked:count(saved?.uses?.[p.id]?.picked),hung:count(saved?.uses?.[p.id]?.hung)}]));
  const snapshot=()=>({version:1,carriedId:carried?.id||null,uses:JSON.parse(JSON.stringify(uses))});
  function checkpoint(){saveState(snapshot());}
  if(carried){const feet=new THREE.Vector3(...carried.approach);carried.hook.take(carryAnchor,feet);}
  const handPoint=new THREE.Vector3(),handOffset=new THREE.Vector3(-.010,-.066,.014),authoredPoint=new THREE.Vector3(),handRotation=new THREE.Quaternion(),forward=new THREE.Vector3(),delta=new THREE.Vector3();
  function reachable(item) {
    const actor=getPlayer();if(!actor||disposed||getBusy())return false;
    const p=actor.root.position;if(Math.abs(p.y-item.approach[1])>.35||!item.hook.canReach(p))return false;
    // A nearby actor behind the facade cannot take a doll through the wall.
    item.hook.group.getWorldDirection(forward);item.hook.mount.getWorldPosition(delta);delta.sub(p);
    return delta.dot(forward)<-.12;
  }
  function target() {
    let best=null,distance=Infinity;
    for(const item of items){if(carried&&item!==carried||!reachable(item))continue;
      const p=getPlayer().root.position,d=Math.hypot(p.x-item.position[0],p.z-item.position[2]);
      if(d<distance){distance=d;best={id:item.id,name:item.name,action:carried?'挂回窗边':item.kind==='fair'?'拿起晴天娃娃':'拿起雨天挂偶',
        weatherCharm:true,visualAnchor:{id:item.id,point:[item.position[0],item.position[1]+item.height,item.position[2]]},position:item.approach.slice(),distance};}}
    return best;
  }
  function interact(id) {
    const item=items.find(p=>p.id===id);if(!item||!reachable(item))return false;
    if(carried){if(item!==carried||!item.hook.hang(getPlayer().root.position))return false;uses[item.id].hung++;item.hook.charm.group.visible=true;carried=null;
      notify('挂回窗边了，让小挂偶随风轻轻摇摆');}
    else{if(!item.hook.take(carryAnchor,getPlayer().root.position))return false;carried=item;uses[item.id].picked++;
      notify(item.kind==='fair'?'拿起了晴天娃娃，把小小的祈晴心愿握在手里。忙别的事时会暂时收好':
        '拿起了蓝灰雨天挂偶：这是汤馆的幻想设计。忙别的事时会暂时收好');}
    checkpoint();return true;
  }
  function update(time) {
    if(disposed)return;for(const item of items)item.hook.update(time,.65);
    if(!carried)return;const actor=getPlayer(),hand=actor?.root.userData.hands?.[0],visible=!!hand&&!getBusy();
    carried.hook.charm.group.visible=visible;if(!visible)return;
    // Reuse the existing actual left-hand carrying pose, replacing its towel
    // visually. The anchor stays outside the avatar so wardrobe rebuilds cannot
    // dispose or strand the carried doll; no character rig code is modified.
    if(actor.root.userData.tools?.cloth)actor.root.userData.tools.cloth.visible=false;
    actor.root.updateMatrixWorld(true);handPoint.copy(handOffset);const pose=actor.getAuthoredHandPose?.(0);
    if(pose){handPoint.applyQuaternion(handRotation.fromArray(pose.quaternion)).add(authoredPoint.fromArray(pose.position));actor.root.userData.body.localToWorld(handPoint);}else hand.localToWorld(handPoint);
    root.worldToLocal(handPoint);carryAnchor.position.copy(handPoint);carryAnchor.quaternion.copy(actor.root.quaternion);
    // The cord begins at the carried anchor. Fit the real thumb to that same
    // point after positioning it, rather than dragging the doll with the wrist.
    if(actor.fitExternalHandGrip){root.localToWorld(handPoint);actor.root.userData.body.worldToLocal(handPoint);actor.fitExternalHandGrip({side:0,target:handPoint.toArray()});}
  }
  return {target,interact,update,
    pose:()=>!disposed&&carried&&!getBusy()?{heldProp:'cloth'}:null,
    label:()=>carried&&!getBusy()?`手持${carried.name} · 可回窗边挂回`:null,
    state:()=>({...snapshot(),hooks:items.map(p=>({id:p.id,kind:p.kind,state:p.hook.state,position:p.position.slice(),approach:p.approach.slice(),height:p.height,visible:p.hook.charm.group.visible}))}),
    dispose(){if(disposed)return;disposed=true;checkpoint();for(const item of items)item.hook.dispose();root.removeFromParent();},
  };
}
