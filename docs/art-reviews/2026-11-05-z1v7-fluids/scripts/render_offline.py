"""Deterministic art-review composites. This does not execute the game renderer.

Uses layout rectangles, world-anchored tiles, overlay/normal blends and placed
sprite timings transcribed from the supplied town-fluid-fx.js. Native painted
frames are held at their layout fps. No new animation phase is synthesized.
"""

from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import subprocess

from PIL import Image, ImageChops, ImageDraw

from build_assets import terrain


ROOT = Path(__file__).resolve().parents[1]
LAYOUT = json.loads((ROOT / "fx-layout.json").read_text())
WORLD_TO_MAP = [LAYOUT["masterSize"][i] / LAYOUT["worldSize"][i] for i in range(2)]


class Renderer:
    def __init__(self):
        self.ground = terrain()
        self.frames = {}
        self.masks = {}
        for piece in LAYOUT["pieces"]:
            name = piece["sheet"]
            if name not in self.frames:
                sheet = Image.open(ROOT / "sheets" / name).convert("RGBA")
                self.frames[name] = [sheet.crop((i * piece["frameW"], 0, (i + 1) * piece["frameW"], piece["frameH"])) for i in range(piece["frames"])]
            if piece["mask"] not in self.masks:
                self.masks[piece["mask"]] = Image.open(ROOT / "masks" / (piece["mask"] + ".webp")).getchannel("A")

    def view(self, rect, width, height):
        return View(self, rect, width, height)


