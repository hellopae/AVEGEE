from pathlib import Path
from PIL import Image
import sys,json,hashlib
R=Path(__file__).resolve().parents[1];ident,src=sys.argv[1:3];native=Image.open(src);nativeMode=native.mode;im=native.convert('RGBA');out=R/'sources'/f'{ident}.webp';im.save(out,quality=92,method=4,exact=True)
p=R/'generation-records.json';records=json.loads(p.read_text()) if p.exists() else [];records=[x for x in records if x['id']!=ident];records.append({'id':ident,'tool':'built-in image_gen','nativeSize':list(im.size),'nativeMode':nativeMode,'originalSha256':hashlib.sha256(Path(src).read_bytes()).hexdigest(),'savedFile':str(out.relative_to(R)),'alphaExtrema':list(im.getchannel('A').getextrema())});p.write_text(json.dumps(records,indent=2));print(ident,im.size,out.stat().st_size)
