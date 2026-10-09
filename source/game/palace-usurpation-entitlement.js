import {
  PALACE_USURPATION_VERSION,
  palaceUsurpationIdentifier as identifier,
  palaceUsurpationInteger as integer,
  palaceUsurpationSame as same,
  palaceUsurpationTime as time,
} from './palace-usurpation-policy.js';

// Persisted dining evidence is a description of a past tenure. New dining
// authority is issued only from the host's verified, live usurpation core.
const issued = new WeakMap();
const verifiedTenures = new WeakMap();
const fields = ['eligible','actorId','titleId','source','caseId','bodyId','officeRevision','investitureReceiptId'];
export function validPalaceUsurpationRoyalMealEvidence(value) {
  if (!value || Object.keys(value).length !== fields.length || !fields.every(key=>Object.hasOwn(value,key)) ||
    value.eligible !== true || value.actorId !== 'player' || value.titleId !== 'emperor' || value.source !== 'palace-usurpation' ||
    !identifier(value.bodyId) || !identifier(value.investitureReceiptId) || !integer(value.officeRevision) || value.officeRevision < 1) return false;
  const match = /^palace-usurpation:(0|[1-9][0-9]*):([1-9][0-9]*)$/.exec(value.caseId);
  return !!match && integer(Number(match[1])) && integer(Number(match[2])) && Number(match[1]) + 1 === value.officeRevision;
}

function currentEvidence(core, actorId, bodyId) {
  try {
    if (actorId !== 'player' || !identifier(bodyId)) return null;
    const authority = core?.authority?.();
    if (!authority || authority.suspended !== false || authority.holderId !== actorId) return null;
    const office = core.office();
    if (!office ||
      authority.revision !== office.revision || office.actorId !== actorId || office.bodyId !== bodyId ||
      !integer(office.revision) || office.revision < 1 || !time(office.since)) return null;
    // The real core already replay-validates events. Cross-check the original
    // receipt once per core/body/tenure, never clone its full history per frame.
    const cached = verifiedTenures.get(core);
    if (cached && cached.evidence.bodyId === bodyId && cached.evidence.officeRevision === office.revision &&
      cached.since.day === office.since.day && cached.since.hour === office.since.hour) return cached.evidence;
    const task = core.currentTask(), snapshot = core.snapshot();
    if (!task || snapshot?.version !== PALACE_USURPATION_VERSION ||
      !integer(snapshot.revision) || !Array.isArray(snapshot.events) || snapshot.revision !== snapshot.events.length ||
      !Array.isArray(snapshot.cases) || !same(snapshot.office,office) || !same(snapshot.cases.at(-1),task) ||
      task.stage !== 'invested' || task.playerId !== actorId || task.playerBodyId !== bodyId ||
      task.resolution?.passed !== true || task.investiture?.officeRevision !== office.revision ||
      task.emperor?.id === actorId || task.emperor?.bodyId === bodyId || task.emperor?.revision + 1 !== office.revision) return null;
    const receipt = task.investiture.receipt;
    if (!receipt || !identifier(receipt.id) || receipt.kind !== 'investiture-reading' || receipt.completed !== true ||
      receipt.caseId !== task.id || receipt.playerId !== actorId || receipt.playerBodyId !== bodyId ||
      receipt.emperorId !== task.emperor.id || receipt.emperorBodyId !== task.emperor.bodyId || receipt.emperorRevision !== task.emperor.revision ||
      !time(receipt.at) || !same(receipt.at,task.investiture.at) || !same(receipt.at,office.since) ||
      !Array.isArray(receipt.participants) || receipt.participants.filter(p=>p.actorId === actorId && p.bodyId === bodyId).length !== 1 ||
      !identifier(receipt.documentId) || receipt.objectId !== receipt.documentId) return null;
    const events = snapshot.events.filter(event=>event.type === 'investiture' && event.caseId === task.id);
    if (events.length !== 1 || !same(events[0].receipt,receipt) || events[0].context?.player.id !== actorId ||
      events[0].context?.player.bodyId !== bodyId) return null;
    const evidence = {eligible:true,actorId,titleId:'emperor',source:'palace-usurpation',caseId:task.id,bodyId,
      officeRevision:office.revision,investitureReceiptId:receipt.id};
    if (!validPalaceUsurpationRoyalMealEvidence(evidence)) return null;
    Object.freeze(evidence);
    verifiedTenures.set(core,{evidence,since:{day:office.since.day,hour:office.since.hour}});
    return evidence;
  } catch { return null; }
}

/** Read-only: no title, kinship, career, supply or needs record is created. */
export function palaceUsurpationRoyalMealEligibility(core, {actorId='player',bodyId}={}) {
  const evidence = currentEvidence(core,actorId,bodyId);
  if (!evidence) return null;
  issued.set(evidence,{core,actorId,bodyId});
  return evidence;
}

// A JSON copy can describe historical food but cannot start or continue food.
// Recheck even a previously issued object after authority/body/tenure changes.
export function isCurrentPalaceUsurpationRoyalMealEligibility(evidence) {
  const origin = evidence && issued.get(evidence);
  if (!origin) return false;
  const current = currentEvidence(origin.core,origin.actorId,origin.bodyId);
  return !!current && fields.every(key=>evidence[key] === current[key]);
}
