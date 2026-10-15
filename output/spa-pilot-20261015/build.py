"""Isolated animation assembly; no changes to the game or its source artwork."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math, struct, zlib

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
SOURCE = ROOT / 'img/yama-sword-v3/hero-yama-th-sword.webp'
sheet = Image.open(SOURCE).convert('RGBA')
assert sheet.size == (5120, 640)
frames = [sheet.crop((i*640, 0, (i+1)*640, 640)) for i in range(8)]
durations = [85, 80, 60, 35, 40, 80, 100, 100]
sheet.save(OUT / 'attack-sheet.png')
frames[0].save(OUT / 'idle.png')
(OUT / 'frames').mkdir(exist_ok=True)
for i, frame in enumerate(frames):
    frame.save(OUT / 'frames' / f'attack-{i:02}.png')

# Prepare a native-format candidate. This is NOT an Aseprite/SPA-verified export.
# Format: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
def chunk(kind, data): return struct.pack('<IH', len(data)+6, kind)+data
name = b'Yama existing attack poses'
layer = chunk(0x2004, struct.pack('<6HB3xH', 3,0,0,0,0,0,255,len(name))+name)
blocks=[]
for i, (frame, duration) in enumerate(zip(frames, durations)):
    cel = chunk(0x2005, struct.pack('<HhhBHh5xHH',0,0,0,255,2,0,640,640)+zlib.compress(frame.tobytes()))
    payload = (layer if i == 0 else b'')+cel
    count = 2 if i == 0 else 1
    blocks.append(struct.pack('<IHHH2xI',16+len(payload),0xF1FA,count,duration,count)+payload)
header = bytearray(128)
struct.pack_into('<IHHHHHIH',header,0,128+sum(map(len,blocks)),0xA5E0,8,640,640,32,1,85)
header[34:36] = b'\x01\x01'
native = bytes(header)+b''.join(blocks)
(OUT/'yama-attack-candidate.aseprite').write_bytes(native)
# Binary structure/pixel check only; native application compatibility is pending.
offset=128
for i, frame in enumerate(frames):
    size, magic, count, duration = struct.unpack_from('<IHHH',native,offset)
    assert magic==0xF1FA and duration==durations[i]
    pos=offset+16
    for _ in range(count):
        length,kind=struct.unpack_from('<IH',native,pos)
        if kind==0x2005:
            assert zlib.decompress(native[pos+26:pos+length])==frame.tobytes(), i
        pos+=length
    assert pos==offset+size
    offset+=size
assert offset==len(native)

preview=[]
for frame in frames:
    bg=Image.new('RGBA',(640,640),'#171b2a')
    d=ImageDraw.Draw(bg); d.ellipse((120,550,360,590),fill='#10131d')
    bg.alpha_composite(frame)
    preview.append(bg.resize((400,400),Image.Resampling.LANCZOS).convert('RGB'))
preview[0].save(OUT/'attack-preview.gif',save_all=True,append_images=preview[1:],duration=[650]+durations[1:],loop=0)
contact=Image.new('RGB',(1280,640),'#171b2a')
for i, frame in enumerate(preview): contact.paste(frame.resize((320,320)),((i%4)*320,(i//4)*320))
contact.save(OUT/'contact.jpg')
metadata={
    'generator':'Python/Pillow assembly; NOT exported by SPA',
    'source':str(SOURCE.relative_to(ROOT)),
    'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'sheet':{'file':'attack-sheet.png','width':5120,'height':640},
    'anchor':{'x':240,'y':570},'bodyHeight':355,
    'frames':[{'file':f'frames/attack-{i:02}.png','x':i*640,'y':0,'w':640,'h':640,'duration_ms':ms} for i,ms in enumerate(durations)],
    'duration_ms':sum(durations),
    'checks':{'source_dimensions':True,'binary_pixels_roundtrip':True,'binary_timing_roundtrip':True,'aseprite_runtime_verified':False},
}
(OUT/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
print(json.dumps({'frames':8,'duration_ms':sum(durations),'source_hash':metadata['source_sha256'],'binary_check':'pixel + duration roundtrip passed; native verification pending'},indent=2))