class View:
    def __init__(self, renderer, rect, width, height):
        self.renderer = renderer
        self.rect = rect
        self.width, self.height = width, height
        self.scale = [width / rect[2], height / rect[3]]
        x, y, w, h = rect
        self.base = renderer.ground.crop((2 * x, 2 * y, 2 * (x + w), 2 * (y + h))).resize((width, height), Image.Resampling.LANCZOS)
        self.layers = []
        for piece in LAYOUT["pieces"]:
            px, py, pw, ph = piece["maskRectPx"]
            if px + pw <= x or py + ph <= y or px >= x + w or py >= y + h or piece.get("off"):
                continue
            left, top = round((px - x) * self.scale[0]), round((py - y) * self.scale[1])
            size = [max(1, round(pw * self.scale[0])), max(1, round(ph * self.scale[1]))]
            # Sample just the visible mask part, including for full-map masks.
            box = [max(0, left), max(0, top), min(width, left + size[0]), min(height, top + size[1])]
            if box[2] <= box[0] or box[3] <= box[1]:
                continue
            visible = [box[2] - box[0], box[3] - box[1]]
            mask = renderer.masks[piece["mask"]]
            sx, sy = mask.width / size[0], mask.height / size[1]
            crop_box = [(box[0] - left) * sx, (box[1] - top) * sy, (box[2] - left) * sx, (box[3] - top) * sy]
            mask = mask.transform(tuple(visible), Image.Transform.EXTENT, crop_box, Image.Resampling.BILINEAR)
            layer = {"piece": piece, "box": box, "mask": mask, "frames": []}
            if piece["kind"] == "rect":
                for frame in renderer.frames[piece["sheet"]]:
                    fx, fy = frame.width / size[0], frame.height / size[1]
                    box_frame = [(box[0] - left) * fx, (box[1] - top) * fy, (box[2] - left) * fx, (box[3] - top) * fy]
                    layer["frames"].append(frame.transform(tuple(visible), Image.Transform.EXTENT, box_frame, Image.Resampling.BICUBIC))
            if piece["kind"] == "tile":
                tw = max(1, round(piece["tileWorld"][0] * WORLD_TO_MAP[0] * self.scale[0]))
                th = max(1, round(piece["tileWorld"][1] * WORLD_TO_MAP[1] * self.scale[1]))
                origin = [round(x * self.scale[0]) + box[0], round(y * self.scale[1]) + box[1]]
                for frame in renderer.frames[piece["sheet"]]:
                    tile = frame.resize((tw, th), Image.Resampling.LANCZOS)
                    image = Image.new("RGBA", tuple(visible))
                    for ty in range(-(origin[1] % th), visible[1], th):
                        for tx in range(-(origin[0] % tw), visible[0], tw):
                            image.paste(tile, (tx, ty))
                    layer["frames"].append(image)
            self.layers.append(layer)

    def spots(self, layer, sec):
        piece, box = layer["piece"], layer["box"]
        image = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]))
        frames = self.renderer.frames[piece["sheet"]]
        for spot in piece["spots"]:
            period = spot[6] or 4
            phase = (sec / period + spot[5]) % 1
            if piece["mode"] == "once":
                window = piece.get("win", .5)
                if phase >= window:
                    continue
                progress = phase / window
                frame = min(len(frames) - 1, math.floor(progress * (len(frames) - 1)))
                alpha = min(1, progress * 6, (1 - progress) * 6)
                dx, dy = 0, 0
            else:
                frame = math.floor((sec + spot[5] * period) * piece.get("fps", 8)) % len(frames)
                if piece["mode"] == "rise":
                    alpha = math.sin(math.pi * phase) ** 1.2
                    dx, dy = spot[7] * phase, spot[8] * phase
                else:
                    alpha = math.sin(math.pi * phase) ** 1.5
                    dx, dy = spot[7] * (phase - .5), spot[8] * (phase - .5)
            size = (max(1, round(spot[2] * WORLD_TO_MAP[0] * self.scale[0])), max(1, round(spot[3] * WORLD_TO_MAP[1] * self.scale[1])))
            sprite = frames[frame].resize(size, Image.Resampling.LANCZOS).rotate(-math.degrees(spot[4]), resample=Image.Resampling.BICUBIC, expand=True)
            sprite.putalpha(sprite.getchannel("A").point(lambda value: round(value * alpha)))
            cx = ((spot[0] + dx) * WORLD_TO_MAP[0] - self.rect[0]) * self.scale[0] - box[0]
            cy = ((spot[1] + dy) * WORLD_TO_MAP[1] - self.rect[1]) * self.scale[1] - box[1]
            image.alpha_composite(sprite, (round(cx - sprite.width / 2), round(cy - sprite.height / 2)))
        return image

    def render(self, sec=0, effect=True):
        result = self.base.copy()
        if not effect:
            return result
        for layer in self.layers:
            piece, box = layer["piece"], layer["box"]
            if piece["kind"] == "spots":
                image = self.spots(layer, sec)
            else:
                index = math.floor(sec * piece.get("fps", 8) + 1e-8) % piece["frames"]
                image = layer["frames"][index]
            alpha = ImageChops.multiply(image.getchannel("A"), layer["mask"])
            alpha = alpha.point(lambda value: round(value * piece.get("opacity", 1)))
            background = result.crop(tuple(box))
            foreground = image.convert("RGB")
            if piece.get("blend") == "overlay":
                foreground = ImageChops.overlay(background, foreground)
            elif piece.get("blend") == "screen":
                foreground = ImageChops.screen(background, foreground)
            elif piece.get("blend", "normal") != "normal":
                raise ValueError("Unsupported blend " + piece["blend"])
            result.paste(Image.composite(foreground, background, alpha), tuple(box[:2]))
        return result


