// Dormant payment port for the original salon controller. This does not choose
// customers, move anyone, complete a service or create an independent order.
import {CHINA_OFFICIAL_IDS} from './china-official-economy.js';
import {SALON_ARTISTS} from './china-tavern-salon-artists.js';
const no=code=>({ok:false,code});
export function createChinaOfficialSalonPayments({officialEconomy,artistEconomy}={}){
 const terms=o=>({actorId:o.customerId,orderId:o.id,amount:o.fee,artistId:o.actorId,activity:o.activity,incomePolicy:o.incomePolicy});
 const available=(id,fee)=>{const a=officialEconomy?.account(id);return CHINA_OFFICIAL_IDS.includes(id)&&!officialEconomy.loadError&&!artistEconomy?.loadError&&a&&Number.isSafeInteger(fee)&&fee>=20&&a.cash+a.bank>=fee+6;};
 return {
  available,nextId:()=>officialEconomy?.nextSalonOrderId(),
  status:o=>{const h=officialEconomy?.salonHold(o.id);return !h?null:h.actorId===o.customerId&&h.artistId===o.actorId&&h.activity===o.activity&&h.amount===o.fee&&JSON.stringify(h.incomePolicy)===JSON.stringify(o.incomePolicy)?h:{status:'conflict'};},
  recognizesCustomer:id=>CHINA_OFFICIAL_IDS.includes(id),
  held:()=>officialEconomy?.salonHolds().filter(h=>h.status==='reserved'&&SALON_ARTISTS.some(a=>a.id===h.artistId&&a.activity===h.activity))||[],
  reserve(o){if(!available(o.customerId,o.fee)&&!officialEconomy?.salonHold(o.id))return no('insufficient-personal-funds');const p=officialEconomy.prepareSalonReserve(terms(o));return p.ok?p.commit():p;},
  refund(o){const p=officialEconomy.prepareSalonRefund(terms(o));return p.ok?p.commit():p;},
  settle(o,{elapsed,duration=2.2}={}){
   if(!SALON_ARTISTS.some(a=>a.id===o.actorId&&a.activity===o.activity))return no('invalid-artist');
   const evidence={kind:'salon-service',completed:true,orderId:o.id,customerId:o.customerId,artistId:o.actorId,activity:o.activity,elapsed,duration};
   const p=officialEconomy.prepareSalonSettle({...terms(o),evidence});if(!p.ok)return p;
   const income=artistEconomy.prepareOfficialIncome(p.transaction,{...o,completed:true});if(!income.ok)return income;
   if(!p.valid()||!income.valid())return no('stale-salon-settlement');
   const lockAware=typeof income.lock==='function';let attempted=false;
   if(lockAware&&typeof income.release!=='function')return no('invalid-salon-participant');
   try{
    if(lockAware){attempted=true;if(!income.lock())return no('stale-salon-settlement');}
    const result=p.commit(income.patch);if(!result.ok)return result;
    if(income.committed()===false)throw Error('salon-income-commit-conflict');
    return result;
   }finally{if(attempted)income.release();}
  },
 };
}
