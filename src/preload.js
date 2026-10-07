import { createAssetQueue, loadImage, zoneAssets, fetchWithTimeout } from './asset-preload.js';
import { preloadBgm } from './sfx.js';

const queue = createAssetQueue(url => url.startsWith('audio:') ? preloadBgm(url.slice(6)) : loadImage(url));
let catalogPromise, active = null;
const LABELS = { th:'สุวรรณภูมิ', asia:'บูรพา', west:'ปัจฉิม', cyberhell:'นรกเครือข่าย' };
async function catalog() {
  if (!catalogPromise) catalogPromise = fetchWithTimeout('img/preload-catalog.json?v=20261007-roar-v4', { cache:'no-cache' })
    .then(async ({response:r, release}) => {
      try { if (!r.ok) throw new Error('catalog unavailable'); return await r.json(); }
      finally { release(); }
    })
    .catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
function screen(boot) {
  if (boot) return boot;
  const el = document.createElement('dialog');
  el.className = 'asset-loading';
  el.innerHTML = '<h1 class="brand">อเวจี</h1><div class="bar"><i></i></div><div class="pct">0%</div><p class="note"></p>';
  el.addEventListener('cancel', e => e.preventDefault());
  document.body.append(el); el.showModal();
  return el;
}
function choose(el, text) {
  el.querySelector('.note').textContent = text;
  const controls = document.createElement('div'); controls.className = 'row';
  controls.innerHTML = '<button class="gold" data-retry>ลองโหลดใหม่</button><button data-skip>เข้าเกมเท่าที่โหลดได้</button>';
  el.append(controls);
  return new Promise(resolve => {
    controls.querySelector('[data-retry]').onclick = () => { controls.remove(); resolve(true); };
    controls.querySelector('[data-skip]').onclick = () => { controls.remove(); resolve(false); };
  });
}
async function run(zone, outfit, boot) {
  const el = screen(boot);
  const siblings = boot ? [...document.body.children].filter(n => n !== boot && !n.inert) : [];
  siblings.forEach(n => { n.inert = true; });
  try {
    while (true) {
      el.querySelector('.note').textContent = `เรือข้ามฟากกำลังพาดวงวิญญาณมาสู่${LABELS[zone] || LABELS.th}…`;
      let failed;
      try {
        const list = zoneAssets(await catalog(), zone, outfit);
        failed = await queue.run([...list, 'audio:bgm-title', 'audio:bgm-zone', 'audio:bgm-battle'], ({done,total,failed}) => {
          const percent = total ? Math.round(done / total * 100) : 0;
          el.querySelector('.bar i').style.width = `${percent}%`;
          el.querySelector('.pct').textContent = `${percent}% · ${done}/${total}${failed ? ` · ต้องลองใหม่ ${failed}` : ''}`;
        });
      } catch { failed = ['catalog']; }
      if (!failed.length) break;
      if (!await choose(el, `ยังโหลดไม่สำเร็จ ${failed.length} รายการ ตรวจการเชื่อมต่อแล้วลองใหม่ได้ครับ`)) break;
    }
  } finally {
    siblings.forEach(n => { n.inert = false; });
    if (el.tagName === 'DIALOG') el.close();
    el.remove();
  }
}
/** Gate both new branches and returning branches; repeat visits reuse successful URLs. */
export function preloadZone(zone, outfit = zone, boot = null) {
  if (active) return active.then(() => preloadZone(zone, outfit, boot));
  active = run(zone, outfit, boot).finally(() => { active = null; });
  return active;
}

const boot = document.getElementById('boot');
if (boot) {
  let saved;
  try { saved = JSON.parse(localStorage.getItem('avegee.save.v2') || 'null'); } catch {}
  preloadZone(saved?.zone || 'th', saved?.outfit || saved?.zone || 'th', boot).then(() => {
    document.documentElement.dataset.bootReady = 'true';
    dispatchEvent(new Event('avegee:boot-ready'));
  });
}
