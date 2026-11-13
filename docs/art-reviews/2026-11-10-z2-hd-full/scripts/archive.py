"""Archive built-in ImageGen PNGs losslessly; JSON records supplied on argv[1]."""
from pathlib import Path
import hashlib, json, sys
from PIL import Image
OUT=Path(__file__).resolve().parents[1]

if __name__=='__main__':
    path=OUT/'generation-prompts.json'
    manifest=json.loads(path.read_text()) if path.exists() else dict(tool='built-in image_gen.imagegen',plannedCount=16,generations=[])
    for item in json.loads(sys.argv[1]):
        if any(g['chunk']==item['chunk'] and g['id']==item['id'] for g in manifest['generations']):
            continue
        raw=Image.open(item['nativeFile']).convert('RGB')
        dest=OUT/item['chunk']/f"{item['id']}-native.webp"
        raw.save(dest,lossless=True,method=6)
        item.update(nativeSize=list(raw.size),decodedRgbSha256=hashlib.sha256(raw.tobytes()).hexdigest(),archivedNative=str(dest.relative_to(OUT)),archivedReferenceImages=[f"{item['chunk']}/inputs/{item['id']}-v2.webp"],selectedNative=True,attempt=1)
        if Image.open(dest).convert('RGB').tobytes()!=raw.tobytes():
            raise RuntimeError(f'Lossless roundtrip mismatch: {dest}')
        manifest['generations'].append(item)
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f"Archived {len(manifest['generations'])}/16 natives")
