// A/B frame time in Zone 4 town: variant "base" stubs z4-poles.js (route) so the poles/wires/electricity are not drawn; "new" is the real module.
// usage: BASE=http://localhost:8795 node perf.cjs <outfile.json>
const {launch,boot,gotoZone,measure}=require('./lib.cjs');
const fs=require('fs');
const STUB="export const addZ4PoleLayers=()=>({poles:0,wires:0,runners:0,bolt:false});";
async function run(profile,variant){
 const h=await launch(profile),page=h.page;
 if(variant==='base')await page.route('**/src/z4-poles.js*',r=>r.fulfill({status:200,contentType:'text/javascript',body:STUB}));
 await boot(h);await gotoZone(page,'cyberhell');
 await page.evaluate(()=>{G.player.x=1500;G.player.y=900;G.paused=false;});
 await page.waitForTimeout(2000);
 const throttle=profile==='mobile'?4:1,wins=[];
 for(let i=0;i<3;i++){const r=await measure(h,{name:'z4',ms:8000,throttle,profile:false});wins.push(r.frames);}
 await h.browser.close();
 const med=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
 return {profile,variant,throttle,median:med(wins.map(w=>w.median)),mean:+(wins.reduce((a,w)=>a+w.mean,0)/3).toFixed(2),p95:med(wins.map(w=>w.p95)),wins};
}
(async()=>{
 const res=[];
 for(const [p,v] of [['desktop','base'],['desktop','new'],['mobile','base'],['mobile','new'],['mobile','new'],['mobile','base'],['desktop','new'],['desktop','base']]){
  const r=await run(p,v);res.push(r);console.log(p,v,'median',r.median,'mean',r.mean,'p95',r.p95);
  fs.writeFileSync(process.argv[2],JSON.stringify(res,null,1));
 }
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
