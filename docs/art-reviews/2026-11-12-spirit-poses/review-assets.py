"""Export generated PNGs, make the requested contact sheet, check only count/decode/size."""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
RECORD = HERE / 'generation-record.json'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['export', 'sheet', 'check'])
    parser.add_argument('--name')
    parser.add_argument('--generated')
    args = parser.parse_args()
    record = json.loads(RECORD.read_text())
    if args.action == 'export':
        item = next(p for p in record['items'] if p['name'] == args.name)
        with Image.open(args.generated) as image:
            with Image.open(REPO / item['source']) as source:
                if image.size != source.size:
                    raise SystemExit(f'Canvas mismatch: {image.size} != {source.size}; no resize performed')
            image.convert('RGBA').save(HERE / item['name'], 'WEBP', lossless=True, exact=True, method=6)
        item['status'] = 'generated'
        item['attempt'] = record['attempts']
        RECORD.write_text(json.dumps(record, indent=2) + '\n')
        print('Exported', item['name'])
    elif args.action == 'check':
        completed = []
        missing = []
        errors = []
        for item in record['items']:
            path = HERE / item['name']
            if not path.exists():
                missing.append(item['name'])
                continue
            try:
                with Image.open(path) as image, Image.open(REPO / item['source']) as source:
                    image.load()
                    if image.size != source.size:
                        errors.append(f"{item['name']}: {image.size} != {source.size}")
                    else:
                        completed.append(item['name'])
            except Exception as exc:
                errors.append(f"{item['name']}: {exc}")
        result = dict(expected=39, opened_with_matching_dimensions=len(completed), missing=missing, errors=errors)
        (HERE / 'checks.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result, indent=2))
        raise SystemExit(bool(errors or missing))
    else:
        items = [p for p in record['items'] if (HERE / p['name']).exists()]
        # Each cell has an original and an edited sprite at exactly 200 px high.
        width, height = 620, 248
        sheet = Image.new('RGB', (width * 2, height * max(1, (len(items) + 1) // 2)), '#292c35')
        draw = ImageDraw.Draw(sheet)
        for index, item in enumerate(items):
            x, y = index % 2 * width, index // 2 * height
            draw.text((x + 8, y + 5), item['name'], fill='white')
            for offset, path, title in [(0, REPO / item['source'], 'ORIGINAL'), (310, HERE / item['name'], 'NEW')]:
                draw.text((x + offset + 8, y + 23), title, fill='#c4cad8')
                with Image.open(path) as original:
                    image = original.convert('RGBA')
                    image = image.resize((round(image.width * 200 / image.height), 200), Image.Resampling.NEAREST)
                    sheet.paste(image, (x + offset + (310 - image.width) // 2, y + 43), image)
        sheet.save(HERE / 'contact-sheet.jpg', quality=94)
        print(f'Contact sheet: {len(items)} original/new pairs')


if __name__ == '__main__':
    main()
