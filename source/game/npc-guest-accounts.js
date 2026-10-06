// A guest registry never grants a purse. Preserve the unique account with real
// earned income even after spending it all or leaving the role. Ambiguous
// provider history fails closed; existing meal leases pin the same provider.
export function createNPCGuestAccounts(providers){
 const owner=id=>{const found=providers.filter(p=>p.economy.hasIncome(id));return found.length===1?found[0]:null;};
 return {providerFor:id=>owner(id)?.id||null,account:id=>owner(id)?.economy.account(id)||null,hasIncome:id=>!!owner(id),prepareMealPayment:input=>owner(input.actorId)?.economy.prepareMealPayment(input)||{ok:false,code:'guest-account-unavailable'},prepareMealRefund:input=>owner(input.actorId)?.economy.prepareMealRefund(input)||{ok:false,code:'guest-account-unavailable'}};
}
