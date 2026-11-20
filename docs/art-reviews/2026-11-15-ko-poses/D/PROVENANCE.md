# D cyberhell — ImageGen provenance

Built-in ImageGen only; eight individual calls, one per character, transparent_background=true. Every call attached the corresponding crop of the original cyberhell combat sprite. No Shado or external image API.

References: Yama `img/yama-animation-v1/cyberhell/sword-idle.webp`, first 640×640 cell (actual sheet is 3840×640, six cells). Crew `img/crew-combat-v1/cyberhell/<key>.webp`, first 384×512 cell of the original 4×2 combat sheet. Nira `img/nira-idle-v1/cyberhell.webp`, first 256×512 cell.

Postprocessing: discard alpha≤1 residue outside visible artwork, crop alpha bounds, resample uniformly with Lanczos (no rotation or nonuniform scaling), center on transparent 640×320, place visible bottom at approximately y=272, encode lossless WebP. Width settings: yama 290, taan 300, kan 355, dam 370, boon 365, plerng 395, guard 355, nira 350. These are raster bounds settings; body-axis measurements are separately listed in README. Checkerboard appears only in contact-sheet.jpg.

Contact sheet: delivered KO images shown at 1:1. Standing references resized uniformly to the upper standing bodyHeight in the brief for comparison (311,329,383,389,389,421,374,381 respectively); no source sprites modified.

## yama

Use case: identity-preserve. Create ONE game knockout sprite of exactly the supplied cyberhell Yama. Reference is original standing combat sprite, identity/costume/style lock. Red small demon, two red horns, pointed ears, black peaked officer cap with faceted purple silver badge, charcoal officer long coat with lavender silver trim, black boots, silver lavender sword. Draw a NEW anatomically relaxed unconscious pose lying flat on his back slightly on side, NOT a rotated standing image: head at LEFT, feet extend RIGHT, eyes fully CLOSED, arms dropped limp, knees relaxed, sword lying alongside near hand. Keep precise original face proportions, horns, clothing colors, outlines and shaded chibi sprite rendering. Slightly overhead 3/4 battle camera. Single complete character centered horizontally in wide 2:1 canvas. Head to feet nearly horizontal; generous transparent margins all sides. No background, no floor, no separate shadow, no text, no frame, no extra characters, no blood or wounds. Do not draw stars. Actual transparent alpha background. Final will be resampled into 640x320 with body length 296px; maximize source clarity.

## taan

Use case: identity-preserve. Create ONE game knockout sprite of exactly cyberhell Taan in the attached original combat sprite (identity, outfit and art style reference). Red-skinned bulky demon bruiser, grey-white topknot and shaved side hair, pointed ears, two lower tusks, orange bronze rounded shoulder armor, heavy dark mechanical forearms, orange brown chest plate and belt, orange sash, dark brown trousers, armored open-toed sandals; short glowing cyan energy blade. Draw a NEW unconscious relaxed pose lying flat on back slightly side-turned, not a rotated standing sprite. Head LEFT, feet RIGHT; eyes fully CLOSED; arms dropped naturally, legs relaxed and extended, cyan energy blade laid beside loose hand. Same chibi body proportions and original shaded outlined game sprite rendering; no realistic adult anatomy. Slight overhead 3/4 camera. Single complete figure centered on wide 2:1 canvas with transparent margins. No text, no blood, no wounds, no floor, no detached shadow, no stars. Actual alpha transparency. Final resampled to 640x320 with head-to-foot length 313px.

## kan

Use case: identity-preserve. Create ONE unconscious knockout game sprite of precisely cyberhell Kan shown in the reference combat sprite. Keep original dark blue indigo skin, pointed elf ears, long navy ponytail with high bun, cyan glowing ROUND eyeglasses, dark navy fitted technological full armor with rounded pauldrons elbow and knee plates, gloves and boots, handheld small rectangular smartphone terminal. Keep exact original chibi face, costume, colors, proportions and shaded outlined slightly pixel-textured sprite style. NEW fully reclined unconscious pose lying on back slightly on side. HEAD LEFT, FEET RIGHT, body nearly horizontal, eyes CLOSED underneath transparent round glasses, arms limp at sides, both legs relaxed extended, terminal rests beside loose hand. Do not simply rotate the standing pose. Slightly overhead 3/4 battle camera. One character alone centered with clear transparent space all around on a wide 2:1 canvas. Actual transparent alpha. No scenery, no floor, no separate shadow, no letters or symbols or watermark, no blood, no wounds, no stars. Final will be 640x320 with body head-to-toes length 365px.

## dam

