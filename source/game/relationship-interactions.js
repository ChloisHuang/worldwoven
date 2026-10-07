// Finite shared ST01 actions. Scores unlock opportunities, never consent.
export const RELATIONSHIP_STAGES = Object.freeze(['stranger', 'acquainted', 'familiar', 'trusted', 'affection']);
const action = (id, label, stage, duration, fitKind, extra = {}) => Object.freeze({id, label, stage, duration, kind: `relationship-${id}`, fitKind, ...extra});
export const RELATIONSHIP_INTERACTIONS = Object.freeze([
  action('gratitude', '认真道谢', 'acquainted', 6, 'staff-work'),
  action('respectful-disagreement', '说说不同看法', 'acquainted', 8, 'read'),
  action('shared-memory', '回忆上次相处', 'familiar', 8, 'read'),
  action('apology', '为上次的事道歉', 'familiar', 8, 'staff-rest', {requiresFault: true}),
  action('argument', '谈清上次的争执', 'familiar', 9, 'staff-work', {requiresFault: true}),
  action('confide', '说说心里话', 'trusted', 10, 'staff-rest'),
  action('boundary', '认真说明界限', 'acquainted', 7, 'staff-rest'),
  action('express-interest', '坦白好感', 'trusted', 8, 'read', {romantic: true}),
  action('respond-interest', '回应好感', 'trusted', 8, 'read', {romantic: true}),
  action('flirt', '温柔地调侃', 'affection', 7, 'read', {romantic: true}),
  action('public-invitation', '相约到公共会面处', 'affection', 10, 'staff-rest', {romantic: true}),
  action('quiet-company', '安静陪伴片刻', 'affection', 10, 'staff-rest', {romantic: true}),
  action('private-company', '询问是否愿意私下亲近', 'affection', 10, 'staff-rest', {romantic: true, private: true}),
]);
const evidenceId = id => typeof id === 'string' && id.length > 0 && id.length <= 512;
const byId = new Map(RELATIONSHIP_INTERACTIONS.map(a => [a.id, a]));
export const relationshipInteraction = id => byId.get(id) || null;
export function relationshipStage(context = {}) {
  const n = context.completedCount || 0;
  if (context.interestGiven === true && context.interestReceived === true && relationshipRomanticContextAllowed(context)) return 'affection';
  if (n >= 6 && (context.relation || 0) >= .15 && (context.trust || 0) >= 0) return 'trusted';
  if (n >= 3) return 'familiar';
  return n >= 1 ? 'acquainted' : 'stranger';
}
export function relationshipRomanticContextAllowed(context={}){return context.available!==false&&Number.isFinite(context.age)&&context.age>=18&&Number.isFinite(context.selfAge)&&context.selfAge>=18&&!context.boundary&&(context.trust||0)>=-.2&&(context.relation||0)>=-.3&&(context.opinion||0)>=-.3&&(context.aversion||0)<=.3;}
export function relationshipInteractionEligible(id, context = {}) {
  const a = byId.get(id);
  if (context.available === false) return false;
  if (!a || RELATIONSHIP_STAGES.indexOf(relationshipStage(context)) < RELATIONSHIP_STAGES.indexOf(a.stage)) return false;
  if (a.requiresFault && (!evidenceId(context.mismatchEventId || context.faultEventId) || context.repairedEventId === (context.mismatchEventId || context.faultEventId))) return false;
  if (id === 'apology' && context.acknowledgedEventId === (context.mismatchEventId || context.faultEventId)) return false;
  if (id === 'shared-memory' && !evidenceId(context.lastCompletedId)) return false;
  if (a.romantic && !relationshipRomanticContextAllowed(context)) return false;
  if (id === 'respond-interest' && !(context.initiator === 'npc' ? context.interestGiven : context.interestReceived)) return false;
  if (['public-invitation','quiet-company'].includes(id)&&context.publicPlaceAvailable===false)return false;
  if (a.private && context.privatePlaceAvailable !== true) return false;
  return true;
}
export const relationshipInteractionOptions = context => RELATIONSHIP_INTERACTIONS.filter(a => relationshipInteractionEligible(a.id, context));
export function relationshipInteractionOutcome(id, context = {}) {
  if (!byId.has(id) || id === 'private-company' && context.explicitConsent !== true) return null;
  const changes = {
    gratitude: [.035, .025, .02], 'respectful-disagreement': [.005, -.015, .025],
    'shared-memory': [.04, .025, .025], apology: [.025, .015, .045], argument: [-.025, -.035, -.015],
    confide: [.045, .03, .055], boundary: [0, 0, .02], 'express-interest': [.02, .01, .01],
    'respond-interest': [.03, .02, .02], flirt: [.025, .025, .005],
    'public-invitation': [.035, .02, .025], 'quiet-company': [.025, .015, .03], 'private-company': [.035, .025, .035],
  };
  const receptivity = Number.isFinite(context.receptivity) ? Math.max(0, Math.min(1, context.receptivity)) : .5;
  const factor = .65 + receptivity * .7;
  let [relation, opinion, trust] = changes[id].map(value => Math.round(value * factor * 1000000) / 1000000);
  if (id === 'argument' && receptivity >= .65) { relation = .008; opinion = .005; trust = .018; }
  if (id === 'apology' && receptivity < .35) { relation = .002; opinion = 0; trust = .005; }
  const result = {feeling: id === 'argument' ? (receptivity >= .65 ? 'neutral' : 'mismatched') : id === 'boundary' ? 'neutral' : 'appreciated', relation, opinion, trust, action: id};
  if (Number.isFinite(context.selfReceptivity)) {
    const inverse = relationshipInteractionOutcome(id, {...context, receptivity: context.selfReceptivity, selfReceptivity: undefined});
    result.inverseRelation = inverse.relation;
    result.inverseOpinion = inverse.opinion;
  }
  if (id === 'boundary') result.boundary = true;
  if (id === 'express-interest') result[context.initiator === 'npc' ? 'interestReceived' : 'interestGiven'] = true;
  if (id === 'respond-interest') result[context.initiator === 'npc' ? 'interestReceived' : 'interestGiven'] = true;
  if (id === 'apology') {
    result.acknowledgedEventId = context.mismatchEventId || context.faultEventId;
    result.forgiven = receptivity >= .35;
    if (result.forgiven) result.repairedEventId = result.acknowledgedEventId;
  }
  if (id === 'private-company') result.explicitConsent = context.explicitConsent === true;
  return result;
}
