"""Register frozen ground-only polygons, without reading production mask pixels."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    source = json.loads((ROOT / 'review/ground-reference-additions.json').read_text())
    liquid_path = ROOT / 'review/liquid-reference.json'
    particle_path = ROOT / 'review/particle-flat-reference.json'
    liquid = json.loads(liquid_path.read_text())
    particles = json.loads(particle_path.read_text())
    for name, item in source['masks'].items():
        polygons = [[[x * 2, y * 2] for x, y in polygon]
                    for polygon in item['definiteFlatLiquidMap1x']]
        falling = [[[x * 2, y * 2] for x, y in polygon]
                   for polygon in item.get('definiteFallingLavaMap1x', [])]
        unknown = [[[x * 2, y * 2] for x, y in polygon]
                   for polygon in item.get('unlabelledMap1x', [])]
        liquid['masks'][name] = {
            'groundRectMap1x': item['groundRectMap1x'],
            'groundOnlyGrid': item['grid'],
            'definiteLiquidPolygons': polygons,
            'unlabelledPolygons': unknown,
            'limitation': item['note'],
            'frozenSource': 'review/ground-reference-additions.json',
        }
        if name.startswith('lava-flat-'):
            particles['masks'][name] = {
                'groundGrid': item['grid'],
                'definiteFlatLavaPolygons': polygons,
                'definiteFallingLavaPolygons': falling,
                'unlabelledPolygons': unknown,
                'note': item['note'],
            }
    for path, data in [(liquid_path, liquid), (particle_path, particles)]:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'registeredGroundReferences': list(source['masks']),
                      'productionMasksReadOrChanged': False}))


if __name__ == '__main__':
    main()