Use case: identity-preserve. Create ONE unconscious knockout game sprite of cyberhell Dam, exactly the original combat sprite in reference. Same tiny charcoal-black armored BAT demon character: very long triangular bat ears built into black patched metal helmet, round half-lidded eyes now FULLY CLOSED, small brown bat nose, tiny fangs, small dark leathery bat wings attached behind arms, black patched segmented body armor, utility belt, black clawed feet; small grey metal rectangular hammer and metal bucket holding sparkling blue-white material. Preserve exact head proportions, original face silhouette, costume, wings, accessories and original shaded outlined slightly pixel-textured chibi game sprite style. Draw a NEW naturally limp unconscious pose lying on back slightly on side: HEAD at LEFT, legs/feet extended RIGHT, ears resting leftward, arms relaxed down, hammer and bucket resting on their sides beside loose hands. NOT a rotated standing sprite. Slight overhead 3/4 battle camera. One full character centered wide 2:1 canvas with ample transparent margin. Actual transparent alpha; no scene/floor/shadow outside body, no blood/wounds, no letters or text, no stars, no added accessories. Final will be 640x320 with visible head including ears to feet length 371px.

## boon

Use case: identity-preserve. Create ONE knockout game sprite of EXACTLY cyberhell Boon from the attached standing combat sprite. A small gentle bald pale mint-green CYBORG monk, cyan circuit seams across bald scalp, dark metal implant on side of head and round mechanical earpiece, small closed eyelids, subtle rosy cheeks, bright CYAN BLUE wrapped monk robe with wide sleeves and dark waist belt, metallic segmented hands and feet, peach pink lotus emblem/object at chest. Preserve original cute large bald head and chibi proportions, robe silhouette/colors, face, cybernetic details, original outlined shaded slightly pixel-textured sprite style. Draw a NEW naturally limp unconscious pose lying fully on back slightly on side, HEAD LEFT, FEET RIGHT, eyes fully CLOSED, arms resting beside torso, legs relaxed extended rightward under blue robe, peach lotus resting beside loose hand or on chest. Not a rotated standing sprite; no raised prayer/combat hands. Slightly overhead 3/4 battle camera. One complete character centered on wide 2:1 canvas with transparent margins. Actual alpha transparency. No background/floor, no detached cast shadow, no text, no stars, no blood or wounds. Final canvas 640x320; head to feet length about 371px.

## guard

Use case: identity-preserve. ONE knockout game sprite of precisely cyberhell Guard from attached original standing combat sprite. Same bulky chibi dark grey-purple yaksha gate guardian, two red-orange horns with gold bases, black swept-back topknot, golden circular halo-like mechanical crown behind head with cyan blue gems, one bright CYAN circular cybernetic eye lens and other natural eye now CLOSED, two small ivory tusks, heavy engraved black-and-GOLD Thai yaksha armor with cyan glowing inlays and joints, red waist sash and gold patterned center panel, plated sandals showing grey toes. Same ornate long black/gold staff with a broad circular CYAN HEXAGON/HONEYCOMB luminous mace head. Preserve exact original face, body proportions, costume details and colors, original outlined shaded slightly pixel-textured sprite style. Draw a NEW naturally limp unconscious pose lying fully on back slightly on side, HEAD LEFT, FEET RIGHT, crown resting behind head, natural eye fully CLOSED, arms dropped and relaxed, legs relaxed extended rightwards. Lay staff horizontally beside lower side of body, loose hand near shaft, keep it within head-to-feet horizontal extent as much as possible. Not a rotated standing sprite. Slight overhead 3/4 battle camera. Single full character centered wide 2:1 canvas, ample transparent margins. Actual alpha transparency. No background/floor/detached shadow, no text, no blood/wounds, no stars. Final 640x320; visible crown/head to toes length about 356px.

## nira

Use case: identity-preserve. ONE unconscious knockout game sprite of cyberhell Nira, exactly the supplied original standing sprite identity, costume and style. Small chibi female purple-grey skinned demon clerk, two short pale grey-lavender horns on forehead, purple-grey hair swept back into high round bun with thin gold band, pointed ears, dark charcoal long formal coat with grey-lilac edging, small gold round buttons, bronze/gold woven lattice pattern down front skirt panel, dark rounded shoulder pads, grey stockings and small black shoes. Her prop is a thick stack of tan parchment/book-like folded records with a small metallic joystick lever on top. Preserve original face/head silhouette, hair, exact costume colors and original outlined shaded pixel-textured chibi game sprite style; no redesign. Draw a NEW fully reclined unconscious pose lying on back slightly on side: HEAD LEFT, FEET RIGHT, eyes fully CLOSED, arms down relaxed beside body, legs extended relaxed toward right; record stack and its joystick resting beside loose hand. Not a rotated standing sprite, not hugging records in an upright pose. Slightly overhead 3/4 battle camera. Single complete figure centered wide 2:1 canvas with generous transparent space all around. Actual transparent alpha. No background or floor or detached cast shadow, no text on records or anywhere, no stars, no blood/wounds. Final will be 640x320 with visible head/bun to feet length about 362px.

