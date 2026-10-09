// Regressions: a new grade must not move people, open high-office jobs, or show
// an old title beside a new wage. Pure module/DOM fixtures, not visual QA.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,context,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,context);}});
const {CHINA_OFFICIAL_GRADES:G,CHINA_OFFICIAL_GRADE_PAY_V1:PAY,CHINA_COURT_OFFICIAL_RANKS:R,getChinaRecordsCareerRank}=await import('../source/game/china-official-ranks.js');
const {CHINA_COURT_OFFICIALS:PEOPLE,chinaCourtOfficialStations}=await import('../source/game/china-palace-audience.js');
const {CHINA_OFFICIAL_BUREAU:B}=await import('../source/game/china-official-bureau.js');
const {FORMAL_CAREER_ROLES}=await import('../source/game/formal-careers.js');
const {appendCourtRankReference}=await import('../source/game/official-career-panel.js');
assert.equal(G.length,18);assert.equal(new Set(G.map(g=>g.gradeId)).size,18);
assert.deepEqual([...G].sort((a,b)=>b.gradeOrder-a.gradeOrder).map(g=>PAY[g.gradeId]),[18,22,26,30,34,38,42,48,56,64,76,88,104,120,144,168,200,240]);
assert.equal(getChinaRecordsCareerRank('cn-records-junior').basePay,18);
assert.equal(getChinaRecordsCareerRank('cn-records-regular').basePay,22);
const expected=[
 ['cn-minister-works','顾衡','工务主官','正二品',168],
 ['cn-minister-granary','许知远','仓务总管','正三品',120],
 ['cn-official-rites','沈叙','礼仪主管','正四品',88],
 ['cn-official-personnel','陆谦','吏务主管','正五品',64],
 ['cn-official-justice','周惟正','刑名主官','正二品',168],
 ['cn-official-records','宋承简','文书承办官','正七品',38],
];
const stations=chinaCourtOfficialStations();
expected.forEach(([id,name,title,grade,wage],i)=>{
 assert.equal(PEOPLE[i].id,id);assert.equal(R[i].actorId,id);
 assert.equal(PEOPLE[i].npcName,`${name} · ${title}（${grade}）`);
 assert.equal(PEOPLE[i].currentWage,wage);assert.equal(stations[i].officialRoleLabel,title);
 assert.deepEqual(stations[i].position,B.offices[i]);assert.equal(stations[i].gradeId,R[i].gradeId);
 assert.equal(R[i].automaticPromotion,false);assert(R[i].implemented&&R[i].remaining);
});
assert.equal(FORMAL_CAREER_ROLES.filter(r=>r.rankId).length,1,'No high office is opened by the grade catalogue');
assert.equal(FORMAL_CAREER_ROLES.some(r=>r.id==='cn-palace-scribe'),false,'Unapproved Wen career draft stays isolated');
const make=(tag,text='',className='')=>({tag,textContent:text||'',className,children:[],append(...items){this.children.push(...items);}});
const flatten=n=>[n,...n.children.flatMap(flatten)],text=n=>flatten(n).map(n=>n.textContent).join('\n');
for(const [policy,day,notice] of [[null,2,'尚未保存'],[{effectiveDay:3},2,'第4日'],[{effectiveDay:3},3,'历史已付']]){
 const panel={body:make('div')};appendCourtRankReference({panel,make,policy,day});
 const root=panel.body.children[0];assert.equal(root.tag,'details');assert.notEqual(root.open,true);
 assert(text(root).includes(notice));assert(text(root).includes('从九品 18文 · 正九品 22文'));
 assert(text(root).includes('从一品 200文 · 正一品 240文'));
 assert(text(root).includes('工务主官 · 正二品 · 新俸168文'));
 assert(text(root).includes('当前可玩升阶只到正九品'));
 assert(text(root).includes('当前仅工务和仓务两人有奏报'));
 assert(text(root).includes('真实已报案件的交办、实据复核与具名意见归档'));assert(text(root).includes('完整审理与裁决权限链；现有复核不追加刑罚'));
 assert(!flatten(root).some(n=>n.tag==='button'),'Salary reference is not an application or rank-grant button');
}
console.log('PASS 18-grade curve, six stable identities/physical slots, shared titles, bounded player vacancies and honest read-only court reference');

// The audit is a read-only record of original paid duties, never a wage gate.
for(const [result,received,notice] of [[null,null,'待许知远本人'],[{actorId:'cn-minister-granary'},null,'待实际朝会'],[{actorId:'cn-minister-granary'},{day:7},'皇帝已收讫']]){
 const panel={body:make('div')},granaryAudit={batches:[{id:'cn-granary-audit-2',receipts:[{day:2,amount:24},{day:6,amount:120}],result,...(received?{received}:{})}]};
 appendCourtRankReference({panel,make,granaryAudit});const shown=text(panel.body);
 assert(shown.includes('第2批'));assert(shown.includes('职责日3、7'));assert(shown.includes('已入账2份、合144文'));assert(shown.includes(notice));assert(shown.includes('职责日期不是到账日期'));assert(!flatten(panel.body).some(n=>n.tag==='button'));
}
const damagedPanel={body:make('div')};appendCourtRankReference({panel:damagedPanel,make,granaryAudit:{loadError:'invalid-saved-state'}});assert(text(damagedPanel.body).includes('暂时无法核验'));
console.log('PASS audit panel distinguishes waiting/read/received, original late duty dates and amounts, no wage/appointment action');
