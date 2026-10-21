import {candidates,planAI,validateMeld,validateTurn,rackValue} from './engine.js';

// Bounded exact-cover search: all borrowed table tiles must be returned in legal
// melds; hand tiles are optional. Only public information enters this planner.
export function planNormalAI(g,{budgetMs=1400,maxNodes=35000}={}) {
 const p=g.players[g.current],end=performance.now()+budgetMs;
 if(!p.opened){
  const held=p.rack.filter(t=>['regular','double'].includes(t.kind));
  const view={...g,players:g.players.map((x,i)=>i===g.current?{...x,rack:x.rack.filter(t=>!held.includes(t))}:x)};
  const d=planAI(view);if(!d)return null;d.rack.push(...held);
  return validateTurn(g,d).ok?d:null;
 }
 const urgent=g.players.some((x,i)=>i!==g.current&&(x.rackCount??x.rack.length)<=3);
 const own=new Set(p.rack.map(t=>t.id));
 function score(d){
  if(!d)return -Infinity;if(!d.rack.length)return 1e9;
  const exposed=d.table.filter(a=>a.some(t=>t.kind!=='number')&&a.some((t,i)=>t.kind!=='number'&&validateMeld(a.filter((_,j)=>i!==j)).ok)).length;
  return (p.rack.length-d.rack.length)*100+(rackValue(p.rack)-rackValue(d.rack))*(urgent?3:0.5)-exposed*18;
 }
 let best=planAI(g),bestScore=score(best),nodes=0;
 // Consider small, then progressively larger neighborhoods. Keeping untouched
 // melds fixed bounds cost while permitting multi-meld joker liberation.
 const regions=g.table.map((_,i)=>[i]);
 for(let i=0;i<g.table.length;i++)for(let j=i+1;j<g.table.length;j++)regions.push([i,j]);
 regions.sort((a,b)=>b.reduce((n,i)=>n+g.table[i].filter(t=>t.kind!=='number').length,0)-a.reduce((n,i)=>n+g.table[i].filter(t=>t.kind!=='number').length,0));
 regions.unshift([]);
 if(g.table.length>2)regions.push(g.table.map((_,i)=>i));
 for(const region of regions){
  if(performance.now()>end||nodes>=maxNodes)break;
  const fixed=g.table.filter((_,i)=>!region.includes(i)),borrowed=region.flatMap(i=>g.table[i]),all=[...p.rack,...borrowed];
  const required=new Set(borrowed.map(t=>t.id)),pool=new Map();
  function add(a){if(validateMeld(a).ok)pool.set(a.map(t=>t.id).join(','),a);}
  for(const a of candidates(all,900))add(a);
  for(const i of region){const a=g.table[i];add(a);
   for(let l=0;l<a.length;l++)for(let r=l+1;r<=a.length;r++)add(a.slice(l,r));
   for(let at=0;at<a.length;at++)for(const t of p.rack){const b=[...a];b[at]=t;add(b);}
  }
  // Candidate generation chooses one copy per face. Include both physical copies
  // so exact cover can use duplicates in independent melds.
  for(const a of [...pool.values()])for(let i=0;i<a.length;i++)for(const t of all){
   if(t.id!==a[i].id&&t.kind===a[i].kind&&t.n===a[i].n&&t.color===a[i].color&&!a.some(x=>x.id===t.id)){const b=[...a];b[i]=t;add(b);}
  }
  const opts=[...pool.values()].map(a=>({a,ids:a.map(t=>t.id),gain:a.filter(t=>own.has(t.id)).length})).sort((a,b)=>b.gain-a.gain);
  const byId=new Map(all.map(t=>[t.id,opts.filter(a=>a.ids.includes(t.id))]));
  let localNodes=0;
  function search(used,sets,start=0){
   if(++nodes>maxNodes||++localNodes>3500||performance.now()>end)return;
   let choices=null;
   for(const id of required)if(!used.has(id)){
    const compatible=byId.get(id).filter(a=>a.ids.every(id=>!used.has(id)));
    if(!compatible.length)return;
    if(!choices||compatible.length<choices.length)choices=compatible;
   }
   if(!choices){
    const d={table:[...fixed,...sets],rack:p.rack.filter(t=>!used.has(t.id))},value=score(d);
    if(value>bestScore&&validateTurn(g,d).ok){best=d;bestScore=value;}
    for(let i=start;i<opts.length;i++){const o=opts[i];if(!o.gain||o.ids.some(id=>used.has(id)))continue;search(new Set([...used,...o.ids]),[...sets,o.a],i+1);}
   }else for(const o of choices)search(new Set([...used,...o.ids]),[...sets,o.a]);
  }
  search(new Set(),[]);
 }
 return best&&validateTurn(g,best).ok?best:null;
}
