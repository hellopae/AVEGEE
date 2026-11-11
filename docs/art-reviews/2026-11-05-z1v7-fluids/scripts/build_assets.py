"""Cut painted frames and v7 coverage masks. Never synthesize animation frames."""

from pathlib import Path
import hashlib
import json
import math

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SIZE = (9830, 6554)
MASTER = (4915, 3277)
WORLD = (3840, 2560)


def write_json(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def terrain():
    result = Image.new("RGB", SIZE)
    manifest = json.loads((ROOT / "input/v7/manifest.json").read_text())
    for entry in manifest["files"]:
        if "rectPx2x" in entry:
            x, y, _, _ = entry["rectPx2x"]
            result.paste(Image.open(ROOT / "input/v7" / entry["file"]), (x, y))
    return result


def crop(image, rect):
    x, y, w, h = rect
    return image.crop((2 * x, 2 * y, 2 * (x + w), 2 * (y + h)))


def geometry(size, polygons, holes=(), scale=1, offset=(0, 0)):
    result = Image.new("L", size)
    draw = ImageDraw.Draw(result)
    for shapes, value in [(polygons, 255), (holes, 0)]:
        for points in shapes:
            mapped = [((x - offset[0]) * scale, (y - offset[1]) * scale) for x, y in points]
            draw.polygon(mapped, fill=value)
    return np.asarray(result) > 0


def palette(image, kind):
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    if kind == "ice":
        core = (g > 100) & (b > 135) & (g - r > 38) & (b - r > 60)
        white = (r > 174) & (g > 208) & (b > 214)
        return core | (white & ndimage.binary_dilation(core, iterations=7))
    if kind == "lava":
        return (r > 205) & (g > 48) & (r - b > 95) & (g > b * 1.5)
    purple = (b > 75) & (b - g > 36) & (r - g > 16)
    reflected_lava = (r > 215) & (g > 65) & (r - b > 75)
    foam = (r > 190) & (g > 160) & (b > 205)
    return purple | reflected_lava | foam


def save_mask(name, support):
    rgba = Image.new("RGBA", (support.shape[1], support.shape[0]), "white")
    rgba.putalpha(Image.fromarray(support.astype(np.uint8) * 255))
    rgba.save(ROOT / "masks" / (name + ".webp"), lossless=True, method=6)


def to_full(mask, rect):
    result = np.zeros((SIZE[1], SIZE[0]), dtype=bool)
    x, y, w, h = rect
    result[y * 2:(y + h) * 2, x * 2:(x + w) * 2] = mask
    return result


# Coordinates below are hand-traced from the supplied native v7 crops.
# They define liquid faces and explicit foreground occluders before palette refinement.
# Local coordinates are pixels of the input crop, which is already map 2x.
ICE_TRACES = {
    "icefall-summit": {
        "polygons": [[(95, 0), (218, 0), (220, 130), (248, 153), (265, 213),
                      (279, 165), (278, 82), (308, 68), (418, 85), (470, 117),
                      (420, 200), (398, 237), (364, 249), (342, 294), (326, 380),
                      (301, 456), (270, 506), (220, 522), (192, 497), (171, 424),
                      (151, 382), (102, 355), (72, 340), (15, 355), (0, 334),
                      (23, 299), (64, 271), (90, 221), (104, 153), (80, 117)]],
        "holes": [[(77, 37), (101, 35), (120, 47), (130, 113), (126, 159),
                   (113, 180), (104, 124), (88, 94)],
                  [(66, 161), (88, 145), (105, 149), (124, 171), (128, 217),
                   (114, 250), (90, 245), (78, 200)],
                  [(83, 262), (96, 245), (113, 246), (133, 258), (139, 310),
                   (129, 369), (116, 397), (93, 395), (83, 353), (75, 304)],
                  [(0, 335), (41, 330), (68, 343), (80, 368), (49, 389),
                   (0, 378)],
                  [(110, 127), (139, 118), (165, 172), (184, 221), (199, 250),
                   (219, 319), (191, 343), (168, 299), (152, 264), (125, 235)],
                  [(228, 228), (247, 221), (260, 268), (265, 321), (247, 347)],
                  [(340, 288), (369, 262), (393, 285), (372, 347), (344, 421),
                   (302, 480), (286, 485), (320, 397)]],
    },
    "icefall-upper-tree": {
        "polygons": [[(87, 0), (181, 0), (207, 56), (227, 92), (242, 123),
                      (215, 144), (193, 123), (174, 127), (153, 142), (152, 173),
                      (177, 168), (198, 177), (218, 200), (224, 243), (208, 249),
                      (181, 212), (170, 177), (149, 174), (127, 190), (91, 182),
                      (66, 168), (42, 145), (50, 105), (68, 68)]],
        "holes": [[(113, 0), (142, 0), (144, 43), (125, 69), (128, 92),
                   (151, 113), (141, 135), (124, 144), (120, 169), (90, 161),
                   (102, 135), (98, 107), (111, 72), (110, 40)],
                  [(161, 57), (193, 56), (218, 74), (243, 84), (228, 110),
                   (187, 96)],
                  [(225, 149), (254, 142), (276, 160), (289, 217),
                   (308, 231), (276, 248), (252, 219)]],
    },
    "icefall-upper-right": {
        "polygons": [[(222, 85), (259, 94), (252, 132), (231, 202),
                      (216, 264), (205, 300), (216, 330), (204, 363),
                      (176, 343), (145, 321), (146, 297), (172, 247), (200, 148)]],
        "holes": [[(183, 315), (205, 306), (232, 328), (259, 369),
                   (259, 420), (169, 420), (163, 365)]],
    },
    "icefall-east-cliff": {
        "polygons": [[(113, 0), (146, 0), (145, 62), (152, 66), (158, 100),
                      (167, 132), (181, 201), (197, 259), (229, 289),
                      (213, 311), (121, 293), (114, 241)]],
        "holes": [[(139, 113), (156, 101), (171, 120), (179, 165), (181, 210),
                   (168, 246), (152, 220)]],
    },
    "icefall-center-bridge": {
        "polygons": [[(172, 75), (221, 76), (350, 87), (389, 94),
                      (387, 173), (364, 236), (352, 289), (359, 325),
                      (337, 343), (209, 338), (170, 317), (218, 298),
                      (230, 271), (220, 224), (207, 184), (177, 175)]],
        "holes": [[(154, 175), (201, 175), (218, 193), (225, 257),
                   (225, 293), (209, 311), (177, 318)]],
    },
    "icefall-lower-inlet": {
        "polygons": [[(91, 65), (121, 68), (158, 79), (149, 99),
                      (131, 146), (115, 199), (108, 235), (118, 247),
                      (105, 260), (74, 252), (87, 220), (85, 143)]],
        "holes": [],
    },
    "icefall-lower-1": {
        "polygons": [[(116, 92), (154, 94), (212, 100), (210, 160),
                      (203, 222), (191, 264), (201, 280), (182, 299),
                      (98, 292), (94, 271), (108, 226), (112, 163)]],
        "holes": [],
    },
    "icefall-lower-2": {
        "polygons": [[(104, 97), (150, 92), (191, 91), (210, 109),
                      (216, 154), (222, 205), (211, 242), (182, 258),
                      (119, 250), (113, 222), (120, 176), (118, 128)]],
        "holes": [],
    },
    "icefall-lower-3": {
        "polygons": [[(111, 76), (160, 75), (201, 78), (238, 78),
                      (281, 69), (318, 62), (339, 59), (335, 116),
                      (322, 172), (315, 231), (343, 259), (300, 278),
                      (160, 279), (133, 266), (137, 227), (123, 165)]],
        "holes": [[(197, 81), (228, 80), (227, 112), (221, 171),
                   (213, 213), (207, 170), (201, 123)],
                  [(290, 70), (320, 61), (316, 94), (309, 145), (301, 184)]],
    },
    "icefall-mouth": {
        "polygons": [[(54, 145), (103, 130), (180, 114), (244, 103),
                      (301, 96), (329, 94), (341, 90), (398, 84),
                      (431, 93), (414, 137), (405, 168), (419, 189),
                      (421, 206), (407, 232), (393, 260), (364, 280),
                      (310, 264), (236, 237), (173, 214), (126, 182), (67, 175)]],
        "holes": [[(307, 96), (329, 94), (320, 139), (311, 180),
                   (300, 191), (292, 174)],
                  [(339, 186), (359, 186), (375, 199), (367, 211),
                   (343, 214), (331, 205)],
                  [(383, 209), (399, 210), (410, 219), (400, 230), (381, 226)]],
    },
}


# Basin envelopes traced in map 1x coordinates from the native v7 grid reviews.
# Tight palette selection is a second constraint inside these spatial envelopes.
FLAT_TRACES = [
    ("lava-flat-upper", "lava", [280, 155, 1120, 620], [
        [(320, 311), (376, 311), (414, 316), (433, 308), (451, 311),
         (475, 318), (492, 314), (505, 341), (480, 350), (417, 350), (369, 349)],
        [(787, 210), (833, 197), (901, 200), (961, 207), (1020, 212),
         (1112, 228), (1176, 240), (1221, 272), (1182, 287), (1131, 290),
         (1103, 324), (1121, 356), (1199, 377), (1236, 400), (1212, 425),
         (1137, 413), (1109, 396), (1048, 371), (1001, 353), (957, 334),
         (956, 305), (898, 288), (842, 259), (806, 244)],
        [(1116, 565), (1179, 574), (1222, 568), (1274, 572), (1326, 562),
         (1374, 578), (1388, 612), (1364, 641), (1279, 661),
         (1228, 640), (1160, 625), (1094, 608), (1050, 616), (1024, 601)],
        [(1210, 688), (1257, 684), (1304, 690), (1308, 715),
         (1285, 740), (1241, 736), (1210, 716)],
    ]),
    ("lava-flat-west", "lava", [30, 490, 520, 560], [
        [(106, 649), (169, 658), (220, 676), (270, 693), (289, 715),
         (256, 737), (205, 731), (175, 712), (127, 705)],
        [(102, 917), (147, 907), (215, 913), (261, 906), (320, 913),
         (369, 925), (440, 943), (489, 965), (448, 985), (365, 993),
         (296, 987), (213, 984), (123, 1000), (76, 1030), (35, 1038)],
    ]),
    ("lava-flat-middle", "lava", [1040, 1000, 500, 220], [
        [(1128, 1009), (1168, 1011), (1209, 1032), (1247, 1055),
         (1309, 1051), (1374, 1079), (1425, 1097), (1450, 1118),
         (1418, 1149), (1396, 1185), (1337, 1191), (1284, 1161),
         (1230, 1133), (1186, 1100), (1141, 1078)],
    ]),
    ("lava-flat-lower", "lava", [1060, 1425, 660, 780], [
        [(1217, 1460), (1280, 1478), (1347, 1502), (1370, 1533),
         (1398, 1549), (1444, 1562), (1466, 1593), (1438, 1629),
         (1403, 1620), (1365, 1595), (1335, 1565), (1315, 1533), (1255, 1512)],
        [(1398, 1624), (1437, 1620), (1466, 1645), (1481, 1671),
         (1474, 1700), (1427, 1705), (1383, 1686), (1348, 1676), (1341, 1657)],
        [(1371, 1862), (1426, 1850), (1481, 1866), (1520, 1882),
         (1547, 1926), (1607, 1955), (1668, 1972), (1691, 2002),
         (1689, 2044), (1660, 2068), (1617, 2065), (1551, 2038),
         (1481, 2009), (1390, 1994), (1329, 2009), (1288, 2028),
         (1251, 2048), (1214, 2048), (1206, 2028), (1216, 2005),
         (1290, 1968), (1365, 1944), (1376, 1917)],
    ]),
    ("lava-flat-left-bottom", "lava", [160, 1180, 330, 220], [
        [(203, 1228), (249, 1243), (298, 1284), (348, 1298),
         (341, 1322), (306, 1339), (283, 1314), (258, 1292), (218, 1270)],
    ]),
    ("lava-flat-southwest", "lava", [215, 1700, 405, 390], [
        [(264, 1740), (320, 1740), (351, 1759), (393, 1783),
         (453, 1802), (493, 1828), (491, 1859), (463, 1871),
         (437, 1854), (414, 1824), (361, 1801), (304, 1785)],
        [(484, 1889), (528, 1919), (571, 1943), (575, 1975),
         (546, 2004), (515, 2024), (482, 2034), (464, 2015),
         (478, 1986), (486, 1946)],
    ]),
    ("ice-stream-flat-upper", "ice", [3650, 660, 650, 250], [
        [(3670, 721), (3732, 695), (3770, 684), (3800, 716),
         (3830, 731), (3876, 751), (3922, 761), (3961, 780),
         (3995, 814), (4030, 827), (4080, 849), (4124, 866),
         (4175, 879), (4156, 897), (4091, 897), (4042, 875),
         (4008, 849), (3950, 831), (3900, 821), (3830, 800),
         (3772, 780), (3736, 774), (3692, 776), (3663, 757)],
    ]),
    ("ice-stream-flat-central", "ice", [3070, 925, 630, 360], [
        [(3490, 950), (3544, 929), (3566, 955), (3526, 983),
         (3505, 1010), (3481, 1041), (3425, 1097), (3394, 1127),
         (3377, 1160), (3345, 1187), (3310, 1203), (3280, 1232),
         (3234, 1258), (3182, 1265), (3121, 1258), (3152, 1231),
         (3192, 1207), (3217, 1177), (3241, 1162), (3281, 1147),
         (3316, 1119), (3325, 1095), (3300, 1070), (3245, 1073),
         (3241, 1041), (3310, 1027), (3376, 1007), (3424, 990)],
        [(3570, 1009), (3621, 1014), (3667, 1011), (3661, 1035),
         (3619, 1064), (3594, 1080)],
    ]),
    ("ice-stream-flat-lower", "ice", [3020, 1440, 1110, 570], [
        [(3136, 1454), (3190, 1458), (3230, 1468), (3295, 1482),
         (3340, 1502), (3410, 1524), (3480, 1545), (3550, 1561),
         (3619, 1584), (3652, 1608), (3635, 1631), (3571, 1630),
         (3511, 1603), (3450, 1587), (3380, 1568), (3302, 1545),
         (3225, 1523), (3172, 1509), (3109, 1510), (3061, 1495), (3087, 1477)],
        [(3752, 1556), (3814, 1567), (3861, 1568), (3910, 1584),
         (3910, 1601), (3837, 1591), (3778, 1578)],
        [(3843, 1683), (3890, 1689), (3951, 1706), (3976, 1723),
         (3937, 1745), (3891, 1728), (3846, 1708)],
        [(3855, 1808), (3901, 1805), (3960, 1814), (3994, 1828),
         (3984, 1840), (3925, 1840), (3878, 1832)],
        [(3891, 1933), (3960, 1937), (4015, 1944), (4062, 1963),
         (4113, 1984), (4102, 1998), (4027, 2000), (3965, 1991), (3890, 1982)],
    ]),
    ("ice-stream-flat-east", "ice", [4650, 1175, 265, 170], [
        [(4655, 1189), (4713, 1205), (4753, 1223), (4791, 1238),
         (4837, 1242), (4893, 1262), (4914, 1280), (4914, 1316),
         (4863, 1294), (4821, 1280), (4771, 1260), (4725, 1237), (4680, 1220)],
    ]),
    ("ice-stream-flat-mouth", "ice", [4140, 2135, 140, 55], [
        [(4154, 2139), (4195, 2148), (4236, 2157), (4270, 2168),
         (4268, 2182), (4221, 2174), (4180, 2164), (4145, 2154)],
    ]),
    ("spirit-river-west", "spirit", [0, 2110, 2370, 440], [
        [(0, 2230), (190, 2232), (350, 2217), (520, 2216), (710, 2232),
         (880, 2224), (1060, 2208), (1200, 2193), (1320, 2190),
         (1460, 2164), (1600, 2144), (1780, 2127), (1870, 2156),
         (1990, 2190), (2140, 2226), (2280, 2243), (2358, 2238),
         (2358, 2422), (2315, 2460), (2190, 2502), (2040, 2487),
         (1900, 2475), (1750, 2472), (1620, 2470), (1450, 2492),
         (1270, 2488), (1080, 2480), (890, 2454), (710, 2450),
         (510, 2479), (340, 2450), (180, 2450), (0, 2465)],
    ]),
    ("spirit-river-east", "spirit", [2560, 2110, 2355, 450], [
        [(2572, 2243), (2690, 2248), (2810, 2238), (2950, 2227),
         (3090, 2212), (3195, 2222), (3320, 2228), (3430, 2239),
         (3540, 2252), (3660, 2266), (3770, 2255), (3860, 2251),
         (3960, 2230), (4070, 2192), (4170, 2165), (4240, 2147),
         (4340, 2194), (4460, 2203), (4590, 2227), (4730, 2233),
         (4820, 2232), (4914, 2245), (4914, 2485), (4770, 2495),
         (4630, 2497), (4500, 2490), (4360, 2507), (4220, 2511),
         (4080, 2505), (3930, 2497), (3780, 2471), (3630, 2480),
         (3490, 2473), (3360, 2468), (3210, 2460), (3070, 2458),
         (2940, 2440), (2810, 2425), (2680, 2438), (2572, 2446)],
    ]),
]


def build():
    for directory in ["masks", "sheets", "review", "review/masks", "review/pairs"]:
        (ROOT / directory).mkdir(parents=True, exist_ok=True)
    ground = terrain()
    current = json.loads((ROOT / "input/current-fx-layout.json").read_text())
    inventory = json.loads((ROOT / "input/fall-inventory.json").read_text())
    layout = {"schemaVersion": 4, "worldSize": list(WORLD), "masterSize": list(MASTER),
              "note": "v7 fluid asset pack. Masks contain alpha at map 2x. Spatial registration only. Eight painted frames.",
              "bandWorld": 12, "pieces": [], "sheets": []}
    mask_records = []
    loop_records = []
    fall_union = {kind: np.zeros((SIZE[1], SIZE[0]), dtype=bool) for kind in ["ice", "lava"]}
    flat_union = {kind: np.zeros((SIZE[1], SIZE[0]), dtype=bool) for kind in ["ice", "lava", "spirit"]}
    annotations = {"coordinatePolicy": "ice polygons are local pixels of input/<id>.png at map 2x; flat polygons are global map 1x",
                   "ice": ICE_TRACES, "flat": FLAT_TRACES,
                   "independentGroundTruth": False}
    write_json("mask-annotations.json", annotations)

    def register_mask(name, rect, guide, kind, remove=None):
        base = crop(ground, rect)
        liquid = palette(base, kind)
        support = guide & liquid
        # Small holes may be foam, but never restore pixels outside the traced envelope.
        support = ndimage.binary_closing(support, iterations=2) & guide
        support = ndimage.binary_erosion(support, iterations=2)
        if name == "icefall-summit":
            # Snow caps and blue reflections on rock are ambiguous at these edges.
            # Keep saturated moving water, plus the traced impact pool at the base.
            rgb = np.asarray(base).astype(np.int16)
            saturated = (rgb[:, :, 1] - rgb[:, :, 0] > 55) & (rgb[:, :, 2] - rgb[:, :, 0] > 75)
            saturated[480:] = True
            support &= saturated
        if remove is not None:
            support &= ~remove
        save_mask(name, support)
        outside = np.count_nonzero(support & ~guide)
        record = {"id": name, "maskRectPx": rect, "maskSizePx": list(base.size),
                  "maskPixels": int(support.sum()), "outsideAnnotationPixels": int(outside),
                  "outsideAnnotationPercent": 100 * outside / max(1, int(support.sum())),
                  "outsideDrawnLiquidPercent": None,
                  "limitation": "Annotation containment is construction-dependent. No independent pixel-labelled ground truth."}
        mask_records.append(record)
        overlay = base.copy().convert("RGBA")
        tint = Image.new("RGBA", base.size, (255, 30, 130, 0))
        tint.putalpha(Image.fromarray(support.astype(np.uint8) * 115))
        overlay = Image.alpha_composite(overlay, tint)
        overlay.convert("RGB").save(ROOT / "review/masks" / (name + ".webp"), quality=83, method=6)
        return support

    def add_piece(name, group, rect, sheet, kind="rect", **extra):
        image = Image.open(ROOT / "sheets" / sheet)
        frames = extra.pop("frames", 8)
        piece = {"id": name + "--" + name, "group": group, "sheet": sheet,
                 "frames": frames, "fps": 8, "blend": "normal", "opacity": .48,
                 "maskRectPx": rect, "mask": name, "frameW": image.width // frames,
                 "frameH": image.height, "kind": kind}
        piece.update(extra)
        layout["pieces"].append(piece)
        return piece

    for entry in inventory:
        name, rect = entry["id"], entry["rectPx1x"]
        print("Packing", name, flush=True)
        trace = ICE_TRACES[name]
        guide = geometry((rect[2] * 2, rect[3] * 2), trace["polygons"], trace["holes"])
        support = register_mask(name, rect, guide, "ice")
        fall_union["ice"] |= to_full(support, rect)
        frames, native_sizes, origins = [], [], []
        pairs = ["12", "34", "56", "78"]
        for pair in pairs:
            path = ROOT / "sources" / (name + "-" + pair + ".webp")
            image = Image.open(path)
            for i in range(2):
                frame = image.crop((i * image.width // 2, 0, (i + 1) * image.width // 2, image.height))
                frames.append(frame)
                native_sizes.append(list(frame.size))
                origins.append(str(path.relative_to(ROOT)))
        # Spatial resizing registers each painted full crop to the same map rectangle.
        # It neither translates imagery in time nor manufactures extra temporal phases.
        output_size = (800, 800)
        packed = Image.new("RGBA", (800 * 8, 800))
        registered = []
        alpha = Image.fromarray(support.astype(np.uint8) * 255).resize(output_size, Image.Resampling.NEAREST)
        for i, frame in enumerate(frames):
            frame = frame.convert("RGBA").resize(output_size, Image.Resampling.LANCZOS)
            frame.putalpha(alpha)
            packed.paste(frame, (i * 800, 0))
            registered.append(frame)
        packed.save(ROOT / "sheets" / (name + ".webp"), quality=85, method=6)
        p = add_piece(name, "waterfall", rect, name + ".webp", nativeFrameSizes=native_sizes,
                      sources=origins, drawnShape=entry["shape"])
        old_id = name.replace("icefall-", "waterfall-ice-")
        if name in ["icefall-mouth", "icefall-east-cliff"]:
            p["replacesOff"] = old_id + "--" + old_id
        arrays = [np.asarray(f)[:, :, :3].astype(np.float32) for f in registered]
        selected = np.asarray(alpha) > 0
        differences = [float(np.abs(arrays[(i + 1) % 8] - arrays[i])[selected].mean()) for i in range(8)]
        median = float(np.median(differences))
        loop_records.append({"id": name, "nativeFrameSizes": native_sizes,
                             "distinctFrames": len({hashlib.sha256(a.tobytes()).hexdigest() for a in arrays}),
                             "maskedAdjacentRgbMAE": differences,
                             "wrapToMedianRatio": differences[-1] / max(median, .001),
                             "largestToMedianRatio": max(differences) / max(median, .001),
                             "native800AllFrames": all(min(s) >= 800 for s in native_sizes),
                             "temporalSynthesis": False})

    for old in current["pieces"]:
        if old["group"] != "lavafall":
            continue
        name, rect = old["mask"], old["maskRectPx"]
        # Explicit face envelope inside the lip and base, excluding the side cliffs.
        w, h = rect[2] * 2, rect[3] * 2
        polygon = [(w * .04, h * .02), (w * .92, h * .02),
                   (w * .95, h * .71), (w * .85, h * .97),
                   (w * .13, h * .97), (w * .07, h * .7)]
        guide = geometry((w, h), [polygon])
        support = register_mask(name, rect, guide, "lava")
        fall_union["lava"] |= to_full(support, rect)
        add_piece(name, "lavafall", rect, "lavafall.webp", blend="overlay", opacity=.62,
                  reusedFrom="fluids-HD", shapeDecision="Same terrace lip and vertical curtain visible in v7 survey; reuse painted flow, retrace support.")

    for name, kind, rect, polygons in FLAT_TRACES:
        x, y, w, h = rect
        guide = geometry((w * 2, h * 2), polygons, scale=2, offset=(x, y))
        removal = fall_union.get(kind)
        if removal is not None:
            removal = removal[y * 2:(y + h) * 2, x * 2:(x + w) * 2]
        support = register_mask(name, rect, guide, kind, removal)
        flat_union[kind] |= to_full(support, rect)
        sheet = {"lava": "lava-surface.webp", "ice": "ice-stream.webp", "spirit": "spirit-river.webp"}[kind]
        group = {"lava": "lava", "ice": "ice", "spirit": "river"}[kind]
        direction = [-.83, .56] if "central" in name else [1, .25]
        if kind == "ice":
            # Pre-orient every painted phase by the same spatial transform.
            # The existing loader has no flowDir transform, so orientation is baked in.
            oriented_name = "ice-stream-sw.webp" if "central" in name else "ice-stream-se.webp"
            oriented_path = ROOT / "sheets" / oriented_name
            if not oriented_path.exists():
                source = Image.open(ROOT / "sheets/ice-stream.webp").convert("RGBA")
                fw, fh = source.width // 8, source.height
                oriented = Image.new("RGBA", source.size)
                angle = -math.degrees(math.atan2(direction[1], direction[0]))
                for i in range(8):
                    tile = source.crop((i * fw, 0, (i + 1) * fw, fh))
                    repeated = Image.new("RGBA", (fw * 3, fh * 3))
                    for row in range(3):
                        for col in range(3):
                            repeated.paste(tile, (col * fw, row * fh))
                    turned = repeated.rotate(angle, resample=Image.Resampling.BICUBIC)
                    oriented.paste(turned.crop((fw, fh, fw * 2, fh * 2)), (i * fw, 0))
                oriented.save(oriented_path, quality=85, method=6)
            sheet = oriented_name
        add_piece(name, group, rect, sheet, kind="tile", blend="overlay", opacity=.36,
                  tileWorld=[150, 100], flowDir=direction,
                  flowDirPolicy="All painted phases spatially pre-oriented to flowDir. Runtime tile remains world-anchored.")

    for kind, aggregate in flat_union.items():
        save_mask({"ice": "ice-stream-flat", "lava": "lava-flat", "spirit": "spirit-river"}[kind], aggregate)
    shore_union = np.zeros((SIZE[1], SIZE[0]), dtype=bool)
    for kind in ["ice", "spirit"]:
        water = flat_union[kind]
        # Fill internal texture gaps for distance only. The exported support still
        # intersects the original water mask, so filling cannot paint over rocks.
        region = ndimage.binary_closing(water, iterations=8)
        region = ndimage.binary_fill_holes(region) | water
        # Use a padded domain so a map boundary is not interpreted as a river bank.
        distance = ndimage.distance_transform_edt(np.pad(region, 32, constant_values=True))[32:-32, 32:-32]
        shore = water & (distance <= 30)
        shore_union |= shore
        name = "shore-band-" + kind
        ys, xs = np.where(shore)
        x0, y0 = int(xs.min()) // 2, int(ys.min()) // 2
        x1, y1 = int(xs.max()) // 2 + 1, int(ys.max()) // 2 + 1
        rect = [x0, y0, x1 - x0, y1 - y0]
        save_mask(name, shore[y0 * 2:y1 * 2, x0 * 2:x1 * 2])
        old_name = "bank-foam-" + kind
        template = next(p for p in current["pieces"] if p["sheet"] == old_name + ".webp")
        p = add_piece(name, "bank-foam", rect, old_name + ".webp", kind="tile",
                      tileWorld=template["tileWorld"], opacity=.32, maxDistanceWorld=30 * WORLD[0] / SIZE[0])
        mask_records.append({"id": name, "maskRectPx": rect, "maskSizePx": [(x1 - x0) * 2, (y1 - y0) * 2],
                             "maskPixels": int(shore.sum()), "outsideFlatMaskPixels": int(np.count_nonzero(shore & ~water)),
                             "maxDistanceWorld": float(distance[shore].max() * WORLD[0] / SIZE[0]),
                             "distanceReference": "Texture-gap-filled flat-water support; semantic bank distance still requires review",
                             "outsideDrawnLiquidPercent": None})
    save_mask("shore-band", shore_union)

    # Preserve approved shoreline coordinates exactly, clip at the new v7 shore band.
    approved = next(p for p in current["pieces"] if p["id"] == "river-foam--shore")
    foam = dict(approved)
    shore_piece = next(p for p in layout["pieces"] if p["mask"] == "shore-band-spirit")
    foam.update(mask="shore-band-spirit", maskRectPx=shore_piece["maskRectPx"])
    layout["pieces"].append(foam)

    # Existing placed lava sprites are remapped to the matching flat mask only.
    for old in current["pieces"]:
        if old["group"] not in ["lava-bubble", "lava-steam", "embers"] or old.get("off"):
            continue
        if "lavafall" in old["mask"]:
            continue
        suffix = old["mask"].removeprefix("lava-")
        name = "lava-flat-" + ("west" if suffix == "left" else suffix)
        target = next((p for p in layout["pieces"] if p["mask"] == name), None)
        if target is None:
            continue
        p = dict(old)
        p.update(mask=name, maskRectPx=target["maskRectPx"])
        layout["pieces"].append(p)

    layout["sheets"] = sorted({p["sheet"] for p in layout["pieces"]})
    write_json("fx-layout.json", layout)
    write_json("mask-review.json", {"maskResolution": "2x", "measurements": mask_records,
                                    "semanticOutsidePercentVerified": False,
                                    "explanation": "Reported annotation containment is not an independent semantic leakage estimate."})
    write_json("loop-review.json", {"method": "RGB mean absolute change inside spatial mask, all 8 transitions including 8->1, before encoding",
                                    "frames": loop_records, "visualPlaybackReviewed": False})
    write_json("off-replacements.json", [
        {"old": "waterfall-ice-upper-bridge", "replacement": "ice-stream-flat-upper", "type": "flat water only; sky under bridge excluded"},
        {"old": "waterfall-ice-center-step", "replacement": "ice-stream-flat-central", "type": "flat channel"},
        {"old": "waterfall-ice-plaza-right", "replacement": None, "type": "rock face in v7, keep off"},
        {"old": "waterfall-ice-east-cliff", "replacement": "icefall-east-cliff", "type": "new narrow face west of old misplaced box"},
        {"old": "waterfall-ice-mouth", "replacement": "icefall-mouth", "type": "v7 has twin sloping falls beneath wooden bridge"},
    ])
    print("Built", len(layout["pieces"]), "pieces", len(mask_records), "mask records")


if __name__ == "__main__":
    build()
