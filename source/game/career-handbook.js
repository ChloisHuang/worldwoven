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
const COUNTRIES={china:'中国',france:'法国'},SKILLS={ritual:'礼仪',writing:'文书',gardening:'园艺',art:'艺术'};
const place=role=>({...PLACES[role?.id],...role});
const unit=role=>{const id=place(role).currency;return id==='copper'?'铜文':id==='france'?'法国券':GAME_CURRENCIES[id]?.unit||'';};
const wageRange=role=>`${role.wage}–${role.wage+(role.id===CLERK?2:1)}${unit(role)}`;
const requirements=role=>role.skillRequirements||role.requirements||{};
const employer=role=>place(role).employer||'岗位主管';
const isClerk=role=>role?.id===CLERK;
const registryKind=role=>isClerk(role)?'view':'formal-view';
const dutySummary=role=>isClerk(role)?'11:30前赴班，随班行礼听记，退朝后回官署归档':role.id===TAVERN?'06:00–18:00开班，擦净两桌，再找许安当面验收':'06:00–18:00开班，领取原壶、浇两畦、归还，再找埃米尔验收';
const resultReason=code=>({'adult-required':'年龄未达要求','ritual-required':'礼仪未达要求','writing-required':'文书未达要求','gardening-required':'园艺未达要求','art-required':'艺术未达要求','already-employed':'已有正式职位，请先在原岗位办理离职','no-vacancy':'当前没有空缺','save-failed':'登记未能保存，请重试','async-save-unsupported':'登记未能保存，请重试','invalid-clock':'世界时钟暂不可用','invalid-career-state':'职业存档暂时无法核对'}[code]||'本次登记未完成，请稍后重试');
const stageText=(d,role)=>({arrived:'已在班位候朝',attending:'正在随班听记',archive:'朝会完成，待回官署归档',
  working:role?.id===GARDEN?'本轮园艺工作进行中：领取真实水壶、完成两畦浇花，再归还水壶':'本轮酒楼工作进行中：亲手完成两张指定桌面的擦拭',
  inspection:`职责已完成，待${employer(role)}当面验收`,ready:isClerk(role)?'归档完成，工资待钱庄入账':'验收完成，工资待账户入账',
  paid:'今日工资已存入账户',missed:'本轮未完整履职，没有日薪'}[d?.stage]||'等待本日安排');

