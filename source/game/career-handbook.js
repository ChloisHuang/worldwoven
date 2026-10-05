import {FORMAL_CAREER_ROLES} from './formal-careers.js';
import {GAME_CURRENCIES} from './currency-ledger.js';

// The shared catalogue only reads career state. Applications and work still
// travel through the live country's physical intent and visibility checks.
const CLERK='cn-court-clerk',TAVERN='cn-tavern-steward',GARDEN='fr-garden-assistant';
const PLACES={
  [CLERK]:{country:'china',currency:'copper',workplace:'承务官署',employer:'沈叙（礼仪官）',destination:'承务官署 · 铨录登记案'},
  [TAVERN]:{country:'china',currency:'copper',workplace:'云来酒楼',employer:'许安',destination:'云来酒楼 · 许安的招工登记案'},
  [GARDEN]:{country:'france',currency:'france',workplace:'西苑',employer:'埃米尔',destination:'西苑工具架 · 埃米尔的园艺登记簿'},
};
const COUNTRIES={china:'中国',france:'法国'},SKILLS={ritual:'礼仪',writing:'文书',gardening:'园艺'};
const place=role=>({...PLACES[role?.id],...role});
const unit=role=>{const id=place(role).currency;return id==='copper'?'铜文':id==='france'?'法国券':GAME_CURRENCIES[id]?.unit||'';};
const wageRange=role=>`${role.wage}–${role.wage+(role.id===CLERK?2:1)}${unit(role)}`;
const requirements=role=>role.skillRequirements||role.requirements||{};
const employer=role=>place(role).employer||'岗位主管';
const isClerk=role=>role?.id===CLERK;
const stageText=(d,role)=>({arrived:'已在班位候朝',attending:'正在随班听记',archive:'朝会完成，待回官署归档',
  working:role?.id===GARDEN?'本轮园艺工作进行中：领取真实水壶、完成两畦浇花，再归还水壶':'本轮酒楼工作进行中：亲手完成两张指定桌面的擦拭',
  inspection:`职责已完成，待${employer(role)}当面验收`,ready:isClerk(role)?'归档完成，工资待钱庄入账':'验收完成，工资待账户入账',
  paid:'今日工资已存入账户',missed:'本轮未完整履职，没有日薪'}[d?.stage]||'等待本日安排');

