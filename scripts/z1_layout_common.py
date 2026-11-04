"""Shared helpers for the Z1 layout tools (render sprites into ok space)."""
import numpy as np, cv2
OKW, OKH = 2500, 1758


def to_premult(rgba8):
    a = rgba8[..., 3:4].astype(np.float32) / 255.0
    return np.concatenate([rgba8[..., :3].astype(np.float32) * a, a * 255.0], axis=2)


def warp_sprite(sprite_rgba8, M, shape=(OKH, OKW), dx=0.0, dy=0.0):
    """Warp an RGBA8 sprite by 2x3 matrix M (sprite px -> ok px). Returns premultiplied float32 HxWx4
    (rgb premult 0..255, alpha 0..255) and its integer bbox (x0,y0,x1,y1) or None."""
    h, w = sprite_rgba8.shape[:2]
    M = np.array(M, np.float64).copy(); M[0, 2] += dx; M[1, 2] += dy
    f = float(np.sqrt(abs(np.linalg.det(M[:, :2]))))
    P = to_premult(sprite_rgba8)
    if f < 0.75:
        nw, nh = max(1, int(round(w * f))), max(1, int(round(h * f)))
        P = cv2.resize(P, (nw, nh), interpolation=cv2.INTER_AREA)
        S = np.array([[w / nw, 0, 0], [0, h / nh, 0], [0, 0, 1.]])
        M = np.vstack([M, [0, 0, 1.]]) @ S; M = M[:2]
        h, w = nh, nw
    pts = cv2.transform(np.float32([[[0, 0], [w, 0], [w, h], [0, h]]]), M.astype(np.float32))[0]
    x0 = max(0, int(np.floor(pts[:, 0].min())) - 1); y0 = max(0, int(np.floor(pts[:, 1].min())) - 1)
    x1 = min(shape[1], int(np.ceil(pts[:, 0].max())) + 1); y1 = min(shape[0], int(np.ceil(pts[:, 1].max())) + 1)
    if x1 <= x0 or y1 <= y0: return None, None
    M2 = M.copy(); M2[0, 2] -= x0; M2[1, 2] -= y0
    out = cv2.warpAffine(P, M2.astype(np.float32), (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    return out, (x0, y0, x1, y1)


def composite_over(canvas, layer, bbox):
    """canvas float32 HxWx3 (0..255); layer premultiplied HxWx4 from warp_sprite."""
    x0, y0, x1, y1 = bbox
    a = layer[..., 3:4] / 255.0
    canvas[y0:y1, x0:x1] = layer[..., :3] + canvas[y0:y1, x0:x1] * (1.0 - a)
