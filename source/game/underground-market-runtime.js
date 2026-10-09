import {holdSocialActors,releaseSocialActors,socialHoldOwner} from './npc-social-ownership.js';
import {followActorRoute} from './actor-navigation.js';
export const MARKET_MERCHANT_ID='cn-tavern-diner-east';
const OWNER='underground-market:china',copy=structuredClone;
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const pos=n=>n?.root?.position,identity=n=>`${n.actorId||n.station?.id||'player'}@${n.lifeId??n.station?.lifeId??'original'}`;
const validPoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
// One original resident, one temporary movement lease, one finite stock ledger.
// Work time advances only with both people at the authored counter, never offline.
export function createUndergroundMarketRuntime({lot,getActors,getPlayer,economy,getCrime,canBorrow,canContinue=()=>true,playerAvailable,canSee,planPath,moveActor,doors,poseContext,stopPlayer,saveState,saved=null,notify=()=>{},isPaused=()=>false}){
 const place=lot.blackMarket;let state={version:1,serial:0,merchantKey:null,session:null,action:null},error=economy.loadError||null,lastError=null,disposed=false,yielding=false,leased=false,stalled=0,saveIn=0;
 const merchant=()=>getActors().find(n=>(n.actorId||n.station?.id)===MARKET_MERCHANT_ID);
 try{if(saved!=null){if(saved.version!==1||!Number.isSafeInteger(saved.serial)||saved.serial<0||saved.merchantKey!==null&&typeof saved.merchantKey!=='string')throw Error();if(saved.session&&(!saved.merchantKey||!['waiting','travelling','open','returning'].includes(saved.session.stage)||!validPoint(saved.session.origin)||!Number.isFinite(saved.session.remaining)||saved.session.remaining<0))throw Error();if(saved.action&&(!saved.session||!['buy','sell','work','fence'].includes(saved.action.kind)||saved.action.requestId!==`cn-market-action-${saved.serial}`||saved.action.duration!==(saved.action.kind==='work'?8:2)||!Number.isFinite(saved.action.elapsed)||saved.action.elapsed<0||!validPoint(saved.action.origin)))throw Error();state=copy(saved);}}catch{error='invalid-market-session';}
 function write(next){try{const r=saveState(copy(next));if(r!==true&&r?.ok!==true){lastError='save-failed';return false;}state=next;lastError=null;return true;}catch(e){lastError=e?.message||'save-failed';return false;}}
 const detained=n=>!!n&&getCrime()?.model.status(identity(n)).detained;
 const healthy=n=>!!n&&n.alive!==false&&!n.serviceMount&&!n.bathTransition&&!detained(n);
 function claim(){const n=merchant();if(!healthy(n)||getCrime()?.model.status(identity(n)).status==='pursuit'||identity(n)!==state.merchantKey||!canContinue(n))return false;const held=socialHoldOwner(MARKET_MERCHANT_ID);if(held&&held!==OWNER)return false;if(!leased){if(!holdSocialActors([MARKET_MERCHANT_ID],OWNER))return false;n.route=[];leased=true;}return true;}
 function release(){const n=merchant();if(leased){releaseSocialActors(OWNER);leased=false;if(n)n.walking=false;}}
 function clear(reason){const old=state.session,n=merchant();if(state.action&&!cancelAction())return false;if(!write({...state,session:null,action:null}))return false;release();if(n&&old&&!yielding&&!socialHoldOwner(MARKET_MERCHANT_ID)&&old.stage!=='waiting'&&identity(n)===state.merchantKey&&healthy(n))n.route=planPath(pos(n),old.origin,.25);if(reason)notify(reason);return true;}
 function atCounter(){const p=getPlayer(),n=merchant();return state.session?.stage==='open'&&healthy(p)&&healthy(n)&&identity(n)===state.merchantKey&&canContinue(n)&&leased&&playerAvailable()&&gap(pos(n),point(place.merchant.position))<.4&&gap(pos(p),point(place.interaction.position))<.85&&gap(pos(p),pos(n))<1.8&&canSee(pos(p),pos(n));}
 function proof(action){return {...copy(action),actorKey:identity(getPlayer()),buyerKey:identity(merchant()),merchantKey:identity(merchant()),seconds:action.elapsed,atCounter:atCounter()};}
 function verifyAction(input){const a=state.action;return !disposed&&!error&&!!a&&input?.requestId===a.requestId&&input.kind===a.kind&&input.itemId===a.itemId&&a.elapsed>=a.duration&&atCounter()&&gap(pos(getPlayer()),a.origin)<.22;}
 const requestable=n=>n&&n.alive!==false&&n.serviceMount?.kind!=='bed'&&!n.socialPrivateFade&&!detained(n)&&canContinue(n);
 function invite(){const p=getPlayer(),n=merchant();if(error||!place||state.session||!healthy(p)||!requestable(n)||!playerAvailable()||gap(pos(p),pos(n))>2||!canSee(pos(p),pos(n))||socialHoldOwner(MARKET_MERCHANT_ID)||state.merchantKey&&state.merchantKey!==identity(n))return false;
  const next={...state,merchantKey:identity(n),session:{stage:canBorrow(n)?'travelling':'waiting',origin:point(pos(n)),remaining:120},action:null};if(!write(next)||state.session.stage!=='waiting'&&!claim())return false;stopPlayer();if(state.session.stage==='waiting'){notify('周棠：先等我办完眼前的事情，空下来就带原来的旧物去地下小摊。你可以继续逛，或回来取消邀约。');return true;}notify('周棠：我带着自家的五件旧物去地下小摊。跟我走，到了当面看货；卖货所得才够回购和付整理工钱。');return true;
 }
 function begin(kind,itemId){if(state.action||!atCounter())return false;const serial=state.serial+1,requestId=`cn-market-action-${serial}`,a={kind,itemId,requestId,elapsed:0,duration:kind==='work'?8:2,origin:point(pos(getPlayer()))};if(!write({...state,serial,action:a}))return false;if(kind==='work'&&!economy.beginWork({itemId,requestId}).ok){cancelAction();notify('摊账现金不足或原纸包已被占用，暂不能开工。');return false;}stopPlayer();notify(kind==='fence'?'正在交接封存巡牌：属于销赃，原盗案不会消失；独立目击者可以报告双方。移动或按 E 可取消。':kind==='work'?'整理原纸包需 8 秒，完成付 2 文；这是一次短时零工，不改变主职日薪。移动或按 E 可取消。':'当面清点钱货需 2 秒；移动或按 E 可取消。');return true;}
 function cancelAction(){if(!state.action)return false;if(state.action.kind==='work'&&economy.view().active?.requestId===state.action.requestId&&!economy.cancelPending().ok)return false;return write({...state,action:null});}
 function close(){if(!state.session)return false;if(state.session.stage==='waiting')return clear('已取消小摊邀约，周棠继续原来的安排。');if(state.action&&!cancelAction())return false;return write({...state,action:null,session:{...state.session,stage:'returning'}});}
 function commitAction(){const a=state.action;if(!a)return;const input={itemId:a.itemId,requestId:a.requestId,proof:proof(a)};const result=(a.kind==='work'?economy.completeWork(input):economy[a.kind]?.(input))||{ok:false,code:'unavailable'};
  if(result.ok){if(!write({...state,action:null}))return;notify(a.kind==='work'?'原纸包已整理，2 文已从摊账付给你。':a.kind==='fence'?'巡牌和6文已当面交接，原案及独立目击记录保留。':'钱货已当面交清，库存和双方账款已保存。');}
  else{const code=result.code||result.reason||'save-failed';if(economy.view().active?.kind==='buy'){notify('清点已完成，付款已保留；正在恢复同一笔交货，不会重复扣款。');return;}cancelAction();notify(code.includes('fund')||code.includes('cash')?'现有现金不足，钱货没有交接。摊主只用实际卖货收入回购。':code.includes('save')?'保存没有成功，先保留原账；重新靠近交易。':'交易条件已变化，未交货付款。');}
 }
 function walk(n,to,dt){if(gap(pos(n),to)<.25){n.route=[];n.walking=false;stalled=0;return true;}if(!n.route?.length)n.route=planPath(pos(n),to,.25);const before=point(pos(n));followActorRoute(n,dt,{doors,moveActor,npcs:getActors().filter(a=>a!==getPlayer()),playerPosition:pos(getPlayer()),radius:.25,speedScale:.9});stalled=gap(before,pos(n))<.001?stalled+dt:0;if(stalled>20){clear('去小摊的通路暂时受阻，周棠先回原处；可在空闲时再邀请。');stalled=0;}return false;}
 function update(dt,t){if(disposed||error||!place||!Number.isFinite(dt)||dt<=0||dt>.25)return;economy.recover?.();place.setStock?.(economy.view().items);const n=merchant();if(yielding){release();if(clear('周棠需要处理其他事情，小摊已收起。'))yielding=false;return;}if(!state.session)return;if(state.session.stage==='waiting'){if(!n||n.alive===false||identity(n)!==state.merchantKey||!canContinue(n)){clear('周棠目前无法赴约，小摊邀约已结束。');return;}if(!canBorrow(n)||!healthy(n)||socialHoldOwner(MARKET_MERCHANT_ID))return;if(!write({...state,session:{...state.session,stage:'travelling',origin:point(pos(n))}}))return;notify('周棠已办完手边的事，正带旧物步行去地下小摊。');}if(!claim()){yielding=true;release();if(clear('周棠有其他事情需要处理，小摊暂时收起；已经交清的钱货保留。'))yielding=false;return;}
  if(state.session.stage!=='open'){const to=state.session.stage==='travelling'?point(place.merchant.position):state.session.origin;if(walk(n,to,dt)){if(state.session?.stage==='returning')clear();else if(state.session){write({...state,session:{...state.session,stage:'open'}});notify('周棠已到地下小摊。旧物买卖本身不违法；封存巡牌属于赃物，交易前会明确提示。');}}return;}
  n.walking=false;n.root.rotation.y=place.merchant.rotation??0;
  if(state.action?.kind==='work'&&!economy.view().active){const r=economy.beginWork({itemId:state.action.itemId,requestId:state.action.requestId});if(!r.ok)cancelAction();}
  if(state.action){if(!atCounter()||gap(pos(getPlayer()),state.action.origin)>.22||isPaused()){cancelAction();}else{state.action.elapsed+=dt;getPlayer().animate?.(t,false,null,{...poseContext(getPlayer(),null),handoff:true});getPlayer().root.rotation.y=Math.atan2(pos(n).x-pos(getPlayer()).x,pos(n).z-pos(getPlayer()).z);if(state.action.elapsed>=state.action.duration)commitAction();}}
  if(!state.action)state.session.remaining=Math.max(0,state.session.remaining-dt);saveIn-=dt;if(saveIn<=0){saveIn=1;write(copy(state));}if(state.session?.remaining===0)close();
 }
 function choice(id,kind,action,position,itemId=null){
  const p=Array.isArray(position)?position:[position.x,position.y,position.z],besideMerchant=['invite','waiting','cancel-wait','progress'].includes(id),target=besideMerchant?'cn-market-invitation':place.id;
  // Queueing an invitation never acquires the social conversation/body lease.
  // A live authored marker follows the resident; actual execution rechecks them.
  const anchor=besideMerchant?[p[0],p[1]+1.35,p[2]]:place.interaction.menuPoint||place.interaction.anchor||[p[0],p[1]+1.05,p[2]];
  return {id:'market:'+id,market:true,kind,itemId,name:'周棠 · 地下旧物小摊',targetKey:target,targetName:'周棠 · 地下旧物小摊',visualAnchor:{id:target,point:anchor},action,position:p,interactionRadius:2,executionRadius:2,priority:18};
 }
 function choices(){if(disposed||error||!place)return[];const n=merchant(),p=getPlayer(),out=[];if(!p)return out;
  if(!state.session){if(requestable(n)&&(!state.merchantKey||state.merchantKey===identity(n)))out.push(choice('invite','invite',canBorrow(n)?'请空闲的周棠带路去地下旧物小摊':'约好去地下小摊 · 等周棠办完眼前的事',pos(n)));out.push(choice('info','info','查看小摊说明 · 先在酒楼找空闲的周棠',place.interaction.position));return out;}
  if(state.action)return out;if(state.session.stage==='waiting')return [choice('waiting','info','小摊邀约已记下 · 等周棠空闲后出发',pos(n)),choice('cancel-wait','close','取消小摊邀约',pos(n)),choice('cancel-wait-room','close','取消小摊邀约',place.interaction.position)];if(state.session.stage!=='open')return [choice('progress','info',state.session.stage==='travelling'?'周棠正步行前往小摊 · 沿原楼梯跟随':'收摊中 · 周棠正沿原路返回',pos(n))];
  out.push(choice('info','info','查看来源、库存和摊账余额',place.interaction.position));if(!atCounter())return out;
  const view=economy.view();for(const item of view.items||[]){if(item.holder==='merchant')out.push(choice('buy:'+item.id,'buy',`买${item.name} · ${item.buyPrice}文 · 现货1件`,place.interaction.position,item.id));else if(item.holder==='player')out.push(choice('sell:'+item.id,'sell',`卖回${item.name} · ${item.sellPrice}文`,place.interaction.position,item.id));if(item.holder==='merchant'&&item.kind==='old-paper')out.push(choice('work:'+item.id,'work',`整理${item.name} · 8秒得2文 · 一次性零工`,place.interaction.position,item.id));}
  const crime=getCrime(),held=crime?.status()?.heldItems||[];if(held.includes('cn-sealed-patrol-token')&&!view.fenced)out.push(choice('fence','fence','违法销赃：交出封存巡牌得6文 · 目击会追捕双方',place.interaction.position,'cn-sealed-patrol-token'));
  out.push(choice('close','close','结束交易 · 请周棠收摊返回',place.interaction.position));return out;
 }
 function info(){const v=economy.view();notify(`周棠的开市自有旧物，仅5件原物，售罄不自动补货。摊账现有${v.merchantCash??v.cash??0}文；买回价低于卖价，现金不足不能回购。旧纸每包可整理一次。普通旧物买卖不违法；封存巡牌属于赃物，不能洗掉原案。`);return true;}
 // Reclaim a saved movement lease before original routines get their first tick.
 // Otherwise a restored merchant can take one step toward their old life task
 // on every reload and drift away from an in-progress physical transaction.
 if(!error&&state.session&&state.session.stage!=='waiting'&&!claim()){yielding=true;release();}
 return {update,choices,invite,verifyAction,resolveIntent:x=>choices().find(c=>c.id===x?.id)||null,cancelAction,close,activeAction:()=>state.action&&copy(state.action),state:()=>({...(error?{error}:{}),lastError,...copy(state),economy:economy.view()}),owns:n=>leased&&n===merchant(),pose(n,t){if(!leased||n!==merchant())return false;n.animate(t+(n.phase||0),!!n.walking,n.walking||state.action?null:'relax',{...poseContext(n,null),...(state.action?{handoff:true}:{})});return true;},interact(x){if(x.kind==='invite')return invite();if(x.kind==='info')return info();if(x.kind==='close')return close();if(!choices().some(c=>c.id===x.id))return false;return begin(x.kind,x.itemId);},dispose(){disposed=true;release();},get loadError(){return error;}};
}
