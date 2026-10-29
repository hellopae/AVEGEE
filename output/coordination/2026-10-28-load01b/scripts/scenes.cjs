const {launch,boot,measure,quiet,gotoZone}=require('./lib.cjs');
const fs=require('fs');
const uiUrl=`document.querySelector('script[src*="ui.js"]').src`;

// ---- town walk ----
async function townWalk(h,ms){
 const {page}=h;
 const pts=await page.evaluate(async()=>{
  const {FRONTIER,SPOTS}=await import('/src/data.js');
  const a=[...G.stations.map(s=>[s.def.x,s.def.y]),[FRONTIER.x,FRONTIER.y]];
  const hp=G.harbourPoint();a.push([hp.x,hp.y]);
  const th=SPOTS.throne;if(th)a.push([th.x,th.y]);
  return a;
 });
 const t0=Date.now();let i=0,dist=0,last=await page.evaluate(()=>[G.player.x,G.player.y]);
 while(Date.now()-t0<ms){
  const p=pts[i++%pts.length];
  await page.evaluate(([x,y])=>{G.paused=false;G.walkTo(x,y);},p);
  await page.waitForTimeout(3300);
  const now=await page.evaluate(()=>[G.player.x,G.player.y]);dist+=Math.hypot(now[0]-last[0],now[1]-last[1]);last=now;
 }
 h.extra={walkedPx:Math.round(dist)};
}
// ---- dungeon (border) walk ----
async function dungeonSetup(h,from,to){
 const {page}=h;
 await page.evaluate(async([from,to,uiUrlSrc])=>{
  const {openDungeon}=await import(document.querySelector('script[src*="ui.js"]').src);
  const {FRONTIER}=await import('/src/data.js');
  G.bossCleared[from]=true;G.player.x=FRONTIER.x;G.player.y=FRONTIER.y;
  if(!G.zoneTravel.active)G.beginBorderDungeon(to);
  openDungeon();
 },[from,to]);
 await page.waitForFunction(()=>document.querySelector('#dungeon-root canvas'),{timeout:30000});
 await page.waitForTimeout(3000);
 await page.evaluate(()=>{G.dungeonChaseCooldown=true;});   // harness only: no auto-encounter, so the walk is continuous
}
async function dungeonWalk(h,ms){
 const {page}=h;
 const box=await page.evaluate(()=>{const c=document.querySelector('#dungeon-root canvas');const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
 const t0=Date.now();const dirs=[['ArrowDown','ArrowRight'],['ArrowRight'],['ArrowDown'],['ArrowRight','ArrowUp'],['ArrowRight']];let i=0;
 await page.evaluate(()=>document.querySelector('#dungeon-root canvas').focus());
 while(Date.now()-t0<ms){
  const d=dirs[i++%dirs.length];
  for(const k of d)await page.keyboard.down(k);
  await page.waitForTimeout(2000);
  for(const k of d)await page.keyboard.up(k);
  if(await page.evaluate(()=>!!G.battle)){h.extra={...(h.extra||{}),battleStarted:true};break;}
 }
}
// ---- trial room ----
async function trialSetup(h){
 const {page}=h;
 await page.evaluate(async()=>{
  const {openTrial}=await import(document.querySelector('script[src*="ui.js"]').src);
  const {STATIONS}=await import('/src/data.js');
  G.hire('dam');G.hire('kan');G.hire('boon');
  if(!G.taught.includes('trial-calculation'))G.taught.push('trial-calculation');
  for(const k of ['krata','lokan','dab'])if(!G.has(k)){const def=STATIONS.find(d=>d.k===k);G.stations.push({...G.stations[0],def,build:0,buildWait:false,slots:[],crewK:null});}
  if(!G.queue.length)G.spawnSoul();
  G.courtArrivals=[];G.courtClosed=true;
  openTrial();
 });
 await page.waitForTimeout(1500);
 for(let i=0;i<6;i++){await page.evaluate(()=>{document.querySelectorAll('.trial-first-lesson button, [data-trait-lesson-next]').forEach(b=>b.click());});await page.waitForTimeout(500);}
 await page.waitForTimeout(1500);
}
async function trialIdle(h,ms){
 const {page}=h;const t0=Date.now();
 while(Date.now()-t0<ms){
  // interact: press an interrogation line if there is one, to exercise the room
  await page.evaluate(()=>{const b=document.querySelector('dialog[open] [data-line]:not(:disabled)');if(b)b.click();});
  await page.waitForTimeout(1800);
 }
}
// ---- battle ----
async function battleSetup(h){
 const {page}=h;
 await page.evaluate(async()=>{
  const {openBattle}=await import(document.querySelector('script[src*="ui.js"]').src);
  G.hire('taan');G.hire('boon');G.party.members=['taan','boon'];G.hireGuard();
  G.startBattle({id:999,who:'ทดสอบคิว',deserved:4,resist:true});
  const b=G.battle;b.foes=b.foes.map(f=>({...f,hp:5000,maxHp:5000,atk:[1,2]}));
  openBattle();
 });
 await page.waitForTimeout(2500);
}
async function battleRound(h,ms){
 const {page}=h;const t0=Date.now();let clicks=0;
 while(Date.now()-t0<ms){
  const ok=await page.evaluate(()=>{
    const bs=[...document.querySelectorAll('dialog[open] button')].filter(b=>/^โจมตี/.test(b.innerText.trim())&&!b.disabled&&b.offsetParent);
    if(bs[0]){bs[0].click();return 1;}return 0;});
  clicks+=ok;
  await page.waitForTimeout(450);
 }
 h.extra={attackClicks:clicks};
}
const SCENES={
 'town-th':async(h)=>({setup:async()=>{},during:townWalk,ms:20000}),
 'town-asia':async(h)=>({setup:async()=>{await gotoZone(h.page,'asia')},during:townWalk,ms:20000}),
 'town-west':async(h)=>({setup:async()=>{await gotoZone(h.page,'west')},during:townWalk,ms:20000}),
 'town-cyberhell':async(h)=>({setup:async()=>{await gotoZone(h.page,'cyberhell')},during:townWalk,ms:20000}),
 'border-1-2':async(h)=>({setup:()=>dungeonSetup(h,'th','asia'),during:dungeonWalk,ms:14000}),
 'border-2-3':async(h)=>({setup:async()=>{await gotoZone(h.page,'asia');await dungeonSetup(h,'asia','west')},during:dungeonWalk,ms:14000}),
 'trial':async(h)=>({setup:()=>trialSetup(h),during:trialIdle,ms:10000}),
 'battle':async(h)=>({setup:()=>battleSetup(h),during:battleRound,ms:16000}),
};
module.exports={SCENES};
