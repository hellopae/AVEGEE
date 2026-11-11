"""Freeze additional visually inspected v7 ground contours before measurement.

No production mask, animation, colour classifier or construction annotation is
read. Local coordinates were transcribed from the named ground-only grids.
The source snapshot makes repeated application idempotent.
"""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    reference = json.loads((ROOT / 'review/run-start-liquid-reference.json').read_text())
    source = json.loads((ROOT / 'review/run-start-ground-reference-groups.json').read_text())
    groups = {}

    def add(name, rect, polygons, targets, grid, note, scale=2):
        groups[name] = {
            'groundRectMap1x': rect,
            'definiteLiquidPolygons': [
                [[round(x * scale), round(y * scale)] for x, y in polygon]
                for polygon in polygons
            ],
            'unlabelledPolygons': [],
            'groundOnlyGrid': 'review/boundary/' + grid,
            'referencePolicy': note,
            'targets': targets,
        }

    # Clear-water envelopes at four adjoining ground crops. The first fine
    # bank trace was rejected during ground-only preview, before measurement.
    # Foreground rock peaks/leaves stay outside these conservative interiors.
    patches = [
        ('river-west-lower-a-ground', [0, 2110, 1185, 440], 'spirit-river-west', 'run2-river-west-a-ground-map1x.webp'),
        ('river-west-lower-b-ground', [1185, 2110, 1185, 440], 'spirit-river-west', 'run2-river-west-b-ground-map1x.webp'),
        ('river-east-lower-a-ground', [2560, 2110, 1180, 450], 'spirit-river-east', 'run2-river-east-a-ground-map1x.webp'),
        ('river-east-lower-b-ground', [3740, 2110, 1175, 450], 'spirit-river-east', 'run2-river-east-b-ground-map1x.webp'),
    ]
    notes = [
        'Clear river interior below the original observation. Conservative water-side contour at foreground rock peaks, leaves and reflections; uncertain bank edge remains unknown.',
        'Open water below the earlier label, bounded by the independent visible silhouette of the foreground rocks. Upper waterfall and far bank are outside this patch.',
        'Lower open river; dock stays outside the polygon. Leaves, boulders and foreground peaks are conservatively excluded.',
        'Lower river with foreground trees and rocks excluded. Mist on the far right bank remains unlabelled; no inference from water colour alone.',
    ]
    for (name, rect, target, grid), note in zip(patches, notes):
        add(name, rect, [], [target], grid, note)
    safe_edges = {
        'river-west-lower-a-ground': [
            (0, 315), (50, 335), (65, 332), (100, 290), (120, 290),
            (160, 345), (210, 350), (250, 355), (300, 355), (310, 350),
            (340, 295), (360, 265), (395, 260), (430, 315), (470, 345),
            (495, 350), (520, 330), (550, 330), (575, 350), (640, 350),
            (660, 380), (700, 370), (720, 370), (750, 350), (780, 360),
            (810, 375), (860, 370), (880, 365), (910, 380), (950, 350),
            (985, 345), (1020, 370), (1080, 355), (1110, 360),
            (1140, 380), (1160, 375), (1184, 355),
        ],
        'river-west-lower-b-ground': [
            (0, 365), (60, 395), (100, 380), (130, 375), (160, 345),
            (180, 345), (210, 365), (250, 370), (270, 350), (290, 310),
            (330, 305), (360, 350), (380, 355), (420, 400), (470, 400),
            (500, 365), (520, 355), (550, 370), (580, 355), (620, 355),
            (660, 390), (700, 400), (740, 380), (770, 380), (800, 335),
            (820, 310), (840, 310), (870, 365), (890, 390), (930, 400),
            (980, 375), (1010, 375), (1040, 375), (1070, 360),
            (1100, 350), (1120, 320), (1150, 295), (1184, 240),
        ],
        'river-east-lower-a-ground': [
            (0, 300), (50, 320), (100, 330), (150, 340), (200, 345),
            (250, 340), (280, 350), (305, 340), (330, 320), (350, 320),
            (380, 345), (410, 350), (440, 355), (460, 355), (490, 380),
            (520, 405), (560, 405), (590, 390), (610, 390), (640, 350),
            (650, 335), (670, 335), (700, 370), (730, 390), (750, 385),
            (775, 370), (795, 375), (820, 335), (850, 335), (875, 375),
            (900, 390), (930, 405), (980, 410), (1010, 405), (1040, 390),
            (1070, 365), (1090, 335), (1110, 335), (1140, 375),
            (1160, 390), (1179, 360),
        ],
        'river-east-lower-b-ground': [
            (0, 320), (100, 320), (200, 320), (300, 330), (400, 350),
            (500, 360), (600, 360), (680, 360), (730, 330), (850, 330),
            (900, 310), (1000, 310), (1120, 310), (1174, 280),
        ],
    }
    for name, edge in safe_edges.items():
        top = 245 if name == 'river-east-lower-a-ground' else 205
        polygon = [(0, top), (edge[-1][0], top), *reversed(edge)]
        groups[name]['definiteLiquidPolygons'] = [
            [[x * 2, y * 2] for x, y in polygon]
        ]
        groups[name]['preMeasurementRevision'] = (
            'Replaced fine bank trace with inset clear-water envelope after '
            'ground-only label preview showed peak/leaf contamination. '
            'No production alpha read for the correction.'
        )

    add('lavafall-west-left-water-ground', [188, 734, 114, 169], [[
        (24, 18), (32, 36), (37, 60), (38, 85), (38, 112),
        (37, 140), (35, 165), (33, 184), (31, 198), (27, 210),
        (25, 214), (26, 198), (30, 180), (31, 164), (29, 146),
        (25, 128), (21, 111), (20, 93), (21, 76), (21, 60),
        (19, 42), (18, 29)
    ]], ['lavafall-west'], 'run2-lavafall-west-ground-detail.webp',
        'Narrow flowing lava ribbon immediately right of the faceted left wall. '
        'Earlier conservative unknown envelope covered this water as well. '
        'Rock reflection and curtain/rock antialiasing remain unknown.', scale=1)

    for name, group in groups.items():
        targets = group.pop('targets')
        reference['groundPatches'][name] = group
        source['groups'][name] = group
        for target in targets:
            reference['masks'][target].setdefault('unionReferences', []).append(name)
            source['attach'].setdefault(target, []).append(name)
    reference['latestGroundContinuation'] = {
        'worktree': '20261111T115315Z-11a68ec7',
        'source': 'scripts/continue_ground_references.py',
        'groundOnly': True, 'productionMasksReadOrChanged': False,
        'labelsFrozenBeforeMeasurement': True,
        'sameAiReviewer': True, 'notHumanQA': True,
        'unknownPolicy': 'Unlabelled area is unknown. No flood fill or construction-alpha inference.',
    }
    destination = ROOT / 'review/liquid-reference.json'
    destination.write_text(json.dumps(reference, ensure_ascii=False, indent=2) + '\n')
    source['latestContinuation'] = reference['latestGroundContinuation']
    (ROOT / 'review/ground-reference-groups.json').write_text(
        json.dumps(source, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'newGroundGroups': list(groups),
                      'referenceSha256': hashlib.sha256(destination.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
