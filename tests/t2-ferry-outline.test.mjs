import test from 'node:test';
import assert from 'node:assert/strict';
import {ferryBridge} from '../src/ferry-geometry.js';
// F15 (owner 15 Nov): the outline that hides the boat under the central bridge must hug the painted rails (re-measured on the active ground).
const spanAt=(poly,y)=>{const xs=[];for(let i=0;i<poly.length;i++){const [ax,ay]=poly[i],[bx,by]=poly[(i+1)%poly.length];if((ay<=y)!==(by<=y))xs.push(ax+(y-ay)/(by-ay)*(bx-ax));}xs.sort((a,b)=>a-b);return [xs[0],xs.at(-1)];};
test('F15: every zone outline is within 6 units of the measured rail edges at the boat rows (y 1800 / 1840)',()=>{
  const measured={th:{1800:[1855,1993],1840:[1852,1996]},asia:{1800:[1846,2003],1840:[1841,2005]},west:{1800:[1849,1968+36]},cyberhell:{1800:[1845,2008],1840:[1842,2013]}};
  for(const [z,rows] of Object.entries(measured))for(const [y,[l,r]] of Object.entries(rows)){
    const [a,b]=spanAt(ferryBridge(z),+y);
    assert.ok(Math.abs(a-l)<=6,`${z} y${y} left ${a} vs ${l}`);
    if(z!=='west')assert.ok(Math.abs(b-r)<=6,`${z} y${y} right ${b} vs ${r}`);
  }
});
test('F15: no notch - the right edge of zone 2 does not bulge out and back between y 1780 and 1830',()=>{
  const poly=ferryBridge('asia');const xs=[1780,1790,1800,1810,1820,1830].map(y=>spanAt(poly,y)[1]);
  for(let i=1;i<xs.length;i++)assert.ok(xs[i]>=xs[i-1]-0.01&&xs[i]-xs[i-1]<=8,xs.join());
  assert.ok(Math.max(...xs.slice(0,5))-Math.min(...xs.slice(0,5))<=1);
});
