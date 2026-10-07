import {TELLER_CURRENCIES,freezeTellerSource,verifyTellerSource,tellerSame} from './china-teller-audit-proof.js';

// Four local employment entrances commission ONE audit of the same original
// ledger each day. These are explicit game contracts, never customer deposits,
// invented exchange orders, or a second independent book at each counter.
const definitions={
 china:{prefix:'cn',currency:'copper',name:'钱庄柜务核验',employer:'承光结算署',incumbentId:'cn-money-house-teller',incumbentName:'陆昭',workplace:'钱庄 · 原账案'},
 japan:{prefix:'jp',currency:'japan',name:'霞汤屋柜务核验',employer:'霞汤屋结算处',incumbentId:'jp-exchange-teller',incumbentName:'澄江',workplace:'霞汤屋 · 両替柜台'},
 france:{prefix:'fr',currency:'france',name:'宫苑柜务核验',employer:'宫苑结算处',incumbentId:'france-exchange-teller',incumbentName:'克莱尔',workplace:'宫苑音乐接待厅 · 银行柜台'},
 egypt:{prefix:'eg',currency:'egypt',name:'沙海柜务核验',employer:'沙海结算处',incumbentId:'egypt-exchange-teller',incumbentName:'奈赫特',workplace:'沙海入口前庭 · 票券柜台'},
};
export const REGIONAL_TELLER_ROLES=Object.freeze(Object.fromEntries(Object.entries(definitions).map(([country,{prefix,...local}])=>[country,Object.freeze({
 ...local,country,id:`${prefix}-teller-auditor`,slotId:`${prefix}-teller-auditor-1`,amount:8,wage:8,contractVersion:1,
 supervisorId:local.incumbentId,vacancyKind:'exclusive',paymentKind:'commission',careerKind:'technical-service',workSource:'regional-teller-audit',
 minimumAgeYears:18,skillRequirements:Object.freeze({writing:1,ritual:1}),dutyWindow:Object.freeze({startHour:0,endHour:24}),earlyBeforeHour:0,preparationBonus:0,
 duties:`满18岁并具备文书1级、礼仪1级，当面登记审核，录用与接单分开。四地共用同一本原账，每日全世界最多一份核验合同；逐币亲自查账、核算、落记，再回原柜台交验。完整合同由${local.employer}按签约柜台币种付${country==='china'?'8文铜钱':`8${({japan:'日本',france:'法国',egypt:'埃及'})[country]}券`}入银行，跨国不能再领同日合同，零交易日仍须完成全部核验。此为明确新增的游戏委托合同，不从存款抽款，不编造顾客或兑换。`,
})])));
export const regionalTellerRole=countryOrId=>Object.values(REGIONAL_TELLER_ROLES).find(role=>role.country===countryOrId||role.id===countryOrId)||null;
export const REGIONAL_TELLER_CURRENCIES=TELLER_CURRENCIES;
export {freezeTellerSource,tellerSame};
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;

// A deterministic evidence fingerprint, not a cryptographic signature. Every
// use also replays the full authentic ledger; a matching hash alone proves zero.
export function regionalTellerSourceHash(source){
 let hash=0xcbf29ce484222325n;
 for(const char of JSON.stringify(canonical(source))){const point=char.codePointAt(0);for(const byte of [point&255,(point>>>8)&255,(point>>>16)&255])hash=BigInt.asUintN(64,(hash^BigInt(byte))*0x100000001b3n);}
 return `fnv1a64:${hash.toString(16).padStart(16,'0')}`;
}
export const regionalTellerOrderId=day=>`regional-teller-audit:${day}`;
export const regionalTellerReport=source=>verifyTellerSource(source);

// Keep the original journal entries unchanged, including the legacy copper
// prefix. An incoming exchange is relevant to its receiving currency as well.
export function regionalTellerJournal(source,currency=null){
 if(!verifyTellerSource(source)||currency!==null&&!TELLER_CURRENCIES.includes(currency))return null;
 const journal=[...source.legacyCopper.transactions,...source.transactions];
 return copy(currency===null?journal:journal.filter(tx=>(tx.currency||'copper')===currency||tx.action==='exchange'&&tx.quote.to===currency));
}
export function regionalTellerContract({country,day,holderRevision,workReceiptId=regionalTellerOrderId(day),source}={}){
 const role=regionalTellerRole(country);if(!role)throw Error('invalid-teller-country');
 return {kind:'player-regional-teller-daily-audit',version:1,actorId:'player',country:role.country,roleId:role.id,slotId:role.slotId,
  holderRevision,orderId:regionalTellerOrderId(day),workReceiptId,day,amount:role.amount,currency:role.currency,contractVersion:role.contractVersion,
  duty:'daily-four-currency-balances-holds-journal-consistency-including-zero-activity',sourceHash:regionalTellerSourceHash(source),source:copy(source)};
}
export function validateRegionalTellerContract(contract){
 try{return !!contract&&integer(contract.day)&&integer(contract.holderRevision)&&
  typeof contract.workReceiptId==='string'&&/^[a-z][a-z0-9:-]{0,159}$/.test(contract.workReceiptId)&&
  (contract.source?.interest===undefined||contract.source.interest.day<=contract.day)&&!!verifyTellerSource(contract.source)&&
  tellerSame(contract,regionalTellerContract(contract));}catch{return false;}
}
export function regionalTellerAuditProof(contract){
 if(!validateRegionalTellerContract(contract))throw Error('invalid-regional-teller-contract');
 return {...copy(contract),report:verifyTellerSource(contract.source),journal:regionalTellerJournal(contract.source),
  steps:TELLER_CURRENCIES.map(currency=>({currency,checkedSeconds:2,calculatedSeconds:2})),calculatedSeconds:8,recordedSeconds:2,returnedHome:true};
}
export function validateRegionalTellerAuditProof(proof){
 try{if(!proof)return false;const {report,journal,steps,calculatedSeconds,recordedSeconds,returnedHome,...contract}=proof;
  return validateRegionalTellerContract(contract)&&tellerSame(proof,regionalTellerAuditProof(contract));}catch{return false;}
}
