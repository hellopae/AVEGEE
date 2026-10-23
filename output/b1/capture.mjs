// Run from repository root with the game served on port 8789.
// npm install playwright (outside this repository); npx playwright install chromium
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node output/b1/capture.mjs
// Optional PLAYWRIGHT_EXECUTABLE=/absolute/path/to/chromium
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser=await chromium.launch({headless:true, executablePath:process.env.PLAYWRIGHT_EXECUTABLE});
const report=[];
try {
 for(const reduced of [false,true]) {
  const page=await browser.newPage({viewport:{width:1365,height:900},reducedMotion:reduced?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Test-only access to the real battle UI, injected in the response, never in shipped code.
  await page.route(/\/src\/ui\.js(?:\?|$)/,async route=>{
   const response=await route.fetch();
   await route.fulfill({response,body:(await response.text())+'\nwindow.__b1={openBattle,startPlay};'});
  });
  await page.goto(process.env.B1_URL || 'http://127.0.0.1:8789/');
  await page.waitForFunction(()=>!!window.__b1);
  await page.evaluate(()=>{
   __b1.startPlay(false);const g=window.G;g.save=()=>true;g.storyQueue=[];g.party.members=[];g.pendingReward=null;
   document.querySelector('#dlg').close();
   g.startBattle({id:99,who:'B1 target',deserved:4,resist:true});
   g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[1,1];});__b1.openBattle();
  });
  await page.waitForFunction(()=>document.querySelector('.formation-member')?.style.width);
  await page.waitForTimeout(700);
  await page.screenshot({path:`output/b1/${reduced?'reduced':'normal'}-home.png`});
  // Record each browser animation frame across all repaints, including the actual model HP.
  await page.evaluate(()=>{
   window.__b1Samples=[];const start=performance.now();
   const sample=()=>{
    const root=document.querySelector('.fig.you'), b=G.battle;
    if(!root||!b)return;
    const box=root.getBoundingClientRect();
    __b1Samples.push({at:performance.now()-start,x:box.x,y:box.y,phase:root.dataset.dashPhase||'idle',hp:b.foes[0].hp,busy:b.commandBusy,turn:G.currentBattleTurn()?.side});
    if(performance.now()-start<1250)requestAnimationFrame(sample);
   };sample();
  });
  await page.locator('[data-command="attack"]').click();
  // Selecting the ordinary attack opens target selection; clicking the enemy executes it.
  const atk=page.locator('[data-act="atk"]');
  if(await atk.isVisible())await atk.click();
  await page.locator('.fig.foe[data-foe-id]').first().click();
  for(const [name,delay] of [['outbound',130],['contact',390],['return',330],['home',300]]) {
   await page.waitForTimeout(delay);
   await page.screenshot({path:`output/b1/${reduced?'reduced':'normal'}-${name}.png`});
  }
  const samples=await page.evaluate(()=>__b1Samples);
  const active=samples.filter(s=>s.phase!=='idle');
  assert.ok(active.length,'dash actually ran');
  const before=active.filter(s=>s.phase==='outbound'||s.phase==='attack');
  assert.ok(before.every(s=>s.hp===10000),'damage is held until contact');
  const damaged=active.filter(s=>s.hp<10000);assert.ok(damaged.length,'contact applies damage');
  assert.equal(new Set(damaged.map(s=>s.hp)).size,1,'one damage application');
  assert.ok(active.every(s=>s.turn==='ally'),'next turn waits for home');
  if(reduced)assert.ok(Math.max(...active.map(s=>s.x))-Math.min(...active.map(s=>s.x))<2,'reduced motion stays still');
  assert.deepEqual(errors,[],'no browser exceptions');
  report.push({reduced,samples,errors});await page.close();
 }
 await writeFile('output/b1/browser-results.json',JSON.stringify(report,null,2));
 console.log('Browser assertions completed; inspect screenshots for visual acceptance.');
} finally {await browser.close();}
