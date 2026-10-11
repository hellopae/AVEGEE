"""Rebuild the H5b cover-fx masks for cover-v4 (img/cover-v4-full.png, 1678x937).

Same recipe as the cover-v5 masks: hand-traced regions (coordinates on 1678x937) AND-ed with a
colour test on the full-res art, so only painted lava/fire/crater/soul pixels survive; the
characters/throne are carved out with PROTECTED polygons. Output = 688x384 binary-alpha RGBA
(half of the 1376x768 cover) as img/cover-fx/<kind>-v4-mask.png. Never edits the cover art.
Also writes a preview overlay (argument 1, optional) to eyeball registration.
    python3 scripts/h5b-cover-masks-v4.py [overlay-preview.png]
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
REFERENCE = ROOT / 'img' / 'cover-v4-full.png'
OUT = ROOT / 'img' / 'cover-fx'
W, H = 1376, 768            # working size (colour test runs here, like the v5 recipe)
MW, MH = 688, 384           # shipped mask size
REGIONS = {
 'lava': [
  [(77,492),(202,493),(213,551),(102,553),(105,685),(140,750),(110,765)],
  [(144,610),(282,643),(483,666),(503,831),(620,937),(553,937),(441,898),(296,848),(266,753),(176,704)],
  [(1124,573),(1307,575),(1441,580),(1466,631),(1390,665),(1340,698),(1277,736),(1234,784),(1168,744),(1075,686),(1088,639)],
  [(1182,490),(1239,507),(1262,601),(1189,612)],
  [(1225,421),(1272,427),(1275,491),(1229,473)],
  [(1323,439),(1409,443),(1399,524),(1335,512)],
  [(1488,298),(1540,303),(1523,396),(1485,401)],
  [(1430,628),(1678,613),(1678,736),(1510,738),(1490,687)],
  [(1289,705),(1414,698),(1415,740),(1299,749)],
  [(1460,778),(1678,721),(1678,937),(1532,937),(1510,866)],
 ],
 'fire': [
  [(0,305),(0,227),(52,208),(84,309)],
  [(305,224),(309,161),(345,156),(345,224)],
  [(298,261),(299,231),(321,218),(327,261)],
  [(708,232),(698,151),(735,148),(747,233)],
  [(992,326),(994,290),(1014,285),(1025,326)],
  [(1580,331),(1588,289),(1618,280),(1650,333)],
  [(364,488),(389,495),(413,476),(462,479),(480,506),(498,542),(369,544)],
  [(602,505),(622,487),(651,474),(680,488),(700,465),(713,544),(605,545)],
  [(839,492),(865,496),(890,529),(931,526),(947,498),(969,482),(974,554),(839,551)],
 ],
 'volcano': [[(1039,0),(1250,0),(1298,99),(1265,221),(1241,268),(1189,192),(1142,257),(1075,237),(1036,201),(1126,64)]],
 'soul': [
  [(631,514),(670,514),(681,646),(639,646)],
  [(684,550),(727,551),(743,695),(686,695)],
  [(738,582),(781,580),(805,749),(743,746)],
  [(811,602),(856,603),(915,678),(929,829),(830,825)],
  [(948,635),(1007,635),(1055,709),(1067,887),(949,912)],
  [(1076,673),(1134,673),(1173,732),(1206,924),(1101,937)],
  [(1211,708),(1275,708),(1331,778),(1361,937),(1233,937)],
  [(1380,729),(1444,730),(1518,814),(1537,937),(1392,937)],
  [(1565,780),(1624,778),(1678,824),(1678,937),(1581,937)],
 ],
}
# I2-A: foreground cliff lip above the fifth soul is rock, including orange
# reflected highlights. Do not translate those pixels with the lava texture.
LAVA_ROCK = [[(1040,566),(1160,570),(1150,610),(1125,644),(1090,679),(1060,685),(1030,643)]]
# Foreground envelopes (throne, Yama, ogre, flame kid, guard...) that fire/lava/volcano may never touch.
PROTECTED = [
 [(217,278),(314,278),(368,431),(333,555),(217,557)],
 [(362,76),(626,73),(690,279),(680,453),(384,459)],
 [(483,298),(588,298),(617,560),(488,563)],
 [(695,118),(974,121),(997,453),(980,567),(730,567),(718,478),(677,370)],
 [(966,346),(1094,347),(1110,559),(1086,577),(967,578)],
 [(1320,236),(1428,235),(1451,429),(1328,430)],
]
def scaled(poly): return [(round(x * W / 1678), round(y * H / 937)) for x, y in poly]
def main():
    src = Image.open(REFERENCE).convert('RGB').resize((W, H))
    px = src.load()
    preview = src.convert('RGBA')
    colors = {'lava':(255,70,0), 'fire':(255,220,0), 'volcano':(255,0,180), 'soul':(0,210,255)}
    for kind, polys in REGIONS.items():
        region = Image.new('1', (W, H)); d = ImageDraw.Draw(region)
        for p in polys: d.polygon(scaled(p), fill=1)
        if kind != 'soul':
            for p in PROTECTED + REGIONS['soul']: d.polygon(scaled(p), fill=0)
        torch_px = None
        if kind == 'fire':
            # This torch sits in empty space beside the throne, but the broad
            # character envelope accidentally erased it. Restore its traced
            # flame only, including the tip above the old polygon's flat top.
            d.polygon(scaled(REGIONS['fire'][3]), fill=1)
            torch = Image.new('1', (W, H))
            ImageDraw.Draw(torch).polygon(scaled(REGIONS['fire'][3]), fill=1)
            torch_px = torch.load()
        if kind == 'lava':
            for p in LAVA_ROCK: d.polygon(scaled(p), fill=0)
        rp = region.load()
        mask = Image.new('L', (W, H)); mp = mask.load()
        for y in range(H):
            for x in range(W):
                r, g, b = px[x, y]
                hit = (g > r*1.08 and b > r*1.13 and b > 100) if kind == 'soul' else (r > 165 and r > g*1.12 and g > b*1.3 and g > 48)
                if torch_px is not None and torch_px[x, y]:
                    # Gold/white flame, excluding the red sky in the extra tip room.
                    hit = r > 165 and g > 110 and g > r*.52 and r > g*.98 and b < g*.88
                if rp[x, y] and hit: mp[x, y] = 255
        small = mask.resize((MW, MH), Image.Resampling.NEAREST)   # binary alpha stays exactly 0/255
        out = Image.new('RGBA', (MW, MH), (255, 255, 255, 0)); out.putalpha(small)
        out.save(OUT / f'{kind}-v4-mask.png', optimize=True)
        tint = Image.new('RGBA', (W, H), (*colors[kind], 0))
        tint.putalpha(small.resize((W, H), Image.Resampling.NEAREST).point(lambda a: round(a * .65)))
        preview = Image.alpha_composite(preview, tint)
        print(kind, sum(1 for v in small.tobytes() if v), 'px')
    if len(sys.argv) > 1: preview.save(sys.argv[1])
if __name__ == '__main__': main()
