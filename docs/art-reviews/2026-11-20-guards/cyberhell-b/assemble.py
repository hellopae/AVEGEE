"""Asset-only, reproducible cutout/compositing and sheet validation; no game code edits."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[3]
OUT = ROOT / 'prepared'
OUT.mkdir(exist_ok=True)

def polygon(size, points):
    m = Image.new('L', size)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return m

def cutout(im, clean_alpha=False):
    im = im.convert('RGBA')
    a = np.array(im)
    if clean_alpha:
        mask = (a[:,:,3] >= 150).astype('uint8')
    else:
        # Bright metal and cyan are definite foreground; infer the dark joints
        # through GrabCut rather than treating every dark pixel as background.
        bright = (a[:,:,:3].max(2) > 90).astype('uint8')
        near = cv2.dilate(bright, np.ones((19,19),np.uint8))
        labels = np.where(near, cv2.GC_PR_FGD, cv2.GC_BGD).astype('uint8')
        labels[cv2.erode(bright,np.ones((3,3),np.uint8)) > 0] = cv2.GC_FGD
        cv2.grabCut(a[:,:,:3].copy(), labels, None, np.zeros((1,65)), np.zeros((1,65)), 4, cv2.GC_INIT_WITH_MASK)
        mask = ((labels == cv2.GC_FGD) | (labels == cv2.GC_PR_FGD)).astype('uint8')
    mask = cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    n, cc, stats, _ = cv2.connectedComponentsWithStats(mask)
    keep = np.where(stats[:,cv2.CC_STAT_AREA] >= 700)[0]
    keep = keep[keep != 0]
    mask = np.isin(cc,keep).astype('uint8')
    # Recover a narrow dark ink outline; retain holes between arms and torso.
    mask = cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    mask = cv2.dilate(mask,np.ones((3,3),np.uint8))
    a[:,:,3] = mask * 255
    a[a[:,:,3] == 0,:3] = 0
    return Image.fromarray(a)

# Reuse the generated correct cyan device, never synthesize replacement text.
device_source = Image.open(ROOT/'generated/combat-00.png').convert('RGBA')
device_source.putalpha(polygon(device_source.size,[(544,657),(820,657),(840,680),(793,738),(504,738),(487,718)]))
DEVICE = device_source.crop((487,656,841,741))

PATCHES = {
 'combat-03': ([(881,498),(1169,476),(1171,712),(881,740)], [[(847,481),(890,468),(964,472),(986,505),(969,537),(934,543),(892,533),(867,547)],[(852,689),(885,682),(939,704),(956,728),(944,752),(900,764),(859,743)]]),
 'combat-04': ([(111,416),(346,331),(414,546),(152,619)], [[(112,418),(133,390),(173,366),(211,371),(219,403),(195,426),(147,465),(118,470)],[(130,543),(170,542),(205,563),(216,603),(201,631),(156,621),(132,593)]]),
 'combat-06': ([(440,858),(702,968),(625,1137),(365,1031)], [[(348,852),(375,826),(409,845),(444,891),(441,920),(417,940),(385,927),(356,909)]]),
 'combat-07': ([(345,963),(668,959),(665,1130),(342,1129)], [[(318,959),(342,947),(378,959),(404,1008),(389,1054),(365,1071),(325,1053),(308,1021)],[(648,951),(677,955),(689,995),(681,1039),(659,1067),(641,1047),(640,997)]]),
 'walk-00': ([(533,572),(730,527),(746,764),(551,785)], [[(723,650),(755,654),(779,674),(776,725),(758,755),(729,765),(711,744),(711,683)]]),
 'walk-01': ([(669,431),(858,377),(871,634),(671,645)], [[(850,529),(874,525),(895,541),(897,586),(882,617),(856,626),(836,607),(836,550)]]),
 'walk-02': ([(288,641),(497,606),(510,802),(264,804)], [[(314,785),(349,768),(378,767),(409,792),(404,822),(368,847),(335,855),(310,834)]]),
 'walk-03': ([(644,549),(844,497),(845,809),(618,814)], [[(803,646),(836,646),(859,667),(862,714),(848,750),(821,766),(798,747),(790,697)]]),
}

def patch_device(im, quad, hands):
    original = im.copy()
    erase = polygon(im.size,quad).filter(ImageFilter.MaxFilter(11))
    alpha = np.array(im.getchannel('A'))
    alpha[np.array(erase)>0] = 0
    im.putalpha(Image.fromarray(alpha))
    transform = cv2.getPerspectiveTransform(np.float32([[0,0],[353,0],[353,84],[0,84]]),np.float32(quad))
    warped = cv2.warpPerspective(np.array(DEVICE),transform,im.size,flags=cv2.INTER_CUBIC)
    im.alpha_composite(Image.fromarray(warped))
    for points in hands:
        m = polygon(im.size,points)
        m = Image.fromarray(np.minimum(np.array(m),np.array(original.getchannel('A'))))
        hand = original.copy(); hand.putalpha(m); im.alpha_composite(hand)
    return im

def prepare():
    for path in (ROOT/'generated').glob('*.png'):
        if path.stem == 'idle-00':
            continue # rejected: wrong character; use approved same-pose identity below
        im = cutout(Image.open(path),path.stem in ['combat-00','combat-01','combat-02'])
        if path.stem == 'combat-06':
            a = np.array(im); a[230:390,445:565,3] = 0; im=Image.fromarray(a)
        if path.stem in PATCHES:
            im = patch_device(im,*PATCHES[path.stem])
        im.save(OUT/path.name)
    reference = REPO/'docs/art-reviews/2026-11-20-guard-designs/guard-watson03-cyberhell-v1.webp'
    cutout(Image.open(reference)).save(OUT/'idle-00.png')

if __name__ == '__main__':
    prepare()
