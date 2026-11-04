"""Playwright check of docs/art-reviews/2026-11-05-zone1-layout/index.html (desktop + 390px). Needs a local server on PORT."""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]; OUT = ROOT / 'docs/art-reviews/2026-11-05-zone1-layout'; EVID = OUT / 'evidence'
PORT = sys.argv[1] if len(sys.argv) > 1 else '8931'


async def main():
    EVID.mkdir(exist_ok=True); report = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, vp, mobile in (('desktop', dict(width=1280, height=900), False), ('mobile390', dict(width=390, height=844), True)):
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, has_touch=mobile, is_mobile=mobile)
            page = await ctx.new_page(); errors = []; console = []
            page.on('pageerror', lambda e: errors.append(str(e))); page.on('console', lambda m: console.append((m.type, m.text)) if m.type in ('error', 'warning') else None)
            page.on('requestfailed', lambda r: errors.append('requestfailed ' + r.url))
            resp404 = []; page.on('response', lambda r: resp404.append(r.url) if r.status >= 400 else None)
            await page.goto(f'http://127.0.0.1:{PORT}/index.html'); await page.wait_for_function('window.__z1ready===true', timeout=60000)
            r = {}
            r['scrollWidthOK'] = await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            r['count'] = await page.inner_text('#count')
            r['viewport'] = vp
            await page.screenshot(path=str(EVID / f'{name}-scene.jpg'), type='jpeg', quality=80)
            # pick an object: click the centre of the first tree-like object via known coords (z1-021 fortress)
            info = await page.evaluate('''()=>{const o=layout.objects.find(o=>o.label.startsWith('fortress'));return {id:o.id,cx:o.x+o.w/2,cy:o.y+o.h*0.6}}''')
            box = await page.evaluate('(()=>{const r=document.querySelector("#stage").getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()')
            # make the target visible: scroll so that it is in the viewport
            await page.evaluate('([cx,cy])=>{const v=document.querySelector("#view");v.scrollLeft=cx*state.zoom-v.clientWidth/2;v.scrollTop=cy*state.zoom-v.clientHeight/2}', [info['cx'], info['cy']])
            box = await page.evaluate('(()=>{const r=document.querySelector("#stage").getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()')
            x = box[0] + info['cx'] / 2500 * box[2]; y = box[1] + info['cy'] / 1758 * box[3]
            await page.mouse.click(x, y); await page.wait_for_timeout(200)
            r['pickedId'] = await page.evaluate('state.sel&&state.sel.id'); r['expectedId'] = info['id']
            r['infoText'] = (await page.inner_text('#info')) if await page.is_visible('#info') else None
            await page.screenshot(path=str(EVID / f'{name}-picked.jpg'), type='jpeg', quality=80)
            # layers toggle: hide trees -> pixels change; show again -> identical
            async def px(): return await page.evaluate('document.querySelector("#scene").toDataURL()')
            a = await px(); await page.click('#btnLayers'); await page.uncheck('input[data-k="C:tree"]'); await page.wait_for_timeout(150); b2 = await px()
            r['treeToggleChangesPixels'] = a != b2
            await page.screenshot(path=str(EVID / f'{name}-layers-notrees.jpg'), type='jpeg', quality=80)
            await page.check('input[data-k="C:tree"]'); await page.wait_for_timeout(150); r['treeToggleRoundTrip'] = a == await px()
            await page.check('input[data-k="outline"]'); await page.wait_for_timeout(100); await page.click('#btnLayers')
            await page.screenshot(path=str(EVID / f'{name}-outlines.jpg'), type='jpeg', quality=80); await page.click('#btnLayers'); await page.uncheck('input[data-k="outline"]'); await page.click('#btnLayers')
            # modes
            await page.click('[data-mode="ok"]'); await page.wait_for_timeout(100); r['okModeSceneHidden'] = await page.evaluate('getComputedStyle(document.querySelector("#scene")).display==="none"')
            await page.click('[data-mode="slider"]'); await page.fill('#slider', '40'); await page.wait_for_timeout(100)
            r['sliderClip'] = await page.evaluate('document.querySelector("#scene").style.clipPath')
            await page.screenshot(path=str(EVID / f'{name}-slider.jpg'), type='jpeg', quality=80)
            await page.click('[data-mode="scene"]')
            # zoom in/out/fit
            await page.click('#zIn'); await page.click('#zIn'); z1 = await page.evaluate('state.zoom'); await page.click('#zFit'); z2 = await page.evaluate('state.zoom')
            r['zoomWorks'] = z1 > z2; r['scrollWidthAfterZoomOK'] = await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            # thumb-size check of dock buttons
            r['minButtonPx'] = await page.evaluate('Math.min(...[...document.querySelectorAll("#dock button")].map(b=>Math.min(b.getBoundingClientRect().width,b.getBoundingClientRect().height)))')
            r['pageErrors'] = errors; r['consoleErrorsOrWarnings'] = console; r['http4xx'] = resp404
            report[name] = r; await ctx.close()
        await b.close()
    (OUT / 'browser-review.json').write_text(json.dumps(report, indent=1, ensure_ascii=False)); print(json.dumps(report, indent=1, ensure_ascii=False))
    bad = [k for k, r in report.items() if r['pageErrors'] or r['consoleErrorsOrWarnings'] or r['http4xx'] or not r['scrollWidthOK'] or r['pickedId'] != r['expectedId'] or not r['treeToggleChangesPixels'] or not r['treeToggleRoundTrip']]
    sys.exit(1 if bad else 0)

asyncio.run(main())
