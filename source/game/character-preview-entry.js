/** Loaded only by the explicit same-site candidate query. */
import {CHARACTER_PREVIEW_ENABLED,PREVIEW_NPCS_ENABLED,previewQueryValue} from './character-preview-gate.js';
import {installActorPreview,setCharacterPreviewHeadLook} from './complete-adult/selection.js';
if(!CHARACTER_PREVIEW_ENABLED)throw new Error('Candidate entry requires character-preview=1');
const femaleHair=previewQueryValue('hair')==='long'?'long-layered':'gathered-updo',hairFlow=previewQueryValue('flow')!=='0';
installActorPreview({femaleHair,hairFlow,playerOnly:!PREVIEW_NPCS_ENABLED});
const style=document.createElement('style');style.textContent=`
.character-preview-label{position:fixed;z-index:18;left:50%;top:66px;transform:translateX(-50%);max-width:min(470px,92vw);padding:7px 11px;border:1px solid #b0bfa0;border-radius:11px;background:#fff9eaf2;color:#31504b;font:12px/1.45 system-ui;box-shadow:0 4px 15px #263c3522}.character-preview-label summary{cursor:pointer;font-weight:650}.character-preview-label p{margin:7px 0}.character-preview-label nav{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.character-preview-label a{color:#315e60}.character-preview-label label{display:flex;align-items:center;gap:5px}.character-preview-label input{width:84px}.character-preview-label output{display:block;margin-top:5px;color:#655334}
`;document.head.append(style);
const panel=document.createElement('details');panel.className='character-preview-label';
const summary=document.createElement('summary');summary.textContent=`人物候选 · 未定稿 · ${PREVIEW_NPCS_ENABLED?'玩家与NPC':'仅玩家'} · 独立预览存档`;panel.append(summary);
const note=document.createElement('p');note.textContent='在此试用新人物和十项外形微调，全部进度仅保留在本标签页的候选存档，正式存档不变。部分岗位衣发仍会回退。';panel.append(note);
const nav=document.createElement('nav');
for(const [label,key,value]of[['盘发','hair','updo'],['长发（适配裙装）','hair','long'],[hairFlow?'关闭发束层次':'开启发束层次','flow',hairFlow?'0':'1'],[PREVIEW_NPCS_ENABLED?'仅预览玩家':'也预览NPC','preview-npcs',PREVIEW_NPCS_ENABLED?'0':'1']]){const a=document.createElement('a'),url=new URL(location.href);url.searchParams.set(key,value);a.href=url.href;a.textContent=label;nav.append(a);}
const normal=document.createElement('a'),normalURL=new URL(location.href);for(const key of['character-preview','preview-npcs','hair','flow'])normalURL.searchParams.delete(key);normal.href=normalURL.href;normal.textContent='返回普通版本';nav.append(normal);
const label=document.createElement('label');label.textContent='转头';const range=document.createElement('input');range.type='range';range.min='-.6';range.max='.6';range.step='.02';range.value='0';range.setAttribute('aria-label','候选人物转头');range.oninput=()=>setCharacterPreviewHeadLook({yaw:Number(range.value),weight:1});label.append(range);nav.append(label);panel.append(nav);
const status=document.createElement('output');panel.append(status);panel.addEventListener('keydown',event=>event.stopPropagation());document.body.append(panel);
setInterval(()=>{const model=window.__worldsDays?.getState().playerModel;if(!model)return;status.textContent=model.applied?`当前玩家：候选人物 · ${model.previewHair==='long-layered'?'长发':model.previewHair==='gathered-updo'?'盘发':model.previewHair==='side-part'?'侧分':'原发型'}`:'当前玩家：此衣发组合尚未适配，暂用原人物';},400);
