"""Capture the supplied game's fluid renderer against the copied v7 terrain.

Run from any directory. Requires Pillow, Python Playwright with Chromium and ffmpeg.
Only this art-review folder is served and written. No game scene or save is loaded.
"""

import base64
import functools
import hashlib
import http.server
import io
import json
from pathlib import Path
import subprocess
import threading

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def capture(page, rect, ms, effect, width, height):
    page.evaluate("a => review.render(...a)", [rect, ms, effect, width, height])
    encoded = page.evaluate("document.querySelector('canvas').toDataURL('image/jpeg', .92).split(',')[1]")
    return base64.b64decode(encoded)


def main():
    review = ROOT / "review"
    pairs = review / "pairs"
    clips = review / "clips"
    pairs.mkdir(exist_ok=True)
    clips.mkdir(exist_ok=True)
    record = {"method": "Copied current game fluid renderer with four import adapters. Isolated terrain/FX harness.",
              "gameIntegrationTested": False, "pageErrors": [], "httpErrors": [], "failedRequests": [],
              "pairs": [], "clips": []}
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page(viewport={"width": 1200, "height": 1000}, device_scale_factor=1)
            page.on("pageerror", lambda e: record["pageErrors"].append(str(e)))
            page.on("requestfailed", lambda r: record["failedRequests"].append(r.url))
            page.on("response", lambda r: record["httpErrors"].append({"status": r.status, "url": r.url}) if r.status >= 400 else None)
            page.goto(f"http://127.0.0.1:{server.server_port}/review.html", wait_until="networkidle")
            page.wait_for_function("window.review?.ready", timeout=180000)
            record["loaded"] = page.evaluate("review.stats()")
            layout = page.evaluate("review.layout")
            groups = {"icefalls": [], "lavafalls": [], "streams": []}
            for piece in layout["pieces"]:
                group = piece["group"]
                if group not in ["waterfall", "lavafall", "ice", "lava", "river"]:
                    continue
                rect = piece["maskRectPx"]
                scale = min(2, 600 / rect[2], 600 / rect[3])
                width, height = max(2, round(rect[2] * scale)), max(2, round(rect[3] * scale))
                before = Image.open(io.BytesIO(capture(page, rect, 375, False, width, height)))
                after = Image.open(io.BytesIO(capture(page, rect, 375, True, width, height)))
                pair = Image.new("RGB", (width * 2, height + 24), "#17171e")
                pair.paste(before, (0, 24))
                pair.paste(after, (width, 24))
                ImageDraw.Draw(pair).text((6, 5), piece["mask"] + " | ground / ground + all FX at 0.375s", fill="white")
                path = pairs / (piece["mask"] + ".webp")
                pair.save(path, quality=78, method=6)
                key = "icefalls" if group == "waterfall" else "lavafalls" if group == "lavafall" else "streams"
                groups[key].append(pair)
                record["pairs"].append({"id": piece["mask"], "file": str(path.relative_to(ROOT)), "rectPx1x": rect,
                                        "effectTimeMs": 375, "size": list(pair.size)})
            for group, images in groups.items():
                # Every pair is retained separately at its larger review size.
                height = sum(round(im.height * 960 / im.width) + 8 for im in images)
                sheet = Image.new("RGB", (960, height), "#17171e")
                y = 0
                for im in images:
                    im = im.resize((960, round(im.height * 960 / im.width)), Image.Resampling.LANCZOS)
                    sheet.paste(im, (0, y))
                    y += im.height + 8
                sheet.save(review / ("contact-" + group + ".jpg"), quality=74, optimize=True)
            for view in page.evaluate("review.views"):
                path = clips / (view["id"] + ".mp4")
                command = ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "mjpeg", "-r", "24", "-i", "-",
                           "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)]
                process = subprocess.Popen(command, stdin=subprocess.PIPE)
                digests = []
                frames = []
                for index in range(288):
                    data = capture(page, view["rectPx1x"], index * 1000 / 24, True, 960, 776)
                    process.stdin.write(data)
                    digests.append(hashlib.sha256(data).hexdigest())
                    if index in [0, 3, 6, 9, 12, 18, 21, 24]:
                        image = Image.open(io.BytesIO(data))
                        image.thumbnail((320, 259))
                        frames.append((index, image.copy()))
                process.stdin.close()
                if process.wait() != 0:
                    raise RuntimeError("ffmpeg failed for " + view["id"])
                probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)]))
                stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
                montage = Image.new("RGB", (1280, 558), "#17171e")
                draw = ImageDraw.Draw(montage)
                for i, (index, image) in enumerate(frames):
                    x, y = (i % 4) * 320, (i // 4) * 279
                    montage.paste(image, (x, y + 20))
                    draw.text((x + 4, y + 4), f"{index / 24:.3f}s", fill="white")
                montage.save(review / (view["id"] + "-sequence.jpg"), quality=76)
                record["clips"].append({"file": str(path.relative_to(ROOT)), "view": view,
                                        "durationSeconds": float(probe["format"]["duration"]), "frames": int(stream["nb_frames"]),
                                        "fps": stream["avg_frame_rate"], "size": [stream["width"], stream["height"]],
                                        "distinctCapturedFrames": len(set(digests)), "captureFrameHashes": digests})
                print("Captured", view["id"], path.stat().st_size, flush=True)
            browser.close()
    except Exception as error:
        record["failure"] = str(error)
        raise
    finally:
        server.shutdown()
        (review / "capture-report.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
