// A delivery proof must retain all original people and real approved/sealed work.
import assert from 'node:assert/strict';
import {createNPCPieceworkAccount} from '../source/game/npc-piecework-account.js';
import {PALACE_HERALD_ROLE as role} from '../source/game/china-palace-herald-role.js';
import {heraldContract} from '../source/game/china-palace-herald-proof.js';
const proof=()=>({...heraldContract({id:'cn-edict-east-shore:0',audienceId:'cn-morning-audience:0',day:0},'cn-palace-herald',0,'cn-calligraphy',0,'cn-garden',0,'cn-emperor'),steps:{collectedSeconds:2,approvalSeconds:4,sealedSeconds:2.2,readingSeconds:6,responseSeconds:3,handoffSeconds:1.3,received:true},approvedBy:'cn-emperor',sealedBy:'cn-palace-herald',holder:'recipient'});
const create=extra=>createNPCPieceworkAccount({role,namespace:'chinaHeraldAccounts',proofKind:'npc-edict-delivery-piecework',saveState:()=>true,...extra});
let good=false,saved;const account=create({saveState:s=>{if(!good)return false;saved=s;return true;}});
for(const field of Object.keys(proof().steps)){const p=proof();p.steps[field]=0;assert(!account.settle(p).ok,field);}
for(const change of [p=>p.approvedBy='cn-wrong',p=>p.sealedBy='cn-wrong',p=>p.holder='herald',p=>p.authorId=p.actorId,p=>p.recipientRevision=-1,p=>delete p.emperorId,p=>p.kind='npc-edict-draft-piecework',p=>p.amount=13,p=>p.extra=true]){const p=proof();change(p);assert(!account.settle(p).ok);}
assert(!account.settle(proof()).ok);assert.equal(account.account('cn-palace-herald').bank,0);good=true;assert(account.settle(proof()).ok);assert.equal(account.account('cn-palace-herald').bank,12);assert(account.settle(proof()).replayed);
const successor=proof();successor.actorId='cn-new-herald';successor.sealedBy=successor.actorId;successor.holderRevision=1;assert(!account.settle(successor).ok);assert.equal(account.account('cn-new-herald').bank,0);
assert.deepEqual(create({saved}).snapshot(),saved);const bad=structuredClone(saved);bad.receipts[0].evidence.authorId='cn-palace-herald';assert(create({saved:bad}).loadError);
console.log('PASS strict original delivery account schema, all work stages, identity/holder guards, atomic failure/replay, no successor backpay');
