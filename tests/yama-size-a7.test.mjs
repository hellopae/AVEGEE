import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {yamaFit} from '../src/yama-fit.js';
import {drawYamaBook,drawYamaSwordIdle} from '../src/yama-animation.js';
const zones=['th','asia','west','cyberhell'],dirs=['down','left','right','up'];
globalThis.Image=class{naturalWidth=512;naturalHeight=512;set src(v){this.path=v;queueMicrotask(()=>this.onload?.());}};
const records=[];let current;
const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},drawImage(im,...args){records.push({...current,path:im.path,args});}};
async function warm(fn){const n=records.length;fn();await Promise.resolve();records.length=n;}
test('A7 generated body fits still match all 236 shipped alpha frames and source hashes',()=>{
 const out=JSON.parse(execFileSync('python3',['scripts/art/measure-yama-fit.py'],{encoding:'utf8'}));assert.equal(out.metadata_matches,true);assert.equal(out.frames,236);assert.equal(out.sources,20);
});
test('A7 production book renderer makes actual idle silhouettes equally high with the same foot baseline',async()=>{
 records.length=0;
 for(const z of zones)for(const direction of dirs){
  await warm(()=>drawYamaBook(ctx,z,200,300,96,0,direction,false,0));
  for(const now of [0,1000,1320,1420]){current={z,direction};assert.ok(drawYamaBook(ctx,z,200,300,96,0,direction,false,now));}
 }
 const result=JSON.parse(execFileSync('python3',['-c',`
import json,sys,statistics
from PIL import Image
rows=json.loads(sys.stdin.read());groups={}
for r in rows:
 sx,sy,sw,sh,dx,dy,dw,dh=r['args'];im=Image.open(r['path']).convert('RGBA').crop((sx,sy,sx+sw,sy+sh))
 b=im.getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox();key=r['z']+'/'+r['direction']
 top=dy+b[1]*dh/sh;foot=dy+b[3]*dh/sh
 band=im.getchannel('A').crop((0,b[3]-8,sw,b[3])).point(lambda a:255 if a>=64 else 0);xx=[i%sw+.5 for i,v in enumerate(band.getdata()) if v];cx=dx+(sum(xx)/len(xx))*dw/sw
 groups.setdefault(key,[]).append([top,foot,cx])
for key,bs in groups.items():
 assert abs(max(b[1] for b in bs)-min(b[0] for b in bs)-96)<.0001,(key,bs)
 assert abs(max(b[1] for b in bs)-300)<.0001,(key,bs)
 assert abs(statistics.median(b[2] for b in bs)-200)<.001,(key,'foot x',bs)
 assert max(b[1] for b in bs)-min(b[1] for b in bs)<=1.3,(key,'blink foot jitter',bs)
print(json.dumps({'directions':len(groups),'frames':len(rows),'height':96,'foot':300}))
`],{input:JSON.stringify(records.filter(r=>r.z)),encoding:'utf8'}));assert.equal(result.directions,16);assert.equal(result.frames,64);
});
test('A7 walking retains native eight poses and one unchanged scale/anchor shared with standing idle',async()=>{
 for(const z of zones)for(const direction of dirs){
  await warm(()=>drawYamaBook(ctx,z,200,300,96,0,direction,true,0));records.length=0;current={z,direction};
  drawYamaBook(ctx,z,200,300,96,0,direction,false,0);const baseline=records.at(-1).args.slice(6);let walkingAnchor;
  for(let frame=0;frame<8;frame++){drawYamaBook(ctx,z,200,300,96,frame*7,direction,true,0);const args=records.at(-1).args;assert.equal(args[0],frame*320);assert.equal(args[1],dirs.indexOf(direction)*480);assert.deepEqual(args.slice(6),baseline);if(walkingAnchor)assert.deepEqual(args.slice(4),walkingAnchor);walkingAnchor=args.slice(4);}
 }
});
test('A7 sword idle fits a constant body height while retaining the same six-frame timing',async()=>{
 const timing=[0,1000,1240,1660,1760,1860],rows=[];
 for(const z of zones){await warm(()=>drawYamaSwordIdle(ctx,z,200,300,96,0));records.length=0;current={z};for(const now of timing)drawYamaSwordIdle(ctx,z,200,300,96,now);rows.push(...records);}
 const out=execFileSync('python3',['-c',`
import json,sys,statistics
from PIL import Image
rows=json.loads(sys.stdin.read());groups={}
for r in rows:
 sx,sy,sw,sh,dx,dy,dw,dh=r['args'];im=Image.open(r['path']).convert('RGBA').crop((sx,sy,sx+sw,sy+sh));b=im.getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
 groups.setdefault(r['z'],[]).append([dy+b[1]*dh/sh,dy+b[3]*dh/sh])
for z,bs in groups.items():assert abs(max(b[1] for b in bs)-min(b[0] for b in bs)-96)<.0001,(z,bs);assert abs(max(b[1] for b in bs))<.0001,(z,'foot')
print(len(rows))
`],{input:JSON.stringify(rows),encoding:'utf8'});assert.equal(Number(out),24);
});

test('A7 production standing fallback aligns every outfit silhouette to requested height and foot',()=>{
 const src=readFileSync(new URL('../src/art.js',import.meta.url),'utf8');const begin=src.indexOf('export function drawStandee('),end=src.indexOf('/** Eight drawn walk poses',begin),body=src.slice(begin,end).replace('export function','function');
 const paths={th:'img/hero-yama.png',asia:'img/Asia/hero-yama-asia.png',west:'img/West/hero-yama-west.png',cyberhell:'img/CyberHell/hero-yama-cyberhell.png'},rows=[];
 for(const z of zones){let drawn;const im={naturalWidth:512,naturalHeight:512};const c=vm.createContext({standeeFit:()=>1,zoneOf:()=>z,heroStyleOf:()=>z,yamaFit,img:()=>im,drawContactShadow(){},ctx:{save(){},restore(){},translate(){},scale(){},drawImage:(im,...args)=>drawn=args}});vm.runInContext(body,c);c.drawStandee(c.ctx,'hero-yama',0,300,96,0);rows.push({path:paths[z],args:drawn});}
 const output=execFileSync('python3',['-c',`
import json,sys
from PIL import Image
for r in json.loads(sys.stdin.read()):
 b=Image.open(r['path']).convert('RGBA').getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox();dx,dy,dw,dh=r['args']
 assert abs((b[3]-b[1])*dh/512-96)<.0001
 assert abs(dy+b[3]*dh/512)<.0001
print('4 aligned fallback outfits')
`],{input:JSON.stringify(rows),encoding:'utf8'});assert.match(output,/4 aligned/);
});
