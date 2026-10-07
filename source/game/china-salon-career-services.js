// Small authored services with distinct, inspectable work. Chess evaluates the
// position itself; music records four individually timed notes, not a renamed
// recital. All use the same existing room and visitor-funded payment pipeline.
const frozen=entries=>Object.freeze(Object.fromEntries(Object.entries(entries).map(([id,value])=>[id,Object.freeze(value)])));
export const SALON_CAREER_PIECES=Object.freeze({
 poetry:frozen({river:{name:'《江行》',text:'江风拂水，远帆带暮色；一盏清茶，听两岸人声。',meaning:'远行见闻'},home:{name:'《归灯》',text:'灯在窗前，归人认旧路；茶温未冷，细雨到檐边。',meaning:'归家心绪'}}),
 story:frozen({ferry:{name:'《渡口留灯》',meaning:'江行互助',text:'舟子见渡口的灯还亮着，先靠岸询问。原来赶集人落下了药包，守渡者便留灯等他。赶集人折返取回药包，舟子再送他渡河。',question:'守渡者为何迟迟不熄灯？',answer:'等失主回来取药包',wrong:'等船客付更多船钱'},ridge:{name:'《雨后山径》',meaning:'山路见闻',text:'行人雨后到山脚，见近路满是落石。樵夫先查看水势，领他绕到干燥的旧驿道；日暮两人才到村口。走得虽远，避过了湿滑的山坡。',question:'两人为何改走较远的旧驿道？',answer:'避开雨后落石与湿滑',wrong:'抄近路抢在别人前面'}}),
 music:frozen({quiet:{name:'《檐雨》',meaning:'舒缓曲词',text:'檐雨慢落，茶烟轻回。',pattern:Object.freeze(['short','long','short','long'])},lively:{name:'《行舟》',meaning:'明快曲词',text:'长风催棹，短桨逐波。',pattern:Object.freeze(['long','short','long','short'])}}),
 chess:frozen({capture:{name:'围棋小题 · 围住一子',meaning:'提子棋理',board:Object.freeze(['.','B','.','B','W','.','.','B','.']),text:'黑先。白子在中央，只余右中一口气。选一处空点落黑子，看看是否真的提掉白子。'},escape:{name:'围棋小题 · 留出两气',meaning:'脱困棋理',board:Object.freeze(['.','W','.','W','B','.','.','W','.']),text:'黑先。中央黑子被围，只有右中一口气。选一处空点，为中央这组黑子留出至少两口气。'}})
});
export const salonPieces=role=>SALON_CAREER_PIECES[role.activity];
export const salonPieceKey=o=>o?.piece??o?.poem;
export const salonRequest=(role,customerId)=>Object.keys(salonPieces(role))[customerId==='cn-tavern-diner-east'?1:0];
export const SALON_BEAT_SECONDS=Object.freeze({short:1,long:2});
export const salonBeatLabel=key=>key==='short'?'短拍':'长拍';
export const salonBoardLabel=index=>['左上','上中','右上','左中','中央','右中','左下','下中','右下'][index];
const neighbours=i=>[i-3,i+3,...(i%3?[i-1]:[]),...(i%3<2?[i+1]:[])].filter(n=>n>=0&&n<9);
function group(board,start){const stones=new Set([start]),liberties=new Set(),todo=[start];while(todo.length){const p=todo.pop();for(const n of neighbours(p)){if(board[n]==='.')liberties.add(n);else if(board[n]===board[start]&&!stones.has(n)){stones.add(n);todo.push(n);}}}return {stones,liberties};}
export function salonChessMove(key,index){const piece=SALON_CAREER_PIECES.chess[key];if(!piece||!Number.isInteger(index)||index<0||index>8||piece.board[index]!=='.')return null;
 const board=piece.board.slice();board[index]='B';let captured=0;for(const n of neighbours(index)){if(board[n]!=='W')continue;const g=group(board,n);if(!g.liberties.size)for(const p of g.stones){board[p]='.';captured++;}}
 if(!group(board,index).liberties.size)return null;const liberties=board[4]==='B'?group(board,4).liberties.size:0;
 return {index,board,captured,liberties,correct:key==='capture'?captured>0:liberties>=2};
}
export const salonPerformanceSeconds=o=>o?.stage==='beat'?SALON_BEAT_SECONDS[o.pendingBeat]||0:['reciting','narrating'].includes(o?.stage)?8:0;
export function salonServiceProofValid(o,role){const pieces=salonPieces(role),key=salonPieceKey(o);if(!pieces[o.request]||!(key==null||pieces[key]))return false;
 if(role.activity==='poetry')return ['approaching','offered','escort','choose','reciting','discussion','ready'].includes(o.stage)&&(!['reciting','discussion','ready'].includes(o.stage)||!!pieces[o.poem])&&(o.stage!=='ready'||!!pieces[o.answer]);
 if(['approaching','offered','escort','choose'].includes(o.stage))return key==null;
 if(!pieces[key])return false;
 if(role.activity==='story')return ['narrating','discussion','ready'].includes(o.stage)&&(o.stage!=='ready'||['cause','wrong'].includes(o.answer));
 if(role.activity==='music')return ['rhythm','beat','ready'].includes(o.stage)&&Array.isArray(o.beats)&&o.beats.length<=(o.stage==='ready'?4:3)&&o.beats.every(b=>['short','long'].includes(b))&&(o.stage!=='beat'||['short','long'].includes(o.pendingBeat))&&(o.stage!=='ready'||o.beats.length===4);
 if(role.activity==='chess'){if(o.stage==='chess')return o.move==null;if(o.stage!=='ready'||!o.move)return false;const result=salonChessMove(key,o.move.index);return !!result&&JSON.stringify(result)===JSON.stringify(o.move);}
 return false;
}
