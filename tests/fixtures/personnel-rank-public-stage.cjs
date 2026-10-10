// Explicit segmented endpoint fixture. Royal bodies/positions/controller come
// from the committed actual public-emperor checkpoint, never invented actors.
module.exports=async function({prior,retry,mod,linker,root,assert}){
 const fs=require('node:fs'),path=require('node:path'),copy=x=>JSON.parse(JSON.stringify(x));
 const actual=JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/personnel-main-checkpoint.json'),'utf8')).save;
 const old=prior.worldContinuity.regions.china,world=actual.worldContinuity.regions.china;
 for(const key of ['formalCareers','copperLedger','simulationClock','chinaAudience','chinaPersonnelCareer','chinaPersonnelAppointment'])actual[key]=copy(prior[key]);
 for(const key of ['chinaCareer','chinaPersonnelCareer','chinaPersonnelAppointment','chinaAudience'])world.controllers[key]=copy(old.controllers[key]);
 world.activity={target:null,pending:null,performing:null,actionTime:0,studyTicket:null,destination:null,seated:null,seatedBerthId:null,bathTransition:null};
 if(retry){
  const m=mod(path.join(root,'game/formal-careers.js'));if(m.status==='unlinked')await m.link(linker);if(m.status!=='evaluated')await m.evaluate();
  const clock={day:14,hour:14,seconds:(14*1440+14*60-600)/.7};actual.simulationClock={version:1,seconds:clock.seconds};
  const actor=id=>({actorId:id,bodyId:id,alive:true,position:world.actors[id].position});
  const career=m.namespace.createFormalCareers({saved:actual.formalCareers,worldSeed:actual.appearance.seed,getClock:()=>clock,enablePersonnelProgression:true,resolvePromotionActor:actor,saveState:s=>{actual.formalCareers=copy(s);return true;}});
  assert.equal(career.state().loadError,null);assert(career.observeDay().ok);assert(career.applyPromotion().ok);
  const app=career.promotionSummary().application,lu=actor('cn-official-personnel');
  const proof=(step)=>({applicationId:app.id,documentId:'appointment:'+app.id,actorId:'player',targetId:step==='interview'?lu.actorId:'cn-court-career-desk',position:step==='interview'?[lu.position[0]+.7,lu.position[1],lu.position[2]]:[21.5,.215,32.25],standing:true,clear:true,elapsed:step==='interview'?4:0,duration:step==='interview'?4:0,day:14,completedAt:clock.seconds,...(step==='interview'?{recipientPosition:lu.position,recipientBodyId:lu.bodyId,recipientAlive:true}:{})});
  for(const step of ['interview','receive-document'])assert(career.reviewPromotion({applicationId:app.id,step,proof:proof(step)}).ok);
  actual.chinaPersonnelAppointment={version:1,applicationId:app.id,activity:null};world.controllers.chinaPersonnelAppointment=copy(actual.chinaPersonnelAppointment);
  assert.equal(career.promotionSummary().application.imperialDecision,null);
 }
 return actual;
};