export function createCareerHandbook({careers,copperLedger,getClock,getService,getCountry=()=>null,
  onIntent=()=>{},onOpen=()=>{},walletFactory=null,document:doc=globalThis.document}) {
  const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const slot=make('div',null,'career-wallet-slot'),money=make('span',null,'career-money'),button=make('button','职业手册','career-open');
  button.type='button';button.setAttribute('aria-label','打开职业手册');const wallet=walletFactory?.({mount:slot})||null;if(!wallet)slot.append(money);slot.append(button);
  const dialog=make('dialog',null,'career-dialog'),feedback=make('div',null,'career-review-pop'),style=make('style');
  dialog.setAttribute('aria-label','职业手册与正式职位登记');feedback.setAttribute('role','status');feedback.hidden=true;
  style.textContent='.career-wallet-slot{display:flex;align-items:center;gap:7px}.career-dialog{position:fixed;inset:0;margin:auto;width:min(520px,calc(100vw - max(28px,env(safe-area-inset-left)) - max(28px,env(safe-area-inset-right))));max-height:calc(100dvh - max(16px,env(safe-area-inset-top)) - max(16px,env(safe-area-inset-bottom)));overflow:auto;overscroll-behavior:contain;border:1px solid #baa476;border-radius:16px;padding:20px;background:#f5efde;color:#3e4d44}.career-dialog::backdrop{background:#253d3866}.career-dialog h2{margin:0 35px 6px 0;font-size:21px}.career-dialog h3{font-size:15px;margin:16px 0 8px}.career-dialog p{font-size:13px;line-height:1.65;margin:8px 0}.career-dialog button{min-height:44px;border-radius:9px;padding:9px 12px;background:#dedcc8;color:#344d44}.career-dialog button:focus-visible{outline:3px solid #3e7763;outline-offset:2px}.career-dialog .career-close{position:absolute;right:9px;top:8px;background:transparent;font-size:24px}.career-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:14px 0}.career-tabs button{flex:1;white-space:nowrap;font-size:12px}.career-tabs button[aria-pressed=true]{background:#3d6659;color:#fff9e7}.career-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.career-positive{color:#256742!important}.career-negative{color:#a13e36!important}.career-review-pop{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:24;max-width:calc(100vw - 56px);padding:12px 18px;border-radius:12px;background:#fff7e8;box-shadow:0 5px 25px #20372933;font-size:13px;pointer-events:none}@media(max-height:500px){.career-dialog{padding:14px 18px}.career-dialog h2{font-size:18px}.career-tabs{margin:8px 0}.career-dialog p{margin:6px 0}.career-dialog h3{margin:10px 0 6px}}';
  (doc.head||doc.body).append(style);doc.body.append(slot,dialog,feedback);
  let tab='catalogue',registrationRoleId=null,selectedRoleId=null,requestedCountry=null,signature='',generation=0;
  let reviewId=careers.state().lastEvaluation?.id||null,feedbackUntil=-1;
  const roles=()=>careers.catalogue?.()||FORMAL_CAREER_ROLES;
  const currentRole=(s,list)=>careers.currentRole?.()||list.find(r=>r.id===s.tenure?.roleId)||null;
  const localService=role=>{
    const country=getCountry();
    if(!role||country&&country!==place(role).country)return null;
    return getService?.(role.id)||null;
  };
  const close=()=>{generation++;if(dialog.open)dialog.close();};
  const buttonFor=(title,run)=>{const b=make('button',title);b.type='button';b.onclick=run;return b;};
  const action=(role,kind,label)=>{
    const intent=localService(role)?.intent(kind);if(!intent)return null;
    const token=generation;
    return buttonFor(label||intent.action,()=>{
      if(!dialog.open||token!==generation)return;
      const service=localService(role),next=service?.intent(kind);
      if(!next||next.id!==intent.id||next.intentKey!==intent.intentKey)return;
      close();onIntent(next);
    });
  };
  function render(force=false) {
    const s=careers.state(),c=getClock(),list=roles(),held=currentRole(s,list);
    const selected=list.find(r=>r.id===selectedRoleId)||held||list.find(r=>place(r).country===(requestedCountry||getCountry()))||list[0];
    if(!selected)return;
    selectedRoleId=selected.id;
    // Current work, salary and reviews always describe the actual tenure,
    // even when another country's vacancy is selected in the catalogue.
    const role=['today','reviews','wage'].includes(tab)?held||selected:selected;
    const hired=s.tenure?.roleId===role.id,d=s.lastDuty?.roleId===role.id?s.lastDuty:null;
    const pendingDuty=d&&d.day<c.day&&['inspection','ready'].includes(d.stage);
    const registration=registrationRoleId===role.id;
    const service=localService(role),key=[s.revision,tab,registrationRoleId,selected.id,held?.id,getCountry(),Math.floor(c.hour*60),!!service,service?.intent()?.intentKey,
      ...list.map(r=>`${r.id}:${r.vacancy}`)].join(':');
    if(!force&&key===signature)return;signature=key;generation++;
    dialog.replaceChildren();const x=buttonFor('×',close);x.className='career-close';x.setAttribute('aria-label','关闭职业手册');
    dialog.append(x,make('h2',tab==='catalogue'?'职业手册 · 正式职位目录':`${registration?'任职登记':'职业手册'} · ${role.name}`),
      make('p',tab==='catalogue'?'中国与法国的现有正式岗位 · 查看空缺、门槛与实际职责':isClerk(role)?'九品礼务录事 · 架空长期职位（游戏设定，非史实品秩复原）':`${COUNTRIES[place(role).country]||place(role).country} · ${place(role).workplace} · 常任助理职位`));
    const tabs=make('div',null,'career-tabs');
    for(const[id,title]of [['catalogue','职位目录'],['duties','职责'],['today','今日安排'],['reviews','评价'],['wage','工资'],['growth','成长']]){
      const b=buttonFor(title,()=>{tab=id;render(true);});b.setAttribute('aria-pressed',tab===id);tabs.append(b);
    }dialog.append(tabs);
    const text=(title,content)=>dialog.append(make('h3',title),make('p',content));
    const skillLine=r=>Object.entries(requirements(r)).map(([id,need])=>`${SKILLS[id]||id} ${s.skills[id]??0}/${need}`).join(' · ');
    const travel=r=>`从世界地图进入${COUNTRIES[place(r).country]||place(r).country}，前往${place(r).destination||place(r).workplace}办理。`;
    const registrationKind=r=>registrationRoleId!==r.id?null:s.tenure?.roleId===r.id?(isClerk(r)?'resign':'formal-resign'):!held?(isClerk(r)?'apply':'formal-apply'):null;
    if(tab==='catalogue'){
      text('任职规则',held?`你目前任职：${held.name}。同一时间只能任一份正式职位；转职需先回原岗位办理离职，已有技能保留。`:'每个岗位各有1个专设助理名额，现有NPC保留原职。须年满18岁，并在当地登记处核对技能与空缺。');
      const registrationRole=list.find(r=>r.id===registrationRoleId);
      if(registrationRole&&localService(registrationRole))text('当前登记',`${registrationRole.name} · ${employer(registrationRole)}。申请或离职按钮位于这一岗位下方；查看职责后也可继续办理。`);
      for(const item of list){
        const p=place(item),own=s.tenure?.roleId===item.id,vacancy=item.vacancy??(own?0:1);
        text(`${item.name}${item.id===selected.id?' · 已选':''}`,`${COUNTRIES[p.country]||p.country} · ${p.workplace} · 主管${employer(item)}。${own?'你已任职':`当前空缺 ${vacancy}/1`} · 日薪 ${wageRange(item)}。申请：${skillLine(item)}。`);
        const row=make('div',null,'career-actions');
        row.append(buttonFor('查看职责',()=>{selectedRoleId=item.id;tab='duties';render(true);}));
        const kind=registrationKind(item),apply=kind&&action(item,kind);if(apply)row.append(apply);
        const go=action(item,'view',`前往${p.workplace}登记`);if(go)row.append(go);else dialog.append(make('p',travel(item)));
        dialog.append(row);
      }
      text('日薪依据','完成真实职责并由主管验收后，工资自动存入对应币种账户。酒楼与园艺岗位在12:00前开始、完整完成本轮职责，可得1单位本币的准时奖励；礼务录事按11:25到班规则计奖。');
    }else if(tab==='duties'){
      const vacancy=role.vacancy??(hired?0:1);
      text('长期任职 · 独立名额1',hired?`你已占用${role.name}职位，可一直任职，也可回登记处办理离职。现有NPC各守原职。`:`当前空缺 ${vacancy}/1。成年人须在当地登记处核对申请条件；正在进行的临时活须先完成或取消。`);
      text('每日实际职责',isClerk(role)?'11:30之前到正殿第七录事班位候朝，随六位官员行礼并听记；退朝后沿公共通路回官署，抄录归档8秒，本日工资自动存入当地钱庄。':role.id===TAVERN?'06:00–18:00到云来酒楼许安处开工，亲自走到两张指定餐桌旁逐桌擦净，再回许安处当面验收。完成验收后才会把日薪存入铜钱账户。':'06:00–18:00到西苑埃米尔处开工，领取工具架上的真实浇水壶，亲自浇完两畦玫瑰、归还水壶，再找埃米尔验收。完成验收后才会把日薪存入法国券账户。');
      text('申请能力',`${skillLine(role)}。礼仪可通过藏书处读书或完成酒楼两桌擦拭积累；文书来自翰墨书房习字；园艺来自完整完成西苑浇花工作。`);
      text('登记地点',`${place(role).workplace} · ${employer(role)}。${service?'下方导航会带你走到实际登记位置，申请仍须在当地办理。':travel(role)}`);
    }else if(tab==='today'){
      const title=`第${c.day+1}日 · ${isClerk(role)?'朝会11:30':'开工06:00–18:00'}`;
      const next=!hired?`先前往${place(role).destination||place(role).workplace}申请${role.name}。`:isClerk(role)?c.hour<11.5?'请预留从当前位置走到正殿的时间。11:25前到班可得勤勉奖励。':'本日朝会时刻已过。下一模拟日再提前赴班。':c.hour<6?'06:00后到主管处开始本日工作。':c.hour<18?'先到主管处开工，再完成实际职责与验收。12:00前开工且完成全轮可得准时奖励。':'本日开工时段已过。下一模拟日再来办理。';
      text(title,pendingDuty?`第${d.day+1}日的工作仍待结清：${stageText(d,role)}。已完成的工作会保留；请先处理这份凭记，再开始新的班次。`:d?.day===c.day?d.reason==='court-postponed'?'朝会延期，本轮不计薪，也不记你的缺勤差评。':stageText(d,role):next);
      text('自己安排路程','点下方当前工作会走到实际操作位置；手动走到同一班位、工作台或登记处也可按E。途中可以取消，岗位身份保留。错过或未完成当班不会自动领薪。');
      text('世界时钟','只在实际游玩地区时推进；离线、隐藏页面和回到世界地图时暂停。切换白天/夜晚只换灯光，不会变出工资日。');
    }else if(tab==='reviews'){
      const r=s.lastEvaluation?.roleId===role.id?s.lastEvaluation:null;
      text(`主管 · ${isClerk(role)?'沈叙（礼仪官）':employer(role)}`,isClerk(role)?'性情认真，重视准时到班、完整听记和归档。评价来自这轮实际工作，关系好坏与付款各自记账。':`评价来自本轮的开工时间、实际完成情况与${employer(role)}的当面验收。未完整履职不会获得工资或好评。`);
      if(r){const p=make('p',`${r.positive?'👍 好评':'👎 差评'} · 第${r.day+1}日 · ${r.reason}`,r.positive?'career-positive':'career-negative');dialog.append(p);}else dialog.append(make('p','该职位尚无当班评价。查看手册或登记申请不会制造评价。'));
      text('累计表现',`${s.performance??0}。这是各次正式工作累计的表现记录；完整履职得+1，已开始却中断或缺勤得−1。`);
    }else if(tab==='wage'){
      text(`日薪 · ${wageRange(role)}`,isClerk(role)?'完成本日朝仪与归档：18铜文；11:25前到班且完成全轮：另加2文，共20文。缺勤、中断或朝会未成：0文，不扣已有铜钱。':`完成本轮真实职责并当面验收：${role.wage}${unit(role)}；12:00前开工且完成全轮：另加1${unit(role)}，共${role.wage+1}${unit(role)}。未完整完成或未验收：0，不扣已有余额。`);
      text(pendingDuty?`第${d.day+1}日 · 待结清工资`:'本日结算',d?.day===c.day||pendingDuty?`${stageText(d,role)}${d.wage!=null?' · 核定'+d.wage+unit(role):''}${pendingDuty?'。已完成工作不会因跨日消失；验收并结清后才能开始新班次。':''}`:'该职位尚无本日工资记录。');
      text('按日存入账户',role.id===GARDEN?'验收后自动存入法国券账户，不直接增加随身现金。法国目前没有实体钱庄；须前往中国钱庄，选择法国券账户取款后才会进入钱包。':'完整履职后自动存入铜钱账户，不直接增加随身现金；须前往中国的真实钱庄取款后才会进入钱包。');
      text('保存与结算','若保存失败，会保留应计凭记并自动重试；同一岗位同一天只入账一次。没有离线自动收入。');
      if(role.id===GARDEN)text('临时活与正式职位','原园艺临时活仍为每次6铜文；正式园艺岗位使用法国券计日薪，两种工作各按实际完成情况结算。');
    }else{
      text('技能与申请',`当前礼仪${s.skills.ritual??0}、文书${s.skills.writing??0}、园艺${s.skills.gardening??0}。${role.name}申请门槛：${skillLine(role)}。完整学习或实际完成工作才会积累技能。`);
      text('成长记录',`已累计${s.promotionProgress??0}次有效成长记录。正式工作的评价与技能会保留，可据此准备其他已开放职位。`);
      text('晋升 · 尚未开放','更高品级、主管职位与后续晋升名额均未开放。当前不能解锁新头衔；手册目录只列出实际可登记的三份正式职位。');
      text('起步与转职','中国酒楼帮工、法国园艺帮工仍是可选计件活。转入正式职位前，须先完成或取消手头的临时活；在职转岗须先回原岗位离职。原任NPC保留其职位。');
    }
    if(s.loadError)dialog.append(make('p','职业存档暂时无法核对，请保留当前存档后再试。','career-negative'));
    const actions=make('div',null,'career-actions'),kinds=[];
    if(hired&&['today','duties','wage'].includes(tab)){
      const next=service?.intent();if(next&&!['view','formal-view'].includes(next.kind))kinds.push(next.kind);
    }
    if(tab!=='catalogue'){const kind=registrationKind(role);if(kind)kinds.push(kind);}
    if(tab!=='catalogue')kinds.push('view');
    for(const kind of new Set(kinds)){const b=action(role,kind,kind==='view'?`前往${place(role).workplace}登记`:null);if(b)actions.append(b);}
    dialog.append(actions);
    if(hired&&!service)dialog.append(make('p',`你仍任职${role.name}。${travel(role)}工作须在岗位所在地区实际完成。`));
  }
  function open(options=false){
    wallet?.close();
    const s=careers.state(),list=roles(),held=currentRole(s,list);
    registrationRoleId=options===true?CLERK:options&&typeof options==='object'?options.roleId||null:null;
    requestedCountry=options&&typeof options==='object'?options.country||getCountry():getCountry();
    selectedRoleId=options===true?CLERK:options?.roleId||held?.id||list.find(r=>place(r).country===requestedCountry)?.id||list[0]?.id;
    tab=options===true?'duties':options&&typeof options==='object'?'catalogue':held?'today':'catalogue';
    onOpen();render(true);if(!dialog.open)dialog.showModal();
  }
  button.onclick=()=>open(false);dialog.addEventListener('cancel',()=>close());dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  return {open,close,isOpen:()=>!!dialog.open,
    update(mode){const s=careers.state(),r=s.lastEvaluation,c=getClock();slot.hidden=mode!=='lot';if(!wallet){money.textContent=`${copperLedger.state().cash} 铜文`;money.setAttribute('aria-label',`手头${copperLedger.state().cash}铜文`);}button.hidden=false;
      if(r&&r.id!==reviewId){reviewId=r.id;const role=roles().find(item=>item.id===r.roleId);feedback.textContent=`${r.positive?'👍':'👎'} ${employer(role)}：${r.reason}`;feedback.className='career-review-pop '+(r.positive?'career-positive':'career-negative');feedbackUntil=c.seconds+6;feedback.hidden=false;}
      if(c.seconds>=feedbackUntil||mode!=='lot')feedback.hidden=true;if(dialog.open)render();},
    dispose(){close();wallet?.dispose();slot.remove();dialog.remove();feedback.remove();style.remove();},
  };
}