def main():
    renderer = Renderer()
    review = ROOT / "review"
    (review / "pairs").mkdir(exist_ok=True)
    (review / "clips").mkdir(exist_ok=True)
    report = {"renderer": "Offline Pillow renderer", "gameIntegrationTested": False,
              "differencesFromRuntime": ["Painted phases are held at layout fps, without runtime cross-fading", "No GPU mips or profile throttling", "Spot composites use alpha-over instead of runtime lighter accumulation"],
              "pairs": [], "clips": [], "contactSheets": [], "inputAssets": []}
    paths = [ROOT / "fx-layout.json", review / "views.json", Path(__file__), ROOT / "scripts/build_assets.py"]
    paths += [ROOT / "masks" / (name + ".webp") for name in sorted(renderer.masks)]
    paths += [ROOT / "sheets" / name for name in sorted(renderer.frames)]
    paths += sorted((ROOT / "input/v7").glob("*"))
    report["inputAssets"] = [{"path": str(path.relative_to(ROOT)),
                              "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
                             for path in paths if path.is_file()]
    groups = {"icefalls": [], "lavafalls": [], "streams": []}
    for piece in LAYOUT["pieces"]:
        group = piece["group"]
        if group not in ["waterfall", "lavafall", "ice", "lava", "river"]:
            continue
        rect = piece["maskRectPx"]
        scale = min(2, 600 / rect[2], 600 / rect[3])
        width, height = max(2, round(rect[2] * scale)), max(2, round(rect[3] * scale))
        view = renderer.view(rect, width, height)
        pair = Image.new("RGB", (width * 2, height + 24), "#17171e")
        pair.paste(view.render(effect=False), (0, 24))
        pair.paste(view.render(.375), (width, 24))
        ImageDraw.Draw(pair).text((5, 5), piece["mask"] + " | ground / ground + FX (offline)", fill="white")
        path = review / "pairs" / (piece["mask"] + ".webp")
        pair.save(path, quality=72, method=6)
        key = "icefalls" if group == "waterfall" else "lavafalls" if group == "lavafall" else "streams"
        groups[key].append(pair)
        report["pairs"].append({"id": piece["mask"], "file": str(path.relative_to(ROOT)), "rectPx1x": rect, "size": list(pair.size),
                                "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    for group, pairs in groups.items():
        height = sum(round(image.height * 800 / image.width) + 8 for image in pairs)
        sheet = Image.new("RGB", (800, height), "#17171e")
        y = 0
        for image in pairs:
            image = image.resize((800, round(image.height * 800 / image.width)), Image.Resampling.LANCZOS)
            sheet.paste(image, (0, y))
            y += image.height + 8
        contact_path = review / ("contact-" + group + ".jpg")
        sheet.save(contact_path, quality=68, optimize=True)
        report["contactSheets"].append({"file": str(contact_path.relative_to(ROOT)),
                                       "sha256": hashlib.sha256(contact_path.read_bytes()).hexdigest()})
    for config in json.loads((review / "views.json").read_text()):
        view = renderer.view(config["rectPx1x"], 960, 776)
        path = review / "clips" / (config["id"] + ".mp4")
        command = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", "960x776", "-framerate", "24", "-i", "-",
                   "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "31", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)]
        process = subprocess.Popen(command, stdin=subprocess.PIPE)
        hashes = []
        montage = Image.new("RGB", (1280, 558), "#17171e")
        draw = ImageDraw.Draw(montage)
        selected = [0, 3, 6, 9, 12, 18, 21, 24]
        for index in range(288):
            image = view.render(index / 24)
            data = image.tobytes()
            hashes.append(hashlib.sha256(data).hexdigest())
            process.stdin.write(data)
            if index in selected:
                i = selected.index(index)
                image.thumbnail((320, 259))
                x, y = (i % 4) * 320, (i // 4) * 279
                montage.paste(image, (x, y + 20))
                draw.text((x + 4, y + 4), f"{index / 24:.3f}s", fill="white")
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError("ffmpeg failed")
        montage.save(review / (config["id"] + "-sequence.jpg"), quality=72)
        probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)]))
        stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
        report["clips"].append({"file": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "view": config, "durationSeconds": float(probe["format"]["duration"]),
                                "frames": int(stream["nb_frames"]), "fps": stream["avg_frame_rate"], "size": [stream["width"], stream["height"]],
                                "distinctFrames": len(Counter(hashes)), "frameHashes": hashes})
        print("Rendered", config["id"], path.stat().st_size, flush=True)
    (review / "offline-render-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
