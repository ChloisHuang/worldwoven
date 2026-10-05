import {GAME_CURRENCIES} from './currency-ledger.js';

export const JAPAN_SERVICE_CURRENCY='japan';
export const japanServiceMoney=(currency=JAPAN_SERVICE_CURRENCY)=>({
 ...GAME_CURRENCIES[currency],displayUnit:currency==='copper'?'铜文':'券',
});
// A historical receipt owns its denomination, even when the restored order
// predates explicit currency fields. New Japanese quotes never use the copper
// facade as a fallback for an empty/missing local purse.
export function japanServiceCash(ledger,currency=JAPAN_SERVICE_CURRENCY){
 return ledger?.balances?.()?.[currency]?.cash??(currency==='copper'?ledger?.state().cash:0)??0;
}
export function japanServicePayment(ledger,id,quote={}){
 const hold=id?ledger?.reservations().find(h=>h.id===id):null;
 return {currency:hold?(hold.currency||'copper'):(quote.currency||'copper'),amount:hold?.amount??quote.amount,status:hold?.status||null};
}
