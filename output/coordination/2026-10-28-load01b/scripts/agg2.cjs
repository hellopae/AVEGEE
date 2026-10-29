const fs=require('fs');
const scenes=['town-th','town-asia','town-west','town-cyberhell','border-1-2','border-2-3','trial','battle'];
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const ld=(b,sc,sub,prof,thr)=>{try{return JSON.parse(fs.readFileSync(`ab/${b}/${sub}/${sc}-${prof}-x${thr}.json`));}catch(e){return null;}};
const agg=(b,sc,subs,prof,thr)=>{const rs=subs.map(s=>ld(b,sc,s,prof,thr)).filter(Boolean);if(!rs.length)return null;const f=k=>rs.map(r=>r.frames[k]);
 return {n:rs.length,median:med(f('median')),p95:med(f('p95')),p99:med(f('p99')),max:med(f('max')),long50:med(rs.map(r=>r.longTasks.over50)),errs:rs.reduce((a,r)=>a+r.errors.length,0),
  p95s:f('p95'),maxs:f('max')};};
const rows=[];
console.log('| scene | env | median ms | p95 ms | p99 ms | max ms | long tasks >50ms |');console.log('|---|---|---|---|---|---|---|');
for(const sc of scenes)for(const [prof,thr,subs,env] of [['mobile',4,['r1','r2','r3'],'390x844 dpr2, CPU x4'],['desktop',1,['d'],'1440x900, x1']]){
 const a=agg('base',sc,subs,prof,thr),b=agg('new',sc,subs,prof,thr);if(!a||!b)continue;
 const f=k=>`${a[k]} -> ${b[k]}`;
 console.log(`| ${sc} | ${env} (n=${a.n}/${b.n}) | ${f('median')} | ${f('p95')} | ${f('p99')} | ${f('max')} | ${f('long50')} |`);
 rows.push({sc,env,a,b});
}
fs.writeFileSync('ab/summary.json',JSON.stringify(rows,null,1));