## Body-axis measurement probes

Coordinates in the final 640×320 image; origin at top left. Visually checked: left endpoint belongs to head/headgear/ear and right endpoint to a foot. Length is Euclidean distance, an approximate reclining axis rather than a curved anatomical centerline. Each sampled point has alpha≥128.

| key | head x,y | foot x,y | length px |
|---|---|---|---:|
| yama | (177, 189) | (462, 219) | 286.6 |
| taan | (173, 104) | (466, 179) | 302.4 |
| kan | (144, 144) | (492, 200) | 352.5 |
| dam | (137, 181) | (502, 161) | 365.5 |
| boon | (139, 153) | (499, 199) | 362.9 |
| plerng | (124, 118) | (514, 184) | 395.5 |
| guard | (144, 160) | (493, 190) | 350.3 |
| nira | (148, 103) | (491, 197) | 355.6 |

## Verification record

Python/Pillow assertions completed with exit code 0 for all eight delivered files: names, 640×320, RGBA, alpha extrema (0,255), transparent outer 12-pixel border, centered visible bounds (≤1px), lossless VP8L encoding, opaque measurement endpoints, and all eight body-axis estimates inside the requested ranges. Minimum actual transparent margin: 38px. Contact sheet: 2048×2080 JPEG.

An initial body-probe assertion caught an averaged endpoint in a transparent gap at Yama’s feet; probes were moved to the nearest actual opaque edge before the successful rerun. No artwork change was needed for that measurement correction. Visual comparison was performed against the full completed contact sheet. No in-game test or QA approval was performed.

Reproduce from the worktree root (read-only checks):

```python
from PIL import Image
from pathlib import Path
import math
root=Path('docs/art-reviews/2026-11-15-ko-poses/D')
keys=['yama','taan','kan','dam','boon','plerng','guard','nira']
folder=root/'img/ko-pose-v1/cyberhell'
assert {p.stem for p in folder.glob('*.webp')}==set(keys),'missing/extra character'
print('key | size/mode | alpha | visible bbox | min margin | visible width | lossless')
for k in keys:
 p=folder/f'{k}.webp'; im=Image.open(p);im.load()
 assert im.size==(640,320) and im.mode=='RGBA',(k,im.size,im.mode)
 a=im.getchannel('A');assert a.getextrema()==(0,255),(k,'alpha')
 l,t,r,b=a.getbbox();margin=min(l,t,640-r,320-b)
 assert margin>=12,(k,'margin',margin)
 assert abs((l+r)/2-320)<=1,(k,'horizontal centering')
 assert a.crop((0,0,640,12)).getbbox() is None
 assert a.crop((0,308,640,320)).getbbox() is None
 assert a.crop((0,0,12,320)).getbbox() is None
 assert a.crop((628,0,640,320)).getbbox() is None
 data=p.read_bytes();assert data[:4]==b'RIFF' and data[8:12]==b'WEBP'
 assert b'VP8L' in data[:64],(k,'not lossless WebP')
 print(k,im.size,im.mode,a.getextrema(),(l,t,r,b),margin,r-l,'VP8L')
print('contact',Image.open(root/'contact-sheet.jpg').size)
assert (root/'README.md').is_file()
print('Metadata assertions: 8 files checked. Visual and game review remain separate.')

# These opaque-edge endpoints were visually checked to belong to headgear/head
# and feet, rather than props. Distances approximate the body's reclining axis.
probes={
 'yama':((177,189),(462,219),(280,311)),
 'taan':((173,104),(466,179),(296,329)),
 'kan':((144,144),(492,200),(345,383)),
 'dam':((137,181),(502,161),(350,389)),
 'boon':((139,153),(499,199),(350,389)),
 'plerng':((124,118),(514,184),(379,421)),
 'guard':((144,160),(493,190),(337,374)),
 'nira':((148,103),(491,197),(343,381)),
}
for k,(head,foot,(lo,hi)) in probes.items():
 a=Image.open(folder/f'{k}.webp').getchannel('A')
 assert a.getpixel(head)>=128 and a.getpixel(foot)>=128,(k,'endpoint outside opaque artwork')
 length=math.dist(head,foot);assert lo<=length<=hi,(k,length,lo,hi)
 print(k,'axis estimate',round(length,1),'requested',(lo,hi),'points',head,foot)
```
