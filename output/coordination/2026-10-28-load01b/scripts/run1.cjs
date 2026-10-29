// usage: node run1.cjs <scene> <mobile|desktop> <throttle> <outdir> [noprofile]
const {launch,boot,measure,quiet,gotoZone}=require('./lib.cjs');
const {SCENES}=require('./scenes.cjs');
const fs=require('fs');
(async()=>{
 const [scene,profile,throttle,outdir,np]=process.argv.slice(2);
 const h=await launch(profile);const page=h.page;
 await boot(h);
 const sc=await SCENES[scene](h);
 await sc.setup();
 if(scene.startsWith('town')){await quiet(page,3);}
 await page.waitForTimeout(800);
 await page.screenshot({path:`${outdir}/${scene}-${profile}-start.png`});
 const r=await measure(h,{name:scene,ms:sc.ms,throttle:+throttle,during:sc.during,profile:np!=='noprofile'});
 r.extra=h.extra;
 await page.screenshot({path:`${outdir}/${scene}-${profile}-end.png`});
 r.errors=h.errors.filter(e=>!/404/.test(e));
 r.dpr=profile==='mobile'?2:1;
 fs.writeFileSync(`${outdir}/${scene}-${profile}-x${throttle}.json`,JSON.stringify(r));
 console.log(scene,profile,'x'+throttle,JSON.stringify(r.frames),'long>50:',r.longTasks.over50,'LoAF',r.loafCount,'extra',JSON.stringify(r.extra),'err',r.errors.length);
 if(process.env.LOAF)console.log(r.loafTop.map(l=>`   LoAF ${l.d.toFixed(0)}ms block ${l.b.toFixed(0)} `+l.s.map(x=>x.join('|')).join(' ; ')).join('\n'));
 if(r.top)console.log(r.top.incl.slice(0,25).map(t=>`   incl ${t.inclMs}ms ${t.fn}`).join('\n'));
 if(r.top)console.log(r.top.top.slice(0,6).map(t=>`   ${t.pct}% ${t.selfMs}ms ${t.fn}`).join('\n'));
 await h.browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
