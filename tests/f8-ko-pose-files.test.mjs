import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const read = readFileSync;
import {hasKoPose} from '../src/battle-ko.js';

// F8 (owner 15 Nov, a2): a fallen teammate lies in a drawn pose.  Pictures are dropped as img/ko-pose-v1/<zone>/<key>.webp and scripts/add-ko-poses.py writes the `:ko` records.
const root = new URL('..', import.meta.url).pathname;
const py = (cwd, args) => spawnSync('python3', ['-I', join(root, 'scripts/add-ko-poses.py'), ...args], {encoding:'utf8', cwd});
const makeWebp = (file, w, h, box) => spawnSync('python3', ['-I', '-c', `
from PIL import Image
im=Image.new('RGBA',(${w},${h}),(0,0,0,0)); im.paste((200,80,60,255),(${box.join(',')}))
im.save(${JSON.stringify(file)})`], {encoding:'utf8'});

test('F8: every :ko record of the manifest points at a file that exists (none yet = the tilt stays)', () => {
  const m = JSON.parse(read(join(root, 'img/combat-animation-v1/manifest.json'), 'utf8'));
  for (const [k, rec] of Object.entries(m.sprites)) if (k.endsWith(':ko')) assert.ok(existsSync(join(root, rec.src)), `${k}: ${rec.src}`);
});
test('F8: add-ko-poses.py writes scaled records for the pictures that exist and drops the ones whose file is gone', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ko-'));
  try {
    mkdirSync(join(tmp, 'img/combat-animation-v1'), {recursive:true}); mkdirSync(join(tmp, 'img/ko-pose-v1/th'), {recursive:true}); mkdirSync(join(tmp, 'img/ko-pose-v1/asia'), {recursive:true});
    cpSync(join(root, 'img/combat-animation-v1/manifest.json'), join(tmp, 'img/combat-animation-v1/manifest.json'));
    makeWebp(join(tmp, 'img/ko-pose-v1/th/taan.webp'), 512, 256, [100, 180, 400, 250]);
    makeWebp(join(tmp, 'img/ko-pose-v1/th/nira.webp'), 512, 256, [60, 200, 300, 250]);
    makeWebp(join(tmp, 'img/ko-pose-v1/th/yama.webp'), 512, 256, [20, 190, 420, 255]);
    makeWebp(join(tmp, 'img/ko-pose-v1/asia/guard.webp'), 512, 256, [10, 150, 500, 230]);
    const r = py(tmp, ['--root', tmp]); assert.equal(r.status, 0, r.stderr);
    const s = JSON.parse(readFileSync(join(tmp, 'img/combat-animation-v1/manifest.json'), 'utf8')).sprites;
    const base = JSON.parse(read(join(root, 'img/combat-animation-v1/manifest.json'), 'utf8')).sprites;
    assert.deepEqual(Object.keys(s).filter(k => k.endsWith(':ko')).sort(), ['crew:asia:guard:ko', 'crew:th:nira:ko', 'crew:th:taan:ko', 'yama:th:ko']);
    const t = s['crew:th:taan:ko'];
    assert.equal(t.src, 'img/ko-pose-v1/th/taan.webp'); assert.deepEqual([t.frameWidth, t.frameHeight, t.cols, t.rows], [512, 256, 1, 1]);
    assert.deepEqual(t.anchor, [250, 250], 'centre of the visible pixels, bottom of the visible pixels');
    const K = 1.2;   // FB3-BT7: scripts/add-ko-poses.py KO_SCALE
    assert.equal(t.bodyHeight, Math.round(base['crew:th:taan'].bodyHeight / K), 'the standing scale, shown KO_SCALE bigger');
    assert.equal(s['crew:th:nira:ko'].bodyHeight, Math.round(base['nira:th'].bodyHeight / K)); assert.equal(s['yama:th:ko'].bodyHeight, Math.round(base['yama:th'].bodyHeight / K));
    assert.equal(s['crew:asia:guard:ko'].bodyHeight, Math.round(base['crew:asia:guard'].bodyHeight / K));
    assert.deepEqual(t.modes.ko, {frames:[0], durations:[1000]});
    assert.equal(hasKoPose('crew:th:taan', s), true, 'battle-ko.js sees the record');
    assert.equal(hasKoPose('crew:th:kan', s), false, 'a figure without a file keeps the tilt');
    rmSync(join(tmp, 'img/ko-pose-v1/th/taan.webp'));
    assert.equal(py(tmp, ['--root', tmp]).status, 0);
    const s2 = JSON.parse(readFileSync(join(tmp, 'img/combat-animation-v1/manifest.json'), 'utf8')).sprites;
    assert.ok(!('crew:th:taan:ko' in s2), 'a record whose file is gone is removed'); assert.ok('yama:th:ko' in s2);
  } finally { rmSync(tmp, {recursive:true, force:true}); }
});
test('F8: Nira and the Guard are looked up under the zone they stand in', () => {
  const ui = read(join(root, 'src/ui.js'), 'utf8');
  assert.match(ui, /`crew:\$\{c\.k === 'nira' \? g\.zone : c\.homeZone \|\| g\.zone\}:\$\{c\.k\}`/);
  assert.match(ui, /c\.k==='nira'&&!\(koInfo\.get\(c\.id\)\?\.pose&&\['fall','down'\]\.includes\(koInfo\.get\(c\.id\)\?\.phase\)\)\)continue/);
});
