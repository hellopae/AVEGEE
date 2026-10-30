// Z4-TOWN-B: building scale / canteen / dais evidence + terrain tile load check. usage: BASE=... node shots2.cjs <outdir>
const {launch,boot,gotoZone}=require('./lib.cjs');
(async()=>{
 const out=process.argv[2];
 for(const profile of ['desktop','mobile']){
  const h=await launch(profile),page=h.page;await boot(h);await gotoZone(page,'cyberhell');
  await page.evaluate(()=>{G.player.x=1855;G.player.y=1130;G.paused=false;});
  await page.waitForTimeout(2500);
  await page.screenshot({path:`${out}/b-${profile}-court.png`});
  await page.evaluate(()=>{G.player.x=1840;G.player.y=520;});
  await page.waitForTimeout(2500);
  await page.screenshot({path:`${out}/b-${profile}-canteen.png`});
  for(let i=0;i<3;i++)await page.locator('#town-zoom-more').click({timeout:3000}).catch(()=>{});
  await page.waitForTimeout(4000);
  const st=await page.evaluate(async()=>{const m=await import('/src/town-terrain.js');const c=document.querySelector('#town-canvas')||[...document.querySelectorAll('canvas')].sort((a,b)=>b.width-a.width)[0];return {stats:m.townTerrainStats(),canvas:[c.width,c.height],dpr:devicePixelRatio};});
  console.log(profile,'zoomed tiles',JSON.stringify(st));
  await page.screenshot({path:`${out}/b-${profile}-zoom.png`});
  await page.locator('#town-overview').click({timeout:3000}).catch(()=>{});
  await page.waitForTimeout(2500);
  await page.screenshot({path:`${out}/b-${profile}-overview.png`});
  console.log(profile,'errors',JSON.stringify(h.errors.filter(e=>!/404/.test(e))));
  await h.browser.close();
 }
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
