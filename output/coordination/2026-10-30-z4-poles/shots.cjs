// usage: BASE=http://localhost:8795 node shots.cjs <outdir>
const {launch,boot,gotoZone}=require('./lib.cjs');
(async()=>{
 const out=process.argv[2];
 for(const profile of (process.argv[3]||'desktop,mobile').split(',')){
  const h=await launch(profile),page=h.page;
  await boot(h);
  await gotoZone(page,'cyberhell');
  const info=await page.evaluate(()=>({zone:G.zone,x:G.player.x,y:G.player.y}));console.log(profile,JSON.stringify(info));
  for(const [name,x,y,zoom] of [['default',1500,900,0],['zoom',1500,900,3]]){
   await page.evaluate(([x,y])=>{G.player.x=x;G.player.y=y;G.paused=false;},[x,y]);
   for(let i=0;i<zoom;i++)await page.locator('#town-zoom-more').click({timeout:3000}).catch(()=>{});
   await page.waitForTimeout(2500);
   await page.screenshot({path:`${out}/z4-${profile}-${name}.png`});
  }
  for(let i=0;i<5;i++){await page.waitForTimeout(170);await page.screenshot({path:`${out}/z4-${profile}-burst${i}.png`});}
  await page.locator('#town-overview').click({timeout:3000}).catch(()=>{});
  await page.waitForTimeout(2500);
  await page.screenshot({path:`${out}/z4-${profile}-overview.png`});
  console.log(profile,'errors',JSON.stringify(h.errors.filter(e=>!/404/.test(e))));
  await h.browser.close();
 }
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
