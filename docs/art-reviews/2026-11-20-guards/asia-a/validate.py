"""Validate only the delivered asia/a artwork; no game or git mutations."""
import hashlib
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
baseline = json.loads((HERE / 'baseline.json').read_text())
production = json.loads((HERE / 'production.json').read_text())
expected = {row['path']: row for row in baseline}
expected['img/ko-pose-v1/asia/guard.webp'] = {
    'size': [640, 320], 'mode': 'RGBA', 'frames': 1,
}

def footprint(im, roi):
    x, y, _, _ = roi
    mask = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    box = mask.crop(roi).getbbox()
    assert box is not None
    box = [box[0]+x, box[1]+y, box[2]+x, box[3]+y]
    return box, [(box[0]+box[2]-1)/2, box[3]-1]

rows = []
checks = 0
for path, old in expected.items():
    p = ROOT / path
    with Image.open(p) as im:
        im.load()
        actual = {'size': list(im.size), 'mode': im.mode,
                  'frames': getattr(im, 'n_frames', 1)}
        for key in ('size', 'mode', 'frames'):
            assert actual[key] == old[key], (path, key, actual[key], old[key])
            checks += 1
        assert im.format == 'WEBP', path
        checks += 1
        row = {'path': path, **actual, 'grid': [1, 1],
               'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
        if im.mode == 'RGBA':
            extrema = im.getchannel('A').getextrema()
            assert extrema == (0, 255), (path, extrema)
            checks += 1
            row['alpha_extrema'] = list(extrema)
        rows.append(row)

# An anchor is the centre of the two-boot footprint and its lowest occupied
# row, alpha >=128. ROIs exclude the polearm and cloak. It is not the position
# of either individual boot. The original map has a clipped right sole.
anchor_specs = [
    ('img/Asia/crew-guard-asia-v2.webp', [440,1220,910,1254], [679.5,1253],
     {'roi':[370,1180,1000,1254], 'footprint_bbox':[375,1180,985,1254]}),
    ('img/tea-rest/crew-guard-asia-sit-v1.webp', [0,210,170,229], [84.5,228],
     {'roi':[0,195,170,229], 'footprint_bbox':[1,195,169,229]}),
    ('img/z2-events/boss-guanyu-asia.webp', [150,485,350,512], [256,497],
     {'placeholder_baseline':True, 'note':'No anatomical feet in original placeholder.'}),
    ('img/z2-events/boss-guanyu-asia-guard.webp', [150,485,350,512], [256,497],
     {'placeholder_baseline':True, 'note':'No anatomical feet in original placeholder.'}),
]
anchors = []
for path, roi, reference, old_measurement in anchor_specs:
    with Image.open(ROOT/path) as im:
        box, point = footprint(im, roi)
    delta = [point[i]-reference[i] for i in range(2)]
    assert max(abs(v) for v in delta) <= 2, (path, delta)
    checks += 1
    anchors.append({'path':path, 'method':'alpha>=128 footprint base anchor',
                    'roi':roi, 'footprint_bbox':box, 'baseline_anchor':reference,
                    'actual_anchor':point, 'delta_px':delta,
                    'baseline_measurement':old_measurement})

cut = production['cutscene']
cut_points = []
for source, target in zip(cut['source_landmarks'], cut['baseline_landmarks']):
    x, y = source
    transformed = [x*cut['forward_x_scale']+cut['forward_x_offset'],
                   y+x*cut['forward_y_shear']+cut['forward_y_offset']]
    delta = [transformed[i]-target[i] for i in range(2)]
    assert max(abs(v) for v in delta) <= 2
    checks += 1
    cut_points.append({'source':source, 'baseline':target,
                       'transformed':transformed, 'delta_px':delta})

# Measurements marked manually on the saved 512px event sprite and KO image.
# Exclude the tall weapon, loose ribbon and cloak from the body extent.
standing_top, standing_bottom = 125, 497
ko_head_left, ko_toe_right = 155, 509
standing_height = standing_bottom-standing_top+1
ko_length = ko_toe_right-ko_head_left+1
ratio = ko_length/standing_height
assert .9 <= ratio <= 1
checks += 1

report = {
    'scope':'asia/a only', 'generation_tool':'built-in image_gen',
    'imagegen_calls':production['imagegen_calls'], 'files':rows,
    'automated_assertions':checks, 'automated_result':'assertions completed',
    'base_anchors':anchors,
    'cutscene_landmarks':{'method':cut['measurement'], 'points':cut_points,
        'limitation':'Residual verifies the transform of manually selected points; it does not independently locate the final boot pixels.'},
    'ko_body_ratio':{'method':'Manual horizontal headwear-to-toe extent; standing body at event 512px canvas scale.',
        'standing_reference':'img/z2-events/boss-guanyu-asia-guard.webp',
        'standing_top_y':standing_top, 'standing_bottom_y':standing_bottom,
        'standing_body_height_px':standing_height, 'ko_head_left_x':ko_head_left,
        'ko_toe_right_x':ko_toe_right, 'ko_body_length_px':ko_length, 'ratio':ratio,
        'head_side':'left', 'feet_side':'right'},
    'visual_review':{'artifact':'compare.jpg', 'observed':[
        'Human red face and long black beard; green headdress, green cloak and gold dragon armor.',
        'Standing, portraits and cutscene retain the green-dragon guandao.',
        'Seated pose holds tea; unconscious pose has closed eyes, head left, feet right, no visible blood.',
        'Three event placeholders replaced; matching standing and portrait art reused for identity consistency.'
    ]},
    'limitations':[
        'No game runtime play-test or QA approval is claimed.',
        'Footprint base anchors are measured, not the independent position of every individual boot.',
        'Cutscene contact points and KO body landmarks are manually selected; see measurement definitions.'
    ]
}
(HERE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'{len(rows)} WebP files decoded; {checks} assertions completed; KO ratio {ratio:.4f}.')
for a in anchors:
    print(a['path'], 'anchor delta', a['delta_px'])
