import assert from 'node:assert/strict';
import {createCrimeConsequences} from '../source/game/crime-consequences.js';
import {createChinaCriminalCaseRuntime,CHINA_JUSTICE_DESK} from '../source/game/china-criminal-case-runtime.js';
const vec=a=>({x:a[0],y:a[1],z:a[2],toArray(){return [this.x,this.y,this.z];}});
const body=(id,p=[0,0,0])=>({station:{id},alive:true,root:{position:vec(p)}});
function fixture(saved){
 const p=body('player'),j=body('cn-official-justice',[1,0,0]),w=body('witness',[0,0,1]);let held=null,busy=false,saveOK=true,disk=saved,opened=0,see=true;
 const subjects=[{id:'suspect',key:'suspect@original',position:vec([0,0,0]),countryId:'china',sceneId:'china'},...['witness','other'].map(id=>({id,key:id+'@original',position:vec([0,0,1]),countryId:'china',sceneId:'china'}))];
 const guard={id:'guard',key:'guard@original',position:vec([1,0,0]),countryId:'china',sceneId:'china'};
 const engine=createCrimeConsequences({actors:()=>subjects,guards:()=>[guard],items:[{id:'token',ownerId:'owner',countryId:'china',position:vec([0,0,0])}],hasLineOfSight:()=>true,persist:()=>true});
 assert(engine.take('suspect@original','token').ok);const id=engine.snapshot().cases[0].id;assert(engine.report('witness@original',id).ok);assert(engine.report('other@original',id).ok);
 const actors=[p,j,w],notices=[];
 const options={saved,persist:s=>{if(!saveOK)return false;disk=structuredClone(s);return true;},getCrime:()=>engine.snapshot(),getPlayer:()=>p,getActors:()=>actors,standing:()=>!p.walking,getBusy:()=>busy,
  canSee:()=>see,getMeetingPoint:n=>[n.root.position.x+.7,n.root.position.y,n.root.position.z],canMeet:n=>!n.busy,
  requestMeeting:(n,o)=>{if(held)return false;held={n,o};return true;},meetingHeld:(n,o)=>held?.n===n&&held.o===o,releaseMeeting:()=>{held=null;},stopPlayer:()=>{p.walking=false;},openPanel:()=>opened++,notify:s=>notices.push(s)};
 let rt=createChinaCriminalCaseRuntime(options);
 const at=intent=>{p.root.position=vec(intent.position);};
 const start=()=>{const next=rt.intent(id);assert(next,'next physical intent');at(next);assert(rt.executeIntent(next),next.kind);return next;};
 const finish=()=>{for(let i=0;i<21;i++)rt.update(.1);};
 return {p,j,w,actors,engine,id,get rt(){return rt;},start,finish,at,notices,get disk(){return disk;},get held(){return held;},get opened(){return opened;},setBusy:x=>busy=x,setSave:x=>saveOK=x,setSee:x=>see=x,reload(){rt.dispose();rt=createChinaCriminalCaseRuntime({...options,saved:disk});}};
}
{
 const f=fixture();f.at(f.rt.intent());assert(f.rt.executeIntent(f.rt.intent()));assert.equal(f.opened,1);const original=f.engine.snapshot();
 for(const stage of ['intake','scene','witness','review','archive']){assert.equal(f.rt.core.view(f.id).stage,stage);f.start();for(let i=0;i<19;i++)f.rt.update(.1);assert.equal(f.rt.core.view(f.id).stage,stage,'partial read is not completion');f.rt.update(.1);assert.notEqual(f.rt.core.view(f.id).stage,stage);assert.equal(f.held,null);f.reload();}
 assert.equal(f.rt.core.view(f.id).stage,'archived');assert.equal(f.rt.core.view(f.id).outcome.code,'reviewed-referral');assert.deepEqual(f.engine.snapshot(),original,'no second police/custody mutation');assert.equal(f.rt.intent(f.id),null);f.rt.dispose();
}
{
 const f=fixture();const next=f.start();f.rt.update(.7);assert(f.rt.state().activity.elapsed<=.1,'no offline time catchup');f.rt.cancel();assert.equal(f.rt.core.view(f.id).stage,'intake');assert.equal(f.held,null);
 f.start();f.p.root.position.x+=.3;f.rt.update(.1);assert(!f.rt.isActing());assert.equal(f.held,null);
 f.start();f.setBusy(true);f.rt.update(.1);assert(!f.rt.isActing());f.setBusy(false);
 f.start();f.j.lifeId='replacement';f.rt.update(.1);assert(!f.rt.isActing(),'same object replacement lifetime cancels');delete f.j.lifeId;
 f.start();f.setSave(false);f.finish();assert.equal(f.rt.core.view(f.id).stage,'intake');assert.equal(f.disk,undefined);f.setSave(true);f.start();f.finish();assert.equal(f.rt.core.view(f.id).stage,'scene');assert.equal(f.rt.executeIntent(next),false,'old click cannot replay commission');f.reload();assert.equal(f.rt.core.view(f.id).stage,'scene');f.rt.dispose();
}
{
 const f=fixture();f.start();f.finish();f.start();f.finish();f.w.busy=true;let next=f.rt.intent(f.id);assert(next.action.includes('原证言'));f.start();f.finish();f.start();f.finish();f.start();f.finish();assert.equal(f.rt.core.view(f.id).outcome.code,'insufficient-evidence');assert.equal(f.rt.core.view(f.id).outcome.recordedStatement,true);f.rt.dispose();
}
{
 const f=fixture();f.start();f.finish();f.start();f.finish();f.start();f.w.lifeId='replacement';f.rt.update(.1);assert(!f.rt.isActing());assert.equal(f.rt.core.view(f.id).stage,'witness');assert(f.rt.intent(f.id).action.includes('原证言'),'same name replacement cannot testify as original witness');f.rt.dispose();
}
{const f=fixture();f.j.lifeId='replacement';assert.equal(f.rt.intent(f.id),null,'replacement actor cannot become original Zhou');f.rt.dispose();}
{const f=fixture();f.start();for(let i=0;i<120;i++)f.rt.update(1/60);assert.equal(f.rt.core.view(f.id).stage,'scene','60Hz rounding retains full-duration proof');f.rt.dispose();}
{const f=fixture();const next=f.rt.intent(f.id);assert(f.rt.prepareIntent(next));assert(f.held,'original NPC reserved during approach');assert(!f.rt.isActing());f.rt.cancel();assert.equal(f.held,null);assert.equal(f.rt.core.view(f.id).stage,'intake');f.rt.dispose();}
console.log('PASS criminal case physical adapter: five stages, actual elapsed, same-life interviews, limited paper source, interrupt, cold resume, refusal and no source mutation');
