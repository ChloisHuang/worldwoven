// The royal life controller must release its previous route on arrival, as
// the officials do. Otherwise every authored stair landing waits for a false
// four-second obstruction timeout before the next legitimate leg is planned.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../source/game/china-palace-life.js',import.meta.url),'utf8');
const start=source.indexOf(' function travel(n,s,to,dt){'),end=source.indexOf('\n function interrupted(',start);
assert(start>=0&&end>start);
let plans=0,time=0;
const actor={root:{position:{x:0,y:0,z:0}},route:[],walking:false,station:{id:'cn-emperor'}};
const state={planned:false,stalled:0,retries:0},targets=[[1,0,0],[1,0,1],[2,0,1]],failures=[];
const travel=new Function('near','point','planPath','followActorRoute','doors','moveActor','npcs','playerState','scripts','failures',source.slice(start,end)+'\nreturn travel;')(
  (p,a)=>Math.hypot(p.x-a[0],p.z-a[2])<.065&&Math.abs(p.y-a[1])<.32,
  a=>({x:a[0],y:a[1],z:a[2]}),
  (_from,to)=>{plans++;return[{...to}];},
  (n,dt)=>{while(n.route.length&&Math.hypot(n.root.position.x-n.route[0].x,n.root.position.z-n.route[0].z)<.025)n.route.shift();const p=n.route[0];n.walking=false;if(!p)return{waiting:false};const dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz),amount=Math.min(d,dt*1.44);n.root.position.x+=dx/d*amount;n.root.position.z+=dz/d*amount;n.walking=true;return{waiting:false};},
  {},()=>{},[actor],{position:null},new Map([[actor,[{id:'duty-public-stairs'}]]]),failures);
for(const target of targets){
  const beforePlans=plans;let arrived=false;
  for(let step=0;step<90&&!arrived;step++){arrived=travel(actor,state,target,1/30);time+=1/30;}
  assert(arrived,'each short authored leg must complete without an obstruction timeout');
  assert.equal(plans,beforePlans+1,'exactly one route is planned for each authored leg');
  assert.equal(state.planned,false,'arrival after movement must release the previous plan immediately');
  assert.equal(actor.route.length,0,'a completed route cannot delay its successor');
}
assert(time<2.5);assert.equal(failures.length,0);
console.log('PASS: royal stair/ceremony waypoint handoff clears plans immediately, without false four-second waits');
