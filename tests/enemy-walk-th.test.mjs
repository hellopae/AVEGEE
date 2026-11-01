import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ENEMY_WALK_ART,enemyWalkReady} from '../src/enemy-walk-assets.js';
const keys=['mob-pret','mob-pret2','mob-werewolf','mob-krahang','mob-pop','mob-tanee'];
function pixels(file){
 const b=readFileSync(file);assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.equal(b[24],8);assert.equal(b[25],6,'RGBA');
 const parts=[];for(let o=8;o<b.length;){const n=b.readUInt32BE(o);if(b.toString('ascii',o+4,o+8)==='IDAT')parts.push(b.subarray(o+8,o+8+n));o+=n+12;}
 const data=inflateSync(Buffer.concat(parts)),out=new Uint8Array(w*h*4);let k=0;const stride=w*4;
 for(let y=0;y<h;y++){const f=data[k++];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?out[i-4]:0,c=x>=4&&y?out[i-stride-4]:0,up=y?out[i-stride]:0,p=a+up-c;const pa=Math.abs(p-a),pb=Math.abs(p-up),pc=Math.abs(p-c);out[i]=(data[k++]+[0,a,up,Math.floor((a+up)/2),pa<=pb&&pa<=pc?a:pb<=pc?up:c][f])&255;}}
 return {w,h,out};
}
for(const key of keys)test(`${key}: four distinct RGBA cells retain size, bottom pivot and transparent margins`,()=>{
 assert.ok(enemyWalkReady(key));const {w,h,out}=pixels(`img/${key}-walk.png`),standing=readFileSync(`img/${key}.png`);assert.deepEqual([w,h],[standing.readUInt32BE(16)*4,standing.readUInt32BE(20)]);assert.equal(h,512);
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
 for(const key of ENEMY_WALK_ART){const bytes=readFileSync(`img/${key}-walk.png`);assert.equal(bytes.toString('ascii',1,4),'PNG');}
});
