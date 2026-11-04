"""Exercise the review viewer in local headless Chromium (no deployment)."""
from contextlib import contextmanager
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import json
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-frontier1-redraw'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors, bad_requests, checks = [], [], []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1150, 'height': 820}, device_scale_factor=1)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: bad_requests.append(dict(url=response.url, status=response.status)) if response.status >= 400 else None)
            page.goto(f'http://127.0.0.1:{server.server_port}/docs/art-reviews/2026-11-05-frontier1-redraw/index.html')
            page.wait_for_function('window.terrainReview?.ready', timeout=30000)
            for focus in ['center', 'left', 'right', 'south']:
                page.select_option('#location', focus)
                for level in ['near', 'closer']:
                    page.click(f'#{level}')
                    page.wait_for_timeout(100)
                    page.wait_for_function('window.terrainReview.ready && window.terrainReview.stats.pending === 0', timeout=30000)
                    stats = page.evaluate('window.terrainReview.stats')
                    assert not stats['errors'], stats
                    assert stats['bytes'] <= stats['maxBytes']
                    checks.append(dict(focus=focus, zoom=level, bytes=stats['bytes'], pending=stats['pending']))
            for layer in ['sky', 'mountains', 'terrain', 'fluid', 'objects']:
                page.uncheck(f'#{layer}')
                page.wait_for_timeout(60)
                page.check(f'#{layer}')
            page.wait_for_function('window.terrainReview.ready', timeout=30000)
            before = page.evaluate('window.terrainReview.clock')
            page.click('#play')
            # Three full four-second cycles, allowing load latency without advancing unready frames.
            page.wait_for_function(f'window.terrainReview.clock > {before + 12.05}', timeout=45000)
            page.click('#play')
            paused = page.evaluate('window.terrainReview.clock')
            page.wait_for_timeout(200)
            assert page.evaluate('window.terrainReview.clock') == paused
            page.select_option('#location', 'center')
            page.click('#near')
            page.wait_for_timeout(100)
            page.wait_for_function('window.terrainReview.ready', timeout=30000)
            page.screenshot(path=str(OUT / 'viewer-desktop.png'))
            page.set_viewport_size({'width': 390, 'height': 844})
            page.wait_for_timeout(150)
            page.wait_for_function('window.terrainReview.ready', timeout=30000)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            page.screenshot(path=str(OUT / 'viewer-mobile.png'))
            page.click('#overviewButton')
            page.wait_for_function('document.querySelector("#overview").complete && document.querySelector("#overview").naturalWidth === 1600')
            assert page.locator('#scene').is_hidden()
            page.click('#overviewButton')
            page.wait_for_function('window.terrainReview.ready', timeout=30000)
            stats = page.evaluate('window.terrainReview.stats')
            assert not errors and not bad_requests and not stats['errors'], (errors, bad_requests, stats)
            report = dict(browser='headless Chromium', checks=checks, animationSeconds=paused-before,
                          pauseStable=True, layerToggles=5, overview=True, mobileWidth=390,
                          horizontalOverflow=False, consoleErrors=errors, httpErrors=bad_requests,
                          finalCache=stats, limitation='Local review viewer only; not in-game testing.')
            (OUT / 'viewer-review.json').write_text(json.dumps(report, indent=2) + '\n')
            print(json.dumps(report))
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
