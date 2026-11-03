import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {Z4_POLE_ART,z4PoleArtRect} from '../src/z4-pole-art.js';
import {townStartupAssets,retainStartupImage} from '../src/town-startup.js';
import {z4Layout,drawZ4Pole} from '../src/z4-poles.js';
test('painted pole ships in Cyber startup only, with a real catalogued sprite',()=>{
 assert.ok(existsSync(Z4_POLE_ART));assert.ok(readFileSync(Z4_POLE_ART).length<250000);
 const catalog=JSON.parse(readFileSync('img/preload-catalog.json'));
 assert.ok(catalog.zones.cyberhell.includes(Z4_POLE_ART));
 for(const zone of ['th','asia','west','cyberhell'])assert.equal(townStartupAssets(zone).includes(Z4_POLE_ART),zone==='cyberhell');
});
test('all 287 painted pole bases and crossbars retain the authored wire geometry',()=>{
 const {poles}=z4Layout();assert.equal(poles.length,287);
 for(const p of poles){const r=z4PoleArtRect(p),sx=r.w/512,sy=r.h/768;
 assert.ok(Math.abs(r.x+256*sx-p.x)<1e-8);assert.ok(Math.abs(r.y+759*sy-p.y)<1e-8);
 assert.ok(Math.abs(r.y+142*sy-(p.top+p.h*.12))<1e-8);
 for(const side of [-1,1])assert.ok(Math.abs(r.x+(256+side*144)*sx-(p.x+side*p.arm))<1e-8);
 }
});
test('decoded painting replaces the placeholder body without canvas shape painting',()=>{
 const image={naturalWidth:512,naturalHeight:768};retainStartupImage(Z4_POLE_ART,image);
 const calls=[],ctx=new Proxy({drawImage:(im,...args)=>calls.push([im,...args])},{get:(t,k)=>k in t?t[k]:()=>{throw Error('placeholder path: '+String(k));}});
 const pole=z4Layout().poles[0];drawZ4Pole(ctx,pole,0,true);
 const r=z4PoleArtRect(pole);assert.deepEqual(calls,[[image,r.x,r.y,r.w,r.h]]);
});
