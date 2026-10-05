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

export function createAssetQueue(load, lanes = 3) {
  const ready = new Set(), pending = new Map();
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
  return { async run(urls, progress = () => {}) {
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

export function loadImage(url, timeoutMs = 30000) {
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
