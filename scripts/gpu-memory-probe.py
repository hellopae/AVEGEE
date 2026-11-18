#!/usr/bin/env python3
"""T1b GPU probe: how much graphics memory the game asks for, zone by zone (Chromium via Playwright, 390x844).

  python3 scripts/serve-nocache.py 8961 &        (or any threaded no-cache server of the worktree)
  BASE=http://127.0.0.1:8961/index.html python3 scripts/gpu-memory-probe.py [outfile.json] [--lap N]

An init script wraps document.createElement('canvas'), OffscreenCanvas, getContext, createImageBitmap, Image and WebGL texImage2D so every canvas / bitmap / texture the game
makes is counted (width x height x 4 bytes = what the GPU holds for it).  After each step the probe forces a GC (--js-flags=--expose-gc) and reads the live totals, so
what it reports is what the game keeps alive, not garbage.  Steps: each zone (map), the town of every zone, back-and-forth zone hopping, a hidden-tab / visible round trip.
"""
import json, os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:8961/index.html')
HOOK = r"""
(() => {
  const live = new Set(), bitmaps = new Set(); let gl = 0, glMax = 0, glBytes = 0, texCalls = 0;
  const reg = (set, o, meta) => { const r = new WeakRef(o); r.meta = meta; set.add(r); return r; };
  const origCreate = document.createElement.bind(document);
  const imgsEarly = new Set();
  document.createElement = function (tag, ...a) { const el = origCreate(tag, ...a); const t = String(tag).toLowerCase(); if (t === 'canvas') { let who = ''; try { const st = new Error().stack.split('\n').slice(2, 6).map(l => (l.match(/\/([\w.-]+\.js)(?:\?[^:]*)?:(\d+)/) || [])[1]).filter(Boolean); who = st.find(f => f !== 'art.js' || true) || ''; } catch {} reg(live, el, { kind: 'canvas', who }); } else if (t === 'img') reg(imgsEarly, el, {}); return el; };
  if (window.OffscreenCanvas) { const O = window.OffscreenCanvas; window.OffscreenCanvas = class extends O { constructor(w, h) { super(w, h); reg(live, this, { kind: 'offscreen' }); } }; }
  const ctxKinds = new WeakMap();
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) { const c = gc.call(this, type, attrs); if (c) { ctxKinds.set(this, { type, willRead: !!(attrs && attrs.willReadFrequently) }); if (/webgl/.test(type)) { gl++; glMax = Math.max(glMax, gl); } } return c; };
  const imgs = imgsEarly;
  const NativeImage = window.Image;
  window.Image = function (w, h) { const im = new NativeImage(w, h); reg(imgs, im, {}); return im; }; window.Image.prototype = NativeImage.prototype;
  const cib = window.createImageBitmap;
  window.createImageBitmap = function (...a) { return cib.apply(this, a).then(b => { reg(bitmaps, b, { w: b.width, h: b.height }); return b; }); };
  for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (P) {
    const t = P.prototype.texImage2D;
    P.prototype.texImage2D = function (...a) { texCalls++; const src = a[a.length - 1]; const w = (src && (src.width || src.videoWidth)) || a[3] || 0, h = (src && (src.height || src.videoHeight)) || a[4] || 0; if (typeof w === 'number' && typeof h === 'number') glBytes += w * h * 4; return t.apply(this, a); };
  }
  window.__gpuProbe = () => {
    if (window.gc) window.gc();
    const rows = [], imgs = [];
    let canvasBytes = 0, canvasN = 0, cpuBytes = 0, cpuN = 0, big = [];
    const byFile = {};
    for (const r of [...live]) { const c = r.deref(); if (!c) { live.delete(r); continue; } const w = c.width || 0, h = c.height || 0, b = w * h * 4; if (!b) continue; const f = (r.meta && r.meta.who) || '?'; byFile[f] = (byFile[f] || 0) + b;
      const k = ctxKinds.get(c); if (k && k.type === '2d' && k.willRead) { cpuBytes += b; cpuN++; } else if (k) { canvasBytes += b; canvasN++; } if (b > 8e6) big.push({ w, h, mb: +(b / 1048576).toFixed(1), type: k?.type || 'none', inDom: c.isConnected }); }
    let bmBytes = 0, bmN = 0; for (const r of [...bitmaps]) { const b = r.deref(); if (!b || !b.width) { bitmaps.delete(r); continue; } bmBytes += b.width * b.height * 4; bmN++; }
    let imgBytes = 0, imgN = 0, bigImg = [];
    const seen = new Set();
    const add = im => { if (!im || seen.has(im)) return; seen.add(im); if (im.complete && im.naturalWidth) { const b = im.naturalWidth * im.naturalHeight * 4; imgBytes += b; imgN++; if (b > 8e6) bigImg.push({ src: im.src.split('/').slice(-2).join('/'), mb: +(b / 1048576).toFixed(1) }); } };
    for (const im of document.images) add(im);
    for (const r of [...imgs]) { const im = r.deref(); if (!im) { imgs.delete(r); continue; } add(im); }
    const mb = x => +(x / 1048576).toFixed(1);
    return { canvases2dGpu: canvasN, canvases2dGpuMB: mb(canvasBytes), canvasesCpuN: cpuN, canvasesCpuMB: mb(cpuBytes), bitmapsN: bmN, bitmapsMB: mb(bmBytes), domImagesN: imgN, domImagesMB: mb(imgBytes),
      webglContextsEver: gl, webglTextureMB: mb(glBytes), texImage2DCalls: texCalls, totalGpuEstimateMB: mb(canvasBytes + bmBytes + imgBytes + glBytes), big: big.sort((a, b) => b.mb - a.mb).slice(0, 12), canvasByFileMB: Object.fromEntries(Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, +(v / 1048576).toFixed(1)])), bigImg: bigImg.sort((a, b) => b.mb - a.mb).slice(0, 10) };
  };
})();
"""

