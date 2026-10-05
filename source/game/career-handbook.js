// A portable read-only handbook; any job action still goes through the live
// country's physical intent and common route/visibility checks.
export function createCareerHandbook({careers,copperLedger,getClock,getService,
  onIntent=()=>{},onOpen=()=>{},document:doc=globalThis.document}) {
  const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const slot=make('div',null,'career-wallet-slot'),money=make('span',null,'career-money'),button=make('button','职业手册','career-open');
  button.type='button';button.setAttribute('aria-label','打开职业手册');slot.append(money,button);
  const dialog=make('dialog',null,'career-dialog'),feedback=make('div',null,'career-review-pop'),style=make('style');
  dialog.setAttribute('aria-label','职业手册与铨录登记');feedback.setAttribute('role','status');feedback.hidden=true;
  style.textContent='.career-wallet-slot{display:flex;align-items:center;gap:7px}.career-dialog{position:fixed;inset:0;margin:auto;width:min(520px,calc(100vw - max(28px,env(safe-area-inset-left)) - max(28px,env(safe-area-inset-right))));max-height:calc(100dvh - max(16px,env(safe-area-inset-top)) - max(16px,env(safe-area-inset-bottom)));overflow:auto;overscroll-behavior:contain;border:1px solid #baa476;border-radius:16px;padding:20px;background:#f5efde;color:#3e4d44}.career-dialog::backdrop{background:#253d3866}.career-dialog h2{margin:0 35px 6px 0;font-size:21px}.career-dialog h3{font-size:15px;margin:16px 0 8px}.career-dialog p{font-size:13px;line-height:1.65;margin:8px 0}.career-dialog button{min-height:44px;border-radius:9px;padding:9px 12px;background:#dedcc8;color:#344d44}.career-dialog button:focus-visible{outline:3px solid #3e7763;outline-offset:2px}.career-dialog .career-close{position:absolute;right:9px;top:8px;background:transparent;font-size:24px}.career-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:14px 0}.career-tabs button{flex:1;white-space:nowrap;font-size:12px}.career-tabs button[aria-pressed=true]{background:#3d6659;color:#fff9e7}.career-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.career-positive{color:#256742!important}.career-negative{color:#a13e36!important}.career-review-pop{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:24;max-width:calc(100vw - 56px);padding:12px 18px;border-radius:12px;background:#fff7e8;box-shadow:0 5px 25px #20372933;font-size:13px;pointer-events:none}@media(max-height:500px){.career-dialog{padding:14px 18px}.career-dialog h2{font-size:18px}.career-tabs{margin:8px 0}.career-dialog p{margin:6px 0}.career-dialog h3{margin:10px 0 6px}}';
  (doc.head||doc.body).append(style);doc.body.append(slot,dialog,feedback);
  let tab='duties',registration=false,signature='',reviewId=careers.state().lastEvaluation?.id||null,feedbackUntil=-1;
  const close=()=>{if(dialog.open)dialog.close();};
  const action=(kind)=>{const service=getService(),intent=service?.intent(kind);if(!intent)return null;const b=make('button',intent.action);b.type='button';b.onclick=()=>{close();onIntent(intent);};return b;};
  const stages={arrived:'已在班位候朝',attending:'正在随班听记',archive:'朝会完成，待回官署归档',ready:'归档完成，工钱待入账',paid:'今日履职已结清',missed:'本轮未完整履职，没有日薪'};
  function render(force=false) {
    const s=careers.state(),c=getClock(),d=s.lastDuty,hired=careers.isHired();
    const key=[s.revision,tab,registration,Math.floor(c.hour*60),!!getService()].join(':');if(!force&&key===signature)return;signature=key;
    dialog.replaceChildren();const x=make('button','×','career-close');x.type='button';x.setAttribute('aria-label','关闭职业手册');x.onclick=close;
    dialog.append(x,make('h2',registration?'承务官署 · 铨录登记':'职业手册 · 礼务录事'),make('p','九品礼务录事 · 架空长期职位（游戏设定，非史实品秩复原）'));
    const tabs=make('div',null,'career-tabs');
    for(const[id,title]of [['duties','职责'],['today','今日安排'],['reviews','评价'],['wage','工资'],['growth','成长']]){const b=make('button',title);b.type='button';b.setAttribute('aria-pressed',tab===id);b.onclick=()=>{tab=id;render(true);};tabs.append(b);}dialog.append(tabs);
    const text=(title,content)=>dialog.append(make('h3',title),make('p',content));
    if(tab==='duties'){
      text('长期任职 · 独立名额1',hired?'你已占用录事职位，可一直任职，也可在登记案办理离职。六位原任官员各守原职。':'现有一个专设空缺。成年人可凭礼仪与文书各2点申请，由登记簿给出录用或拒绝原因。');
      text('每日实际职责','11:30之前到正殿第七录事班位候朝，随六位官员行礼并听记；退朝后沿公共通路回官署，抄录归档8秒，再结算本日工资。');
      text('申请能力',`礼仪 ${s.skills.ritual}/2 · 文书 ${s.skills.writing}/2。藏书处完成一次读书得礼仪，翰墨书房完成一次习字得文书；做完酒楼两桌擦拭也积累待客礼仪。`);
    }else if(tab==='today'){
      text(`第${c.day+1}日 · 朝会11:30`,d?.day===c.day?stages[d.stage]||'等待本日安排':hired?(c.hour<11.5?'请预留从当前位置走到正殿的时间。11:25前到班可得勤勉奖励。':'本日朝会时刻已过。下一模拟日再提前赴班。'):'先在官署铨录登记案申请任职。');
      text('自己安排路程','点下方当前工作会走到实际操作位置；手动走到同一班位或案边也可按E。途中可以取消，岗位身份保留。错过或未完成当班不会自动领薪。');
      text('世界时钟','只在实际游玩地区时推进；离线、隐藏页面和回到世界地图时暂停。切换白天/夜晚只换灯光，不会变出工资日。');
    }else if(tab==='reviews'){
      const r=s.lastEvaluation;
      text('主管 · 沈叙（礼仪官）','性情认真，重视准时到班、完整听记和归档。评价来自这轮实际工作，关系好坏与付款各自记账。');
      if(r){const p=make('p',`${r.positive?'👍 好评':'👎 差评'} · 第${r.day+1}日 · ${r.reason}`,r.positive?'career-positive':'career-negative');dialog.append(p);}else dialog.append(make('p','尚无当班评价。读书、申请或重复查看手册不会制造评价。'));
      text('累计表现',`${s.performance??0}。每轮至多一次评价；完成得+1，已开始却中断或缺勤得−1。`);
    }else if(tab==='wage'){
      text('日薪 · 18–20铜文','完成本日朝仪与归档：18铜文；11:25前到班且完成全轮：另加2文，共20文。缺勤、中断或朝会未成：0文，不扣已有铜钱。');
      text('本日结算',d?.day===c.day?`${stages[d.stage]||''}${d.wage!=null?' · 核定'+d.wage+'铜文':''}`:'尚无本日工资记录。');
      text('按日发放','完整归档后自动入现有铜文账；若保存失败，会保留待领凭记，可回归档案重试。同一岗位同一天只入账一次。没有离线自动收入。');
    }else{
      text('学习门槛',`当前礼仪${s.skills.ritual}、文书${s.skills.writing}；本职位各需2。每次完整阅读/习字8秒才计一次，每技能每日最多4点，技能总计最多100点。`);
      text('成长记录',`已累计${s.promotionProgress??0}次有效成长记录。工作评价会影响以后可申请职位的条件；更高品级、晋升名额和门槛尚未开放，本批不能升官。`);
      text('起步与转职','中国酒楼帮工、法国园艺帮工仍是可选计件活。它们不挤走长期职位原任NPC，也不是所有国家的完整职业树。');
    }
    if(s.loadError)dialog.append(make('p','职业存档暂时无法核对，请保留当前存档后再试。','career-negative'));
    const actions=make('div',null,'career-actions');
    const kinds=registration?(hired?['resign']:['apply']):[];
    if(hired&&['today','duties','wage'].includes(tab)){const next=getService()?.intent();if(next&&next.kind!=='view')kinds.unshift(next.kind);}
    if(!registration&&hired)kinds.push('view');
    for(const kind of new Set(kinds)){const b=action(kind);if(b)actions.append(b);}dialog.append(actions);
    if(hired&&!getService())dialog.append(make('p','目前不在中国宫苑。回到承务官署后可办理与工作有关的操作。'));
  }
  function open(isRegistration=false){registration=isRegistration;tab=isRegistration?'duties':'today';onOpen();render(true);if(!dialog.open)dialog.showModal();}
  button.onclick=()=>open(false);dialog.addEventListener('cancel',()=>close());dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  return {open,close,isOpen:()=>!!dialog.open,
    update(mode){const s=careers.state(),r=s.lastEvaluation,c=getClock();slot.hidden=mode!=='lot';money.textContent=`${copperLedger.state().cash} 铜文`;money.setAttribute('aria-label',`手头${copperLedger.state().cash}铜文`);button.hidden=!careers.isHired();
      if(r&&r.id!==reviewId){reviewId=r.id;feedback.textContent=`${r.positive?'👍':'👎'} 沈叙：${r.reason}`;feedback.className='career-review-pop '+(r.positive?'career-positive':'career-negative');feedbackUntil=c.seconds+6;feedback.hidden=false;}
      if(c.seconds>=feedbackUntil||mode!=='lot')feedback.hidden=true;if(dialog.open)render();},
    dispose(){close();slot.remove();dialog.remove();feedback.remove();style.remove();},
  };
}
