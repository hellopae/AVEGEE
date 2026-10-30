// Contact sheet: both pole variants at 3 heights, wires between them, a spark and 4 bolt frames. node contact.mjs <out.png>
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCanvas}=require('/Users/agapae/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const m=await import('../../../src/z4-poles.js');
const S=3,cv=createCanvas(900,420),ctx=cv.getContext('2d');
ctx.fillStyle='#2a2438';ctx.fillRect(0,0,900,420);
ctx.scale(S,S);
const {poles}=m.z4Layout();
const pick=[...[0,1].flatMap(v=>[20,40,80].map(h=>poles.filter(p=>p.variant===v).sort((a,b)=>Math.abs(a.h-h)-Math.abs(b.h-h))[0]))];
const placed=pick.map((p,i)=>({...p,x:30+i*48,y:120,top:120-p.h}));
for(const p of placed)m.drawZ4Pole(ctx,p,1000);
m.drawZ4Bolt(ctx,placed[2],.2,5,1);m.drawZ4Bolt(ctx,placed[4],.3,9,1);m.drawZ4Bolt(ctx,placed[1],.1,3,1);m.drawZ4Bolt(ctx,placed[5],.4,12,1);
require('node:fs').writeFileSync(process.argv[2],cv.toBuffer('image/png'));
console.log(placed.map(p=>[p.variant,Math.round(p.h)]).join(' | '));
