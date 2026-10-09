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
