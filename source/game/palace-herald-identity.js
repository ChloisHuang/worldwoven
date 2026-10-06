// Old receipts named the original courier without a revision. Keep that
// evidence readable; every new courier receipt carries its frozen tenure.
export const validHeraldReceiptIdentity=r=>!!r&&typeof r.heraldId==='string'&&/^cn-[a-z0-9-]+$/.test(r.heraldId)&&r.heraldId!=='cn-emperor'&&(r.heraldRevision===undefined?r.heraldId==='cn-palace-herald':Number.isSafeInteger(r.heraldRevision)&&r.heraldRevision>=0);
export const sameHeraldReceiptIdentity=(a,b)=>validHeraldReceiptIdentity(a)&&validHeraldReceiptIdentity(b)&&a.heraldId===b.heraldId&&(a.heraldRevision??0)===(b.heraldRevision??0);
