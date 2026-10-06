// A guest registry never grants a purse. Preserve the unique account with real
// earned income even after spending it all or leaving the role. Ambiguous
// provider history fails closed; existing meal leases pin the same provider.
export function createNPCGuestAccounts(providers){
 const owner=id=>{const found=providers.filter(p=>p.economy.hasIncome(id));return found.length===1?found[0]:null;};
 function validMealLease(lease,order){
  const provider=owner(lease?.actorId);
  if(!provider||provider.id!==lease.accountProvider||provider.economy.loadError||!order||order.customerId!==lease.actorId||order.id!==lease.orderId)return false;
  if(!order.collected)return true;
  const transfers=provider.economy.snapshot?.()?.mealTransfers;
  if(!Array.isArray(transfers))return false;
  const payment=transfers.find(row=>row.kind==='meal-payment'&&row.orderId===order.id);
  return !!payment&&payment.actorId===lease.actorId&&payment.amount===order.price&&!transfers.some(row=>row.kind==='meal-refund'&&row.orderId===order.id);
 }
 return {validMealLease,providerFor:id=>owner(id)?.id||null,account:id=>owner(id)?.economy.account(id)||null,hasIncome:id=>!!owner(id),prepareMealPayment:input=>owner(input.actorId)?.economy.prepareMealPayment(input)||{ok:false,code:'guest-account-unavailable'},prepareMealRefund:input=>owner(input.actorId)?.economy.prepareMealRefund(input)||{ok:false,code:'guest-account-unavailable'}};
}
