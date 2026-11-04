"""Extract chroma alpha and register the selected ImageGen base to owner anchors."""
from pathlib import Path
from PIL import Image
import numpy as np
import cv2

OUT = Path(__file__).resolve().parents[1] / 'docs/art-reviews/2026-11-05-frontier1-redraw'
a = np.array(Image.open(OUT / 'input/terrain-base-green.png').convert('RGB')).astype('int16')
h, w = a.shape[:2]
green = np.maximum(0, a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]))
alpha = np.uint8(np.clip(1 - (green - 25) / 50, 0, 1) * 255)
# int16 deliberately prevents overflow when removing green edge spill from bright stone.
a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]) + 12)
rgba = np.dstack((np.uint8(a), alpha))
rgba[alpha == 0] = 0
y, x = np.mgrid[:h, :w].astype('float32')
srcy = np.interp(y, [0, h * .272, h * .44, h], [0, 300, h * .44, h]).astype('float32')
factor = 1 - .40 * np.clip((y - h * .82) / (h * .18), 0, 1)
srcx = (w * .53 + (x - w * .53) / factor).astype('float32')
rgba = cv2.remap(rgba, srcx, srcy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
Image.fromarray(rgba).save(OUT / 'terrain-master-v2.png')
print('master:', w, h, 'opaque pixels:', int(np.count_nonzero(rgba[:, :, 3] >= 250)))
