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
  // Pagination is over physical sheets, never over a fixed set of countries.
  // The first opening has an inside-cover note and the identity sheet.
  const pages=[{id:'inside-cover',type:'intro'},{id:'identity',type:'identity'}];
  const continuationCount=compact?6:8;
  for(const region of view.regions){
    pages.push({id:region.id,type:'visa',region,records:region.activities.slice(0,4)});
    for(let offset=4;offset<region.activities.length;offset+=continuationCount){
      pages.push({id:region.id+'-records-'+offset,type:'activities',region,records:region.activities.slice(offset,offset+continuationCount),offset});
    }
  }
  pages.push(...notePages(notes,passportMetrics(compact)));
  const spreads=[];
  for(let i=0;i<pages.length;i+=2){
    const left=pages[i],right=pages[i+1]||{type:'end'};
    spreads.push({id:'pages-'+i/2,left,right,hasNotes:left.type==='notes'||right.type==='notes'});
  }
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
function rigidCover(m,side='right'){
  const {width:w,height:h,half}=m,x=side==='right'?half-2:14,cw=half-12;
  return `<rect x="${x+2}" y="21" width="${cw}" height="${h-39}" rx="10" fill="#173c32"/><rect x="${x}" y="17" width="${cw}" height="${h-40}" rx="9" fill="url(#leather)" stroke="#234d3d" stroke-width="2"/><rect x="${x+7}" y="24" width="${cw-14}" height="${h-54}" rx="4" fill="none" stroke="#8ca484" stroke-width=".8" opacity=".45"/>`;
}
function coverArt(m,cover){
  const {width:w,height:h,half}=m,cw=half-14,ch=h-40,x=half,y=17,cx=x+cw/2;
  // Cover and open halves have the same dimensions. Every paper edge lies
  // inside this rigid board, including when the book is fully closed.
  let s=`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="9" fill="url(#leather)" stroke="#244638" stroke-width="2"/>`;
  for(let i=x+12;i<x+cw-7;i+=5)s+=`<path d="M${i} ${y+10}v${ch-20}" stroke="#cfdbb1" stroke-width=".7" opacity="${i%2?.028:.04}"/>`;
  s+=`<path d="M${x+9} ${y+9}v${ch-18}" stroke="#173d34" stroke-width="7" opacity=".62"/><path d="M${x+16} ${y+10}v${ch-20}" stroke="#78a184" stroke-width="1" opacity=".40"/><rect x="${x+25}" y="${y+25}" width="${cw-47}" height="${ch-49}" rx="4" fill="none" stroke="${GOLD}" opacity=".5"/><rect x="${x+30}" y="${y+30}" width="${cw-57}" height="${ch-59}" rx="3" fill="none" stroke="${GOLD}" stroke-width=".65" opacity=".27"/>`;
  s+=text(cx,y+106,'四 方 生 活',25,GOLD,'text-anchor="middle"');
  s+=svgImage(cover,cx-86,y+151,172,172,GOLD);
  s+=text(cx,y+392,'旅行护照',35,GOLD,'text-anchor="middle" letter-spacing="3"');
  s+=text(cx,y+426,'WORLDWOVEN',14,GOLD,'text-anchor="middle" letter-spacing="3"');
  s+=text(cx,y+ch-83,'把日常，收进旅途',18,GOLD,'text-anchor="middle" opacity=".8"');
  s+=text(cx,y+ch-43,'轻触翻开  ›',17,GOLD,'text-anchor="middle"');
  s+=text(x+cw-43,y+55,'×',25,GOLD,'text-anchor="middle" opacity=".75"');
  const shift=-cw/2;
  return {art:s,shift,hotspots:[{action:'open',label:'翻开旅行护照',x:x+shift+25,y:y+70,w:cw-50,h:ch-100},{action:'close',label:'收好护照，继续探索',x:x+shift+cw-70,y:y+20,w:52,h:48}]};
}
export function renderPassportBook({view,portrait='',stamps={},cover='',spread=null,index=0,count=1,compact=false}={}){
  const m=passportMetrics(compact),{width:w,height:h,half,textWidth:tw}=m;
  const hotspots=[],transcript=[];let art='',backing='',paper='';
  const coverFace=coverArt(m,cover);
  const defs=`<defs><linearGradient id="leather" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="#386957"/><stop offset=".52" stop-color="#2b5749"/><stop offset="1" stop-color="#204b40"/></linearGradient><linearGradient id="paperL"><stop stop-color="#eee4c6"/><stop offset=".14" stop-color="#faf3dd"/><stop offset=".86" stop-color="#f6eed7"/><stop offset="1" stop-color="#c8b997"/></linearGradient><linearGradient id="paperR"><stop stop-color="#b8a985"/><stop offset=".045" stop-color="#e6dcc0"/><stop offset=".16" stop-color="#faf4e1"/><stop offset="1" stop-color="#f1e7cd"/></linearGradient><linearGradient id="fold"><stop stop-color="#9b8b65" stop-opacity=".2"/><stop offset=".47" stop-color="#655c43" stop-opacity=".16"/><stop offset=".51" stop-color="#fffbea" stop-opacity=".7"/><stop offset="1" stop-color="#a0926a" stop-opacity="0"/></linearGradient><clipPath id="paperClip"><path d="M27 28Q${half-70} 13 ${half} 30Q${half+70} 13 ${w-27} 28V${h-37}Q${half+85} ${h-48} ${half} ${h-31}Q${half-85} ${h-48} 27 ${h-37}Z"/></clipPath></defs>`;
  if(!spread){
    art=`<g transform="translate(${coverFace.shift} 0)">${rigidCover(m)}${coverFace.art}</g>`;hotspots.push(...coverFace.hotspots);transcript.push('四方生活 · 旅行护照。轻触翻开。');
  }else{
    // Each page includes its own complete contents, paper, corners and spine.
    art+=rigidCover(m,'left')+rigidCover(m);
    for(let j=6;j>0;j-=2)art+=`<path d="M25 ${30+j}Q${half-65} ${16+j} ${half} ${32+j}Q${half+65} ${16+j} ${w-25} ${30+j}V${h-37+j}Q${half+85} ${h-48+j} ${half} ${h-31+j}Q${half-85} ${h-48+j} 25 ${h-37+j}Z" fill="${j%4?'#d8ccaa':'#f1e8cc'}" stroke="#a39874" stroke-width=".7"/>`;
    backing=art;art='';
    art+=`<path d="M27 28Q${half-70} 13 ${half} 30V${h-31}Q${half-85} ${h-48} 27 ${h-37}Z" fill="url(#paperL)"/><path d="M${half} 30Q${half+70} 13 ${w-27} 28V${h-37}Q${half+85} ${h-48} ${half} ${h-31}Z" fill="url(#paperR)"/>`;
    art+=`<g clip-path="url(#paperClip)">${ruledPaper(m)}`;
    const addLines=(value,x,y,font=22,color=INK,width=tw,attrs='')=>{const lines=passportLines(value,width,font);art+=lines.map((l,i)=>text(x,y+i*(font+9),l,font,color,attrs)).join('');return lines.length*(font+9);};
    const heading=(x,title,small='')=>{art+=text(x,113,title,compact?25:28,GREEN);if(small)art+=text(x,140,small,compact?12:14,MUTED,'letter-spacing="1.2"');art+=line(x,151,x+tw,151,'#b4a67e','opacity=".55"');};
    function physicalPage(page,side){
      const x=side?m.right:m.left,cx=side?half*1.5:half*.5;
      if(page.type==='identity'){
        heading(x,'旅人资料','TRAVELER');
        const pw=compact?116:126,ph=pw*76/64,py=175;
        art+=`<g transform="rotate(-2 ${cx} ${py+ph/2})"><rect x="${cx-pw/2-7}" y="${py-7}" width="${pw+14}" height="${ph+14}" fill="#fff8e5" stroke="#cfc1a0"/>`;
        if(typeof portrait==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(portrait))art+=`<image x="${cx-pw/2}" y="${py}" width="${pw}" height="${ph}" href="${esc(portrait)}" preserveAspectRatio="xMidYMid slice"/>`;
        else{art+=`<rect x="${cx-pw/2}" y="${py}" width="${pw}" height="${ph}" fill="#e7dfc9"/>`;art+=text(cx,py+ph/2,'照片待生成',17,MUTED,'text-anchor="middle"');}
        art+='</g>';
        art+=text(x,compact?355:369,'游戏称呼',16,MUTED);
        addLines(view.nickname,x,compact?390:404,compact?25:30,INK,tw);
        const footer=compact?565:495;
        art+=line(x,footer-25,x+tw,footer-25,'#b4a67e','opacity=".5"');
        addLines(view.clockLabel,x,footer,compact?17:19,MUTED,tw);
        transcript.push('游戏称呼：'+view.nickname,'四方之间，自在旅居');
      }else if(page.type==='intro'){
        heading(x,'旅行护照','WORLDWOVEN');
        art+=svgImage(cover,cx-85,compact?245:205,170,170,'#a9a879');
        addLines('四方生活',x,compact?472:423,compact?24:28,GREEN,tw);
        addLines('一本随身旅行册',x,compact?528:471,compact?20:23,MUTED,tw);
        addLines('翻过这一页，去看看远方',x,compact?592:522,compact?18:20,MUTED,tw);
        transcript.push('四方生活旅行护照，一本随身旅行册');
      }else if(page.type==='visa'){
        const r=page.region;heading(x,r.country,'VISAS · '+r.en);addLines(r.place,x,184,compact?21:24,INK,tw);
        const size=compact?142:139,sy=compact?206:193;
        art+=`<g opacity="${r.visited?'.92':'.23'}" transform="rotate(${parseFloat(r.tilt)||0} ${cx} ${sy+size/2})">${svgImage(stamps[r.id]||'',cx-size/2,sy,size,size,r.ink)}</g>`;
        const fy=compact?378:358;
        addLines(r.visited?'已到访 · 日期未记录':'未到访 · 留白待启程',x,fy,compact?18:20,r.visited?r.ink:MUTED,tw);
        art+=line(x,fy+21,x+tw,fy+21,'#b4a67e','opacity=".5"');
        art+=text(x,fy+50,`日常印记 · ${r.activities.length} 枚`,compact?18:20,GREEN);
        page.records.forEach((a,i)=>{
          const y=fy+81+i*(compact?44:31);
          art+=text(x,y,'·',20,r.ink);addLines(a.label,x+16,y,compact?17:19,INK,tw-16);transcript.push(a.label);
        });
        if(!page.records.length)addLines('完成当地活动后，记录会留在这里',x,fy+85,compact?17:19,MUTED,tw);
        transcript.push(r.country,r.place,r.visited?'已到访；到访日期未记录':'未到访');
      }else if(page.type==='activities'){
        const r=page.region;heading(x,r.country+' · 记录','CONTINUED');
        art+=text(x,184,`${r.activities.length} 枚日常印记`,compact?19:21,MUTED);
        page.records.forEach((a,i)=>{
          const y=compact?234+i*60:222+i*42,tx=x+20;
          art+=text(x,y,'·',22,r.ink);addLines(a.label,tx,y,compact?19:21,INK,tw-20);
          transcript.push(a.label);
        });
        addLines('已完成活动 · 未记录日期',x,compact?630:552,compact?15:17,MUTED,tw);
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
  if(spread){paper=art;art=backing+paper;}
  return {width:w,height:h,compact,defs,backing,paper,cover:coverFace.art,coverShift:coverFace.shift,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${spread?'打开的四方旅行护照':'合起的四方旅行护照'}">${defs}${art}</svg>`,hotspots,transcript:transcript.join('。')};
}

// Orthographic book geometry is rendered by the product itself. Covers are
// single rigid planes around the spine; ink is part of each moving paper face.
// The same SVG frame is used on screen and in offline review, with no CSS 3D,
// hidden pseudo-elements, opacity cross-fades or independently moving text.
export function passportMotionGeometry({width,height,kind='turning',direction='forward',progress=0}){
  const p=Math.max(0,Math.min(1,progress)),opening=kind==='unfolding',cover=kind!=='turning';
  const phase=cover?(opening?p:1-p):p,angle=Math.PI*phase;
  const cosine=Math.abs(Math.cos(angle))<1e-9?0:Math.cos(angle),sine=Math.sin(angle),half=width/2;
  const hinge=cover?half-(half-14)/2*(1-phase):half,span=half-(cover?14:27),lift=cover?12:20;
  const face=cosine>=0?'front':'back';
  const side=cover?(face==='front'?'right':'left'):(direction==='forward'?(face==='front'?'right':'left'):(face==='front'?'left':'right'));
  const sign=side==='right'?1:-1,rotationSign=cover||direction==='forward'?1:-1;
  const a=rotationSign*cosine*sign,b=-sine*lift/span*sign;
  return {progress:p,phase,face,side,hinge,cosine,sine,cover,
    matrix:[a,b,0,1,hinge-a*half,-b*half],edgeX:hinge+rotationSign*cosine*span,edgeLift:-sine*lift,
    width,height};
}
export function renderPassportMotion({from,to,kind='turning',direction='forward',progress=0}){
  const p=Math.max(0,Math.min(1,progress));
  if(p===0)return from.svg;if(p===1)return to.svg;
  const {width:w,height:h}=to,half=w/2,g=passportMotionGeometry({width:w,height:h,kind,direction,progress:p});
  const clipDefs=`<clipPath id="motion-left"><rect x="0" y="0" width="${half}" height="${h}"/></clipPath><clipPath id="motion-right"><rect x="${half}" y="0" width="${half}" height="${h}"/></clipPath>`;
  const side=(content,name)=>`<g clip-path="url(#motion-${name})">${content}</g>`;
  const sheet=(scene,name)=>side(scene.paper,name);
  let art='',face='';
  if(g.cover){
    const open=kind==='unfolding'?to:from,closed=kind==='unfolding'?from:to;
    // Only the right packet rests below the moving front board. The inside
    // cover and its printed left page belong to the reverse face of that board.
    art=`<g transform="translate(${g.hinge-half} 0)">${side(open.backing,'right')}${sheet(open,'right')}</g>`;
    face=g.face==='front'?closed.cover:side(open.backing+open.paper,'left');
  }else{
    const forward=direction==='forward';
    // Unturned paper retains the OLD opposite face. The next face is exposed
    // from the outside edge only where the opaque moving paper uncovers it.
    art=to.backing+sheet(forward?from:to,'left')+sheet(forward?to:from,'right');
    face=sheet(g.face==='front'?from:to,g.side);
  }
  const matrix=g.matrix.map(n=>Number(n.toFixed(8))).join(' ');
  if(g.cosine!==0){
    art+=`<g data-moving-face="${g.face}" data-source-side="${g.side}" transform="matrix(${matrix})">${face}</g>`;
    // Lighting follows the physical face, never substitutes for occlusion.
    const left=g.side==='left',x=left?27:half,pw=half-27;
    const shade=g.cover?0:Math.sin(Math.PI*p)*.13;
    if(shade)art+=`<g transform="matrix(${matrix})"><rect x="${x}" y="31" width="${pw}" height="${h-69}" fill="#66573b" opacity="${shade.toFixed(4)}"/></g>`;
  }
  // A board has a visible material edge at 90 degrees. Paper has a fine edge.
  const top=g.cover?17:28,bottom=g.cover?h-23:h-37,edge=g.cover?3.6:1.1;
  art+=`<path data-moving-edge="${g.cover?'board':'paper'}" d="M${g.edgeX} ${top+g.edgeLift}V${bottom+g.edgeLift}" fill="none" stroke="${g.cover?'#193e34':'#c9b996'}" stroke-width="${edge}" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${g.cover?'开合中的旅行护照':'翻页中的旅行护照'}" data-motion="${kind}" data-progress="${p}">${to.defs}<defs>${clipDefs}</defs>${art}</svg>`;
}
