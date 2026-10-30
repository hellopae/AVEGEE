const {chromium}=require('/Users/agapae/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const BASE=process.env.BASE||'http://localhost:8791';
const SAMPLER=`
(()=>{
 window.__fr={on:false,d:[],last:0,long:[],loaf:[]};
 const tick=t=>{const f=window.__fr;if(f.on&&f.last)f.d.push(t-f.last);f.last=t;requestAnimationFrame(tick);};
 requestAnimationFrame(tick);
 try{new PerformanceObserver(l=>{if(!window.__fr.on)return;for(const e of l.getEntries())window.__fr.long.push(e.duration);}).observe({type:'longtask',buffered:false});}catch(e){}
 try{new PerformanceObserver(l=>{if(!window.__fr.on)return;for(const e of l.getEntries())window.__fr.loaf.push({d:e.duration,b:e.blockingDuration,s:e.scripts.map(s=>[s.invoker,s.duration,s.sourceFunctionName,s.sourceURL&&s.sourceURL.split('/').pop(),s.sourceCharPosition])});}).observe({type:'long-animation-frame',buffered:false});}catch(e){}
})();`;
async function launch(profile){ // profile: 'mobile'|'desktop'
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const mobile=profile==='mobile';
 const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900},deviceScaleFactor:1});
 await ctx.addInitScript(SAMPLER);
 const page=await ctx.newPage();
 const cdp=await ctx.newCDPSession(page);
 const errors=[];
 page.on('pageerror',e=>errors.push('pageerror:'+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text()+' @'+(m.location().url||'').split('/').slice(-2).join('/'));});
 return {browser,ctx,page,cdp,errors};
}
async function boot(h){
 const {page}=h;
 await page.goto(BASE+'/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.G,{timeout:60000});
 await page.waitForTimeout(1500);
 await page.locator('#splash-skip').click({timeout:10000});
 await page.waitForFunction(()=>document.querySelector('#title').classList.contains('ready'),{timeout:20000});
 await page.locator('#t-new').click({timeout:10000});
 await page.waitForFunction(()=>document.querySelector('#title').classList.contains('gone'),{timeout:20000});
 await page.waitForFunction(()=>!document.querySelector('dialog.asset-loading[open]'),{timeout:180000});
 await page.waitForTimeout(1500);
 await page.locator('#intro-skip').click({timeout:4000}).catch(()=>{});
 for(let i=0;i<8;i++){
  await page.evaluate(async()=>{
   const {TUTOR}=await import('/src/data.js');
   G.taught=TUTOR.map(x=>x.k);
   document.querySelectorAll('dialog[open]').forEach(d=>{if(!d.classList.contains('asset-loading'))d.close();});
   G.storyQueue=[];G.pendingLevel=null;G.pendingRecovery=null;G.discoveryQueue=[];G.pendingDiscovery=null;
   if(G.powers)G.discoverySeen=Object.fromEntries(G.powers.map(p=>['power:'+p.k,true]));
   G.coin=100000;G.food=100;G.paused=false;G.save=()=>true;
   G.nextArrive=G.nextEvent=G.nextKpi=G.nextPay=Math.max(G.nextArrive||0,100000);
  });
  await page.waitForTimeout(500);
 }
}
function stats(a){ if(!a.length)return null; const s=[...a].sort((x,y)=>x-y);const q=p=>s[Math.min(s.length-1,Math.floor(p*s.length))];
 return {n:a.length,median:+q(.5).toFixed(2),p95:+q(.95).toFixed(2),p99:+q(.99).toFixed(2),max:+s[s.length-1].toFixed(1),mean:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2)};}
