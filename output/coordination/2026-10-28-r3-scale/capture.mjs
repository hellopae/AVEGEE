const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const out='output/coordination/2026-10-28-r3-scale',phase=process.argv[2]||'before';
let browser;
try{browser=await chromium.launch({headless:true});}
catch(e){writeFileSync(`${out}/${phase}-browser-blocker.log`,String(e));throw e;}
const rows=[],errors=[];
try {
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]])for(const zone of ['th','asia','west','cyberhell']){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  // Read the immutable run baseline; no checkout, extra worktree or branch is needed.
  if(phase==='before')await page.route('http://localhost:8873/**',async route=>{
    const path=decodeURIComponent(new URL(route.request().url()).pathname).slice(1)||'index.html';
    if(path==='index.html'||path.startsWith('src/')&&path.endsWith('.js')){
      try{return await route.fulfill({body:execFileSync('git',['show',`fe62d3f0ac757eaf65c7be5e090400da3b22a0c0:${path}`]),contentType:path.endsWith('.js')?'application/javascript':'text/html'});}catch{}
    }
    await route.continue();
  });
  page.on('pageerror',e=>errors.push({name,zone,error:e.message}));
  page.on('console',m=>{if(m.type()==='error')errors.push({name,zone,error:m.text()});});
  await page.goto('http://localhost:8873/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.G,{timeout:120000});
  await page.evaluate(async({zone,fixture})=>{
   window.G.save=()=>true; fixture.zone=zone;window.G.restore(fixture);window.G.coin=100000;
   window.G.battle=null;window.G.over=null;window.G.storyQueue=[];
   for(const k of ['taan','kan','boon'])window.G.hire(k);
   window.G.hireGuard();window.G.party.members=['kan','boon'];window.G.party.guard=true;
   document.querySelectorAll('#boot,#title,#splash').forEach(e=>e.remove());
   const uiSrc=[...document.scripts].find(s=>s.src.includes('/src/ui.js')).src;
   window.reviewUI=await import(uiSrc);
   const art=await import('/src/art.js');art.warmZone(zone);
  },{zone,fixture:JSON.parse(readFileSync('tests/fixtures/b1-v3.json'))});
  await page.waitForTimeout(1800);
  // Render the production map into its own canvas to keep the camera deterministic.
  await page.evaluate(async()=>{
   const scene=await import('/src/scene.js');const {SCENE}=await import('/src/data.js');
   window.reviewMap=document.createElement('canvas');reviewMap.width=SCENE.w;reviewMap.height=SCENE.h;
   Object.assign(reviewMap.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',objectFit:'contain',background:'#19151d',zIndex:99999});document.body.append(reviewMap);
   const g=window.G;g.player.x=820;g.player.y=540;
   g.crew.forEach((c,i)=>{c.x=610+i*70;c.y=540;c.escort=null;c.recoverUntil=0;c.morale=100;});
   if(g.guard){g.guard.x=1080;g.guard.y=540;g.guard.recoverUntil=0;}
   window.paintReview=()=>scene.render(reviewMap.getContext('2d'),g,0,null,null);paintReview();
  });
  await page.waitForTimeout(2500);await page.evaluate(()=>paintReview());
  await page.screenshot({path:`${out}/${phase}-${name}-${zone}-map.png`});
  await page.evaluate(()=>{reviewMap.remove();window.G.startBattle({id:999,who:'R3 scale measurement',deserved:4,resist:true});window.reviewUI.openBattle();});
  await page.waitForTimeout(2500);
  const measured=await page.evaluate(async()=>{
   const {battleSpriteRect}=await import('/src/battle-scale.js');
   return Promise.all([...document.querySelectorAll('.combat-arena [data-crew-pick]')].map(async el=>{
    const im=el.querySelector('img:not(.fx)');if(!im)return null;const r=await battleSpriteRect(im);
    return {key:el.dataset.crewPick,height:r.b-r.t,foot:r.b,left:r.l,right:r.r,src:im.getAttribute('src')};
   }));
  });
  rows.push({name,width,height,zone,actors:measured.filter(Boolean)});
  await page.screenshot({path:`${out}/${phase}-${name}-${zone}-battle.png`});
  console.log(phase,name,zone,measured.map(x=>x&&[x.key,Math.round(x.height)]));await page.close();
 }
}finally{await browser.close();writeFileSync(`${out}/${phase}-measurements.json`,JSON.stringify(rows,null,2));writeFileSync(`${out}/${phase}-console.json`,JSON.stringify(errors,null,2));}
