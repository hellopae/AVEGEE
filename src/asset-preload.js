// Shared bounded queue. Successful URLs are remembered; failures remain retryable.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal:controller.signal });
    // Keep the timeout active while consuming the body, not just until headers arrive.
    return { response, release:() => clearTimeout(timer) };
  } catch (error) { clearTimeout(timer); throw error; }
}

export function zoneAssets(catalog, zone = 'th', outfit = zone) {
  const own = catalog.zones[zone] || catalog.zones.th || [];
  const hero = (catalog.zones[outfit] || []).filter(p => /\/hero-|\/yama-/.test(p));
  // Thai portraits are used as fallbacks in all branches.
  const fallback = zone === 'th' ? [] : (catalog.zones.th || []).filter(p => !/BG-|scene|intro|cutscene|rooms-wide|tea-/.test(p));
  const firstFrame = p => /scene|\/st-|profile|walk/.test(p) ? 1 : 0;
  // Warm map/sprites last, so small mobile image caches retain the first visible scene.
  return [...new Set([...catalog.shared, ...own, ...hero, ...fallback])]
    .sort((a,b) => firstFrame(a) - firstFrame(b));
}

// H1 (10 ต.ค. 2569) — แบ่งภาพของโซนเป็น 3 ชั้น เพื่อให้หน้าโหลดแรกรอเฉพาะของที่เห็นบนจอแรก
//   0 = critical   กั้นหน้าโหลดไว้จนครบ (ฉาก พื้น สถานีบนแผนที่ ยมบาท/ทีม วิญญาณที่เดิน UI หลัก ปกหน้า)
//   1 = background โหลดเงียบๆ หลังเข้าเกม (ห้องในสถานที่ ศึก เอฟเฟกต์ โปรไฟล์ มินิเกม)
//   2 = late       โหลดท้ายสุด/เมื่อว่าง (คัตซีนใหญ่ ฉากจบ intro/ปกสำรอง ฉากสลบ) — ไม่ได้ยกเลิก แค่ไม่แย่งแบนด์วิดท์
// ภาพที่ยังมาไม่ถึงไม่ทำให้เกม error: art.js วาด placeholder ส่วน <img> ใน modal โหลดเองตามปกติ
const SPLIT_RULES = [
  // [tier, rank, regex] — ข้อแรกที่ตรงชนะ · rank ใช้เรียงลำดับในชั้น 1/2 (น้อย = ก่อน)
  [0, 0, /^img\/cover-v5\.webp$/],  // ปกหน้าปัจจุบัน (cover-v4 และรุ่นเก่ากว่าเป็นแค่ fallback → ชั้นท้าย)
  [0, 0, /^img\/(scene|tile-|tex-)/],
  [0, 0, /^img\/map-v5\//],
  [0, 0, /^img\/theme-v4\/(map-|st-)/],
  [0, 0, /^img\/hero-yama(-atk(-[LR])?|-sit(-sip)?|-cry|-walk|-walk-4dir-v2|-profile)?\.(png|webp)$/],
  [0, 0, /^img\/hero-boss\.png$/],
  // พบจากการรันจริงด้วยแคตตาล็อกว่าง (10 ต.ค.): จอแรกขอภาพเหล่านี้ทันที — แถวโปรไฟล์ยมบาท/บอส และสไปรต์วิญญาณประจำโซนในคิว
  [0, 0, /^img\/(\w+\/)?hero-(yama|boss)(-(th|asia|west|cyberhell))?-profile\.(png|webp)$/],
  [0, 0, /^img\/icon-(fang|sword)\.png$/],
  [0, 0, /^img\/\w+\/spirit-[a-z-]+-(th|asia|west|cyberhell)-v\d\.png$/],
  [0, 0, /^img\/(\w+\/)?crew-[a-z]+(-(build-work|work|walk-v2))?(-v2)?\.png$/],
  [0, 0, /^img\/ui\/(?!Button\d)/],
  [0, 0, /^img\/(merchant|prop-boat|prop-lantern|prop-throne-platform)\.png$/],
  [0, 0, /^img\/(soul-[a-z]+|spirit\d+)\.png$/],
  [0, 0, /^img\/(item-[a-z-]+|icon-force-\d|icon-lock|icon-skip)\.png$/],
  // ชั้นท้าย: ใหญ่และเปิดเมื่อมีเหตุการณ์เท่านั้น
  [2, 1, /cutscene|story-ending|story-.*-\d|story-.*reinforce/],
  [2, 2, /deva-intro|frontier-.*-(intro|hypnosis)|tea-.*recovery|unconscious|roar/],
  [2, 3, /^img\/(Intro-|intro-panel|cover)/],
  [2, 3, /^img\/st-[a-z]+\.png$/],       // อาคารเดิม — map-v5/theme-v4 แทนแล้ว เหลือไว้เป็น fallback
  // ชั้นเบื้องหลัง เรียงตามโอกาสที่ผู้เล่นเจอเร็ว
  [1, 1, /rooms-wide|^img\/BG-|theme-v4\/(arena|frontier)/],
  [1, 2, /^img\/ui\/Button/],
  [1, 3, /profile|^img\/(fx|mob|boss)-|\/boss-|^img\/(icon|book)-|zone-/],
  [1, 4, /minigames|mirror-charge|yama-sword/],
];
/** firstRun = ยังไม่มีเซฟ → บทนำ 5 ภาพต้องพร้อมก่อนกด "เริ่มใหม่" · arrival = ย้ายโซน → บทนำโซนต้องพร้อมก่อนเปิดฉากต้อนรับ */
export function assetTier(path, { firstRun = false, arrival = false } = {}) {
  // แผงแรกของบทนำพร้อมเสมอ (กด "เริ่มใหม่" ซ้ำได้) · แผง 2-5 กั้นเฉพาะครั้งแรก ไม่งั้นโหลดเบื้องหลังก่อนของใหญ่
  if (/^img\/intro-panel-01-v2\.webp$/.test(path) || firstRun && /^img\/intro-panel-0\d-v2\.webp$/.test(path)) return { tier:0, rank:0 };
  if (/^img\/intro-panel-0\d-v2\.webp$/.test(path)) return { tier:1, rank:4 };
  if (arrival && /intro-head-|intro-zone|crew-[a-z]+-cutscene/.test(path)) return { tier:0, rank:0 };
  // ย้ายโซน: ผู้เล่นอ่านบทนำโซนก่อน ระหว่างนั้นสไปรต์วิญญาณโหลดเป็นอันดับแรกของเบื้องหลัง ไม่ต้องกั้นหน้าโหลด
  if (arrival && /^img\/\w+\/spirit-[a-z-]+-(th|asia|west|cyberhell)-v\d\.png$/.test(path)) return { tier:1, rank:0 };
  for (const [tier, rank, re] of SPLIT_RULES) if (re.test(path)) return { tier, rank };
  return { tier:1, rank:3 };
}
export function zoneTiers(catalog, zone = 'th', outfit = zone, opts = {}) {
  const out = { critical:[], background:[], late:[] };
  // โซนอื่นไม่ใช้แผนที่/อาคารของโซนไทย (ติดมาใน fallback ของ zoneAssets) → ชั้นท้ายสุด
  const tierOf = url => zone !== 'th' && /^img\/(map-v5|theme-v4)\/.*-th\.webp$/.test(url) ? { tier:2, rank:4 } : assetTier(url, opts);
  const rows = zoneAssets(catalog, zone, outfit).map((url, i) => ({ url, i, ...tierOf(url) }));
  for (const r of rows.sort((a, b) => a.rank - b.rank || a.i - b.i)) {
    (r.tier === 0 ? out.critical : r.tier === 1 ? out.background : out.late).push(r.url);
  }
  return out;
}

export function createAssetQueue(load, lanes = 3, ready = new Set()) {
  const pending = new Map();
  async function one(url) {
    if (ready.has(url)) return;
    if (pending.has(url)) return pending.get(url);
    const task = (async () => {
      for (let attempt = 0; ; attempt++) {
        try { await load(url); ready.add(url); return; }
        catch (err) { if (attempt >= 1) throw err; }
      }
    })();
    pending.set(url, task);
    try { await task; } finally { pending.delete(url); }
  }
  return { missing: urls => [...new Set(urls)].filter(url => !ready.has(url)),
    async run(urls, progress = () => {}) {
    const list = [...new Set(urls)], failed = [];
    let next = 0, done = 0;
    progress({ done, total:list.length, failed:0 });
    await Promise.all(Array.from({ length:Math.min(lanes, list.length) }, async () => {
      while (next < list.length) {
        const url = list[next++];
        try { await one(url); } catch { failed.push(url); }
        progress({ done:++done, total:list.length, failed:failed.length });
      }
    }));
    return failed;
  } };
}

// Cache name follows the catalog version, so a bumped version never serves overwritten files from an old cache.
const IMAGE_CACHE_PREFIX = 'avegee-images-';
let IMAGE_CACHE = IMAGE_CACHE_PREFIX + 'unversioned';
export function useImageCacheVersion(version) {
  IMAGE_CACHE = IMAGE_CACHE_PREFIX + version;
  if (!globalThis.caches) return Promise.resolve();
  // Drop every older avegee-images-* cache; failures are harmless (storage is only an optimisation).
  return caches.keys().then(keys => Promise.all(keys
    .filter(k => k.startsWith(IMAGE_CACHE_PREFIX) && k !== IMAGE_CACHE).map(k => caches.delete(k)))).catch(() => {});
}
/** โหลดเบื้องหลัง: ดึงไฟล์ลง HTTP cache + Cache Storage โดยไม่ถอดรหัสภาพ (ไม่กินเฟรม) — ภาพจะถอดรหัสตอนถูกใช้จริง */
export async function warmImage(url, timeoutMs = 45000) {
  if (typeof window === 'undefined' || !globalThis.caches || !/^img\//.test(url)) return loadImage(url, timeoutMs);
  let cache;
  try { cache = await caches.open(IMAGE_CACHE); if (await cache.match(url)) return; } catch { cache = null; }
  const fetched = await fetchWithTimeout(url, {}, timeoutMs);
  try {
    if (!fetched.response.ok) throw new Error('image unavailable');
    const copy = fetched.response.clone();
    await fetched.response.arrayBuffer();     // อ่านจนจบ ให้ HTTP cache ได้ไฟล์ครบ
    try { await cache?.put(url, copy); } catch {}
  } finally { fetched.release(); }
}
export async function loadImage(url, timeoutMs = 30000) {
  let cachedUrl, cache;
  // Unsupported/disabled storage falls back to normal HTTP image caching.
  if (typeof window !== 'undefined' && globalThis.caches && /^img\//.test(url)) {
    try {
      cache = await caches.open(IMAGE_CACHE);
      let response = await cache.match(url);
      if (!response) {
        const fetched = await fetchWithTimeout(url, {}, timeoutMs);
        try {
          if (!fetched.response.ok) throw new Error('image unavailable');
          response = new Response(await fetched.response.blob(), {headers:fetched.response.headers});
          try { await cache.put(url,response.clone()); } catch {}
        } finally { fetched.release(); }
      }
      cachedUrl = URL.createObjectURL(await response.blob());
    } catch { cache = null; }
  }
  try { return await decodeImage(cachedUrl || url, timeoutMs); }
  catch (error) { try { await cache?.delete(url); } catch {} throw error; }
  finally { if (cachedUrl) URL.revokeObjectURL(cachedUrl); }
}
function decodeImage(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    const timer = setTimeout(() => finish(new Error('image timeout')), timeoutMs);
    let ended = false;
    function finish(error) {
      if (ended) return;
      ended = true; clearTimeout(timer); im.onload = im.onerror = null;
      if (error) { im.src = ''; reject(error); } else resolve();
    }
    im.onerror = () => finish(new Error('image unavailable'));
    im.onload = async () => {
      try { if (im.decode) await im.decode(); finish(); }
      catch (error) { finish(error); }
    };
    im.src = url;
  });
}
