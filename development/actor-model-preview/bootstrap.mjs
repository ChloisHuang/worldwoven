import {installActorPreview,setCharacterPreviewHeadLook} from './selection.mjs';
const query=new URLSearchParams(location.search),femaleHair=query.get('hair')==='long'?'long-layered':'gathered-updo',hairFlow=query.get('flow')!=='0';
installActorPreview({femaleHair,hairFlow});
const style=document.createElement('style');style.textContent=`
.actor-dev-panel{position:fixed;z-index:18;left:50%;top:68px;transform:translateX(-50%);max-width:min(560px,94vw);padding:8px 12px;border:1px solid #8d9a9b;border-radius:12px;background:#173a45ec;color:#f2e9d5;font:12px/1.45 system-ui;box-shadow:0 6px 16px #0003}.actor-dev-panel summary{cursor:pointer;font-weight:650}.actor-dev-panel p{margin:5px 0}.actor-dev-panel nav{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.actor-dev-panel a{color:#dbe6bb}.actor-dev-panel label{display:flex;align-items:center;gap:8px}.actor-dev-panel input{width:100px}.actor-dev-panel button{padding:3px 8px}.actor-dev-panel output{display:block;color:#eed7a5}
`;document.head.append(style);
const panel=document.createElement('details');panel.className='actor-dev-panel';panel.open=true;
const summary=document.createElement('summary');summary.textContent='人物开发预览 · 仅本云端 · 未发布';panel.append(summary);
const description=document.createElement('p');description.textContent='临时显示男侧分、女盘发；长发只用于匹配裙装。原存档发型、身份和发色保留，未适配岗位会回退。';panel.append(description);
const nav=document.createElement('nav');
for(const [label,key,value]of[['盘发版本','hair','updo'],['长发版本','hair','long'],[hairFlow?'关闭发束层次':'开启发束层次','flow',hairFlow?'0':'1']]){const link=document.createElement('a'),url=new URL(location.href);url.searchParams.set(key,value);link.href=url.href;link.textContent=label+'（重载）';nav.append(link);}
const label=document.createElement('label');label.textContent='转头';const range=document.createElement('input');range.type='range';range.min='-.6';range.max='.6';range.step='.02';range.value='0';range.setAttribute('aria-label','开发预览转头');range.oninput=()=>setCharacterPreviewHeadLook({yaw:Number(range.value),weight:1});label.append(range);nav.append(label);
const clear=document.createElement('button');clear.textContent='复位';clear.onclick=()=>{range.value='0';setCharacterPreviewHeadLook(null);};nav.append(clear);panel.append(nav);
const status=document.createElement('output');status.textContent='进入地区后，可用原人物面板的十个拉杆调整候选。';panel.append(status);panel.addEventListener('keydown',event=>event.stopPropagation());document.body.append(panel);
await import('../../source/game/main.js');
setInterval(()=>{const state=window.__worldsDays?.getState(),model=state?.playerModel;if(!model)return;status.textContent=model.applied?`当前玩家：新模型 · ${model.previewHair==='long-layered'?'长发':model.previewHair==='gathered-updo'?'盘发':model.previewHair==='side-part'?'侧分':'原发型'} · 发束层次${model.hairFlow?'开启':'关闭'}`:`当前玩家：原模型回退（${model.reason||'未适配'}）`;},300);