def boot(p, w=int(os.environ.get('W', 390)), h=int(os.environ.get('H', 844)), init=None):
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--js-flags=--expose-gc'])
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=float(os.environ.get('DPR', 1)))
    ctx.add_init_script(HOOK)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(3000)
    try: pg.click('#enter-gate button', timeout=1500)
    except Exception: pass
    pg.wait_for_timeout(500); pg.click('#splash-skip'); pg.wait_for_timeout(2000)
    pg.click('#t-start'); pg.wait_for_timeout(1500); pg.click('text=SLOT 1'); pg.wait_for_timeout(2500)
    pg.click('#intro-skip'); pg.wait_for_timeout(1500)
    close_dialogs(pg)
    return browser, ctx, pg, errs

def close_dialogs(pg):
    for _ in range(8):
        n = pg.evaluate("()=>{const ds=[...document.querySelectorAll('dialog[open]')];ds.forEach(d=>d.close());return ds.length}")
        pg.wait_for_timeout(300)
        if not n: break

def goto_zone(pg, k):
    pg.evaluate("""async(k)=>{const z=G.zoneTravel;for(const q of ['th','asia','west','cyberhell']){z.visited[q]=true;z.ports[q]=true;}
      const p=G.harbourPoint();G.player.x=p.x;G.player.y=p.y;G.player.tx=p.x;G.player.ty=p.y;if(G.zone!==k)G.moveZone(k);}""", k)
    pg.wait_for_timeout(3500)
    close_dialogs(pg)

