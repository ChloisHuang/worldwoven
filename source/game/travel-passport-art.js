// The real booklet artwork is shared by the interactive UI and deterministic
// review renders. Text, seals and controls are printed inside the paper edges.
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const FONT="'Noto Serif CJK SC','Songti SC','STSong',serif";
const INK='#514d3e',MUTED='#837861',GREEN='#416758',GOLD='#d8bd79';
export function passportLines(value,width,font=22){
  const out=[];let line='',used=0;
  for(const c of String(value??'')){
    if(c==='\n'){out.push(line);line='';used=0;continue;}
    const advance=/[\u0020-\u007e]/.test(c)?font*.57:font;
    if(used+advance>width&&line){out.push(line.trimEnd());line='';used=0;}
    line+=c;used+=advance;
  }
  if(line||!out.length)out.push(line.trimEnd());return out;
}
export function passportMetrics(compact=false){
  const width=compact?560:960,height=compact?720:624,half=width/2;
  return {width,height,half,compact,left:compact?35:60,right:half+(compact?25:36),textWidth:half-(compact?65:98),font:22,line:32,top:compact?160:155,bottom:height-103};
}
function notePages(blocks,m){
  const pages=[];let rows=[],used=0;const capacity=Math.floor((m.bottom-m.top)/m.line);
  const finish=()=>{if(rows.length){pages.push({type:'notes',rows});rows=[];used=0;}};
  for(const block of blocks){
    const lines=passportLines(block.text,m.textWidth,block.kind==='heading'?24:m.font);
    // Keep a short source link together, so every visible link has one target.
    if(block.href&&lines.length<=capacity&&used+lines.length+1>capacity)finish();
    for(let i=0;i<lines.length;i++){
      if(used>=capacity)finish();
      rows.push({...block,sourceText:block.text,text:lines[i],line:used,first:i===0});used++;
    }
    if(used<capacity)used++;
  }
  finish();return pages;
}
export function buildPassportSpreads(view,notes=[],compact=false){
  const spreads=[{id:'identity',section:'identity',left:{type:'identity'},right:{type:'overview'}}];
  for(const region of view.regions){
    const records=region.activities,initial=records.slice(0,4);
    spreads.push({id:region.id+'-0',section:region.id,left:{type:'visa',region},right:{type:'activities',region,records:initial,offset:0}});
    for(let offset=4,index=1;offset<records.length;offset+=8,index++){
      spreads.push({id:region.id+'-'+index,section:region.id,left:{type:'activities',region,records:records.slice(offset,offset+4),offset},right:{type:'activities',region,records:records.slice(offset+4,offset+8),offset:offset+4}});
    }
  }
  const pages=notePages(notes,passportMetrics(compact));
  for(let i=0;i<pages.length;i+=2)spreads.push({id:'notes-'+i/2,section:'notes',left:pages[i],right:pages[i+1]||{type:'end'}});
  return spreads;
}
const text=(x,y,value,size=22,fill=INK,attrs='')=>`<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" ${attrs}>${esc(value)}</text>`;
const line=(x1,y1,x2,y2,color='#baae8d',extra='')=>`<path d="M${x1} ${y1}H${x2}" transform="translate(0 ${y2-y1})" fill="none" stroke="${color}" ${extra}/>`;
const svgImage=(svg,x,y,w,h=w,ink=GREEN)=>{
  const box=(svg.match(/viewBox="([^"]+)"/)?.[1]||'0 0 160 160').split(' ').map(Number);
  const paths=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'').replaceAll('currentColor',ink);
  const isPortrait=box[2]===64;
  return `<g transform="translate(${x} ${y}) scale(${w/box[2]} ${h/box[3]})" fill="${isPortrait?INK:'none'}" stroke="${isPortrait?'none':ink}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
};
function ruledPaper(m){
  const {width:w,height:h,half}=m;let s='';
  for(let y=151;y<h-70;y+=32)s+=line(42,y,w-42,y,'#9c916e','opacity=".055"');
  const wave=(cx,cy)=>Array.from({length:8},(_,i)=>`<ellipse cx="${cx}" cy="${cy}" rx="${42+i*7}" ry="${32+i*5}" fill="none" stroke="#928f69" stroke-width=".55" opacity=".10" transform="rotate(${i*19} ${cx} ${cy})"/>`).join('');
  return s+wave(half*.53,h*.59)+wave(half*1.5,h*.59);
}
function coverArt(m,cover){
  const {width:w,height:h,compact}=m,cw=compact?346:410,ch=h-40,x=(w-cw)/2,y=12;
  let s=`<rect x="${x+7}" y="${y+9}" width="${cw}" height="${ch}" rx="14" fill="#0c2624" opacity=".18"/><rect x="${x+4}" y="${y+4}" width="${cw}" height="${ch}" rx="13" fill="#c4b996"/><rect x="${x+2}" y="${y+2}" width="${cw}" height="${ch}" rx="12" fill="#e3d7b5"/><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="12" fill="url(#leather)" stroke="#244638" stroke-width="2"/>`;
  for(let i=x+12;i<x+cw-7;i+=5)s+=`<path d="M${i} ${y+10}v${ch-20}" stroke="#cfdbb1" stroke-width=".7" opacity="${i%2?.028:.04}"/>`;
  s+=`<path d="M${x+13} ${y+9}v${ch-18}" stroke="#173d34" stroke-width="8" opacity=".62"/><path d="M${x+20} ${y+10}v${ch-20}" stroke="#78a184" stroke-width="1" opacity=".40"/><rect x="${x+29}" y="${y+25}" width="${cw-52}" height="${ch-49}" rx="4" fill="none" stroke="${GOLD}" opacity=".5"/><rect x="${x+34}" y="${y+30}" width="${cw-62}" height="${ch-59}" rx="3" fill="none" stroke="${GOLD}" stroke-width=".65" opacity=".27"/>`;
  s+=text(w/2,y+106,'四 方 生 活',25,GOLD,'text-anchor="middle"');
  s+=svgImage(cover,w/2-96,y+151,192,192,GOLD);
  s+=text(w/2,y+392,'旅行护照',39,GOLD,'text-anchor="middle" letter-spacing="5"');
  s+=text(w/2,y+426,'WORLDWOVEN',14,GOLD,'text-anchor="middle" letter-spacing="3"');
  s+=text(w/2,y+ch-83,'把日常，收进旅途',18,GOLD,'text-anchor="middle" opacity=".8"');
  s+=text(w/2,y+ch-43,'轻触翻开  ›',17,GOLD,'text-anchor="middle"');
  s+=text(x+cw-43,y+55,'×',25,GOLD,'text-anchor="middle" opacity=".75"');
  return {art:s,hotspots:[{action:'open',label:'翻开旅行护照',x:x+25,y:y+70,w:cw-50,h:ch-100},{action:'close',label:'收好护照，继续探索',x:x+cw-70,y:y+20,w:52,h:48}]};
}
export function renderPassportBook({view,portrait='',stamps={},cover='',spread=null,index=0,count=1,compact=false,sections=[]}={}){
  const m=passportMetrics(compact),{width:w,height:h,half,textWidth:tw}=m;
  const hotspots=[],transcript=[];let art='';
  const defs=`<defs><linearGradient id="leather" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="#386957"/><stop offset=".52" stop-color="#2b5749"/><stop offset="1" stop-color="#204b40"/></linearGradient><linearGradient id="paperL"><stop stop-color="#eee4c6"/><stop offset=".14" stop-color="#faf3dd"/><stop offset=".86" stop-color="#f6eed7"/><stop offset="1" stop-color="#c8b997"/></linearGradient><linearGradient id="paperR"><stop stop-color="#b8a985"/><stop offset=".045" stop-color="#e6dcc0"/><stop offset=".16" stop-color="#faf4e1"/><stop offset="1" stop-color="#f1e7cd"/></linearGradient><linearGradient id="fold"><stop stop-color="#9b8b65" stop-opacity=".2"/><stop offset=".47" stop-color="#655c43" stop-opacity=".16"/><stop offset=".51" stop-color="#fffbea" stop-opacity=".7"/><stop offset="1" stop-color="#a0926a" stop-opacity="0"/></linearGradient><clipPath id="paperClip"><path d="M27 28Q${half-70} 13 ${half} 30Q${half+70} 13 ${w-27} 28V${h-37}Q${half+85} ${h-48} ${half} ${h-31}Q${half-85} ${h-48} 27 ${h-37}Z"/></clipPath></defs>`;
  if(!spread){
    const result=coverArt(m,cover);art=result.art;hotspots.push(...result.hotspots);transcript.push('四方生活 · 旅行护照。轻触翻开。');
  }else{
    // Each page includes its own complete contents, paper, corners and spine.
    art+=`<rect x="18" y="21" width="${w-30}" height="${h-30}" rx="11" fill="#102d28" opacity=".22"/><path d="M14 17Q${half-60} 4 ${half} 20Q${half+60} 4 ${w-14} 17V${h-23}Q${half+75} ${h-33} ${half} ${h-13}Q${half-75} ${h-33} 14 ${h-23}Z" fill="url(#leather)" stroke="#234d3d" stroke-width="3"/>`;
    for(let j=6;j>0;j-=2)art+=`<path d="M25 ${30+j}Q${half-65} ${16+j} ${half} ${32+j}Q${half+65} ${16+j} ${w-25} ${30+j}V${h-37+j}Q${half+85} ${h-48+j} ${half} ${h-31+j}Q${half-85} ${h-48+j} 25 ${h-37+j}Z" fill="${j%4?'#d8ccaa':'#f1e8cc'}" stroke="#a39874" stroke-width=".7"/>`;
    art+=`<path d="M27 28Q${half-70} 13 ${half} 30V${h-31}Q${half-85} ${h-48} 27 ${h-37}Z" fill="url(#paperL)"/><path d="M${half} 30Q${half+70} 13 ${w-27} 28V${h-37}Q${half+85} ${h-48} ${half} ${h-31}Z" fill="url(#paperR)"/>`;
    art+=`<g clip-path="url(#paperClip)">${ruledPaper(m)}`;
    const addLines=(value,x,y,font=22,color=INK,width=tw,attrs='')=>{const lines=passportLines(value,width,font);art+=lines.map((l,i)=>text(x,y+i*(font+9),l,font,color,attrs)).join('');return lines.length*(font+9);};
    const heading=(x,title,small='')=>{art+=text(x,113,title,compact?25:28,GREEN);if(small)art+=text(x,140,small,compact?12:14,MUTED,'letter-spacing="1.2"');art+=line(x,151,x+tw,151,'#b4a67e','opacity=".55"');};
    function physicalPage(page,side){
      const x=side?m.right:m.left,cx=side?half*1.5:half*.5;
      if(page.type==='identity'){
        heading(x,'旅人资料','TRAVELER');
        const pw=compact?116:126,ph=pw*76/64,py=175;
        art+=`<g transform="rotate(-2 ${cx} ${py+ph/2})"><rect x="${cx-pw/2-7}" y="${py-7}" width="${pw+14}" height="${ph+14}" fill="#fff8e5" stroke="#cfc1a0"/>${svgImage(portrait,cx-pw/2,py,pw,ph)}</g>`;
        art+=text(x,compact?355:369,'游戏称呼',16,MUTED);
        addLines(view.nickname,x,compact?390:404,compact?25:30,INK,tw);
        const footer=compact?565:495;
        art+=line(x,footer-25,x+tw,footer-25,'#b4a67e','opacity=".5"');
        addLines('四方之间，自在旅居',x,footer,compact?19:22,GREEN,tw);
        addLines('沿途的小事，都值得留念',x,footer+39,compact?17:18,MUTED,tw);
        transcript.push('游戏称呼：'+view.nickname,'四方之间，自在旅居');
      }else if(page.type==='overview'){
        heading(x,'沿途印记','PLACES & LITTLE MOMENTS');
        art+=text(x,182,`${view.visitedCount} / 4 个地区`,compact?20:23,GREEN);
        art+=text(x,212,`${view.activityCount} 枚日常印记`,compact?18:20,MUTED);
        const size=compact?78:95,step=compact?105:185,startY=compact?250:225;
        view.regions.forEach((r,i)=>{
          transcript.push(r.country+'，'+(r.visited?'已到访':'待启程'));
          const bx=x+(i%2)*step,by=startY+Math.floor(i/2)*(compact?157:150),mx=bx+(compact?40:63);
          art+=`<g opacity="${r.visited?'.93':'.28'}" transform="rotate(${parseFloat(r.tilt)||0} ${mx} ${by+size/2})">${svgImage(stamps[r.id]||'',mx-size/2,by,size,size,r.ink)}</g>`;
          art+=text(mx,by+size+25,r.country,compact?20:21,r.visited?r.ink:MUTED,'text-anchor="middle"');
          art+=text(mx,by+size+47,r.visited?'已到访':'待启程',compact?15:16,MUTED,'text-anchor="middle"');
          hotspots.push({action:'section',value:r.id,label:`翻到${r.country}，${r.visited?'已到访':'未到访'}`,x:bx-3,y:by-2,w:compact?92:145,h:size+52});
        });
        const cy=compact?613:544;
        addLines(view.clockLabel,x,cy,compact?15:17,MUTED,tw);transcript.push(view.clockLabel,`${view.visitedCount} / 4 个地区，${view.activityCount} 枚日常印记`);
      }else if(page.type==='visa'){
        const r=page.region;heading(x,r.country,r.en);addLines(r.place,x,189,compact?23:28,INK,tw);
        const size=compact?185:240,sy=compact?245:216;
        art+=`<g opacity="${r.visited?'.92':'.23'}" transform="rotate(${parseFloat(r.tilt)||0} ${cx} ${sy+size/2})">${svgImage(stamps[r.id]||'',cx-size/2,sy,size,size,r.ink)}</g>`;
        const fy=compact?480:473;
        addLines(r.visited?'已盖章 · 到访留念':'留白 · 等你来盖章',x,fy,compact?20:23,r.visited?r.ink:MUTED,tw);
        addLines(r.visited?'到访日期 · 未记录':'下一程，从这里开始',x,fy+45,compact?18:20,MUTED,tw);
        addLines(r.motif,x,compact?604:535,compact?17:18,MUTED,tw);transcript.push(r.country,r.place,r.visited?'已到访；到访日期未记录':'未到访');
      }else if(page.type==='activities'){
        const r=page.region;heading(x,'日常印记',r.country+' · LITTLE MOMENTS');
        art+=text(x,184,`${r.activities.length} 枚已收集`,compact?19:21,MUTED);
        if(!page.records.length){
          addLines(r.activities.length?'把空白留给下一段旅程':'这一页还留着空白',x,compact?291:285,22,GREEN,tw);
          addLines('去体验当地的小日常，完成后就会留下印记',x,compact?372:360,compact?19:21,MUTED,tw);
        }
        page.records.forEach((a,i)=>{
          const y=compact?234+i*86:227+i*78,tx=x+31;
          art+=`<circle cx="${x+11}" cy="${y-6}" r="11" fill="none" stroke="${r.ink}" stroke-width="1.2"/><path d="M${x+6} ${y-6}l4 4 7-9" fill="none" stroke="${r.ink}" stroke-width="1.6"/>`;
          addLines(a.label,tx,y,compact?20:22,INK,tw-31);
          art+=line(x,y+57,x+tw,y+57,'#b4a67e','stroke-dasharray="2 5" opacity=".5"');transcript.push(a.label);
        });
        addLines('完成的日常 · 未记录日期',x,compact?624:545,compact?15:17,MUTED,tw);
      }else if(page.type==='notes'){
        heading(x,'随身说明','FIELD NOTES');const linkGroups=[];
        for(const row of page.rows){
          const y=m.top+row.line*m.line+24,fill=row.href?GREEN:row.kind==='heading'?GREEN:INK,size=row.kind==='heading'?24:m.font;
          art+=text(x,y,row.text,size,fill);
          if(row.href){
            art+=line(x,y+5,Math.min(x+tw,x+[...row.text].reduce((n,c)=>n+(/[\u0020-\u007e]/.test(c)?size*.57:size),0)),y+5,'#718b70','opacity=".45"');
            const prior=linkGroups.at(-1);if(prior?.href===row.href&&prior.line===row.line-1){prior.line=row.line;prior.h+=m.line;}else linkGroups.push({action:'link',href:row.href,label:row.sourceText||row.text,x,y:y-23,w:tw,h:31,line:row.line});
          }
          transcript.push(row.text);
        }
        hotspots.push(...linkGroups);
      }else{
        heading(x,'旅途未完','TO BE CONTINUED');
        art+=svgImage(cover,cx-75,compact?270:230,150,150,'#b4b391');
        addLines('走过的地方，会留下印记',x,compact?476:435,compact?20:23,GREEN,tw);
        addLines('下一页，留给新的日常',x,compact?558:508,compact?18:21,MUTED,tw);
      }
    }
    physicalPage(spread.left,0);physicalPage(spread.right,1);
    art+='</g>';
    art+=`<rect x="${half-17}" y="28" width="38" height="${h-63}" fill="url(#fold)"/><path d="M${half} 35v${h-79}" stroke="#8d7f5b" stroke-width=".8" opacity=".42"/>`;
    for(let y=71;y<h-64;y+=76)art+=`<path d="M${half-3} ${y}q5 2 6 6" stroke="#ece2c7" stroke-width="1.5" fill="none"/>`;
    // Six narrow fabric ribbons sit in the book's top edge, not a tab bar.
    const ribbonColors=['#7b8b71',...view.regions.map(r=>r.ink),'#aa9163'];
    sections.forEach((section,i)=>{
      const cx=58+(i+.5)*(w-116)/sections.length,rw=compact?25:29,active=section.id===spread.section,ry=active?16:20,rh=active?47:37;
      art+=`<path d="M${cx-rw/2} ${ry}h${rw}v${rh}l${-rw/2} -7 -${rw/2} 7Z" fill="${ribbonColors[i]}" opacity="${active?'.96':'.63'}"/><path d="M${cx-rw/2+4} ${ry+2}v${rh-8}" stroke="#fff7de" stroke-width=".6" opacity=".35"/>`;
      art+=text(cx,ry+24,section.short,16,'#fff6dc','text-anchor="middle"');
      hotspots.push({action:'section',value:section.id,label:'翻到'+section.label,x:cx-27,y:14,w:54,h:52,current:active});
    });
    art+=text(w-60,88,'合上',compact?16:17,MUTED,'text-anchor="end"');
    hotspots.push({action:'close',label:'合上护照，继续探索',x:w-120,y:64,w:78,h:43});
    const fy=h-54;
    art+=text(51,fy,index?'‹ 翻页':'‹ 封面',compact?17:18,MUTED);
    art+=text(w-50,fy,index===count-1?'封底 ›':'翻页 ›',compact?17:18,MUTED,'text-anchor="end"');
    art+=text(half*.52,fy,`${index*2+1}`.padStart(2,'0'),15,MUTED,'text-anchor="middle"');
    art+=text(half*1.5,fy,`${index*2+2}`.padStart(2,'0'),15,MUTED,'text-anchor="middle"');
    art+=`<path d="M28 ${h-77}l33 35-33-1Z" fill="#e0d4b6" opacity=".7"/><path d="M${w-28} ${h-77}l-33 35 33-1Z" fill="#dfd1b0" opacity=".78"/>`;
    hotspots.push({action:'previous',label:index?'翻到护照上一页':'合回护照封面',x:28,y:h-90,w:130,h:58},{action:'next',label:index===count-1?'合回护照封面':'翻到护照下一页',x:w-158,y:h-90,w:130,h:58});
  }
  return {width:w,height:h,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${spread?'打开的四方旅行护照':'合起的四方旅行护照'}">${defs}${art}</svg>`,hotspots,transcript:transcript.join('。')};
}
