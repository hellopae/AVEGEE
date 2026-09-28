"""Build a seamless Home loop from the original Avegee cover without moving its cast."""

from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, map_coordinates, maximum_filter


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "img" / "cover-v3.webp"
OUTPUT = ROOT / "img" / "home-animated.mp4"
W, H, FPS, FRAMES = 1280, 720, 24, 120

base = np.asarray(Image.open(SOURCE).convert("RGB").resize((W, H), Image.Resampling.LANCZOS), dtype=np.float32)
yy, xx = np.indices((H, W), dtype=np.float32)
r, g, b = base[:, :, 0], base[:, :, 1], base[:, :, 2]

# Lava movement is constrained to the glowing rivers, falls, and molten foreground.
lava_area = ((yy > 485) & (xx < 420)) | ((yy > 345) & (xx > 925)) | ((yy > 615) & (xx < 480))
lava_pixels = (r > 135) & (g > 52) & (r > g * 1.32) & (r > b * 1.4)
lava_mask = gaussian_filter((lava_area & lava_pixels).astype(np.float32), 1.2)

# The blue spirits occupy the bridge. Protect every other character and the camera.
bridge = (yy > 420) & (xx > 430)
spirit_pixels = bridge & (b > 115) & (g > 105) & (b > r * 1.22) & (g > r * 1.13)
spirit_mask = gaussian_filter(maximum_filter(spirit_pixels.astype(np.float32), size=9), 3.0)
spirit_mask = np.clip(spirit_mask, 0, 1)

cmd = [
    "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pixel_format", "rgb24",
    "-video_size", f"{W}x{H}", "-framerate", str(FPS), "-i", "-", "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", str(OUTPUT),
]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
assert proc.stdin is not None

for frame in range(FRAMES):
    phase = 2 * math.pi * frame / FRAMES
    out = base.copy()

    # Slow moving light bands make the lava visibly flow while rock stays fixed.
    flow = np.sin(yy / 22 - 2 * phase + 0.32 * np.sin(xx / 57 + phase))
    flow += 0.35 * np.sin(xx / 32 + yy / 15 - 3 * phase)
    out[:, :, 0] += lava_mask * (18 + 24 * flow)
    out[:, :, 1] += lava_mask * (11 + 30 * flow)
    out[:, :, 2] -= lava_mask * (4 + 6 * flow)

    # Each spirit gently rises and settles; a soft mask hides the local warp edge.
    dx = 5.0 * np.sin(phase + xx / 105)
    dy = 7.0 * np.sin(phase + xx / 89) * (0.35 + 0.65 * (H - yy) / H)
    coords = [np.clip(yy - dy, 0, H - 1), np.clip(xx - dx, 0, W - 1)]
    mask = spirit_mask[:, :, None]
    for channel in range(3):
        moved = map_coordinates(base[:, :, channel], coords, order=1, mode="nearest")
        out[:, :, channel] = out[:, :, channel] * (1 - mask[:, :, 0]) + moved * mask[:, :, 0]
    spirit_light = 10.0 * np.sin(phase + xx / 95)
    out[:, :, 1] += spirit_mask * spirit_light
    out[:, :, 2] += spirit_mask * (10 + spirit_light)

    # Smoke curls above the volcano. Restrict it to the sky around the crater.
    smoke = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(smoke, "RGBA")
    for i in range(8):
        a = phase + i * 0.72
        cx = 905 + 68 * math.sin(a) + 12 * i
        cy = 85 - 18 * i + 12 * math.sin(a)
        rx = 38 + 7 * i
        ry = 20 + 3 * i
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(24, 18, 31, 145))
    smoke = smoke.filter(ImageFilter.GaussianBlur(12))
    frame_image = Image.alpha_composite(Image.fromarray(np.uint8(np.clip(out, 0, 255))).convert("RGBA"), smoke)

    # Small rising embers add motion without tinting the entire painted cover.
    sparks = Image.new("RGBA", (W, H))
    spark_draw = ImageDraw.Draw(sparks, "RGBA")
    for i in range(44):
        seed = (i * 0.61803398875) % 1
        progress = (frame / FRAMES + seed) % 1
        x = (i * 197 + 83) % W + 24 * math.sin(phase + i)
        y = H - ((i * 127 + 41) % H) - 135 * progress
        alpha = int(135 * math.sin(math.pi * progress))
        radius = 1 + i % 2
        spark_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 125 + i % 80, 24, alpha))
    frame_image = Image.alpha_composite(frame_image, sparks)
    out = np.asarray(frame_image.convert("RGB"))
    proc.stdin.write(out.tobytes())

proc.stdin.close()
if proc.wait() != 0:
    raise SystemExit("ffmpeg render failed")
print(OUTPUT)