async function measure(h,{name,ms,during,throttle,profile=true}){
 const {page,cdp}=h;
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});
 await page.waitForTimeout(600);
 if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');}
 await page.evaluate(()=>{const f=window.__fr;f.d=[];f.long=[];f.loaf=[];f.on=true;});
 const t0=Date.now();
 if(during)await during(h,ms);else await page.waitForTimeout(ms);
 const data=await page.evaluate(()=>{const f=window.__fr;f.on=false;return {d:f.d,long:f.long,loaf:f.loaf};});
 let top=null;
 if(profile){const {profile:p}=await cdp.send('Profiler.stop');top=summarize(p);if(process.env.SAVEPROF)fs.writeFileSync(process.env.SAVEPROF,JSON.stringify(p));}
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 const fs_=stats(data.d);
 const longN=data.long.filter(x=>x>50).length;
 const loaf=data.loaf;
 return {name,throttle,wallMs:Date.now()-t0,frames:fs_,longTasks:{count:data.long.length,over50:longN,maxMs:data.long.length?+Math.max(...data.long).toFixed(1):0},
  loafCount:loaf.length,loafTop:[...loaf].sort((a,b)=>b.d-a.d).slice(0,12),loafOver100:loaf.filter(x=>x.d>100).length,loafTotalBlockMs:+loaf.reduce((a,x)=>a+x.b,0).toFixed(0),top,rawFrames:data.d};
}
function summarize(p){
 const nodes=new Map(p.nodes.map(n=>[n.id,n]));const self=new Map();
 const dt=p.timeDeltas;let total=0;
 for(let i=0;i<p.samples.length;i++){const id=p.samples[i];const d=dt[i]||0;total+=d;self.set(id,(self.get(id)||0)+d);}
 const agg=new Map();
 for(const [id,t] of self){const n=nodes.get(id);const cf=n.callFrame;const key=`${cf.functionName||'(anon)'} ${(cf.url||'').split('/').pop().split('?')[0]}:${cf.lineNumber+1}`;agg.set(key,(agg.get(key)||0)+t);}
 const arr=[...agg].sort((a,b)=>b[1]-a[1]).slice(0,14).map(([k,t])=>({fn:k,selfMs:+(t/1000).toFixed(0),pct:+(100*t/total).toFixed(1)}));
 return {totalMs:+(total/1000).toFixed(0),top:arr,incl:inclusive(p,self)};
}
async function quiet(page,n=6){
 for(let i=0;i<n;i++){
  await page.evaluate(()=>{
   document.querySelectorAll('dialog[open]').forEach(d=>{if(!d.classList.contains('asset-loading')&&!G.battle)d.close();});
   G.storyQueue=[];G.pendingLevel=null;G.pendingRecovery=null;G.discoveryQueue=[];G.pendingDiscovery=null;G.pendingZone=null;
   if(G.powers)G.discoverySeen=Object.fromEntries(G.powers.map(p=>['power:'+p.k,true]));
   G.coin=100000;G.food=100;G.save=()=>true;
   G.nextArrive=G.nextEvent=G.nextKpi=G.nextPay=Math.max(G.nextArrive||0,100000);
   if(!document.querySelector('dialog[open]'))G.paused=false;
  });
  await page.waitForTimeout(400);
 }
}
async function gotoZone(page,to){
 const r=await page.evaluate(async(to)=>{
  const {initializeZoneTravel}=await import('/src/zone-travel.js');
  const t=G.zoneTravel||initializeZoneTravel(G);
  t.visited[G.zone]=true;t.visited[to]=true;t.ports[G.zone]=true;t.ports[to]=true;
  Object.assign(G.player,G.harbourPoint());
  return G.moveZone(to);
 },to);
 await page.waitForFunction(()=>!document.querySelector('dialog.asset-loading[open]'),{timeout:120000});
 await page.waitForTimeout(1500);
 await quiet(page,8);
 return r;
}
function inclusive(p,self){
 const nodes=new Map(p.nodes.map(n=>[n.id,n]));const memo=new Map();
 const tot=id=>{if(memo.has(id))return memo.get(id);const n=nodes.get(id);let t=self.get(id)||0;for(const c of n.children||[])t+=tot(c);memo.set(id,t);return t;};
 const agg=new Map();
 for(const n of p.nodes){const cf=n.callFrame;const key=`${cf.functionName||'(anon)'} ${(cf.url||'').split('/').pop().split('?')[0]}:${cf.lineNumber+1}`;agg.set(key,(agg.get(key)||0)+tot(n.id)-0);}
 // note: recursion double counts; acceptable for ranking
 return [...agg].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,t])=>({fn:k,inclMs:+(t/1000).toFixed(0)}));
}
module.exports={quiet,gotoZone,launch,boot,measure,stats,BASE};
