// Exercise the actual China controllers and closed HUD with full reads counted.
// No 3D scene, renderer or device-performance claim is involved.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,context,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,context);}});
const load=name=>import('../source/game/'+name+'.js');
const {createFormalCareers,COURT_CLERK_ROLE:CLERK,CLINIC_PHYSICIAN_ROLE}=await load('formal-careers');
const {createChinaCourtCareer}=await load('china-court-career');
const {createChinaRoyalKitchenEmployment}=await load('china-royal-kitchen-employment');
const {createChinaClinicEmployment}=await load('china-clinic-employment');
const {createChinaGuardEmployment}=await load('china-guard-employment');
const {createChinaSalonEmployment}=await load('china-salon-employment');
const {createChinaTavernService}=await load('china-tavern-service');
const {createChinaTavernLabor}=await load('china-tavern-labor');
const {createCareerHandbook}=await load('career-handbook');
const element=tag=>({tag,children:[],attributes:{},style:{},textContent:'',open:false,hidden:false,setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const document=()=>({head:element('head'),body:element('body'),createElement:element});
for(const mode of ['unemployed','pending','employed','resigned','invalid']){
  const clock={day:1,hour:8,seconds:0},getClock=()=>clock,getPlayer=()=>({ageYears:22,root:{position:{x:0,y:0,z:0,toArray:()=>[0,0,0]}}});
  let writes=0;const options={worldSeed:785,getClock,saveState:()=>{writes++;}};
  const seed=createFormalCareers(options).state();delete seed.loadError;delete seed.lastError;seed.skills.ritual=seed.skills.writing=2;
  const base=createFormalCareers({...options,saved:mode==='invalid'?{version:10}:seed});
  if(['pending','employed','resigned'].includes(mode)){
    assert(base.apply(CLERK.id,{ageYears:22}).ok);
    if(mode!=='pending'){
      const applicationId=base.applicationResult().id;
      for(const step of ['interview','receive-document','appointment'])assert(base.reviewApplication(CLERK.id,{ageYears:22,applicationId,step}).ok);
      if(mode==='resigned')assert(base.resign().ok);
    }
  }
  let fullReads=0,workReads=0;const careers={...base,state:()=>{fullReads++;return base.state();},workState:()=>{workReads++;return base.workState();}};
  const shared={careers,getClock,getPlayer,document:null},bank={state:()=>({cash:0}),loadError:null};
  const court=createChinaCourtCareer({...shared,audience:{state:()=>({phase:'idle',schedule:{day:1,outcome:'in-session'}})}});
  const kitchen=createChinaRoyalKitchenEmployment({...shared,kitchen:{registry:[0,0,0],workLabel:()=>null}});
  const clinic=createChinaClinicEmployment({...shared,clinic:{}}),physician=createChinaClinicEmployment({...shared,clinic:{},role:CLINIC_PHYSICIAN_ROLE});
  const guard=createChinaGuardEmployment({...shared,archery:{guardWorkState:()=>null}});
  const salon=createChinaSalonEmployment({...shared,salon:{},scene:{},npcs:[],getAppearanceScore:()=>50});
  const tavern=createChinaTavernService({...shared,meal:{staffScene:{snapshot:()=>({chefServiceReceipts:[]})}}});
  const labor=createChinaTavernLabor({...shared,copperLedger:bank,document:document()});
  const services={'cn-court-clerk':court,'cn-royal-kitchen-cook':kitchen,'cn-pharmacy-apprentice':clinic,'cn-clinic-physician':physician,'cn-palace-guard':guard,'cn-salon-poet':salon,'cn-tavern-steward':tavern,'cn-tavern-chef':tavern};
  const hud=createCareerHandbook({...shared,copperLedger:bank,getCountry:()=> 'china',getService:id=>services[id],document:document(),walletFactory:()=>({close(){},dispose(){}})});
  const before=base.state(),beforeWrites=writes;fullReads=workReads=0;
  for(let step=0;step<60;step++){
    court.intent();court.intent('view');court.update(1/60);
    for(const controller of [kitchen,clinic,physician,guard,salon,tavern,labor])controller.intent();
    labor.update(1/60);hud.update('lot');
  }
  assert.equal(fullReads,0,mode+': idle controllers and closed panels cannot copy complete histories');assert(workReads>0);
  assert.equal(writes,beforeWrites);assert.deepEqual(base.state(),before,mode+': repeated reads do not change duty, decisions, errors or payroll');
  labor.view();assert.equal(fullReads,0,'cleaning HUD and legacy-job view stay bounded');
  assert.deepEqual(labor.state().formalState,base.state(),'explicit labor diagnostics keep complete careers');assert.equal(fullReads,1);
  hud.open({roleId:CLERK.id,scope:'role'});assert(fullReads>1,'open handbook retains full history access');
  hud.close();fullReads=0;hud.update('lot');assert.equal(fullReads,0,'closing restores bounded reads');
  hud.dispose();labor.dispose();court.dispose();
}
// The production court busy hook is also called during active duty. Reading
// diagnostics here would reintroduce a full-history copy despite lean adapters.
const main=readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const hook=main.match(/function configureChinaCareer\(\)[^\n]+/)[0].match(/getBusy:(.*?),canSee:/)[1];
let cleaning=false;
const busy=new Function('seated','bathTransition','performing','npcSocial','chinaSalon','chinaLabor','return '+hook)(null,null,null,null,null,{isCleaning:()=>cleaning,state:()=>{throw Error('busy checks must not copy career diagnostics');}});
assert.equal(busy(),false);cleaning=true;assert.equal(busy(),true);cleaning=false;assert.equal(busy(),false);
console.log('PASS real China work readers and closed handbook/labor panels: 60 repeated steps per no-job/pending/employed/resigned/invalid state, zero full reads, unchanged state/writes, full open-panel/diagnostic compatibility and production court busy hook');
