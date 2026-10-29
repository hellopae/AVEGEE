// usage: BASE=url node compare.cjs <outdir> <mobile|desktop>
const {launch,boot,quiet,gotoZone}=require('./lib.cjs');
const fs=require('fs');
const {chromium}=require('/Users/agapae/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const [outdir,profile]=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
 const h=await launch(profile);const {page,ctx}=h;
 await ctx.addInitScript(`(()=>{const raf=window.requestAnimationFrame.bind(window);window.__frz=null;window.requestAnimationFrame=cb=>raf(t=>cb(window.__frz??t));})();`);
 await boot(h);
 await page.emulateMedia({reducedMotion:'reduce'});
 const css='*{animation:none !important;transition:none !important;caret-color:transparent !important}';
 await page.addStyleTag({content:css});
 const freeze=async()=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(t=>{window.__frz=t;r();})));await page.waitForTimeout(700);};
 const unfreeze=()=>page.evaluate(()=>{window.__frz=null;});
 const shot=async n=>{await freeze();await page.screenshot({path:`${outdir}/${n}-${profile}.png`});await unfreeze();};
 const park=async(x,y)=>{await page.evaluate(([x,y])=>{G.paused=false;G.player.x=x;G.player.y=y;G.player.path=null;G.player.tx=null;G.player.ty=null;},[x,y]);await page.waitForTimeout(5000);await quiet(page,2);};
 const settle=()=>page.waitForTimeout(7000);
 // towns: spawn + a second spot
 for(const z of ['th','asia','west','cyberhell']){
  if(z!=='th')await gotoZone(page,z);
  await settle();await shot(`town-${z}-a`);
  await park(2300,1500);await settle();await shot(`town-${z}-b`);
 }
 await gotoZone(page,'th');await settle();
 // trial
 const S=require('./scenes.cjs').SCENES;
 let sc=await S['trial'](h);await sc.setup();await shot('trial');
 await page.evaluate(()=>document.querySelector('#dlg').close());await quiet(page,3);
 sc=await S['border-1-2'](h);await sc.setup();await shot('border-1-2');
 await page.evaluate(()=>{document.querySelector('#dlg').close();G.zoneTravel.active=null;});await quiet(page,3);
 sc=await S['battle'](h);await sc.setup();await shot('battle');
 console.log(profile,'done',h.errors.filter(e=>!/404/.test(e)));
 await h.browser.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
