const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
const results=[];
for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/output/f12-code/browser-harness.html');await page.waitForFunction(()=>window.ready);
 // Advance animation frames deterministically so real keyboard/click handlers can traverse the whole map.
 await page.clock.install();
 const position=()=>page.evaluate(()=>Object.values(api.g.zoneTravel.active.position));
 async function settle(){await page.clock.runFor(700);}
 async function screen(p){return page.evaluate(p=>{const pos=Object.values(api.g.zoneTravel.active.position),c=api.frontierCameraTarget(innerWidth,innerHeight,pos);return [c.x+p[0]*1672*c.scale,c.y+p[1]*941*c.scale];},p);}
 for(const [name,goal] of [['left-water',[.357,.636]],['north',[.58,.247]],['south-stairs',[.565,.946]]]){
  await page.evaluate(()=>mount(api.view.dungeonPoint(0)));await settle();
  const path=await page.evaluate(p=>api.view.dungeonPath(api.view.dungeonPoint(0),p),goal);
  for(const waypoint of path){
   // Long waypoints can sit outside a phone viewport: use reachable intermediate points along each clear segment.
   for(let guard=0;guard<80;guard++){
    const at=await position(),dx=waypoint[0]-at[0],dy=waypoint[1]-at[1],distance=Math.hypot(dx*1.79,dy);
    if(distance<.001)break;
    const u=Math.min(1,.065/distance),target=[at[0]+dx*u,at[1]+dy*u],s=await screen(target);
    await page.mouse.click(...s);await page.clock.runFor(Math.ceil(Math.min(distance,.065)/.00019)+100);
   }
  }
  const at=await position();if(Math.hypot(at[0]-goal[0],at[1]-goal[1])>.004)throw new Error(`${width} ${name} did not arrive: ${at}`);
  await settle();await page.screenshot({path:`output/f12-code/${width}-${name}.png`});results.push({width,name,goal,position:at});
 }
 // Keyboard movement and drag joystick are actual browser input, with save positions inspected afterwards.
 await page.evaluate(()=>mount(api.view.dungeonPoint(0)));await settle();const before=await position();
 await page.keyboard.down('d');await page.clock.runFor(350);await page.keyboard.up('d');const after=await position();
 if(after[0]<=before[0])throw new Error('keyboard did not move');
 const center=await screen(after);await page.mouse.move(...center);await page.mouse.down();await page.mouse.move(center[0]+40,center[1]+20);await page.clock.runFor(250);await page.mouse.up();
 results.push({width,input:'keyboard + drag joystick',before,after,drag:await position()});
 // Find a walkable point behind a tree's crown, mount there and photograph sorted occlusion.
 const overlap=await page.evaluate(()=>{for(const t of api.trees){const p=[t.x,t.y-.018];if(api.view.dungeonWalkable(p))return {tree:t,point:p};}return null;});
 if(!overlap)throw new Error('no tree overlap position');await page.evaluate(p=>mount(p),overlap.point);await settle();
 await page.screenshot({path:`output/f12-code/${width}-behind-tree.png`});results.push({width,name:'behind-tree',...overlap});
 if(errors.length)throw new Error(errors.join('\n'));results.push({width,pageerrors:errors});await page.close();
}
await browser.close();writeFileSync('output/f12-code/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
