import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {townContains,applyTownZoneLayout,TOWN_DAIS} from '../src/town-layout.js';
import {daisWorldPoint} from '../src/town-dais-geometry.js';

// F19 (owner 15 Nov, b5.png) - the dais can be entered from the front stairs only; behind it a walker is covered by it (scene sorts the dais by its back rail).
for(const zone of ['th','asia','west','cyberhell'])test(`F19 ${zone}: the platform cannot be reached except through the front stairs`,()=>{
  applyTownZoneLayout(zone,undefined,true);
  const d=TOWN_DAIS,S=4,W=3840/S,H=2560/S;
  const toL=(x,y)=>[(x-d.x)*1536/d.w+768,(y-d.y)*1536/d.w+1024];
  const ok=(i,j)=>{const x=i*S+S/2,y=j*S+S/2;if(!townContains(x,y))return false;const [u,v]=toL(x,y);return !(u>540&&u<1000&&v>=690&&v<1000);};   // the front stair lane is closed for this test
  const [sx,sy]=daisWorldPoint([768,120],d);let si=Math.floor(sx/S),sj=Math.floor(sy/S),found=false;
  for(let r=0;r<40&&!found;r++)for(let a=-r;a<=r&&!found;a++)for(let b=-r;b<=r&&!found;b++)if(ok(si+a,sj+b)){si+=a;sj+=b;found=true;}
  assert.ok(found,'a floor cell behind the dais');
  const seen=new Uint8Array(W*H),q=[si+sj*W];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){const c=q[h],i=c%W,j=(c/W)|0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=W||nj>=H)continue;const n=ni+nj*W;if(!seen[n]&&ok(ni,nj)){seen[n]=1;q.push(n);}}}
  for(const [u,v] of [[768,560],[768,620],[500,560],[1000,560]]){
    const [x,y]=daisWorldPoint([u,v],d),i=Math.floor(x/S),j=Math.floor(y/S);
    if(townContains(x,y))assert.equal(seen[i+j*W],0,`platform point ${u},${v} reachable without the front stairs`);
  }
});

test('F19: queue souls join the y-sorted actor layer and their tags are drawn after it (never under the dais)',()=>{
  const s=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
  assert.match(s,/at\(p\[1\], \(\) => \{[\s\S]*drawSoul\(c, p\[0\], p\[1\], qh/);
  assert.match(s,/lateTags\.push\(\(\) => tag\(ctx,p\[0\],p\[1\]-qh-10,t,\['⏳ รอสอบสวน'/);
  assert.match(s,/layer\.sort\(\(a, b\) => a\.y - b\.y\)\.forEach\(o => o\.fn\(\)\);\n  lateTags\.forEach\(fn => fn\(\)\);/);
  assert.match(s,/if\(drawDais\)at\(daisDepthY\(g\.zone\),drawDais\)/);
});
