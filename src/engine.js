// Pure game engine. No DOM, timers, storage, or hidden AI information.
export const COLORS=['coral','blue','gold','ink'];
export const JOKERS=['regular','double','change','mirror'];
export const clone=x=>structuredClone(x);
export function deck(){let a=[];for(let copy=0;copy<2;copy++){for(const color of COLORS)for(let n=1;n<=13;n++)a.push({id:`${color}-${n}-${copy}`,color,n,kind:'number'});for(const kind of JOKERS)a.push({id:`${kind}-${copy}`,kind});}return a;}
export function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const key=a=>a.map(t=>`${t.n}:${t.color}`).join('|');
const width=t=>t.kind==='double'?2:1;
// Return concrete interpretations, preserving physical order and special-joker semantics.
function interpretations(tiles){
 if(!tiles.length||tiles.some(t=>t.kind==='mirror'))return [];
 const out=[],slots=tiles.reduce((s,t)=>s+width(t),0);
 if(slots<=13){for(let start=1;start+slots-1<=13;start++)for(const color of COLORS){
  function walk(i,n,c,values){if(i===tiles.length){out.push({type:'顺子',values,score:values.reduce((s,t)=>s+t.n,0)});return;}
   const t=tiles[i];if(t.kind==='number'){if(t.n===n&&t.color===c)walk(i+1,n+1,c,[...values,{n,color:c}]);}
   else if(t.kind==='regular')walk(i+1,n+1,c,[...values,{n,color:c}]);
   else if(t.kind==='double')walk(i+1,n+2,c,[...values,{n,color:c},{n:n+1,color:c}]);
   else if(t.kind==='change')for(const next of COLORS.filter(x=>x!==c))walk(i+1,n+1,next,[...values,{n,color:c}]);
  }walk(0,start,color,[]);
 }}
 if(slots<=4&&!tiles.some(t=>t.kind==='change'))for(let n=1;n<=13;n++){
  function walk(i,used,values){if(i===tiles.length){out.push({type:'群组',values,score:n*slots});return;}const t=tiles[i];if(t.kind==='number'){if(t.n===n&&!used.includes(t.color))walk(i+1,[...used,t.color],[...values,{n,color:t.color}]);return;}for(const c of COLORS.filter(c=>!used.includes(c))){if(t.kind==='double'){for(const d of COLORS.filter(d=>d!==c&&!used.includes(d)))walk(i+1,[...used,c,d],[...values,{n,color:c},{n,color:d}]);}else walk(i+1,[...used,c],[...values,{n,color:c}]);}}
  walk(0,[],[]);
 }
 return out;
}
export function validateMeld(tiles){
 if(tiles.reduce((sum,t)=>sum+width(t),0)<3)return {ok:false,reason:'每组至少需要 3 个牌位（双数 Joker 计 2 个）'};
 if(!tiles.some(t=>t.kind==='number'))return {ok:false,reason:'本桌约定：每组至少有一张数字牌'};
 const mirrors=tiles.flatMap((t,i)=>t.kind==='mirror'?[i]:[]);
 let options;
 if(mirrors.length){if(mirrors.length>1)return {ok:false,reason:'本桌约定：一组最多使用一张镜像牌'};
  const at=mirrors[0],left=interpretations(tiles.slice(0,at)),right=interpretations(tiles.slice(at+1).reverse());
  const rightMap=new Map(right.map(x=>[x.type+key(x.values),x]));
  options=left.filter(x=>rightMap.has(x.type+key(x.values))).map(x=>({...x,type:'镜像'+x.type,score:x.score*2}));
 }else options=interpretations(tiles);
 if(!options.length)return {ok:false,reason:'数字、颜色或功能牌不构成有效的顺子／群组'};
 options.sort((a,b)=>b.score-a.score);return {ok:true,...options[0]};
}
export function createGame({count=2,ai=false,seconds=120,names=[]}={},rng=Math.random){const pool=shuffle(deck(),rng),players=Array.from({length:ai?2:count},(_,i)=>({name:names[i]?.trim().slice(0,16)||(ai&&i===1?'阿尔法':'玩家 '+(i+1)),ai:ai&&i===1,rack:pool.splice(0,14),opened:false}));return {players,pool,table:[],current:Math.floor(rng()*players.length),seconds,turn:1,passes:0,over:false,log:['新牌局开始 · 每人 14 张牌']};}
export function draftFor(g){return {table:clone(g.table),rack:clone(g.players[g.current].rack)};}
const ids=a=>a.map(t=>t.id).sort().join(',');
export function validateTurn(g,d){
 const p=g.players[g.current],old=g.table.flat(),now=d.table.flat(),own=new Set(p.rack.map(t=>t.id));
 const expected=[...old,...p.rack],actual=[...now,...d.rack];
 if(new Set(actual.map(t=>t.id)).size!==actual.length||ids(actual)!==ids(expected))return {ok:false,reason:'牌张不守恒：存在遗失或重复的牌'};
 const originals=new Map(expected.map(t=>[t.id,JSON.stringify(t)]));
 if(actual.some(t=>originals.get(t.id)!==JSON.stringify(t)))return {ok:false,reason:'牌面不可修改'};
 if(d.rack.some(t=>!own.has(t.id)))return {ok:false,reason:'桌面的牌不能收入手牌'};
 const played=p.rack.length-d.rack.length;if(played<1)return {ok:false,reason:'至少打出一张手牌，或选择抽牌结束'};
 const table=d.table.filter(a=>a.length),checks=table.map(validateMeld),bad=checks.findIndex(x=>!x.ok);
 if(bad>=0)return {ok:false,reason:`第 ${bad+1} 组：${checks[bad].reason}`};
 if(!p.opened){const oldIds=new Set(old.map(t=>t.id));const preserved=g.table.every(a=>table.some(b=>ids(a)===ids(b)&&a.every((t,i)=>t.id===b[i]?.id)));if(!preserved||table.some(a=>a.some(t=>oldIds.has(t.id))&&a.some(t=>own.has(t.id))))return {ok:false,reason:'首次亮牌当回合只能使用自己的牌，不可改动桌面'};
 const score=table.reduce((s,a,i)=>s+(a.every(t=>own.has(t.id))?checks[i].score:0),0);if(score<30)return {ok:false,reason:`首次亮牌需要 30 分，目前 ${score} 分`,score};return {ok:true,played,score};}
 return {ok:true,played};
}
export const rackValue=rack=>rack.reduce((s,t)=>s+(t.kind==='number'?t.n:30),0);
export function finish(g,winner=null){g.over=true;const totals=g.players.map(p=>rackValue(p.rack));let winners=winner===null?totals.flatMap((v,i)=>v===Math.min(...totals)?[i]:[]):[winner];let base=winner===null?Math.min(...totals):0;let scores=totals.map((v,i)=>winners.includes(i)?0:base-v);const gain=-scores.reduce((s,v)=>s+v,0);winners.forEach(i=>scores[i]=gain/winners.length);g.result={winners,totals,scores,blocked:winner===null};return g;}
export function advance(g){if(g.players[g.current].rack.length===0)return finish(g,g.current);if(!g.pool.length&&g.passes>=g.players.length)return finish(g);g.current=(g.current+1)%g.players.length;g.turn++;return g;}
export function commit(g,d){if(g.over)return {ok:false,reason:'牌局已经结束'};const check=validateTurn(g,d);if(!check.ok)return check;const next=clone(g),p=next.players[next.current];p.rack=clone(d.rack);p.opened=true;next.table=clone(d.table.filter(a=>a.length));next.passes=0;next.log.unshift(`${p.name} 打出 ${check.played} 张牌`);return {ok:true,game:advance(next)};}
export function draw(g,count=1,reason='抽牌'){if(g.over)return clone(g);const next=clone(g),p=next.players[next.current],taken=next.pool.splice(0,count);p.rack.push(...taken);next.passes=taken.length?0:next.passes+1;next.log.unshift(`${p.name} ${reason} ${taken.length} 张${taken.length?'':' · 空池停一回合'}`);return advance(next);}
export function timeout(g,d){const changed=JSON.stringify(d.table.filter(a=>a.length))!==JSON.stringify(g.table)||ids(d.rack)!==ids(g.players[g.current].rack);return draw(g,changed?3:1,changed?'超时回滚，罚抽':'超时，抽牌');}
// Candidate generation uses only the active rack and public table.
export function candidates(rack){const found=new Map();const add=a=>{if(validateMeld(a).ok)found.set(a.map(t=>t.id).join(','),a);};
 const nums=rack.filter(t=>t.kind==='number'),wild=rack.filter(t=>t.kind!=='number'&&t.kind!=='mirror');
 for(const t of nums)for(const w of wild.filter(t=>t.kind==='double')){add([t,w]);add([w,t]);}
 for(let n=1;n<=13;n++){const a=COLORS.map(c=>nums.find(t=>t.n===n&&t.color===c)).filter(Boolean);if(a.length>=3){add(a);if(a.length===4)for(let i=0;i<4;i++)add(a.filter((_,j)=>i!==j));}for(const w of wild)for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)add([a[i],a[j],w]);}
 for(const c of COLORS)for(let start=1;start<=11;start++){
  let a=[];for(let n=start;n<=13;n++){const t=nums.find(t=>t.color===c&&t.n===n);if(!t)break;a.push(t);add([...a]);}
  for(const w of wild)for(let pos=start;pos<=13;pos++){let a=[],used=false;for(let n=start;n<=13;n++){if(n===pos){a.push(w);used=true;if(w.kind==='double')n++;}else{const t=nums.find(t=>t.color===c&&t.n===n);if(!t)break;a.push(t);}if(used)add([...a]);}}
 }
 // Colour change runs and mirror pairs are intentionally included in the heuristic.
 for(const w of wild.filter(t=>t.kind==='change'))for(const a of nums)for(const b of nums)if(a.color!==b.color&&b.n===a.n+2)add([a,w,b]);
 for(const m of rack.filter(t=>t.kind==='mirror'))for(const a of nums){const b=nums.find(t=>t.id!==a.id&&t.n===a.n&&t.color===a.color);if(b)add([a,m,b]);}
 return [...found.values()].sort((a,b)=>b.length-a.length||rackValue(b)-rackValue(a)).slice(0,180);
}
export function planAI(g){const p=g.players[g.current],options=candidates(p.rack);let best=null,bestCount=0,nodes=0;
 function search(i,used,sets,score){if(++nodes>7000)return;if(used.size>bestCount&&(p.opened||score>=30)){bestCount=used.size;best=sets.map(a=>[...a]);}for(let j=i;j<options.length;j++){const a=options[j];if(a.some(t=>used.has(t.id)))continue;search(j+1,new Set([...used,...a.map(t=>t.id)]),[...sets,a],score+validateMeld(a).score);}}
 search(0,new Set(),[],0);let d=draftFor(g);if(best){d.table.push(...best);const used=new Set(best.flat().map(t=>t.id));d.rack=d.rack.filter(t=>!used.has(t.id));}
 if(p.opened){let progress=true;while(progress){progress=false;outer:for(const t of d.rack)for(let i=0;i<d.table.length;i++)for(let at=0;at<=d.table[i].length;at++){let set=[...d.table[i]];set.splice(at,0,t);if(validateMeld(set).ok){d.table[i]=set;d.rack=d.rack.filter(x=>x.id!==t.id);progress=true;break outer;}}}}
 return validateTurn(g,d).ok?d:null;
}
