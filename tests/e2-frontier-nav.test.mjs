import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FRONTIER_NAV, frontierWalkable, frontierPath, frontierSegmentClear } from '../src/frontier-navigation.js';
import { clearFrontierSession, frontierSession, frontierAnchors } from '../src/frontier.js';

// Read runtime anchors/ranges so moving a standee or spawn range cannot silently
// leave this regression test checking obsolete, independently invented points.
const source = readFileSync(new URL('../src/frontier.js', import.meta.url), 'utf8');
const anchor = name => {
 const match = source.match(new RegExp(`${name} = \\[([^\\]]+)\\]`));
 assert.ok(match, `runtime ${name} anchor`);
 return match[1].split(',').map(Number);
};
const range = name => {
 const body = source.match(new RegExp(`function ${name}\\(\\) \\{([^}]+)\\}`))?.[1];
 assert.ok(body, `runtime ${name} range`);
 return [...body.matchAll(/rand\(([^,]+),\s*([^\)]+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
};
function route(zone, from, target) {
 assert.ok(frontierWalkable(zone,...from), `${zone}: start ${from}`);
 assert.ok(frontierWalkable(zone,...target), `${zone}: target ${target}`);
 const path = frontierPath(zone,from,target);
 assert.ok(path.length, `${zone}: path to ${target}`);
 for(const next of path) {
  assert.ok(frontierSegmentClear(zone,from,next), `${zone}: segment ${from} -> ${next}`);
  from=next;
 }
 assert.ok(Math.hypot(from[0]-target[0],from[1]-target[1]) < 1e-8, 'arrives at original target, not nearest-cell fallback');
}
for(const zone of Object.keys(FRONTIER_NAV)) {
 test(`${zone}: runtime start, NPC feet, top gate and bottom spawn connect`, () => {
  clearFrontierSession();
  const {player} = frontierSession(zone);
  const start = [player.x,player.y];
  for(const target of [...Object.values(frontierAnchors(zone)),[.5,.105], [.5,.985]]) route(zone,start,target);
  const [[lo,hi]] = range('edgePoint');
  const y = Number(source.match(/function edgePoint\(\)[\s\S]*?\),\s*([\d.]+)\]/)[1]);
  for(const x of [lo,(lo+hi)/2,hi]) route(zone,start,[x,y]);
 });
 test(`${zone}: sampled runtime enemy destinations connect from the spawn stairs`, () => {
  const [[xl,xh],[yl,yh]] = range('insidePoint');
  let tested=0;
  // The runtime rejects destinations outside navigation. Test accepted samples
  // across the full random range, including both endpoints and obstacle edges.
  for(let ix=0;ix<=12;ix++) for(let iy=0;iy<=6;iy++) {
   const p=[xl+(xh-xl)*ix/12,yl+(yh-yl)*iy/6];
   if(!frontierWalkable(zone,...p)) continue;
   route(zone,[.5,.955],p); tested++;
  }
  assert.ok(tested>=30, 'adequate floor coverage');
 });
 test(`${zone}: source-mask discrepancy remains below 3%`, () => {
  const metrics=JSON.parse(readFileSync(new URL('../output/Codex/e2-preview/extraction-metrics.json',import.meta.url)))[zone];
  assert.equal(metrics.runtime_geometry_sha256,createHash('sha256').update(JSON.stringify(FRONTIER_NAV[zone])).digest('hex'),'metrics must describe current runtime polygons');
  assert.ok(metrics.inliers>100);
  assert.ok(metrics.max_simplification_boundary_error_px <= .01*metrics.background_size[0], "simplification stays within 1% of background width");
  assert.ok(metrics.mismatch_percent<3, `cleaned reference: ${metrics.mismatch_percent}%`);
  assert.ok(metrics.raw_color_mismatch_percent<3, `raw paint detection: ${metrics.raw_color_mismatch_percent}%`);
 });
}
