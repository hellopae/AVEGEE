import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeRGBA} from './helpers/decode-rgba.mjs';
import {imageMeta} from './helpers/image-meta.mjs';
import {createHash} from 'node:crypto';
import {ENEMY_WALK_ART,enemyWalkReady} from '../src/enemy-walk-assets.js';
const keys=['mob-skeleton','mob-bot','mob-bug','mob-worm','mob-cyber-guard','mob-cyber-lancer','mob-cyber-brute'];
const pixels=file=>decodeRGBA(file);
for(const key of keys)test(`${key}: four distinct RGBA cells retain size, bottom pivot and transparent margins`,()=>{
 assert.ok(enemyWalkReady(key));const {w,h,out}=pixels(`img/${key}-walk.webp`),standing=readFileSync((key==='mob-skeleton'?`img/West/${key}-west.webp`:`img/CyberHell/${key}-cyberhell.webp`));assert.deepEqual([w,h],[imageMeta(standing).width*4,imageMeta(standing).height]);assert.equal(h,512);
 const hashes=[];
 for(let f=0;f<4;f++){
  let x0=512,x1=-1,y0=512,y1=-1,clear=0;const frame=new Uint8Array(512*512*4);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*w+f*512+x)*4,a=out[i+3];frame.set(out.subarray(i,i+4),(y*512+x)*4);if(!a)clear++;if(a>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
  assert.ok(clear>512*512*.12,'background remains transparent');assert.ok(y1>=509&&y1<=511,'feet/tail keep a fixed floor line');assert.ok(Math.abs((x0+x1)/2-255.5)<=2,'body stays centered on common cell pivot');assert.ok(y0>=0&&x0>=0&&x1<512);
  hashes.push(createHash('sha256').update(frame).digest('hex'));
 }
 assert.equal(new Set(hashes).size,4,'four actual poses, not repeated standing copies');
});
test('walk registry retains fallback for unregistered keys and every enabled strip exists',()=>{
 assert.equal(enemyWalkReady('mob-unavailable-test'),false);
 assert.ok(ENEMY_WALK_ART.size>=keys.length);
 for(const key of ENEMY_WALK_ART){const bytes=readFileSync(`img/${key}-walk.webp`);assert.ok(imageMeta(bytes).hasAlpha);}
});
