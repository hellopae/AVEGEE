import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {powerCutsceneImage} from '../src/power-cutscene-assets.js';

test('all four visual powers ship four outfits, selected independently from the zone', () => {
  for (const outfit of ['th','asia','west','cyberhell'])
    for (const power of ['hypno','mirror','roar','fire'])
      assert.ok(existsSync(powerCutsceneImage(power,outfit)));
  assert.equal(powerCutsceneImage('roar','west'),'img/hero-yama-west-roar-cutscene-v4.png');
  assert.equal(powerCutsceneImage('hypno',undefined),'img/hero-yama-th-hypno-cutscene-v3.png');
  assert.equal(powerCutsceneImage('fire','th'),'img/hero-yama-th-fire-cutscene-v3.png');
  assert.equal(powerCutsceneImage('fire','th',{bigFire:true}),'img/hero-yama-th-atk-cutscene-v3.png');
  assert.equal(powerCutsceneImage('fire','west'),'img/hero-yama-west-fire-cutscene-v3.png');
});

test('successful interrogation powers show fitted cutscenes, including roar', () => {
  const ui=readFileSync('src/ui.js','utf8');
  assert.match(ui,/const style = g\.outfit \|\| g\.zone;\s*const powerArt = powerCutsceneImage\(k, style, g\.abilities\);/);
  assert.match(ui,/if \(!g\.usePower\(k, s\)\) return;[\s\S]*?playActionCutscene\(k\);/);
  assert.doesNotMatch(ui,/if \(k === 'roar'\) return null;/);
  assert.match(ui,/\['hypno', 'mirror', 'roar', 'ice'/);
  assert.match(ui,/fitCutsceneImage\(cut, img\)/);
});
