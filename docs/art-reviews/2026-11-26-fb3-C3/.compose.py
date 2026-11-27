from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

review = Path(__file__).parent
reference_dir = Path('/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Claudy/2026-11-26-avegee-feedback/input/event')

board = Image.new('RGB', (1600, 820), '#24212b')
draw = ImageDraw.Draw(board)
tag = ImageFont.truetype('/Library/Fonts/SourceCodePro-Semibold.ttf', 19)
with Image.open(review / '.thai-labels.png') as labels:
    board.paste(labels, (0, 0), labels.convert('RGBA').getchannel('A'))
draw.text((1556, 52), 'FB3-C3', font=tag, fill='#d6ac6e', anchor='rm')
draw.line((44, 105, 1556, 105), fill='#4b4353', width=1)

def place_sprite(path, panel, accent):
    left, top, right, bottom = panel
    tile = 29
    for row, y in enumerate(range(top, bottom, tile)):
        for column, x in enumerate(range(left, right, tile)):
            tone = ('#6f697b', '#756f81')[(row + column) % 2]
            draw.rectangle((x, y, min(x+tile, right)-1, min(y+tile, bottom)-1), fill=tone)
    draw.rectangle((left, top, right-1, bottom-1), outline=accent, width=2)
    with Image.open(path) as sprite:
        rgba = sprite.convert('RGBA')
        alpha = rgba.getchannel('A')
        x0, y0, x1, y1 = alpha.point(lambda level: 255 if level >= 8 else 0).getbbox()
        bounds = (max(0, x0-4), max(0, y0-4), min(rgba.width, x1+4), min(rgba.height, y1+4))
        scaled = ImageOps.contain(rgba.crop(bounds), (right-left-48, 558), method=Image.Resampling.LANCZOS)
        x = left + (right-left-scaled.width)//2
        board.paste(scaled, (x, bottom-27-scaled.height), scaled)

place_sprite(Path('img/z4-events/col-s10.webp'), (44, 173, 506, 775), '#8a8194')
place_sprite(review / 'lucifer-design-v1.webp', (524, 173, 1159, 775), '#d6ac6e')

draw.rectangle((1177, 173, 1555, 774), fill='#2e2935', outline='#514858', width=2)
draw.line((1193, 474, 1540, 474), fill='#514858')
for name, top, bottom in [('c1', 184, 466), ('c2', 482, 764)]:
    draw.text((1199, top+14), name, font=tag, fill='#d6ac6e')
    with Image.open(reference_dir / f'{name}.png') as ref:
        scaled = ImageOps.contain(ref.convert('RGB'), (300, 265), method=Image.Resampling.LANCZOS)
        x = (1177+1556-scaled.width)//2
        y = (top+bottom-scaled.height)//2
        board.paste(scaled, (x, y))

for quality in (90, 88, 85, 82, 79, 76):
    out = BytesIO()
    board.save(out, format='JPEG', quality=quality, optimize=True, progressive=True, subsampling=0)
    if out.tell() <= 300_000:
        (review / 'compare.jpg').write_bytes(out.getvalue())
        print(board.size, out.tell(), 'bytes')
        break
else:
    raise RuntimeError('Comparison sheet exceeds 300 KB')