export function createCareerHandbook({careers,copperLedger,getClock,getService,getCountry=()=>null,getPlayer=()=>null,
  onIntent=()=>{},onOpen=()=>{},walletFactory=null,document:doc=globalThis.document}) {
  const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const slot=make('div',null,'career-wallet-slot'),money=make('span',null,'career-money'),button=make('button',null,'career-open');
  // Original paper-and-quill emblem; only the artwork is visible in the HUD.
  const icon=make('span',null,'career-icon');icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" fill="none" focusable="false"><path d="M10 7 28 5l6 6-1 27-23 2-3-4V11z" fill="#ead6a5" stroke="#625846" stroke-width="1.7" stroke-linejoin="round"/><path d="m10 9 3-1v29l-3 1z" fill="#43685c"/><path d="m28 5-1 8 7-2" fill="#fff0c9" stroke="#625846" stroke-width="1.5" stroke-linejoin="round"/><path d="m16 20 11-1m-11 6 9-1m-9 6 5-.5" stroke="#aa9775" stroke-width="1.6" stroke-linecap="round"/><path d="M23 30c1-10 5-19 15-24 1 10-4 16-11 19l-4 5Z" fill="#739083" stroke="#3d5d50" stroke-width="1.5" stroke-linejoin="round"/><path d="M21 34 35 11m-9 15 5-1m-2-5 .5-5" stroke="#3d5d50" stroke-width="1.4" stroke-linecap="round"/></svg>';
  button.append(icon);
  button.type='button';button.setAttribute('aria-label','打开职业手册');const wallet=walletFactory?.({mount:slot})||null;if(!wallet)slot.append(money);slot.append(button);
  const dialog=make('dialog',null,'career-dialog'),feedback=make('div',null,'career-review-pop'),style=make('style');
  dialog.setAttribute('aria-label','职业手册与正式职位登记');feedback.setAttribute('role','status');feedback.hidden=true;
  style.textContent='.career-wallet-slot{display:flex;align-items:center;gap:7px}.career-dialog{position:fixed;inset:0;margin:auto;width:min(520px,calc(100vw - max(28px,env(safe-area-inset-left)) - max(28px,env(safe-area-inset-right))));max-height:calc(100dvh - max(16px,env(safe-area-inset-top)) - max(16px,env(safe-area-inset-bottom)));overflow:auto;overscroll-behavior:contain;border:1px solid #baa476;border-radius:16px;padding:20px;background:#f5efde;color:#3e4d44}.career-dialog::backdrop{background:#253d3866}.career-dialog h2{margin:0 35px 6px 0;font-size:21px}.career-dialog h3{font-size:15px;margin:16px 0 8px}.career-dialog p{font-size:13px;line-height:1.65;margin:8px 0}.career-dialog button{min-height:44px;border-radius:9px;padding:9px 12px;background:#dedcc8;color:#344d44}.career-dialog button:focus-visible{outline:3px solid #3e7763;outline-offset:2px}.career-dialog .career-close{position:absolute;right:9px;top:8px;background:transparent;font-size:24px}.career-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.career-positive{color:#256742!important}.career-negative{color:#a13e36!important}.career-review-pop{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:24;max-width:calc(100vw - 56px);padding:12px 18px;border-radius:12px;background:#fff7e8;box-shadow:0 5px 25px #20372933;font-size:13px;pointer-events:none}@media(max-height:500px){.career-dialog{padding:14px 18px}.career-dialog h2{font-size:18px}.career-dialog p{margin:6px 0}.career-dialog h3{margin:10px 0 6px}}';
  style.textContent+='.career-wallet-slot .career-open{display:grid;place-items:center;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;outline-offset:2px}.career-wallet-slot .career-open:hover,.career-wallet-slot .career-open:active{background:transparent;box-shadow:none}.career-icon{display:block;width:38px;height:38px;pointer-events:none}.career-icon svg{display:block;width:100%;height:100%}.career-role-card{padding:16px;margin:14px 0;border:1px solid #cbbd9d;border-radius:12px;background:#fffaf0}.career-role-card h3{margin:0 0 5px;font-size:18px}.career-role-place{color:#626a5c}.career-role-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.career-role-fact{padding:9px;border-radius:8px;background:#ecebdc}.career-role-fact span{display:block;font-size:12px;color:#656b5e}.career-role-fact strong{display:block;margin-top:4px;font-size:15px}.career-requirements{padding:10px 0;border-top:1px solid #d8cdb4;border-bottom:1px solid #d8cdb4}.career-requirement{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) auto;gap:8px;align-items:center;padding:5px 0;font-size:13px}.career-requirements h4{margin:0 0 6px;font-size:14px}.career-application-result{padding:10px 12px;border-radius:8px;background:#e9ecdb;font-weight:600}.career-dialog button:disabled{opacity:.55;cursor:not-allowed}.career-dialog .career-primary{background:#3d6659;color:#fff9e7}.career-role-card .career-actions{margin-top:12px}.career-empty{padding:14px;background:#ecebdc;border-radius:10px}';
  (doc.head||doc.body).append(style);doc.body.append(slot,dialog,feedback);
  let registrationRoleId=null,signature='',generation=0;
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
    const s=careers.state(),c=getClock(),list=roles(),held=currentRole(s,list),ageYears=getPlayer()?.ageYears,registrationMode=!!registrationRoleId;
    const country=getCountry(),localRoles=list.filter(r=>place(r).country===country);
    const role=held||localRoles.find(r=>r.id===registrationRoleId)||localRoles[0]||null;
    const hired=!!held,d=held&&s.lastDuty?.roleId===held.id?s.lastDuty:null;
    const pendingDuty=d&&d.day<c.day&&['inspection','ready'].includes(d.stage);
    const service=localService(role),key=[s.revision,registrationRoleId,held?.id,country,Math.floor(c.hour*60),!!service,service?.intent()?.intentKey,ageYears,JSON.stringify(careers.applicationResult?.()),
      ...localRoles.map(r=>`${r.id}:${r.vacancy}`)].join(':');
    if(!force&&key===signature)return;signature=key;generation++;
    dialog.replaceChildren();const x=buttonFor('×',close);x.className='career-close';x.setAttribute('aria-label','关闭职业手册');
    const heading=registrationMode?`${COUNTRIES[country]||'当地'}职业登记`:held?`职业手册 · ${held.name}`:'职业登记处';
    dialog.setAttribute('aria-label',heading);
    dialog.append(x,make('h2',heading),make('p',registrationMode?'本地岗位 · 到对应登记处提交申请':held?`${COUNTRIES[place(held).country]||place(held).country} · ${place(held).workplace}`:localRoles.length?'先到当地登记处了解岗位与申请条件。':'当地暂未开放正式职业登记。'));
    const text=(title,content)=>dialog.append(make('h3',title),make('p',content));
    const skillLine=r=>Object.entries(requirements(r)).map(([id,need])=>`${SKILLS[id]||id} ${s.skills[id]??0}/${need}`).join(' · ');
    const travel=r=>`从世界地图进入${COUNTRIES[place(r).country]||place(r).country}，前往${place(r).destination||place(r).workplace}办理。`;
    const registrationKind=r=>registrationRoleId!==r.id?null:s.tenure?.roleId===r.id?(isClerk(r)?'resign':'formal-resign'):!held?(isClerk(r)?'apply':'formal-apply'):null;
    const eligibility=r=>careers.eligibility?.(r.id,{ageYears})||{ok:false,code:'unavailable'};
    const applicationButton=r=>{
      const kind=registrationKind(r),b=kind&&action(r,kind);if(!b)return null;
      if(['apply','formal-apply'].includes(kind)&&!eligibility(r).ok){b.textContent='条件不足 · 暂不可申请';b.disabled=true;b.onclick=()=>{};}
      else b.className='career-primary';return b;
    };
    const showRequirements=(root,r)=>{
      const box=make('div',null,'career-requirements');box.append(make('h4','申请条件 · 当前 / 要求'));
      const values=[['年龄',Number.isFinite(ageYears)?ageYears:null,r.minimumAgeYears,'岁'],...Object.entries(requirements(r)).map(([id,need])=>[SKILLS[id]||id,s.skills[id]??0,need,'点'])];
      for(const[name,value,need,unit]of values){const pass=value!==null&&value>=need,row=make('div',null,'career-requirement');row.append(make('span',name),make('span',`${value===null?'待核对':value}${unit} / ${need}${unit}`),make('strong',pass?'已满足':'未满足',pass?'career-positive':'career-negative'));box.append(row);}
      root.append(box);
    };
    const showResult=(root,r)=>{
      const own=s.tenure?.roleId===r.id,check=eligibility(r),result=careers.applicationResult?.();
      const status=own?'已正式任职':check.ok?'条件已满足 · 可在本岗位登记处提交申请':(check.reasons||[check.code]).map(resultReason).join('；');
      root.append(make('p',status,own||check.ok?'career-positive':'career-negative'));
      if(result?.roleId===r.id&&(!result.ok||own)){
        const message=result.ok?'申请通过 · 正式任职已保存':`申请未通过 · ${held?'原有正式任职不变':'未建立正式任职'}。${(result.reasons||[result.code]).map(resultReason).join('；')}`;
        const notice=make('p',message,'career-application-result '+(result.ok?'career-positive':'career-negative'));notice.setAttribute('role','status');root.append(notice);
      }
    };
    if(!registrationMode&&!held){
      for(const item of localRoles){const go=action(item,registryKind(item),`前往${place(item).workplace}登记`);if(go)dialog.append(go);}
    }else if(registrationMode){
      text('当前正式任职',held?`${held.name}。同一时间只能任一份正式职位；转职需先回原岗位办理离职，已有技能保留。`:'暂无正式职位。临时帮工登记与正式任职分别记录。');
      const registrationRole=localRoles.find(r=>r.id===registrationRoleId);
      if(registrationRole&&localService(registrationRole))text('当前登记处',`${place(registrationRole).workplace} · ${employer(registrationRole)}。这里只办理${registrationRole.name}；其他岗位可前往对应登记处。`);
      for(const item of localRoles){
        const p=place(item),own=s.tenure?.roleId===item.id,vacancy=item.vacancy??(own?0:1),card=make('section',null,'career-role-card');
        card.append(make('h3',item.name),make('p',`${COUNTRIES[p.country]||p.country} · ${p.workplace} · 主管${employer(item)}`,'career-role-place'));
        const facts=make('div',null,'career-role-facts');for(const[label,value]of [['正式空缺',own?'本人在职':`${vacancy} / 1席`],['日薪 · 验收后存银行',wageRange(item)]]){const fact=make('div',null,'career-role-fact');fact.append(make('span',label),make('strong',value));facts.append(fact);}card.append(facts,make('p',`职责：${dutySummary(item)}`));
        showRequirements(card,item);showResult(card,item);
        const row=make('div',null,'career-actions');
        const apply=applicationButton(item);if(apply)row.append(apply);
        if(registrationRoleId!==item.id){const go=action(item,registryKind(item),`前往${p.workplace}登记`);if(go)row.append(go);else card.append(make('p',travel(item)));}
        card.append(row);dialog.append(card);
      }
      text('日薪依据','完成真实职责并由主管验收后，工资自动存入对应币种账户。临工仍按次结算；原有NPC各守原职，不会因玩家申请而消失。');
      if(!localRoles.length)dialog.append(make('p','当地暂未开放正式职业登记。'));
    }else if(held){
      text('当前工作',dutySummary(role));
      const job=service?.state?.().job;
      if(job?.formalRoleId===role.id){const progress=role.id===TAVERN?`${job.completedTables??0}/2桌已擦净`:role.id===GARDEN?`${job.completedBeds??0}/2畦已浇好`:null;if(progress)dialog.append(make('p',progress));}
      const title=`第${c.day+1}日 · ${isClerk(role)?'朝会11:30':'开工06:00–18:00'}`;
      const next=!hired?`先前往${place(role).destination||place(role).workplace}申请${role.name}。`:isClerk(role)?c.hour<11.5?'请预留从当前位置走到正殿的时间。11:25前到班可得勤勉奖励。':'本日朝会时刻已过。下一模拟日再提前赴班。':c.hour<6?'06:00后到主管处开始本日工作。':c.hour<18?'先到主管处开工，再完成实际职责与验收。12:00前开工且完成全轮可得准时奖励。':'本日开工时段已过。下一模拟日再来办理。';
      text(title,pendingDuty?`第${d.day+1}日的工作仍待结清：${stageText(d,role)}。已完成的工作会保留；请先处理这份凭记，再开始新的班次。`:d?.day===c.day?d.reason==='court-postponed'?'朝会延期，本轮不计薪，也不记你的缺勤差评。':stageText(d,role):next);

      const r=s.lastEvaluation?.roleId===role.id?s.lastEvaluation:null;
      text('工作评价',`主管 · ${employer(role)}`);
      if(r){const p=make('p',`${r.positive?'👍 好评':'👎 差评'} · 第${r.day+1}日 · ${r.reason}`,r.positive?'career-positive':'career-negative');dialog.append(p);}else dialog.append(make('p','该职位尚无当班评价。查看手册或登记申请不会制造评价。'));
      text('累计表现',`${s.performance??0}。这是各次正式工作累计的表现记录；完整履职得+1，已开始却中断或缺勤得−1。`);
      text(`银行薪资 · 日薪 ${wageRange(role)}`,isClerk(role)?'完成本日朝仪与归档：18铜文；11:25前到班且完成全轮：另加2文，共20文。缺勤、中断或朝会未成：0文，不扣已有铜钱。':`完成本轮真实职责并当面验收：${role.wage}${unit(role)}；12:00前开工且完成全轮：另加1${unit(role)}，共${role.wage+1}${unit(role)}。未完整完成或未验收：0，不扣已有余额。`);
      text(pendingDuty?`第${d.day+1}日 · 待结清工资`:'本日结算',d?.day===c.day||pendingDuty?`${stageText(d,role)}${d.wage!=null?' · 核定'+d.wage+unit(role):''}${pendingDuty?'。已完成工作不会因跨日消失；验收并结清后才能开始新班次。':''}`:'该职位尚无本日工资记录。');
      text('按日存入账户',role.id===GARDEN?'验收后自动存入法国券账户，不直接增加随身现金。可前往法国银行办理法国券账户取款后使用。':'完整履职后自动存入铜钱账户，不直接增加随身现金；须前往中国的真实钱庄取款后才会进入钱包。');
      text('晋升条件 · 尚未开放',`当前技能：${skillLine(role)}。累计${s.promotionProgress??0}次有效成长记录；后续晋升职位与条件尚未开放，当前保持本职头衔。`);
    }
    if(s.loadError)dialog.append(make('p','职业存档暂时无法核对，请保留当前存档后再试。','career-negative'));
    const actions=make('div',null,'career-actions'),kinds=[];
    if(hired&&!registrationMode){
      const next=service?.intent();if(next&&!['view','formal-view'].includes(next.kind))kinds.push(next.kind);
    }
    for(const kind of new Set(kinds)){const b=action(role,kind);if(b)actions.append(b);}
    dialog.append(actions);
    if(hired&&!service&&!registrationMode)dialog.append(make('p',`你仍任职${role.name}。${travel(role)}工作须在岗位所在地区实际完成。`));
  }
  function open(options=false){
    wallet?.close();
    registrationRoleId=options===true?CLERK:options&&typeof options==='object'?options.roleId||null:null;
    onOpen();render(true);if(!dialog.open)dialog.showModal();
  }
  button.onclick=()=>{
    const s=careers.state(),list=roles();if(currentRole(s,list))return open(false);
    const local=list.find(r=>place(r).country===getCountry()&&localService(r));
    const next=local&&localService(local)?.intent(registryKind(local));
    if(!next)return open(false);wallet?.close();close();onOpen();onIntent(next);
  };dialog.addEventListener('cancel',()=>close());dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  return {open,close,isOpen:()=>!!dialog.open,
    update(mode){const s=careers.state(),r=s.lastEvaluation,c=getClock();slot.hidden=mode!=='lot';if(!wallet){money.textContent=`${copperLedger.state().cash} 铜文`;money.setAttribute('aria-label',`手头${copperLedger.state().cash}铜文`);}const employed=!!s.tenure&&!s.loadError;button.hidden=!employed&&!roles().some(role=>place(role).country===getCountry()&&localService(role)?.intent(registryKind(role)));button.setAttribute('aria-label',employed?'打开当前职业手册':'前往当地职业登记处');
      if(r&&r.id!==reviewId){reviewId=r.id;const role=roles().find(item=>item.id===r.roleId);feedback.textContent=`${r.positive?'👍':'👎'} ${employer(role)}：${r.reason}`;feedback.className='career-review-pop '+(r.positive?'career-positive':'career-negative');feedbackUntil=c.seconds+6;feedback.hidden=false;}
      if(c.seconds>=feedbackUntil||mode!=='lot')feedback.hidden=true;if(dialog.open)render();},
    dispose(){close();wallet?.dispose();slot.remove();dialog.remove();feedback.remove();style.remove();},
  };
}
