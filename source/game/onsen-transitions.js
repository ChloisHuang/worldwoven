// A reversible crossing of the authored east coping. Progress always describes
// bank -> rim support -> legs over the rim -> the existing supported bath pose.
// Reservations belong to the caller until the actor has physically left.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const span=(p,a,b)=>smooth((p-a)/(b-a));
const mix=(a,b,t)=>a+(b-a)*t;
const turn=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function createOnsenTransition({item,position,yaw,direction='enter',landing,saved}) {
 if(!item?.bathEntry)return null;
 if(saved&&(!Array.isArray(saved.bank)||saved.bank.length!==3||!saved.bank.every(Number.isFinite)||!Number.isFinite(saved.bankYaw)||!Number.isFinite(saved.progress)))return null;
 if(saved?.seatId===item.id){direction=saved.direction==='exit'?'exit':'enter';landing=saved.bank;yaw=saved.bankYaw;}
 const bank=(landing?.toArray?.()||landing||position?.toArray?.()||position||item.position).slice();
 const entry=item.bathEntry,seat=item.anchor,away=item.yaw+Math.PI;
 const bankYaw=direction==='enter'?yaw:away;
 let progress=direction==='enter'?0:1,velocity=direction==='enter'?1:-1,done=false;
 if(saved?.seatId===item.id&&Number.isFinite(saved.progress)){progress=clamp(saved.progress);done=velocity<0?progress===0:progress===1;}
 function sample(){
  const p=progress,approach=span(p,.14,.27),sit=span(p,.27,.38),cross=span(p,.42,.73),inward=span(p,.73,.85),seatBlend=span(p,.85,1);
  const bankX=mix(bank[0],entry.east+.37,approach),x=mix(mix(bankX,mix(entry.east+.26,entry.east+.025,span(p,.56,.73)),sit),seat[0],inward),z=mix(bank[2],seat[2],span(p,0,.27));
  const angle=p<.42?turn(bankYaw,away,span(p,0,.14)):away-Math.PI*cross;
  const feet=[0,1].map(side=>{
   const sign=side?1:-1,startAngle=turn(bankYaw,away,span(p,0,.14)),swing=span(p,side?.57:.43,side?.73:.60),theta=away-Math.PI*swing;
   const start=[bankX+Math.sin(startAngle)*-.025+Math.cos(startAngle)*sign*.10,bank[1]+.108,bank[2]+Math.cos(startAngle)*-.025-Math.sin(startAngle)*sign*.10];
   const tucked=[entry.east+Math.sin(theta)*.44+Math.cos(theta)*sign*.13,entry.top+.15,seat[2]+Math.cos(theta)*.44-Math.sin(theta)*sign*.13];
   const lift=span(p,side?.49:.36,side?.56:.43);
   return start.map((v,i)=>mix(v,tucked[i],lift));
  });
  return {progress:p,phase:p<.14?'turn':p<.38?'rim-support':p<.73?'legs-over-rim':p<.85?'over-seat':'lower-to-seat',position:[x,bank[1],z],yaw:angle,hipY:mix(bank[1]+.965,entry.top+.16,sit),feet,hands:[0,1].map(side=>{const sign=side?1:-1;return [mix(Math.max(entry.east-.105,Math.min(entry.east+.105,x-Math.sin(angle)*.23+Math.cos(angle)*sign*.17)),entry.east-.34,inward),mix((entry.handY??entry.top-.017)+.029,entry.top+.20,inward),z-Math.cos(angle)*.23-Math.sin(angle)*sign*.19];}),handWeight:span(p,.18,.38),seatBlend};
 }
 return {
  item,
  sample,
  snapshot(){return {seatId:item.id,bank:bank.slice(),bankYaw,direction:velocity<0?'exit':'enter',progress};},
  update(dt){if(!done){progress=clamp(progress+velocity*Math.min(.1,Math.max(0,dt))/4.8);done=velocity<0?progress===0:progress===1;}return sample();},
  // Repeated E/movement is idempotent. Reverse the same checked corridor and
  // keep ownership until the bank endpoint; never snap a crossing to a seat.
  requestExit(){velocity=-1;done=progress===0;},
  get done(){return done;},
  get endpoint(){return done?(velocity<0?'bank':'seat'):null;},
  state(){return {direction:velocity<0?'exit':'enter',...sample(),seatId:item.id};},
 };
}
