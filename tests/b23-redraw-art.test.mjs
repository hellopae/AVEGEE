import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {routeRow} from '../src/route-geometry.js';
import {dungeonNavigation} from '../src/dungeon-view.js';
const job='b23',id='asia:west',out=`tests/fixtures/${job}-redraw`,row=routeRow(id);
const json=name=>JSON.parse(readFileSync(`${out}/${name}.json`));
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function webpSize(file){const b=readFileSync(file),kind=b.toString('ascii',12,16);if(kind==='VP8X')return [b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1];assert.equal(kind,'VP8 ');return [b.readUInt16LE(26)&16383,b.readUInt16LE(28)&16383];}
test(`${job}: real 2x raster and generated tile provenance match shipped painting`,()=>{
 const audit=json('art-audit'),stitch=json('stitch-report');
 assert.deepEqual(webpSize(row.background),[3344,1882]);assert.equal(audit.sha256,sha(row.background));assert.equal(stitch.assetSHA256,audit.sha256);
 assert.equal(stitch.tiles.length,4);for(const t of stitch.tiles){assert.ok(t.nativeDetailScale.every(v=>v>1.8));assert.ok(t.inliers>=12);assert.match(t.sha256,/^[0-9a-f]{64}$/);}
 assert.ok(stitch.fallbackFraction<.02);
});
test(`${job}: each entry/checkpoint/exit section has at least p10 40px, median 48px floor width`,()=>{
 const report=json('width-report');assert.equal(report.components,1);assert.equal(report.meetsWidthThresholds,true);assert.equal(report.sections.length,4);
 for(const s of report.sections){assert.ok(s.p10>=40);assert.ok(s.median>=48);assert.equal(s.offFloor,0);}
 const nav=dungeonNavigation(id);assert.equal(nav.cells.reduce((a,b)=>a+b,0),report.floorPixels);
 assert.equal(json('art-audit').maskSHA256,sha(`tests/fixtures/${job}-redraw-floor.png`));
});
test(`${job}: story anchors are unchanged; no overlay trees; new flow belongs to this painting`,()=>{
 const before=json('geometry-original');assert.deepEqual(row.corridor[0],before.corridor[0]);assert.deepEqual(row.corridor.at(-1),before.corridor.at(-1));
 for(const i of row.checkpointVertex)assert.deepEqual(row.corridor[i],before.corridor[i]);
 assert.deepEqual(row.captainCave,before.captainCave);assert.deepEqual(row.bossCave,before.bossCave);assert.deepEqual(row.ambient.trees,[]);
 const flow=json('flow-trace');assert.equal(flow.source,row.background);assert.equal(flow.sha256,sha(row.background));assert.equal(flow.roadCells,0);assert.ok(flow.kindCells[4]>100&&flow.kindCells[5]>100);
 assert.equal(row.geometryVersion,2);
});
