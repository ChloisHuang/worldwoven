import {createCurrencyLedger,GAME_CURRENCIES} from './currency-ledger.js';
import {TELLER_ROLE as ROLE} from './china-teller-role.js';
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
export const tellerSame=(a,b)=>{
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&tellerSame(a[k],b[k]));
};
export const TELLER_CURRENCIES=Object.freeze(Object.keys(GAME_CURRENCIES));
export const TELLER_HOME=Object.freeze([-21,.215,-28.25]);
export const TELLER_STANDS=Object.freeze({ledger:Object.freeze([-21.30,.215,-28.19]),abacus:Object.freeze([-20.43,.215,-28.19])});
const canonical=s=>({version:s.version,legacyCopper:copy(s.legacyCopper),balances:copy(s.balances),nextTransaction:s.nextTransaction,transactions:copy(s.transactions),...(s.interest===undefined?{}:{interest:copy(s.interest)})});
// Uses the ORIGINAL ledger's complete arithmetic/sequence/hold/FX/interest replay.
// Constructing this read-only verifier never observes a day or calls a money API.
export function verifyTellerSource(source){
 try{
  if(!source||source.version!==2||!tellerSame(source,canonical(source)))return null;
  const verifier=createCurrencyLedger({saved:copy(source)});if(verifier.loadError)return null;
  if(!tellerSame(source,canonical(verifier.state())))return null;
  const balances=verifier.balances(),holds=verifier.reservations(),history=verifier.history();
  const rows=TELLER_CURRENCIES.map(currency=>{
   const b=balances[currency],reserved=holds.filter(h=>h.currency===currency&&h.status==='reserved');
   const held=reserved.reduce((sum,h)=>sum+h.amount,0);
   if(!integer(held)||held!==b.held||!integer(b.cash+b.bank+held))throw Error('invalid-audit-total');
   return {currency,accountOpened:b.accountOpened,cash:b.cash,bank:b.bank,held,total:b.cash+b.bank+held,reservationIds:reserved.map(h=>h.id)};
  });
  return {version:1,throughTransaction:source.nextTransaction-1,transactionCount:history.length,rows,consistent:true};
 }catch{return null;}
}
export function freezeTellerSource(ledger){
 try{
  if(!ledger||ledger.loadError||typeof ledger.state!=='function')return null;
  const raw=ledger.state();if(raw.loadError)return null;
  const source=canonical(raw);return verifyTellerSource(source)?source:null;
 }catch{return null;}
}
export const tellerOrderId=day=>`cn-teller-audit:${day}`;
export function tellerContract(day,actorId,holderRevision,source){return {kind:'npc-teller-daily-audit',version:1,actorId,roleId:ROLE.id,slotId:ROLE.slotId,holderRevision,orderId:tellerOrderId(day),day,amount:ROLE.amount,contractVersion:ROLE.contractVersion,duty:'daily-balances-holds-journal-consistency-including-zero-activity',source:copy(source)};}
export function validateTellerContract(c){
 try{return !!c&&/^cn-[a-z0-9-]{1,60}$/.test(c.actorId||'')&&integer(c.day)&&integer(c.holderRevision)&&(c.source?.interest===undefined||c.source.interest.day<=c.day)&&!!verifyTellerSource(c.source)&&tellerSame(c,tellerContract(c.day,c.actorId,c.holderRevision,c.source));}catch{return false;}
}
export function tellerAuditProof(contract){
 const report=verifyTellerSource(contract.source);if(!report)throw Error('invalid-teller-source');
 return {...copy(contract),report,steps:TELLER_CURRENCIES.map(currency=>({currency,checkedSeconds:2,calculatedSeconds:2})),calculatedSeconds:8,recordedSeconds:2,returnedHome:true};
}
export function validateTellerAuditProof(p){
 try{if(!p)return false;const {report,steps,calculatedSeconds,recordedSeconds,returnedHome,...contract}=p;return validateTellerContract(contract)&&tellerSame(p,tellerAuditProof(contract));}catch{return false;}
}
