"""Extract the three requested reference crops using the existing repaired baseline."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys

from PIL import Image

sys.dont_write_bytecode = True
OUT = Path(__file__).resolve().parents[1]
ROOT = OUT.parents[2]
BASE = Path('/Users/agapae/agapae-work/.codex-worktrees/20261110T115811Z-6ad6e037/docs/art-reviews/2026-11-05-z1-v5-hd-assemble')
IDS = ['lava-low-stair', 'south-plaza-stair', 'pier-stair']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def atlas_crop(box):
    x0, y0, x1, y1 = [v * 2 for v in box]
    result = Image.new('RGB', (x1 - x0, y1 - y0))
    for r in range(y0 // 2048 + 1, (y1 - 1) // 2048 + 2):
        for c in range(x0 // 2048 + 1, (x1 - 1) // 2048 + 2):
            with Image.open(BASE / f'v7/r{r}-c{c}.webp') as chunk:
                result.paste(chunk, ((c - 1) * 2048 - x0, (r - 1) * 2048 - y0))
    return result


if __name__ == '__main__':
    inventory = json.loads((BASE / 'inventory.json').read_text())
    inputs = []
    for item in inventory['baselineInputs']:
        actual = sha(ROOT / item['path'])
        assert actual == item['sha256'], item['path']
        inputs.append(dict(item, matchesAssemblyInput=True))
    spec = importlib.util.spec_from_file_location('original_assemble', BASE / 'scripts/assemble.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.ROOT = ROOT
    old = module.baseline()
    for item in inventory['fallbackPatches']:
        name = item['id']
        if name not in IDS:
            continue
        folder = OUT / name
        folder.mkdir(exist_ok=True)
        box = item['contextRectPx1x']
        old.crop(box).save(folder / 'reference-1x.png')
        atlas_crop(box).save(folder / 'assembled-before.webp', lossless=True)
        for prefix in ['', 'before-']:
            shutil.copyfile(BASE / f'fallback-check/{prefix}{name}.jpg', folder / f'fallback-{prefix or "final-"}comparison.jpg')
        write(folder / 'input.json', dict(id=name, coreRectPx1x=item['core'], contextRectPx1x=box,
              rectangleConvention='[x0,y0,x1,y1], half-open, master map 4915x3277',
              reason=item['reason'], referenceSha256=sha(folder / 'reference-1x.png'),
              assembledBeforeSha256=sha(folder / 'assembled-before.webp')))
    write(OUT / 'provenance.json', dict(base=str(BASE), baselineInputs=inputs,
          sourceFiles=[dict(path=str(BASE / name), sha256=sha(BASE / name))
                       for name in ['README.md', 'inventory.json', 'structure.json', 'scripts/assemble.py', 'scripts/verify.py']],
          generationTool='built-in image_gen', plannedGenerations=3, fullPx=[9830,6554], chunk=2048))
