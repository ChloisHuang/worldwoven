/** External Japan props must retain the 411aef4 authored trajectories while
 * the repaired, production hands contact their actual surfaces. CPU geometry
 * evidence only; normal-play visual inspection remains a separate acceptance. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const source=path.resolve('source');
async function runtime(base=false){
 const cache=new Map(),overrides=new Set(['game/characters.js','game/japan-performance-props.js','game/japan-weather-charm-service.js']);
 function mod(file){file=path.resolve(file.split('?')[0]);if(!cache.has(file)){const relative=path.relative(source,file),code=base&&overrides.has(relative)?execFileSync('git',['show','411aef4:source/'+relative],{encoding:'utf8'}):fs.readFileSync(file,'utf8');cache.set(file,new vm.SourceTextModule(code,{identifier:file}));}return cache.get(file);}
 const link=(name,parent)=>mod(name==='three'?source+'/vendor/three/build/three.module.js':path.resolve(path.dirname(parent.identifier),name));
 async function load(name){const m=mod(source+'/'+name);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
 await load('game/character-live-entry.js');
 return {C:await load('game/characters.js'),T:await load('vendor/three/build/three.module.js'),P:await load('game/japan-performance-props.js'),W:await load('game/japan-weather-charm-service.js')};
}
const current=await runtime(),base=await runtime(true),V=(...a)=>new current.T.Vector3(...a),report={samples:0,maxTrajectoryGap:0,maxThumbGap:0,maxPalmGap:0};
function update(actor){actor.root.updateWorldMatrix(true,true);actor.root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});}
function gapToSkin(actor,side,target,support=false){update(actor);const skin=actor.root.getObjectByName('approved-face-skin'),g=skin.geometry,name=(support?'relaxed-palm-':'thumb-')+(side?1:-1),range=g.userData.sourceRanges.find(r=>r.name===name);let gap=Infinity;
 for(let i=range.start;i<range.start+range.count;i++)gap=Math.min(gap,skin.getVertexPosition(i,V()).applyMatrix4(skin.matrixWorld).distanceTo(target));return gap;
}
function compare(a,b,label){const gap=a.getWorldPosition(V()).distanceTo(b.getWorldPosition(V()));report.maxTrajectoryGap=Math.max(report.maxTrajectoryGap,gap);assert(gap<1e-7,label+' trajectory '+gap);assert(a.getWorldQuaternion(new current.T.Quaternion()).angleTo(b.getWorldQuaternion(new current.T.Quaternion()))<1e-6,label+' orientation');report.samples++;}
function contact(actor,side,point,support,label){const gap=gapToSkin(actor,side,point,support);report[support?'maxPalmGap':'maxThumbGap']=Math.max(report[support?'maxPalmGap':'maxThumbGap'],gap);assert(gap<.008,label+' actual skin contact '+gap);}
function release(actor,time=4){actor.animate(time,false,null);update(actor);const skin=actor.root.getObjectByName('approved-face-skin');assert(skin.morphTargetInfluences.every(n=>n===0),'release restores open fingers');for(const hand of actor.root.userData.hands)assert(V(0,-1,0).angleTo(V(0,-1,0).applyQuaternion(hand.quaternion))<Math.PI/4,'release restores natural wrist');}
for(const bodyPreset of ['feminine-balanced','masculine-broad']){
 const make=(R)=>{const scene=new R.T.Group(),actors=Array.from({length:3},()=>R.C.createCharacter({culture:'japan',bodyPreset,wardrobePreset:bodyPreset.startsWith('masculine')?'haori-trouser':'kimono-soft-sleeve'}));actors.forEach((a,i)=>{scene.add(a.root);a.root.position.set(2+i*1.3,.4,3);a.root.rotation.y=.7;a.walking=false;});const props=R.P.createJapanPerformanceProps(scene);return {scene,actors,props,fan:scene.getObjectByName('Original vermilion folding dance fan'),tray:scene.getObjectByName('Reserved drink tray'),cup:scene.getObjectByName('One reserved ceramic drink')};};
 const a=make(current),b=make(base);
 for(const t of[0,.8,2.1])for(const mode of['dance','carrying','serving','drinking']){
  const o={id:'unchanged-order',activity:'dance',status:mode==='dance'?'performing':'drinking',drink:mode!=='dance',paid:true,drinkStatus:mode};
  for(const set of[a,b]){const [server,artist,player]=set.actors;server.walking=mode==='carrying';const wave=Math.sin(t*1.4),sip=(Math.sin(t*1.15)+1)*.5;
   artist.animate(t,false,null,{archery:{hands:[[-.24,1.08,.22],[.38+wave*.08,1.40+wave*.20,.18]]}});
   server.animate(t,server.walking,server.walking?null:'tea',mode==='carrying'?{archery:{hands:[[-.18,1.02,.32],[.18,1.02,.32]]}}:{});
   player.animate(t,false,'chair-sit',{seatHeight:.63,handoff:true,archery:{hands:[[-.18,.72,.25],[.10,.94+sip*.20,.30-sip*.13]]}});
   set.props.update(o,{server,artist,player},t);set.scene.updateMatrixWorld(true);
  }
  if(mode==='dance'){compare(a.fan,b.fan,bodyPreset+'/'+mode);contact(a.actors[1],1,a.fan.localToWorld(V(0,.008,.0129)),false,bodyPreset+'/'+mode+'/'+t);}
  else {compare(a.tray,b.tray,bodyPreset+'/'+mode+'/tray');compare(a.cup,b.cup,bodyPreset+'/'+mode+'/cup');assert.equal(a.props.state().orderId,o.id);assert.equal(a.cup.userData.orderId,o.id);
   if(mode==='drinking'){const point=V(.0634,.07,0).applyQuaternion(a.actors[2].root.quaternion).add(a.cup.position);a.cup.parent.localToWorld(point);contact(a.actors[2],1,point,false,bodyPreset+'/'+mode+'/'+t);}
   else {for(const side of[0,1]){const actor=a.actors[0],skin=actor.root.getObjectByName('approved-face-skin'),g=skin.geometry,r=g.userData.sourceRanges.find(r=>r.name==='relaxed-palm-'+(side?1:-1));let gap=Infinity;update(actor);
     for(let i=r.start;i<r.start+r.count;i++){const p=a.tray.worldToLocal(skin.getVertexPosition(i,V()).applyMatrix4(skin.matrixWorld));if(Math.hypot(p.x,p.z)<.22)gap=Math.min(gap,Math.abs(p.y));}report.maxPalmGap=Math.max(report.maxPalmGap,gap);assert(gap<.008,mode+' tray bottom actual palm '+gap);
   }}
  }
 }
 a.props.clearOrder();assert(!a.fan.visible&&!a.cup.visible&&!a.tray.visible);for(const actor of a.actors)release(actor);
 for(const set of[a,b]){set.props.dispose();for(const actor of set.actors)actor.dispose();}
 const charmSet=(R,saved={})=>{let actor=R.C.createCharacter({culture:'japan',bodyPreset});const group=new R.T.Group();actor.root.position.set(0,0,.6);actor.root.rotation.y=.7;group.add(actor.root);let busy=false;
  const point={id:'fair-test',kind:'fair',name:'test charm',height:1.65,position:[0,0,0],approach:[0,0,.6]},service=R.W.createJapanWeatherCharmService({lot:{group,weatherCharmPoints:[point]},getPlayer:()=>actor,getBusy:()=>busy,saved});if(!saved.carriedId)assert(service.interact(point.id));let charm;group.traverse(o=>{if(o.userData.weatherCharm)charm=o;});return {get actor(){return actor;},group,service,charm,busy(value){busy=value;},rebuild(){const old=actor;actor=R.C.createCharacter({culture:'japan',bodyPreset,wardrobePreset:bodyPreset.startsWith('masculine')?'haori-trouser':'kimono-soft-sleeve'});actor.root.position.copy(old.root.position);actor.root.quaternion.copy(old.root.quaternion);old.root.removeFromParent();old.dispose();group.add(actor.root);}};};
 const x=charmSet(current),y=charmSet(base);
 for(const t of[0,.8,2.1])for(const walking of[false,true]){for(const set of[x,y]){set.actor.root.position.x+=walking?.005:0;set.actor.animate(t,walking,null,set.service.pose());set.service.update(t);set.group.updateMatrixWorld(true);}compare(x.charm,y.charm,bodyPreset+'/charm');contact(x.actor,0,x.charm.getWorldPosition(V()),false,'cord origin');}
 const id=x.service.state().carriedId;x.busy(true);x.actor.animate(3,false,null);x.service.update(3);assert(!x.charm.visible);release(x.actor);x.busy(false);x.actor.animate(3.1,false,null,x.service.pose());x.service.update(3.1);assert(x.charm.visible&&x.service.state().carriedId===id);contact(x.actor,0,x.charm.getWorldPosition(V()),false,'restored cord');x.rebuild();x.actor.animate(3.2,false,null,x.service.pose());x.service.update(3.2);assert.equal(x.service.state().carriedId,id);contact(x.actor,0,x.charm.getWorldPosition(V()),false,'rebuilt avatar cord');
 const saved=x.service.state(),restored=charmSet(current,saved);restored.actor.animate(3.3,false,null,restored.service.pose());restored.service.update(3.3);assert.equal(restored.service.state().carriedId,id);assert.deepEqual(restored.service.state().uses,saved.uses);contact(restored.actor,0,restored.charm.getWorldPosition(V()),false,'reloaded cord');assert(restored.service.interact(id));restored.service.dispose();restored.actor.dispose();
 assert(x.service.interact(id));assert.equal(x.service.state().carriedId,null);release(x.actor);x.service.update(4);assert.equal(x.service.state().hooks[0].state,'hanging');
 for(const set of[x,y]){set.service.dispose();set.actor.dispose();}
}
assert.equal(current.C.characterResourceStats().activeReferences,0);assert.equal(base.C.characterResourceStats().activeReferences,0);
console.log(JSON.stringify({status:'PASS',...report,scope:'Production Japanese dance fan, carrying/serving tray, seated drinking cup and walking/resting carried charm; exact 411aef4 prop trajectories/orientations; actual skin contact; release, busy stow/restore, avatar rebuild, saved reload, rehang and disposal'},null,2));
