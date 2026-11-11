"""Measure named stair/rail/bank cross-sections from the decoded local exports."""
import json

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from prepare import IDS, OUT, write

FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 13)


def edge(image, feature):
    pixels = np.asarray(image).astype(np.float32)
    if feature.get('channel') == 'purple':
        signal = pixels[:, :, 2] - pixels[:, :, 1]
    else:
        signal = cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY)
    x, y = feature['seedContextPx1x']
    half = feature['tangentHalfWidthPx1x'] * 2
    radius = feature['searchRadiusPx1x'] * 2
    vertical = feature['normal'] == 'y'
    tangent = int(round((x if vertical else y) * 2))
    center = int(round((y if vertical else x) * 2))
    if not vertical:
        signal = signal.T
    profile = signal[:, tangent-half:tangent+half+1].mean(axis=1)
    profile = cv2.GaussianBlur(profile[:, None], (0, 0), 1)[:, 0]
    start, stop = center-radius, center+radius+1
    assert 0 <= start < stop <= len(profile), feature['id']
    response = np.gradient(profile) * feature['polarity']
    if feature.get('operator') == 'dark-groove':
        response = -profile
    if feature.get('operator') == 'first-threshold':
        crossings = np.flatnonzero(profile[start:stop] >= feature['threshold'])
        assert len(crossings), feature['id']
        offset = int(crossings[0])
    else:
        offset = int(np.argmax(response[start:stop]))
    position = (start+offset) / 2
    point = [x, position] if vertical else [position, y]
    return dict(contextPx1x=point, responseValue=float(response[start+offset]),
                searchBoundaryHit=offset in (0, stop-start-1))


def run(name, spec, threshold, resolutions):
    folder = OUT / name
    data = json.loads((folder / 'input.json').read_text())
    reference = Image.open(folder / 'reference-1x.png').convert('RGB')
    registered = Image.open(folder / 'registered-2x.webp').convert('RGB')
    reference = reference.resize(registered.size, Image.Resampling.LANCZOS)
    rows = []
    for feature in spec['features']:
        before, after = edge(reference, feature), edge(registered, feature)
        distance = float(np.linalg.norm(np.array(before['contextPx1x']) - after['contextPx1x']))
        result = 'within4px' if distance <= threshold else 'over4px'
        if before['searchBoundaryHit'] or after['searchBoundaryHit']:
            result = 'unresolved'
        rows.append(dict(feature, reference=before, exported=after,
                         distancePx1x=distance, result=result))
    counts = {kind: sum(row['result'] == kind for row in rows)
              for kind in ['within4px', 'over4px', 'unresolved']}
    record = dict(id=name, thresholdPx1x=threshold,
                  method='Signed gradient maximum of a tangent-averaged profile, Gaussian sigma0.5 map px, sampled at 0.5 map px. Independent reference/export edge locations, guided by geometry-spec.json. All samples retained.',
                  limitation='Finite architectural cross-sections with visual review. Search intervals separate repeated steps. Does not establish every contour pixel or future composition seams.',
                  visibleTreadCount=spec['visibleTreadCount'], frontEdgeCount=spec['frontEdgeCount'],
                  counts=counts, maxDistancePx1x=max(row['distancePx1x'] for row in rows),
                  measurements=rows)
    write(folder / 'geometry.json', record)
    resolved_rows = list(rows)
    decisions = []
    for resolution in resolutions:
        index = next(i for i, row in enumerate(rows) if row['id'] == resolution['id'])
        original = rows[index]
        feature = dict(original)
        feature.update(resolution['measurement'])
        before, after = edge(reference, feature), edge(registered, feature)
        distance = float(np.linalg.norm(np.array(before['contextPx1x']) - after['contextPx1x']))
        result = 'within4px' if distance <= threshold else 'over4px'
        if before['searchBoundaryHit'] or after['searchBoundaryHit']:
            result = 'unresolved'
        resolved_rows[index] = dict(feature, reference=before, exported=after,
                                   distancePx1x=distance, result=result)
        decisions.append(dict(id=original['id'], initialMeasurementIndex=index,
                              original=original, corrected=resolved_rows[index],
                              diagnosis=resolution['diagnosis'], evidence=resolution['evidence']))
    final_counts = {kind: sum(row['result'] == kind for row in resolved_rows)
                    for kind in ['within4px', 'over4px', 'unresolved']}
    write(folder / 'geometry-resolutions.json', dict(
        initialEvidence='geometry.json', decisions=decisions,
        measurementCount=len(resolved_rows), counts=final_counts,
        maxDistancePx1x=max(row['distancePx1x'] for row in resolved_rows),
        contourReview='Named front edges, side grooves, rails/posts and pier bank reviewed against geometry-review.jpg and geometry-resolved-review.jpg. Five treads and upper landing in each crop.',
        limitation=record['limitation']))
    registration = json.loads((folder / 'registration.json').read_text())
    registration['geometryAcceptance'] = 'Sampled architectural cross-sections reviewed against repaired reference'
    registration['semanticGeometryEvidence'] = 'geometry-resolutions.json'
    registration['semanticGeometrySamples'] = len(resolved_rows)
    registration['semanticGeometryMaxDistancePx1x'] = max(row['distancePx1x'] for row in resolved_rows)
    write(folder / 'registration.json', registration)
    for selected_rows, filename in [(rows, 'geometry-review.jpg'),
                                    (resolved_rows, 'geometry-resolved-review.jpg')]:
        draw_review(reference, registered, selected_rows, folder / filename)
    print(name, 'raw', counts, 'resolved', final_counts,
          'maximum', max(row['distancePx1x'] for row in resolved_rows), flush=True)


def draw_review(reference, registered, rows, path):
    scale = 2
    panels = [reference.resize((reference.width*scale, reference.height*scale)),
              registered.resize((registered.width*scale, registered.height*scale))]
    for panel, key in zip(panels, ['reference', 'exported']):
        draw = ImageDraw.Draw(panel)
        for index, row in enumerate(rows):
            x, y = np.array(row[key]['contextPx1x']) * 4
            color = '#00ffff' if row['result'] == 'within4px' else '#ff2266'
            draw.ellipse((x-3, y-3, x+3, y+3), outline=color, width=2)
            draw.text((x+4, y-8), str(index), font=FONT, fill=color,
                      stroke_width=1, stroke_fill='black')
    sheet = Image.new('RGB', (panels[0].width*2, panels[0].height+28), '#141821')
    for index, panel in enumerate(panels):
        sheet.paste(panel, (index*panel.width, 28))
    draw = ImageDraw.Draw(sheet)
    draw.text((5, 5), 'Repaired reference | sample indices = geometry.json measurements', font=FONT, fill='white')
    draw.text((panels[0].width+5, 5), 'Decoded registered native | cyan <=4px, red = unresolved / >4px', font=FONT, fill='white')
    sheet.save(path, quality=95, subsampling=0)


if __name__ == '__main__':
    data = json.loads((OUT / 'geometry-spec.json').read_text())
    resolutions = json.loads((OUT / 'geometry-resolution-spec.json').read_text())
    for name in IDS:
        run(name, data['assets'][name], data['thresholdPx1x'], resolutions[name])
