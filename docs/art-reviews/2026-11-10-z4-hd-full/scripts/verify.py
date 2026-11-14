"""Check deliverable presence, decoding and dimensions. No art-quality decision."""
import json
from pathlib import Path
from PIL import Image
from prepare import OUT, CHUNKS, bounds


def main():
    errors = []
    checked = []
    def check_json(path):
        try:
            value = json.loads(path.read_text())
            checked.append(str(path.relative_to(OUT)))
            return value
        except (OSError, ValueError) as error:
            errors.append(f'{path.relative_to(OUT)}: {error}')
            return None
    def check_image(path, expected):
        try:
            with Image.open(path) as image:
                image.load()
                if expected is not None and image.size != tuple(expected):
                    errors.append(f'{path.relative_to(OUT)}: size {image.size}, expected {expected}')
                checked.append(str(path.relative_to(OUT)))
        except (OSError, ValueError) as error:
            errors.append(f'{path.relative_to(OUT)}: {error}')
    for filename in ['inputs.json','generation-log.json','generation-prompts.json',
                     'objects-inventory.json','run-summary.json']:
        check_json(OUT/filename)
    for chunk in CHUNKS:
        dest = OUT/chunk
        registration = check_json(dest/'registration.json')
        for name in ['structure.json','removed.json','seams.json']:
            check_json(dest/name)
        for q in ['q11','q12','q21','q22']:
            expected = registration['parts'][q]['nativeSize'] if registration else None
            check_image(dest/f'{q}-native.webp',expected)
        box = bounds(chunk)
        check_image(dest/f'{chunk}-2x.webp',((box[2]-box[0])*2,(box[3]-box[1])*2))
        for filename in [f'{chunk}-compare.jpg','structure-overlay.jpg','seam-paths.jpg','seam-check.jpg']:
            check_image(dest/filename,None)
    for filename in ['source-contact.jpg','walkmask-contact.jpg','hd-contact.jpg']:
        check_image(OUT/filename,(1536,1536))
    if not (OUT/'README.md').is_file():
        errors.append('README.md missing')
    # Include this report itself in the package-size observation.
    result = {'scope':'presence, decode and dimensions only; art quality remains for Claude',
              'checkedFiles':checked,'errors':errors,'packageBytes':0,'packageLimitBytes':80000000}
    path = OUT/'verification.json'
    for _ in range(3):
        path.write_text(json.dumps(result,indent=2)+'\n')
        result['packageBytes'] = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    path.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'checkedFiles':len(checked),'errors':errors,'packageBytes':result['packageBytes']},indent=2))
    raise SystemExit(bool(errors))


if __name__ == '__main__':
    main()
