"""P3 only: normalize eight ImageGen edits and composite costume within source alpha.

Run from repository root: python3 docs/art-reviews/2026-11-20-yama-cyberhell/Y1b-v2-P3/assemble.py
The saved original-sheet.png is the immutable input, never the overwritten game sheet.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
TARGET = ROOT / 'img/yama-sword-weapons/hero-yama-cyberhell-sword-trojan.webp'
SOURCE = Image.open(HERE / 'original-sheet.png').convert('RGBA')

# Rectangles enable only the hat and clothed body, never the detached sword FX.
# Polygons additionally protect the original head, hair, horns and weapon parts.
CONFIG = [
    {'hat': (174,248,330,341), 'body': (120,378,360,572),
     'head': [(174,339),(230,340),(239,298),(257,306),(268,336),(300,337),(314,310),(325,317),(327,344),(321,377),(303,399),(270,405),(226,393),(183,376)],
     'weapon': [(213,477),(218,451),(249,420),(276,400),(297,399),(455,280),(464,311),(299,443),(274,456),(239,482)]},
    {'hat': (176,248,338,340), 'body': (125,387,358,574),
     'head': [(185,337),(232,338),(245,302),(262,311),(270,334),(309,333),(320,305),(329,319),(328,341),(318,365),(303,386),(273,400),(240,399),(204,383),(186,371)],
     'weapon': [(65,220),(96,222),(306,325),(338,333),(383,362),(384,382),(355,385),(329,359),(300,343),(277,337),(166,296)]},
    {'hat': (200,247,342,349), 'body': (130,329,353,574),
     'head': [(237,335),(248,304),(266,338),(304,340),(317,308),(329,319),(331,347),(325,372),(310,392),(286,404),(267,389),(251,367)],
     'weapon': [(169,309),(185,299),(203,300),(237,139),(263,136),(270,160),(229,305),(237,312),(236,330),(215,343),(192,342),(171,335)],
     'extra_protect': [(177,377,204,412)]},
    {'hat': (180,247,342,345), 'body': (125,389,357,574),
     'head': [(192,338),(240,337),(250,302),(267,311),(275,338),(312,339),(324,306),(336,319),(335,348),(326,376),(308,399),(282,408),(245,396),(208,382),(189,367)],
     'weapon': [(266,445),(278,423),(294,411),(299,390),(324,387),(346,405),(359,425),(351,450),(306,452),(287,468),(271,468)]},
    {'hat': (185,247,354,350), 'body': (120,387,370,574),
     'head': [(201,337),(246,337),(259,301),(279,312),(288,341),(325,342),(337,309),(350,325),(349,352),(337,378),(318,402),(293,413),(254,400),(218,385),(198,367)],
     'weapon': [(307,442),(326,440),(346,422),(350,398),(381,399),(388,457),(332,463),(306,465)]},
    {'hat': (180,246,350,348), 'body': (114,387,365,574),
     'head': [(193,334),(243,336),(254,298),(272,311),(281,337),(320,339),(333,307),(348,322),(346,351),(335,378),(318,403),(289,415),(253,401),(213,384),(191,366)],
     'weapon': [(296,446),(322,448),(344,461),(367,470),(383,497),(359,512),(335,498),(320,483),(299,485)]},
    {'hat': (180,246,350,348), 'body': (114,387,365,574),
     'head': [(192,334),(242,336),(253,298),(273,311),(281,337),(320,339),(333,307),(348,322),(346,351),(335,378),(318,403),(289,415),(253,401),(213,384),(191,366)],
     'weapon': [(296,448),(322,450),(345,466),(370,475),(384,504),(357,515),(335,500),(318,488),(298,487)]},
    {'hat': (176,248,334,343), 'body': (120,378,365,572),
     'head': [(176,339),(232,340),(241,298),(259,306),(270,336),(302,337),(316,310),(327,317),(329,344),(323,377),(305,399),(272,405),(228,393),(185,376)],
     'weapon': [(216,478),(221,451),(252,420),(279,400),(300,399),(460,280),(468,311),(303,443),(277,456),(242,483)]},
]


def measure(im):
    alpha = im.getchannel('A')
    bbox = alpha.getbbox()
    # Shoe-only search excludes the detached lower sword trails in frames 6 and 7.
    shoe = alpha.crop((80,500,360,580)).getbbox()
    y = 500 + shoe[3] - 1
    xs = [x for x in range(80,360) if alpha.getpixel((x,y)) > 0]
    return {'bbox': list(bbox), 'bbox_height': bbox[3]-bbox[1],
            'foot': [(min(xs)+max(xs))/2, y],
            'foot_row_x_extent': [min(xs),max(xs)]}


def normalize(raw, original):
    raw = raw.convert('RGBA')
    # ImageGen leaves isolated alpha=1 pixels far outside the sprite. Remove these
    # before measuring; retain the antialiased edge above alpha=4.
    raw.putalpha(raw.getchannel('A').point(lambda x: 0 if x <= 4 else x))
    box = raw.getchannel('A').getbbox()
    obox = original.getchannel('A').getbbox()
    cut = raw.crop(box)
    scale = (obox[3]-obox[1]) / cut.height
    size = (round(cut.width*scale), obox[3]-obox[1])
    cut = cut.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA',(640,640))
    canvas.paste(cut,(obox[0],obox[1]))
    return canvas, {'source_size': list(raw.size), 'source_clean_bbox': list(box),
                    'scale': scale, 'resized_bbox_size': list(size),
                    'placement': [obox[0],obox[1]]}


def costume_mask(original, normalized, config):
    mask = Image.new('L',(640,640))
    draw = ImageDraw.Draw(mask)
    draw.rectangle(config['hat'],fill=255)
    draw.rectangle(config['body'],fill=255)
    draw.polygon(config['head'],fill=0)
    draw.polygon(config['weapon'],fill=0)
    for rect in config.get('extra_protect',[]):
        draw.rectangle(rect,fill=0)
    # Retain all red skin, including hands and horn boundary antialiasing.
    rgb = np.asarray(original).astype(np.int16)
    skin = (rgb[:,:,0] > rgb[:,:,1]*1.3) & (rgb[:,:,0] > rgb[:,:,2]*1.15)
    skin &= rgb[:,:,3] > 0
    # The red/brown boot trim is clothing, not skin; all hands are above y=500.
    skin[500:,:] = False
    skin_mask = Image.fromarray(skin.astype('uint8')*255).filter(ImageFilter.MaxFilter(5))
    mask = ImageChops.subtract(mask,skin_mask)
    mask = ImageChops.multiply(mask,normalized.getchannel('A').point(lambda x:255 if x>=128 else 0))
    # Do not paint the transparent source canvas, even if the generation grew.
    return ImageChops.multiply(mask,original.getchannel('A').point(lambda x:255 if x else 0))


def main():
    for folder in ['frames','masks','normalized']:
        (HERE/folder).mkdir(exist_ok=True)
    final_sheet = Image.new('RGBA',SOURCE.size)
    report=[]
    for index, config in enumerate(CONFIG,1):
        old=SOURCE.crop(((index-1)*640,0,index*640,640))
        gen=Image.open(HERE/'generated'/f'{index:02}.png')
        normalized, transform=normalize(gen,old)
        mask=costume_mask(old,normalized,config)
        new=Image.composite(normalized,old,mask)
        # Costume-only edit: keep source alpha, hence the silhouette and feet.
        new.putalpha(old.getchannel('A'))
        new.save(HERE/'frames'/f'{index:02}.png')
        mask.save(HERE/'masks'/f'{index:02}.png')
        normalized.save(HERE/'normalized'/f'{index:02}.png')
        final_sheet.paste(new,((index-1)*640,0))
        before,after=measure(old),measure(new)
        report.append({'frame':index,'original':before,'final':after,'transform':transform})
    final_sheet.save(TARGET,format='WEBP',lossless=True,method=6,exact=True)
    # Verify the actual encoded game asset, not just the in-memory canvas.
    encoded=Image.open(TARGET)
    assert encoded.size==(5120,640) and encoded.mode=='RGBA'
    assert np.array_equal(np.asarray(encoded),np.asarray(final_sheet))
    for row in report:
        i=row['frame'];old=SOURCE.crop(((i-1)*640,0,i*640,640))
        new=encoded.crop(((i-1)*640,0,i*640,640))
        mask=np.asarray(Image.open(HERE/'masks'/f'{i:02}.png'))>0
        oa,na=np.asarray(old),np.asarray(new)
        row['height_error_percent']=round(abs(row['final']['bbox_height']/row['original']['bbox_height']-1)*100,4)
        row['foot_delta_px']=[row['final']['foot'][j]-row['original']['foot'][j] for j in range(2)]
        row['alpha_identical']=bool(np.array_equal(oa[:,:,3],na[:,:,3]))
        row['protected_rgba_identical']=bool(np.array_equal(oa[~mask],na[~mask]))
        row['changed_opaque_pixels']=int(np.count_nonzero(np.any(oa!=na,axis=2)&(oa[:,:,3]>0)))
        assert row['height_error_percent']<=2
        assert max(abs(v) for v in row['foot_delta_px'])<=2
        assert row['alpha_identical'] and row['protected_rgba_identical']
        assert row['changed_opaque_pixels']>0
    validation={'scope':'P3 only','asset':str(TARGET.relative_to(ROOT)),
                'sheet_size':list(encoded.size),'mode':encoded.mode,'cell_size':[640,640],
                'grid':[8,1],'frame_count':8,'imagegen_attempts':12,
                'imagegen_outputs':8,'orchestration_attempts_without_output':4,'pose_retries':0,
                'measurement':'alpha > 0; bbox exclusive right/bottom; foot is midpoint of min/max occupied x on lowest shoe row in x=[80,360), y=[500,580); excludes sword FX',
                'source_sha256':hashlib.sha256((HERE/'original-sheet.png').read_bytes()).hexdigest(),
                'output_sha256':hashlib.sha256(TARGET.read_bytes()).hexdigest(),
                'frames':report,'visual_approval':'Not asserted; compare.jpg and GIF provided for review'}
    (HERE/'validation.json').write_text(json.dumps(validation,indent=2)+'\n')
    make_previews(encoded)
    print(json.dumps({'size':list(encoded.size),'mode':encoded.mode,'frames':len(report),
                      'height_error_percent':[r['height_error_percent'] for r in report],
                      'foot_delta_px':[r['foot_delta_px'] for r in report]},indent=2))


def panel(old,new,index,size=480):
    canvas=Image.new('RGB',(size*2,size+28),'#303342')
    for im,x in [(old,0),(new,size)]:
        sprite=im.resize((size,size),Image.Resampling.LANCZOS)
        canvas.paste(sprite,(x,28),sprite)
    d=ImageDraw.Draw(canvas)
    d.text((12,8),f'ORIGINAL - {index:02}',fill='white')
    d.text((size+12,8),f'P3 COSTUME - {index:02}',fill='white')
    return canvas


def make_previews(encoded):
    comparison=Image.new('RGB',(1280,8*668),'#303342')
    animation=[]
    for i in range(8):
        old=SOURCE.crop((640*i,0,640*(i+1),640))
        new=encoded.crop((640*i,0,640*(i+1),640))
        comparison.paste(panel(old,new,i+1,640),(0,668*i))
        animation.append(panel(old,new,i+1))
    comparison.save(HERE/'compare.jpg',quality=94,subsampling=0)
    animation[0].save(HERE/'hero-yama-cyberhell-sword-trojan-compare.gif',
                      save_all=True,append_images=animation[1:],duration=[160,100,100,90,100,100,100,200],loop=0,disposal=2)


if __name__=='__main__':
    main()
