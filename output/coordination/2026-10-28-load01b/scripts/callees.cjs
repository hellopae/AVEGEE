const fs=require('fs');const [file,name]=process.argv.slice(2);
const p=JSON.parse(fs.readFileSync(file));
const nodes=new Map(p.nodes.map(n=>[n.id,n]));const self=new Map();
for(let i=0;i<p.samples.length;i++)self.set(p.samples[i],(self.get(p.samples[i])||0)+(p.timeDeltas[i]||0));
const memo=new Map();const tot=id=>{if(memo.has(id))return memo.get(id);let t=self.get(id)||0;for(const c of nodes.get(id).children||[])t+=tot(c);memo.set(id,t);return t;};
const label=n=>`${n.callFrame.functionName||'(anon)'} ${(n.callFrame.url||'').split('/').pop().split('?')[0]}:${n.callFrame.lineNumber+1}`;
const agg=new Map();
for(const n of p.nodes){if(n.callFrame.functionName!==name)continue;for(const c of n.children||[]){const k=label(nodes.get(c));agg.set(k,(agg.get(k)||0)+tot(c));}agg.set('(self)',(agg.get('(self)')||0)+(self.get(n.id)||0));}
console.log([...agg].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,t])=>`${(t/1000).toFixed(0)}ms ${k}`).join('\n'));
