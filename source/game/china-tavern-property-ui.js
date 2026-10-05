import {AIRY_UI_THEME} from './china-money-house-theme.js';
const messages={
 'already-applied-today':'今日申请已有答复，明日再议','seller-consent-required':'卖方尚未同意出售','insufficient-bank':'银行铜文不足，可先到钱庄存款','insufficient-npc-funds':'买方资金不足，报价无法成交',
 'insufficient-business-funds':'经营余额不足，先注入周转金','stale-property-intent':'账目已变化，请按当前报价重新操作','save-failed':'尚未成交，保存失败后可重试','async-save-unsupported':'尚未成交，保存暂不可用',
 'invalid-price':'请填写1至1000000之间的整数铜文','invalid-offer':'出价须为正整数，且不高于挂牌价','invalid-amount':'金额须为正整数','offer-unavailable':'这份报价已结束','unchanged':'挂牌价格没有变化',
};
export function createChinaTavernPropertyUI({property,canOperate=()=>true,isNearby=()=>true,onOpen=()=>{},notify=()=>{},document:doc=globalThis.document}) {
 const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
 const dialog=make('dialog',null,'cn-property-dialog ww-airy-theme'),style=make('style');dialog.setAttribute('aria-label','云来酒楼产权与经营账');
 style.textContent=AIRY_UI_THEME+`
.cn-property-dialog{position:fixed;inset:0;margin:auto;width:min(460px,calc(100vw - 28px));max-height:calc(100dvh - 28px);overflow:auto;overscroll-behavior:contain;border:1px solid #d0e1d8;border-radius:8px;padding:18px;background:#f4f9f1f7;box-shadow:0 4px 20px #345c651c;font-family:Georgia,"Songti SC",serif}
.cn-property-dialog::backdrop{background:#173b4945}.cn-property-dialog *{box-sizing:border-box}.cn-property-dialog h2{font-family:inherit;font-weight:600;font-size:22px;line-height:1.3;margin:0 34px 5px 0}.cn-property-dialog h3{font-size:15px;margin:15px 0 8px}.cn-property-dialog p{font-size:12px;line-height:1.45;margin:7px 0}.cn-property-dialog button,.cn-property-dialog input{font-family:inherit}.cn-property-dialog .ww-airy-action{font-size:13px;padding:8px 12px;letter-spacing:0;flex:1}.cn-property-close{position:absolute;right:8px;top:7px;width:44px;height:44px;padding:0;border:0;border-radius:0;background:transparent;color:#426b74;font-size:26px;box-shadow:none}.cn-property-close:active{background:#dfeee6}.cn-property-line{display:flex;align-items:center;gap:8px;margin:8px 0}.cn-property-line>span{flex:1;font-size:13px}.cn-property-price{flex:1;min-width:0;height:44px;border:0;border-bottom:1px solid #9abeb8;border-radius:0;background:transparent;font-size:18px;color:#285968;text-align:center;box-shadow:none}.cn-property-metrics{display:grid;grid-template-columns:1fr auto;gap:6px;margin:12px 0;font-size:13px}.cn-property-metrics dt{color:#70898c}.cn-property-metrics dd{margin:0;font-variant-numeric:tabular-nums}.cn-property-offer{border-top:1px solid #cbdeda;padding:6px 0}.cn-property-note{color:#70898c}.cn-property-dialog details{margin-top:12px;font-size:11px;color:#70898c}.cn-property-dialog summary{min-height:30px;cursor:pointer}.cn-property-dialog ol{padding-left:18px;line-height:1.6}.cn-property-status{min-height:18px;color:#416d70}
`;
 (doc.head||doc.body).append(style);doc.body.append(dialog);
 let generation=0,signature='',offerDraft=null,askDraft=null,feedback='',disposed=false;
 const close=()=>{generation++;if(dialog.open)dialog.close();};
 const button=(title,run,disabled=false,cls='ww-airy-action')=>{const e=make('button',title,cls),g=generation;e.type='button';e.disabled=disabled;e.onclick=()=>{if(!disposed&&dialog.open&&g===generation&&!e.disabled&&isNearby())run();};return e;};
 function perform(run,success) {
   if(!canOperate()){feedback='许安回案后即可办理';refresh(true);return;}
   const result=run();feedback=result?.ok?(typeof success==='function'?success(result):success||'已记入账簿'):messages[result?.code]||'账簿暂时无法核对，未执行交易';
   if(result?.ok)notify(feedback);refresh(true);
 }
 function amountRow(value,onChange,label,max=1000000) {
   const row=make('div',null,'cn-property-line'),input=make('input',null,'cn-property-price');input.type='number';input.min='1';input.max=String(max);input.step='1';input.inputMode='numeric';input.value=String(value);input.setAttribute('aria-label',label);
   const change=n=>{onChange(n);input.value=String(n);};input.oninput=()=>onChange(Number(input.value));
   row.append(button('−',()=>change(Math.max(1,Number(input.value)-10)),false,'ww-airy-step'),input,button('+',()=>change(Math.min(max,Number(input.value)+10)),false,'ww-airy-step'));return row;
 }
 function refresh(force=false) {
   if(!dialog.open&&!force)return;if(!isNearby()){close();return;}
   const daily=property.refreshDay(),s=property.state(),available=canOperate(),key=JSON.stringify([s.revision,s.balance,s.bank,s.loadError,available]);
   if(!force&&key===signature)return;signature=key;generation++;dialog.replaceChildren();
   dialog.append(button('×',close,false,'cn-property-close'),make('h2','云来酒楼'),make('p',`业主 ${s.ownerName||'待核对'} · 许安代管柜台`));
   if(s.loadError||!daily.ok){dialog.append(make('p','产权账簿暂时无法核对，请保留存档。'));return;}
   const m=s.market,revision=s.revision,owned=s.ownerId==='player';
   const metrics=make('dl',null,'cn-property-metrics');
   for(const [label,amount]of [['营业实收',s.revenue],['已付玩家工资',s.paidWages],['经营余额',s.balance],['你的银行',s.bank]])metrics.append(make('dt',label),make('dd',`${amount} 文`));
   dialog.append(metrics);
   if(!available)dialog.append(make('p','许安回案后即可办理','cn-property-note'));
   if(!owned) {
     dialog.append(make('h3',`第${m.day+1}日挂牌 · ${m.price}文`));
     const app=m.application;
     if(!app) {
       offerDraft=Math.min(offerDraft??m.price,m.price);dialog.append(amountRow(offerDraft,v=>offerDraft=v,'申请购买出价（铜文）',m.price));
       dialog.append(button('向业主申请购买',()=>perform(()=>property.applyPurchase(offerDraft,revision),r=>r.application.status==='accepted'?`${s.ownerName}同意了，确认付款后交割`:`${s.ownerName}婉拒了这次申请`),!available));
     } else {
       dialog.append(make('p',app.status==='accepted'?`${s.ownerName}同意 ${app.amount} 文出售`:`${s.ownerName}已婉拒 · ${app.reason==='price-too-low'?'出价未达预期':'今日想继续经营'}`));
       if(app.status==='accepted')dialog.append(button(`支付 ${app.amount} 文 · 买下酒楼`,()=>perform(()=>property.confirmPurchase(revision),'产权已交割，许安继续代管柜台'),!available));
     }
   } else {
     dialog.append(make('h3','经营与转让'));
     const actions=make('div',null,'cn-property-line');actions.append(button('注资 20 文',()=>perform(()=>property.invest(20,revision),'20文周转金已入经营账'),!available||s.bank<20),button('提取 10 文',()=>perform(()=>property.draw(10,revision),'10文经营结余已入银行'),!available||s.balance<10));dialog.append(actions);
     askDraft=askDraft??m.price??360;dialog.append(amountRow(askDraft,v=>askDraft=v,'酒楼挂牌价（铜文）'));
     const listing=make('div',null,'cn-property-line');listing.append(button(m.price===null?'挂牌出售':`改价 · 当前 ${m.price} 文`,()=>perform(()=>property.setPrice(askDraft,revision),'挂牌价已保存'),!available));
     if(m.price!==null)listing.append(button('降价一成',()=>{askDraft=Math.max(1,Math.floor(m.price*.9));perform(()=>property.setPrice(askDraft,revision),'新的折价已挂牌');},!available));dialog.append(listing);
     if(m.price!==null) {
       for(const o of m.offers){const row=make('div',null,'cn-property-offer');row.append(make('p',`${s.npcNames[o.buyerId]} · 出价 ${o.amount} 文${o.amount<m.price?'（折价）':''}${o.status==='rejected'?' · 已拒绝':''}`));
         if(o.status==='open'){const controls=make('div',null,'cn-property-line');controls.append(button('拒绝',()=>perform(()=>property.replyOffer(o.id,false,revision),'已拒绝这份报价'),!available),button(`收 ${o.amount} 文 · 出售`,()=>perform(()=>property.replyOffer(o.id,true,revision),`已转让给${s.npcNames[o.buyerId]}，款项存入银行`),!available||o.amount>s.npcFunds[o.buyerId]));row.append(controls);}dialog.append(row);}
       dialog.append(button('撤下挂牌',()=>perform(()=>property.setPrice(null,revision),'已撤下挂牌'),!available));
     }
   }
   const status=make('p',feedback,'cn-property-status');status.setAttribute('role','status');dialog.append(status);
   const details=make('details');details.append(make('summary','账簿与经营范围'),make('p','转让含店内经营余额；个人款项从银行收付。许安继续柜台服务，产权不会自动接班。'),make('p','当前成本记实际玩家工资；全员NPC日薪、食材成本和招聘管理尚未开放。'));
   const history=make('ol');for(const e of s.events.slice(-6).reverse()){const text=e.kind==='transfer'?`${s.npcNames[e.from]||'你'} → ${s.npcNames[e.to]||'你'} · 转让 ${e.amount} 文`:e.kind==='wage'?`支付玩家工资 ${e.amount} 文`:e.kind==='invest'?`注入经营账 ${e.amount} 文`:`提取到银行 ${e.amount} 文`;history.append(make('li',text));}details.append(history);dialog.append(details);
 }
 function open(){if(disposed||!isNearby())return false;feedback='';offerDraft=null;askDraft=null;onOpen();if(!dialog.open)dialog.showModal();refresh(true);return true;}
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});return {open,close,refresh,isOpen:()=>!!dialog.open,dispose(){disposed=true;close();dialog.remove();style.remove();}};
}
