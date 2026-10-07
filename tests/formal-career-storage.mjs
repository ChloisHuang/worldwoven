import {approvePending} from './fixtures/career-application.mjs';
// Exercise the exact new main constructors/save callbacks in the preview
// facade. This does not depend on the unavailable historical appearance SHA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {createGameStorage,PREVIEW_STORAGE_PREFIX} from '../source/game/game-storage.js';
import {createSimulationClock} from '../source/game/simulation-clock.js';
import {readWorldRegion} from '../source/game/world-continuity.js';
import {createFormalCareers} from '../source/game/formal-careers.js';
import {regionalTellerRole} from '../source/game/regional-teller-audit-proof.js';
import {PALACE_TEA_ROLE} from '../source/game/china-palace-tea-role.js';
import {ARCHIVE_ROLE} from '../source/game/china-archive-role.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const code=['simulationClock','copperLedger','creditWageToBank','formalCareers'].map(name=>main.split('\n').find(line=>line.startsWith(`const ${name}=`))).join('\n');
const initialize=new Function('saved','gameStorage','createSimulationClock','createGameCurrencyLedger','createFormalCareers','readWorldRegion','regionalTellerRole','PALACE_TEA_ROLE','ARCHIVE_ROLE',
// Mirror the actual main callback dependencies; no active unrelated service
// or political title is present in this isolated preview-storage fixture.
'const consortBridge=null,regionalTellerEmployment=null,chinaPieceworkEmployment=null,japanPerformanceEmployment=null,chinaSalon=null,playerSocialContext=null;const currentCourtRecruiter=()=>null,getNPCProfile=()=>null;const worldSnapshotWriter=null,chinaSalonEmployment=null,chinaLodging=null,tavernProperty=null,chinaAudience=null,franceGardener=null,chinaTavern=null;'+code+'\nreturn {careers:formalCareers,ledger:copperLedger,clock:simulationClock};');
const storage=()=>{const values=new Map();return{values,fail:false,getItem:k=>values.get(k)??null,setItem(k,v){if(this.fail)throw Error('quota');values.set(k,v);}};};
function fixture(){const normal=storage(),session=storage();normal.setItem('worlds-days-v1',JSON.stringify({appearance:{seed:785},visited:['china'],stamps:{},unrelated:'keep',copperLedger:{version:1,cash:17,bank:41,accountOpened:true,nextTransaction:1,transactions:[]}}));const before=[...normal.values];const facade=createGameStorage({preview:true,normal,session});const saved=JSON.parse(facade.getItem('worlds-days-v1'));saved.formalCareers=createFormalCareers({saveState:()=>{},getClock:()=>({day:0,hour:8,seconds:0})}).state();saved.formalCareers.skills.ritual=2;saved.formalCareers.skills.writing=2;const app=initialize(saved,facade,createSimulationClock,createGameCurrencyLedger,createFormalCareers,readWorldRegion,regionalTellerRole,PALACE_TEA_ROLE,ARCHIVE_ROLE);return{...app,saved,normal,session,before};}
const qualify=careers=>{for(const source of ['cn-rest','cn-calligraphy'])for(let n=0;n<2;n++){const ticket=careers.learningTicket(source);assert(careers.completeLearning(ticket.ticket,{seconds:8}).ok);}};
test('actual main career callbacks and injected bank credit remain isolated in preview',()=>{
  const f=fixture();qualify(f.careers);assert(f.careers.apply(undefined,{ageYears:22}).ok);approvePending(f.careers);assert(f.careers.beginDuty().ok);
  for(let n=0;n<520;n++)f.clock.advance(.25);f.saved.simulationClock=f.clock.snapshot();
  for(const e of ['court-start','court-completed','archive-completed'])assert(f.careers.dutyEvent(e).ok);
  assert(f.careers.settle().ok);assert.equal(f.ledger.state().cash,17);assert.equal(f.ledger.state().bank,61);assert.deepEqual([...f.normal.values],f.before);
  const preview=JSON.parse(f.session.getItem(PREVIEW_STORAGE_PREFIX+'worlds-days-v1'));
  assert.equal(preview.formalCareers.lastDuty.stage,'paid');assert.equal(preview.copperLedger.balances.copper.cash,17);assert.equal(preview.copperLedger.balances.copper.bank,61);assert.equal(preview.simulationClock.seconds,130);assert.equal(preview.unrelated,'keep');
  const restored=initialize(preview,createGameStorage({preview:true,normal:f.normal,session:f.session}),createSimulationClock,createGameCurrencyLedger,createFormalCareers,readWorldRegion,regionalTellerRole,PALACE_TEA_ROLE,ARCHIVE_ROLE);
  assert(restored.careers.isHired());assert.equal(restored.careers.settle().ok,false);assert.equal(restored.ledger.state().cash,17);assert.deepEqual([...f.normal.values],f.before);
});
test('preview storage failures never fall back to a formal tenure or wage',()=>{
  const f=fixture();qualify(f.careers);f.session.fail=true;assert.equal(f.careers.apply(undefined,{ageYears:22}).code,'save-failed');assert(!f.careers.isHired());assert.deepEqual([...f.normal.values],f.before);
  f.session.fail=false;assert(f.careers.apply(undefined,{ageYears:22}).ok);approvePending(f.careers);assert(f.careers.beginDuty().ok);
  for(let n=0;n<520;n++)f.clock.advance(.25);
  for(const e of ['court-start','court-completed','archive-completed'])assert(f.careers.dutyEvent(e).ok);
  f.session.fail=true;assert.equal(f.careers.settle().ok,false);assert.equal(f.ledger.state().cash,17);assert.equal(f.ledger.state().bank,41);assert.equal(f.careers.state().lastDuty.stage,'ready');assert.deepEqual([...f.normal.values],f.before);
});
