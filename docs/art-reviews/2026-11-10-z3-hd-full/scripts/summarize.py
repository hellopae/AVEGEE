"""Collect one-pass measurements; never infer visual approval from a score."""
import json
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[1]
manifest = json.loads((OUT/'source-manifest.json').read_text())
chunks = []
known_issues = []
for ch,spec in manifest['chunks'].items():
    d = OUT/ch
    pending = [q for q in spec['parts'] if not (d/f'{q}-native.webp').exists()]
    data = dict(chunk=ch,imageGenCalls=4-len(pending),pendingParts=pending)
    if not pending and (d/'structure.json').exists():
        st = json.loads((d/'structure.json').read_text())
        reg = json.loads((d/'registration.json').read_text())
        data.update(status='assembled-for-Claude-review',outputSizePx=list(Image.open(d/f'{ch}-2x.webp').size),
            actualNativeSizesPx={q:v['nativeSizePx'] for q,v in reg['parts'].items()},
            sharpnessRatioLaplacian1x=st['sharpness']['ratio1x'],sharpnessRatioLaplacian2x=st['sharpness']['ratio2x'],
            structureSampledLandmarkMaxPx1x=st.get('sampledLandmarks',{}).get('maxDisplacementPx1x'),
            structureRawSiftHoldoutMaxPx1x=st['structure']['maxPx1x'],
            siftHoldoutPerPart={q:{k:v[k] for k in ['holdoutResidualMedianPx1x','holdoutResidualP95Px1x','holdoutResidualMaxPx1x','holdoutWithin4pxFraction','trainInlierResidualMaxPx1x','coreOutsideNativeFraction']} for q,v in reg['parts'].items()},
            qualityDecision='pending Claude; sampled landmarks and SIFT do not certify every continuous outline')
    else:
        data['status'] = 'incomplete'
    chunks.append(data)
    if (d/'removed.json').exists():
        removal = json.loads((d/'removed.json').read_text())
        if 'knownVisualIssue' in removal:
            known_issues.append(dict(chunk=ch,**removal['knownVisualIssue']))
summary = dict(task='Z234-HD-FULL zone3 west set2/5',date='2026-11-13',tool='built-in image_gen.imagegen only',
    imageGenCalls=sum(c['imageGenCalls'] for c in chunks),imageGenLimit=16,chunks=chunks,
    pendingGeneration=[f"{c['chunk']}/{q}" for c in chunks for q in c['pendingParts']],
    knownVisualIssues=known_issues,
    pendingReview=['Claude: sharpness definition at both raster scales, all structural outlines <=4px, internal seam visibility, floor-object removal',
                   'ASSEMBLE: join external chunk borders using native contexts and registration; not performed in this run'],
    references=dict(writtenZ1BriefRead=True,oldPlazaDetailWorktreeAvailable=False,oldHdFullWorktreeAvailable=False,
        availableSeamReference='docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py'),
    runtime=dict(zone='west',terrainDir='img/map-zone3/v1/',repairs=False,originalGameFilesModified=False),
    qualityApproved=False,
    measurements=dict(sharpness='grayscale Laplacian variance; no sharpening; 1x comparison plus equal-raster 2x comparison; see structure.json',
        structure='fixed local NCC landmarks, independent SIFT holdout and full raw matches retained; not automatic acceptance'),
    bytesBeforeSummary=sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file()))
(OUT/'run-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
