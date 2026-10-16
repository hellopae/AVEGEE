const {chromium}=require('/Users/agapae/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/worker|workers/.test(r.url()))requests.push({url:r.url(),status:r.status()});});
 await page.goto('http://localhost:8766/output/game-review/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.G,{timeout:60000});
 await page.evaluate(async()=>{const {TUTOR}=await import('/src/data.js');G.taught=TUTOR.map(x=>x.k);G.storyQueue=[];G.pendingLevel=null;G.pendingRecovery=null;G.coin=10000;G.food=100;G.nextArrive=G.nextEvent=G.nextKpi=G.nextPay=100000;(await import('/src/ui.js')).startPlay(false);G.taught=TUTOR.map(x=>x.k);const n=G.crewOf('nira');G.player.x=n.x??n.hx;G.player.y=(n.y??n.hy)+30;G.onChange();});
 await page.waitForTimeout(2500);
 await page.evaluate(()=>{G.discoveryQueue=[];G.discoverySeen=Object.fromEntries(G.powers.map(p=>['power:'+p.k,true]));G.pendingDiscovery=null;G.storyQueue=[];document.querySelectorAll('dialog[open]').forEach(d=>d.close());const n=G.crewOf('nira');G.player.x=n.x??n.hx;G.player.y=(n.y??n.hy)+24;G.player.path=null;G.paused=false;G.onChange();});
 await page.waitForTimeout(1200);
 await page.locator('#town-action').click();
 await page.locator('[data-hire-worker]').waitFor({state:'visible'});
 const coinBefore=await page.evaluate(()=>G.coin);
 for(let i=0;i<3;i++)await page.locator('[data-hire-worker]').click();
 const hired=await page.evaluate(()=>({count:G.workers().length,coin:G.coin,ids:G.workers().map(w=>w.id)}));
 if(hired.count!==3||Math.abs(coinBefore-hired.coin-720)>0.001)throw Error('UI hiring count/cost incorrect: '+JSON.stringify(hired));
 const modes=['supervise','repair','escort'];
 for(let i=0;i<3;i++)await page.locator(`[data-worker-mode="${hired.ids[i]}"]`).selectOption(modes[i]);
 await page.screenshot({path:'output/boss-expansion-20261016/workers-nira-office.png'});
 const overlap=await page.locator('.worker-card').evaluateAll(cards=>cards.some(card=>card.children[0].getBoundingClientRect().right>card.children[1].getBoundingClientRect().left));if(overlap)throw Error('Worker thumbnail overlaps text');
 await page.setViewportSize({width:390,height:844});await page.locator('.worker-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:'output/boss-expansion-20261016/workers-nira-office-mobile.png'});
 const mobileOverlap=await page.locator('.worker-card').evaluateAll(cards=>cards.some(card=>card.children[0].getBoundingClientRect().right>card.children[1].getBoundingClientRect().left));if(mobileOverlap)throw Error('Mobile worker thumbnail overlaps text');
 await page.setViewportSize({width:1440,height:960});
 await page.locator('dialog[open] [data-close]').last().click();
 const before=await page.evaluate(async()=>{
   const {STATIONS,SPOTS}=await import('/src/data.js');
   G.paused=false;G.hire('dam');G.discoveryQueue=[];G.storyQueue=[];
   const station=k=>{let st=G.stations.find(s=>s.def.k===k);if(!st){st={def:STATIONS.find(d=>d.k===k),slots:[],crewK:null,build:0,fire:0,intensity:1};G.stations.push(st);}return st;};
   const s=station('krata');s.slots=[{soul:{id:9910,who:'ทดสอบผู้ช่วย',sp:7},need:100000,progress:0,pendingUntil:0,intensity:1}];s.crewK='dam';G.crewOf('dam').at='krata';
   const repair=station('tarang');repair.fire=1;repair.repair=Date.now()+60000;repair.repairWait=true;G.crewOf('taan').at=null;G.crewOf('taan').buildK='tarang';
   G.syncBlocks(true);const helper=G.workers()[2];const start=[helper.x,helper.y];
   const soul={id:9911,who:'ทดสอบนำส่ง',sp:7};const entry={soul,zone:'th',stage:'prison',checked:false,karmaLeft:1};
   const to=STATIONS.find(d=>d.k==='tarang');G.startAfterlifeWalk(soul,start,[to.x,to.y],'prison',entry);
   G.step();G.onChange();
   return {workers:G.workers().map(w=>({id:w.id,x:w.x,y:w.y,job:w.job})),walk:G.afterlifeWalks.find(w=>w.soul.id===9911)?.escort,progress:s.slots[0].progress};
 });
 console.log('HIRED',hired,'JOBS',before);
 await page.waitForTimeout(2200);
 const moving=await page.evaluate(()=>G.workers().map(w=>({id:w.id,x:w.x,y:w.y,moving:w.moving,arrived:w.arrived,job:w.job})));
 if(!moving.some((w,i)=>Math.hypot(w.x-before.workers[i].x,w.y-before.workers[i].y)>10))throw Error('Workers did not move in real frame loop');
 await page.screenshot({path:'output/boss-expansion-20261016/workers-map-moving.png'});
 // Use production navigation/escort methods to advance game time without waiting for a long real-map walk.
 const effects=await page.evaluate(async()=>{
   const {advanceWorkers,workerSupervisionMultiplier}=await import('/src/workers.js');
   const {canWalk}=await import('/src/walk.js?v=k1d');
   const repair=G.stations.find(s=>s.def.k==='tarang');G.paused=true;
   const prior=G.paused;G.paused=false;
   for(let i=0;i<2500&&!G.workers()[0].arrived;i++)advanceWorkers(G,120);
   for(let i=0;i<2500&&!G.workers()[1].arrived;i++)advanceWorkers(G,120);
   const st=G.stations.find(s=>s.def.k==='krata');const mult=workerSupervisionMultiplier(G,st),p=st.slots[0].progress;G.step();
   repair.repairWait=false;repair.repair=Date.now()+60000;const remaining=repair.repair;
   advanceWorkers(G,120);const repairSaved=remaining-repair.repair;
   const walk=G.afterlifeWalks.find(w=>w.soul.id===9911);if(walk)G.advanceAfterlife(walk.duration);
   const result={mult,progressGain:st.slots[0].progress-p,repairSaved,workers:G.workers().map(w=>({id:w.id,x:w.x,y:w.y,arrived:w.arrived,job:w.job,walkable:canWalk(w.x,w.y)})),delivered:G.sentences.filter(s=>s.soul.id===9911).length,ledger:G.workerState.ledger};
   G.paused=prior;G.onChange();return result;
 });
 console.log('EFFECTS',effects);
 if(effects.mult!==1.2||!(effects.progressGain>0)||!(effects.repairSaved>0)||effects.delivered!==1||effects.workers.some(w=>!w.walkable))throw Error('Worker effects incorrect: '+JSON.stringify(effects));
 // Render a gallery through the exact production drawWorker function for every region and animation job.
 const frames=await page.evaluate(async()=>{
   const {drawWorker,workerSheet}=await import('/src/workers.js');
   const zones=['th','asia','west','cyberhell'];
   const images=await Promise.all(zones.map(zone=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve({zone,width:im.naturalWidth,height:im.naturalHeight});im.onerror=()=>resolve({zone,error:true});im.src=workerSheet(zone);})));
   const canvas=document.createElement('canvas');canvas.id='worker-qa-gallery';canvas.width=1000;canvas.height=640;canvas.style.cssText='position:fixed;inset:70px auto auto 15px;z-index:99999;width:1000px;height:640px;border:2px solid #bd914c;background:#211920';document.body.append(canvas);
   const ctx=canvas.getContext('2d');
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){const zone=zones[row],job=col===2?{kind:'repair'}:col===3?{kind:'escort'}:null;ctx.fillStyle='#f2d79b';ctx.font='16px sans-serif';ctx.fillText(`${zone} · ${['idle','walk','repair','escort'][col]}`,col*250+25,row*160+24);drawWorker(ctx,{homeZone:zone,x:col*250+125,y:row*160+150,job,arrived:true,moving:col===1,face:1},320,118);}
   await new Promise(r=>setTimeout(r,500));
   ctx.clearRect(0,0,canvas.width,canvas.height);
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){const zone=zones[row],job=col===2?{kind:'repair'}:col===3?{kind:'escort'}:null;ctx.fillStyle='#f2d79b';ctx.font='16px sans-serif';ctx.fillText(`${zone} · ${['idle','walk','repair','escort'][col]}`,col*250+25,row*160+24);drawWorker(ctx,{homeZone:zone,x:col*250+125,y:row*160+150,job,arrived:true,moving:col===1,face:1},320,118);}
   return images;
 });
 await page.screenshot({path:'output/boss-expansion-20261016/workers-render-gallery.png'});
 await page.setViewportSize({width:1600,height:1250});
 await page.evaluate(async()=>{
  const {drawWorker}=await import('/src/workers.js');document.querySelector('#worker-qa-gallery')?.remove();
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1152;canvas.style.cssText='position:fixed;inset:70px auto auto 15px;z-index:99999;width:1536px;height:1152px;background:#211920;border:2px solid #bd914c';document.body.append(canvas);const ctx=canvas.getContext('2d');
  for(const [z,zone] of ['th','asia','west','cyberhell'].entries()) {
   const zx=(z%2)*768,zy=Math.floor(z/2)*576;ctx.fillStyle='#f2d79b';ctx.font='20px sans-serif';ctx.fillText(zone,zx+15,zy+25);
   for(let row=0;row<4;row++)for(let col=0;col<4;col++) {
    const x=zx+col*192,y=zy+36+row*135;ctx.strokeStyle='#493647';ctx.strokeRect(x,y,192,135);ctx.font='12px sans-serif';ctx.fillStyle='#ddc8a5';ctx.fillText(`${['idle','walk','repair','escort'][row]} ${col+1}`,x+8,y+16);
    drawWorker(ctx,{homeZone:zone,x:x+96,y:y+128,job:row===2?{kind:'repair'}:row===3?{kind:'escort'}:null,arrived:true,moving:row===1,face:1},col*160,103);
   }
  }
 });
 await page.screenshot({path:'output/boss-expansion-20261016/workers-all-64-frames.png'});
 const report={hired,before,moving,effects,frames,errors,requests};
 fs.writeFileSync('output/boss-expansion-20261016/workers-browser-report.json',JSON.stringify(report,null,2));
 if(errors.length||requests.length||frames.some(f=>f.error))throw Error('Browser errors: '+JSON.stringify({errors,requests,frames}));
 console.log('WORKER_BROWSER_QA_PASS');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
