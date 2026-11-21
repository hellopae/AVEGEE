import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {townZoomLevels,townDefaultZoom} from '../src/town-map.js?v=k1d';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('F2: two zoom steps (medium 3.5x, near 5x = the old default); whole map is a minimap click, closable by click / close button / Esc / any zoom',()=>{
  assert.deepEqual(townZoomLevels('th'),[3.5,5]);assert.equal(townDefaultZoom('th'),1);
  const ui=read('src/ui.js'),html=read('index.html'),css=read('src/town-map.css');
  assert.match(ui,/getElementById\('town-minimap'\)\?\.addEventListener\('click',\(\)=>setFullMap\(!mapCam\.full\)\)/);
  assert.match(ui,/onOverview:\(\)=>setFullMap\(!mapCam\.full\)/);
  assert.match(ui,/e\.key==='Escape'&&mapCam\.full/);
  assert.match(ui,/fullMapClose\.onclick=\(\)=>setFullMap\(false\)/);
  assert.match(ui,/cv\.addEventListener\('wheel'/);
  assert.match(ui,/const target = sailing \? MAP_ZOOM_LEVELS\.at\(-1\) \* 1\.35 : mapCam\.full \? 1 : MAP_ZOOM_LEVELS\[mapCam\.level\]/);
  assert.match(css,/#town-full-close/);
  assert.match(html,/id="town-minimap"[^>]*title=/);
});

