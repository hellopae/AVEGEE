"""Targeted Chromium asset/renderer checks; not a full gameplay acceptance run.

Run from repo root: python3 output/Toby/29f/verify-browser.py
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright

OUT = Path('output/Toby/29f')
ROOMS = [('west', 'Sala'), ('west', 'Tarang'), ('west', 'Krajok'),
         ('west', 'Sawan'), ('cyberhell', 'Tarang'),
         ('cyberhell', 'Krajok'), ('cyberhell', 'Sawan')]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == '/__29f-test':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'<html><body style="margin:0;background:#171520">'
                             b'<canvas width="880" height="880" style="width:880px;height:880px"></canvas></body></html>')
        else:
            super().do_GET()


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
Thread(target=server.serve_forever, daemon=True).start()
results = {'roomRenderer': [], 'cutsceneBounds': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 880, 'height': 880})
        page.goto(f'http://127.0.0.1:{server.server_port}/__29f-test')
        page.evaluate('''async () => {
            window.art = await import('/src/art.js');
            window.data = await import('/src/data.js');
            window.rooms = await import('/src/room.js');
            window.game = (await import('/src/game.js')).createGame();
            window.scale = await import('/src/battle-scale.js');
            window.intros = await import('/src/zone-introductions.js');
        }''')
        page.wait_for_function('art.artEpoch() > 0')
        for zone, base in ROOMS:
            for phase in ['before', 'after']:
                result = page.evaluate('''async ({zone, base, phase}) => {
                    window.room?.destroy();
                    game.zone = zone; art.bindZone(() => game.zone);
                    const url = phase === 'before' ? `img/BG-${base}.webp` : art.artUrl(`BG-${base}`, 'webp');
                    const response = await fetch(url);
                    if (!response.ok) throw Error(`${response.status}: ${url}`);
                    const im = new Image(); im.src = url; await im.decode();
                    const key = base.toLowerCase();
                    window.room = rooms.makeRoom(document.querySelector('canvas'), game,
                        data.STATIONS.find(s => s.k === key), data.ROOMS[key], url, null);
                    room.st = game.stations.find(s => s.def.k === key);
                    room.start();
                    return {zone, base, phase, url, width: im.naturalWidth, height: im.naturalHeight};
                }''', {'zone': zone, 'base': base, 'phase': phase})
                if phase == 'after':
                    assert f'-{zone}.webp' in result['url'], result
                page.wait_for_timeout(200)
                page.locator('canvas').screenshot(
                    path=str(OUT / f'browser-room-{base}-{zone}-{phase}.jpg'), type='jpeg', quality=82)
                results['roomRenderer'].append(result)
        page.evaluate('room.destroy(); document.body.innerHTML = ""')
        for zone in ['asia', 'west', 'cyberhell']:
            for crew in ['taan', 'plerng', 'dam', 'kan', 'boon', 'guard']:
                for width, height in [(1414, 874), (1000, 600), (367, 826), (334, 700)]:
                    page.set_viewport_size({'width': width, 'height': height})
                    result = page.evaluate('''async ({zone, crew, width, height}) => {
                        document.body.innerHTML = '';
                        const cut = document.createElement('div');
                        cut.style.cssText = `position:relative;width:${width}px;height:${height}px;overflow:hidden`;
                        const im = new Image(); im.src = intros.regionalCrewCutscene(crew, zone).src;
                        cut.append(im); document.body.append(cut);
                        const response = await fetch(im.src);
                        if (!response.ok) throw Error(`${response.status}: ${im.src}`);
                        await im.decode(); scale.fitCutsceneImage(cut, im);
                        for (let i=0; i<100 && im.style.position !== 'absolute'; i++)
                            await new Promise(resolve => setTimeout(resolve, 10));
                        if (im.style.position !== 'absolute') throw Error('fitCutsceneImage did not finish');
                        const r = im.getBoundingClientRect();
                        return {zone, crew, viewport:[width,height], natural:[im.naturalWidth,im.naturalHeight],
                            bounds:[r.left,r.top,r.right,r.bottom], src: im.src};
                    }''', {'zone': zone, 'crew': crew, 'width': width, 'height': height})
                    assert result['natural'] == [1375, 768], result
                    left, top, right, bottom = result['bounds']
                    assert left >= -0.5 and top >= -0.5 and right <= width + 0.5 and bottom <= height + 0.5, result
                    assert right - left >= width * 0.98 or bottom - top >= height * 0.98, result
                    results['cutsceneBounds'].append(result)
                    if crew == 'taan' and width in [1414, 367]:
                        page.screenshot(path=str(OUT / f'browser-cutscene-{zone}-{width}.jpg'), type='jpeg', quality=82)
        browser.close()
finally:
    server.shutdown()
    server.server_close()

(OUT / 'browser-results.json').write_text(json.dumps(results, indent=2) + '\n')
print(f"Chromium: {len(results['roomRenderer'])} room renders; {len(results['cutsceneBounds'])} cutscene bounds checks.")
print('Checked real modules in an isolated harness; full station-button/gameplay flow was not exercised.')