def memory_dump(browser, pg):
    """Chromium's own memory-infra dump (what each process really holds): MB of the renderer's decoded-image cache / canvases / malloc and of the GPU process."""
    cdp = browser.new_browser_cdp_session(); events = []; done = []
    cdp.on('Tracing.dataCollected', lambda e: events.extend(e.get('value', [])))
    cdp.on('Tracing.tracingComplete', lambda e: done.append(1))
    cdp.send('Tracing.start', {'traceConfig': {'recordMode': 'recordUntilFull', 'includedCategories': ['-*', 'disabled-by-default-memory-infra'], 'memoryDumpConfig': {'triggers': []}}, 'transferMode': 'ReportEvents'})
    cdp.send('Tracing.requestMemoryDump', {'levelOfDetail': 'detailed'}); cdp.send('Tracing.end')
    for _ in range(80):
        if done: break
        pg.wait_for_timeout(500)   # the sync API only delivers CDP events while it is being called
    names = {ev['pid']: ev['args']['name'] for ev in events if ev.get('ph') == 'M' and ev.get('name') == 'process_name'}
    tot = {}
    for ev in events:
        if ev.get('ph') != 'v': continue
        for name, a in (((ev.get('args') or {}).get('dumps') or {}).get('allocators') or {}).items():
            sz = ((a.get('attrs') or {}).get('size') or {}).get('value')
            if sz: tot[(names.get(ev['pid'], str(ev['pid'])), name)] = int(sz, 16)
    mb = lambda proc, name: round(tot.get((proc, name), 0) / 1048576)
    gpu = next((n for n in names.values() if n.startswith('GPU')), 'GPU Process')
    return {'rendererImageCacheMB': mb('Renderer', 'cc/image_memory'), 'rendererCanvasMB': mb('Renderer', 'canvas'), 'rendererMallocMB': mb('Renderer', 'malloc'), 'rendererPartitionAllocMB': mb('Renderer', 'partition_alloc'),
            'gpuProcessMallocMB': mb(gpu, 'malloc'), 'gpuSharedImagesMB': mb(gpu, 'gpu/shared_images'), 'gpuTotalMB': mb(gpu, 'gpu'), 'browserSharedMemoryMB': mb('Browser', 'shared_memory')}

def snap(pg, label, out):
    pg.wait_for_timeout(1500)
    s = pg.evaluate("()=>window.__gpuProbe()"); s['step'] = label; s['t'] = time.strftime('%H:%M:%S')
    if os.environ.get('DUMP'): s['chromium'] = memory_dump(pg.context.browser, pg)
    out.append(s)
    print(json.dumps({k: v for k, v in s.items() if k not in ('big', 'bigImg')}), flush=True)

if __name__ == '__main__':
    outfile = next((a for a in sys.argv[1:] if a.endswith('.json')), None); laps = int(sys.argv[sys.argv.index('--lap') + 1]) if '--lap' in sys.argv else 2
    out = []
    with sync_playwright() as p:
        browser, ctx, pg, errs = boot(p)
        snap(pg, 'boot (zone 1 start)', out)
        for z in ['th', 'asia', 'west', 'cyberhell']:
            goto_zone(pg, z); snap(pg, f'zone {z} map', out)
        for lap in range(laps):
            for z in ['th', 'asia', 'west', 'cyberhell']:
                goto_zone(pg, z); snap(pg, f'lap {lap + 1} -> {z}', out)
        goto_zone(pg, 'cyberhell'); pg.wait_for_timeout(20000); snap(pg, 'zone cyberhell, 20 s idle', out)
        # the player returns to a zone whose graphics memory was given back (the budget tick releases the other zones after a 12 s stay): it must be rebuilt, not blank
        goto_zone(pg, 'th'); pg.wait_for_timeout(15000); snap(pg, 'back in zone th after a 15 s stay (other zones released)', out)
        if os.environ.get('SHOTS'): pg.screenshot(path=os.environ['SHOTS'] + '/th-after-release.png')
        goto_zone(pg, 'west'); pg.wait_for_timeout(4000)
        if os.environ.get('SHOTS'): pg.screenshot(path=os.environ['SHOTS'] + '/west-after-release.png')
        snap(pg, 'zone west again (released earlier, rebuilt)', out)
        # hidden / visible round trip
        pg.evaluate("()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'))}")
        pg.wait_for_timeout(3000)
        pg.evaluate("()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'))}")
        snap(pg, 'after hide/show', out)
        try:
            info = browser.new_browser_cdp_session().send('SystemInfo.getInfo'); out.append({'step': 'gpu', 'devices': info.get('gpu', {}).get('devices', [])[:2], 'aux': {k: v for k, v in (info.get('gpu', {}).get('auxAttributes') or {}).items() if k in ('glRenderer', 'glVendor', 'glVersion')}})
        except Exception as e: out.append({'step': 'gpu', 'error': str(e)[:120]})
        out.append({'step': 'errors', 'errors': errs[:10]})
        browser.close()
    if outfile: Path(outfile).write_text(json.dumps(out, indent=1, ensure_ascii=False))
