"""Recheck this art delivery; never construct or modify a production mask/frame.

Requires Python 3, Pillow, NumPy, ffmpeg and ffprobe. Run from any directory.
Exit 1 means acceptance remains incomplete; consult delivery-verification.json.
The independent exclusion labels are deliberately partial. Never turn their
unlabelled pixels into a claim of liquid, or their lower bounds into totals.
"""

import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw

from build_assets import crop, terrain


ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text())


def write(name, data):
    (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_clips():
    results = []
    for clip in sorted((ROOT / "review/clips").glob("*.mp4")):
        if clip.name.startswith("._"):
            continue
        probe = json.loads(subprocess.check_output([
            "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(clip)
        ]))
        stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
        width, height = stream["width"], stream["height"]
        process = subprocess.Popen([
            "ffmpeg", "-v", "error", "-i", str(clip), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        frame_bytes = width * height * 3
        hashes, remainder = [], 0
        while True:
            data = process.stdout.read(frame_bytes)
            if not data:
                break
            if len(data) != frame_bytes:
                remainder = len(data)
                break
            hashes.append(hashlib.sha256(data).hexdigest())
        stderr = process.stderr.read()
        process.wait()
        count = len(hashes)
        duration = float(probe["format"]["duration"])
        results.append({
            "file": str(clip.relative_to(ROOT)), "sha256": sha(clip),
            "size": [width, height], "durationSeconds": duration,
            "fps": stream["avg_frame_rate"], "decodedFrames": count,
            "partialFrameBytes": remainder, "decoderExitCode": process.returncode,
            "decoderStderr": stderr.decode(), "distinctDecodedFrames": len(set(hashes)),
            "decodedFrameSha256": hashes,
            "transportValid": process.returncode == 0 and not stderr and remainder == 0
                and count == 288 and duration == 12 and stream["avg_frame_rate"] == "24/1",
            "limitation": "Encoded frame hashes include codec variation. Painted phase counts are measured separately before encoding. No runtime/game integration or visual playback claimed."
        })
    return results


def main():
    layout = read("fx-layout.json")
    pieces = layout["pieces"]
    mask_rects = {p["mask"]: p["maskRectPx"] for p in pieces}
    for name in ["lava-flat", "ice-stream-flat", "spirit-river", "shore-band"]:
        mask_rects[name] = [0, 0, *layout["masterSize"]]
    labels = read("review/independent-exclusions.json")
    reference_results = read('review/liquid-reference-result.json')
    semantic = {r['mask']: r for r in reference_results['measurements']}
    registration = read('review/summit-registration-result.json')
    solid_repairs = read('review/solid-repair-result.json')
    repaired_hashes = {change['mask']: change['afterSha256'] for change in solid_repairs['changes']}
    repaired_hashes['lava-flat'] = solid_repairs['lavaAggregate']['afterSha256']
    if 'iceAggregate' in solid_repairs:
        repaired_hashes['ice-stream-flat'] = solid_repairs['iceAggregate']['afterSha256']
    mask_results = []
    for name, rect in mask_rects.items():
        image = Image.open(ROOT / "masks" / (name + ".webp"))
        support = np.asarray(image.getchannel("A")) > 0
        reference = Image.new("L", image.size)
        regions = [r for r in labels["regions"] if r["mask"] == name]
        draw = ImageDraw.Draw(reference)
        for region in regions:
            draw.polygon([tuple(pt) for pt in region["polygon"]], fill=255)
        excluded = support & (np.asarray(reference) > 0)
        total, outside = int(support.sum()), int(excluded.sum())
        lower_bound = 100 * outside / total if total else None
        mask_results.append({
            "id": name, "maskRectPx": rect, "size": list(image.size),
            "resolution2x": image.size == (rect[2] * 2, rect[3] * 2),
            "selectedPixels": total, "nonBinaryAlphaPixels": int(np.count_nonzero(
                (np.asarray(image.getchannel("A")) != 0) & (np.asarray(image.getchannel("A")) != 255))),
            "independentlyLabelledSolidRegions": len(regions),
            "confirmedOutsidePixels": outside,
            "outsideDrawnLiquidPercentLowerBound": lower_bound,
            "outsideDrawnLiquidPercent": None,
            "status": "fails-3-percent" if lower_bound is not None and lower_bound > 3 else "unverified",
            "visualEvidence": "review/boundary/" + name + ("-overview.jpg" if name.startswith(("lava-flat-", "ice-stream-flat-", "spirit-river-")) else ".webp")
                if not name.startswith("shore-band") and name not in ["lava-flat", "ice-stream-flat", "spirit-river"] else None,
            "limitation": "Partial independent solid-interior labels only. Unlabelled pixels remain unknown. A lower bound below 3% is not acceptance."
        })

    # A second reference, also drawn on ground rather than production geometry:
    # a water-only disk proves that a marked shore pixel is too far from any bank.
    witness = read("review/shore-witness.json")
    name = witness["mask"]
    x, y, w, h = mask_rects[name]
    support = np.asarray(Image.open(ROOT / "masks" / (name + ".webp")).getchannel("A")) > 0
    cx, cy = witness["centerMap1x"]
    local_x, local_y = (cx - x) * 2, (cy - y) * 2
    radius, guard = witness["radiusNative2x"], witness["edgeSafetyNative2x"]
    yy, xx = np.ogrid[-radius:radius + 1, -radius:radius + 1]
    distance = np.sqrt(xx * xx + yy * yy)
    selected = support[local_y - radius:local_y + radius + 1, local_x - radius:local_x + radius + 1]
    world_per_pixel = min(layout["worldSize"][i] / (layout["masterSize"][i] * 2) for i in range(2))
    lower_distance = (radius - guard - distance) * world_per_pixel
    violating = selected & (lower_distance > witness["limitWorld"])
    maximum_lower_distance = float(lower_distance[selected].max()) if selected.any() else None
    witness.update({
        "selectedPixelsProvenBeyond12World": int(violating.sum()),
        "maximumBankDistanceLowerBoundWorld": maximum_lower_distance,
        "worldPerNativePixelConservative": world_per_pixel,
        "status": "fails-12-world" if violating.any() else "counterexample-removed-full-survey-unverified"
    })
    write("review/shore-witness-result.json", witness)

    ground = terrain()
    ground_crop_checks = []
    for piece in pieces:
        if piece["group"] != "waterfall":
            continue
        copied = Image.open(ROOT / "input" / (piece["mask"] + ".png")).convert("RGB")
        expected = crop(ground, piece["maskRectPx"])
        ground_crop_checks.append({
            "mask": piece["mask"],
            "cropMatchesAssembledV7Exactly": copied.size == expected.size and copied.tobytes() == expected.tobytes(),
            "cropSha256DecodedRgb": hashlib.sha256(copied.tobytes()).hexdigest()
        })
    write("review/ground-crop-check.json", {
        "method": "Exact decoded RGB equality of copied fall crops against fresh v7 manifest assembly. Independent labels refer to these unmodified ground crops.",
        "measurements": ground_crop_checks
    })
    reference = read('review/liquid-reference.json')
    ground_reference_checks = []
    for name, item in reference['masks'].items():
        expected = crop(ground, mask_rects[name])
        observed = crop(ground, item['groundRectMap1x']) if 'groundRectMap1x' in item else Image.open(ROOT / item['ground']).convert('RGB')
        ground_reference_checks.append({
            'mask': name,
            'matchesLayoutCrop': observed.size == expected.size and observed.tobytes() == expected.tobytes(),
            'matchesMeasuredReferenceHash': hashlib.sha256(observed.tobytes()).hexdigest()
                == semantic[name]['referenceGroundDecodedRgbSha256']
        })
    write('review/reference-ground-check.json', {'measurements': ground_reference_checks})
    view_rect = [cx - 70, cy - 70, 140, 140]
    base = crop(ground, view_rect)
    # The reference loop above reuses `name`. The proof must still use the
    # shore witness mask, regardless of reference insertion order.
    native_mask = Image.open(ROOT / "masks" / (witness['mask'] + ".webp")).getchannel("A")
    box = [(view_rect[0] - x) * 2, (view_rect[1] - y) * 2,
           (view_rect[0] + view_rect[2] - x) * 2, (view_rect[1] + view_rect[3] - y) * 2]
    tint = Image.new("RGBA", base.size, (255, 0, 130, 0))
    tint.putalpha(native_mask.crop(box).point(lambda a: round(a * .45)))
    overlay = Image.alpha_composite(base.convert("RGBA"), tint).convert("RGB")
    proof = Image.new("RGB", (1120, 612), "#17171e")
    for i, im in enumerate([base, overlay]):
        draw = ImageDraw.Draw(im)
        draw.ellipse((140 - radius, 140 - radius, 140 + radius, 140 + radius), outline="yellow", width=1)
        draw.line((135, 140, 145, 140), fill="red")
        draw.line((140, 135, 140, 145), fill="red")
        proof.paste(im.resize((560, 560), Image.Resampling.NEAREST), (i * 560, 52))
    draw = ImageDraw.Draw(proof)
    draw.text((6, 5), "Independent water-only disk / shore mask (magenta). Yellow disk: 38 native pixels, red center.", fill="white")
    draw.text((6, 23), f"{violating.sum()} selected pixels proven >12 world; max lower bound {maximum_lower_distance}. Full bank survey unverified.", fill="white")
    proof.save(ROOT / witness["evidence"], quality=86, method=6)
    write('review/shore-witness-proof-input.json', {
        'mask': witness['mask'],
        'maskSha256': sha(ROOT / 'masks' / (witness['mask'] + '.webp')),
        'viewRectMap1x': view_rect, 'nativeMaskCropBox': box,
        'selectedCropPixels': int((np.array(native_mask.crop(box)) > 0).sum()),
        'evidence': witness['evidence'],
    })

    sheet_results = []
    for sheet in layout["sheets"]:
        consumers = [p for p in pieces if p["sheet"] == sheet]
        piece = consumers[0]
        image = Image.open(ROOT / "sheets" / sheet).convert("RGBA")
        fw, fh, count = piece["frameW"], piece["frameH"], piece["frames"]
        frames = [np.asarray(image.crop((i * fw, 0, (i + 1) * fw, fh))) for i in range(count)]
        visible = np.logical_and.reduce([frame[:, :, 3] > 0 for frame in frames])
        deltas = [float(np.abs(frames[(i + 1) % count][:, :, :3].astype(float)
                    - frames[i][:, :, :3].astype(float)).mean()) for i in range(count)]
        masked_deltas = [float(np.abs(frames[(i + 1) % count][:, :, :3].astype(float)
                    - frames[i][:, :, :3].astype(float))[visible].mean()) for i in range(count)] if visible.any() else []
        source_sizes = []
        if piece["group"] == "waterfall":
            for i, source in enumerate(piece["sources"]):
                with Image.open(ROOT / source) as source_image:
                    cell = i % 2
                    source_sizes.append([(cell + 1) * source_image.width // 2 - cell * source_image.width // 2,
                                         source_image.height])
        sheet_results.append({
            "sheet": sheet, "sha256": sha(ROOT / "sheets" / sheet), "size": list(image.size),
            "frames": count, "frameSize": [fw, fh],
            "dimensionsMatchAllConsumers": all(image.size == (p["frameW"] * p["frames"], p["frameH"]) for p in consumers),
            "distinctRgbaFrames": len({hashlib.sha256(a.tobytes()).hexdigest() for a in frames}),
            "distinctVisibleRgbFrames": len({hashlib.sha256(a[:, :, :3][visible].tobytes()).hexdigest() for a in frames}) if visible.any() else 0,
            "adjacentRgbMAEIncludingWrap": deltas,
            "visibleAdjacentRgbMAEIncludingWrap": masked_deltas,
            "actualSourceCellSizes": source_sizes,
            "native800AllWaterfallFrames": len(source_sizes) == 8 and all(min(s) >= 800 for s in source_sizes)
                and source_sizes == piece["nativeFrameSizes"]
                if piece["group"] == "waterfall" else None,
            "limitation": "Distinct frames and MAE establish pixel changes, not smoothness or independent drawing."
        })

    current = read("input/current-fx-layout.json")
    old_foam = next(p for p in current["pieces"] if p["id"] == "river-foam--shore")
    new_foam = next(p for p in pieces if p["id"] == "river-foam--shore")
    spot_groups = [p for p in pieces if p["group"] in ["lava-bubble", "lava-steam", "embers"]]
    clips = verify_clips()
    preencode = read("review/offline-render-report.json")
    loops = read("loop-review.json")
    coverage = read("review/coverage-witness-result.json")
    particle_audit = read('review/particle-coverage-result.json')
    shore_audit = read('review/shore-ground-result.json')
    shared_reference_hash = sha(ROOT / 'review/liquid-reference.json')
    expected_particle_ids = {piece['id'] for piece in spot_groups}
    audited_particle_ids = {row['id'] for row in particle_audit['measurements']}
    shore_union = Image.new("L", tuple(s * 2 for s in layout["masterSize"]))
    from PIL import ImageChops
    for shore_name in ["shore-band-ice", "shore-band-spirit"]:
        sx, sy, sw, sh = mask_rects[shore_name]
        box = (sx * 2, sy * 2, (sx + sw) * 2, (sy + sh) * 2)
        alpha = Image.open(ROOT / "masks" / (shore_name + ".webp")).getchannel("A")
        shore_union.paste(ImageChops.lighter(shore_union.crop(box), alpha), box[:2])
    technical = {
        "all37Masks2xAndNonempty": len(mask_results) == 37 and all(m["resolution2x"] and m["selectedPixels"] for m in mask_results),
        "all21ReferencedSheetsConsistent": len(sheet_results) == 21 and all(s["dimensionsMatchAllConsumers"] for s in sheet_results),
        "all21SheetsHaveDistinctVisiblePhases": len(sheet_results) == 21
            and all(s["distinctVisibleRgbFrames"] == s["frames"] for s in sheet_results),
        "allThreeClipsDecode288Frames12Seconds": len(clips) == 3 and all(c["transportValid"] for c in clips),
        "all31ComparisonPairsPresent": len(preencode["pairs"]) == 31 and all((ROOT / p["file"]).is_file() for p in preencode["pairs"]),
        "all31BoundaryViewsPresent": sum(m["visualEvidence"] is not None for m in mask_results) == 31
            and all((ROOT / m["visualEvidence"]).is_file() for m in mask_results if m["visualEvidence"]),
        "all10GroundCropsMatchAssembledV7": len(ground_crop_checks) == 10
            and all(c["cropMatchesAssembledV7Exactly"] for c in ground_crop_checks),
        "allLabelledReferencesMatchAssembledV7": len(ground_reference_checks) == len(reference['masks'])
            and all(row['matchesLayoutCrop'] and row['matchesMeasuredReferenceHash'] for row in ground_reference_checks),
        "all18FallMasksHaveGroundReferences": len([piece for piece in pieces if piece['group'] in ['waterfall', 'lavafall']]) == 18
            and {piece['mask'] for piece in pieces if piece['group'] in ['waterfall', 'lavafall']}
                <= set(reference['masks']),
        "all10IceFallsEightDistinct800Frames": len([p for p in pieces if p["group"] == "waterfall"]) == 10
            and all(s["frames"] == 8 and s["frameSize"] == [800, 800]
                and s["distinctRgbaFrames"] == 8 and s["native800AllWaterfallFrames"]
                for s in sheet_results if s["native800AllWaterfallFrames"] is not None),
        "approved30FoamSpotsUnchanged": len(new_foam["spots"]) == 30 and new_foam["spots"] == old_foam["spots"],
        "lavaSpotsReferenceOnlyFlatMasks": bool(spot_groups) and all(p["mask"].startswith("lava-flat-") for p in spot_groups),
        "iceFlatPiecesAreTilesWithFlowDir": all(p["kind"] == "tile" and "flowDir" in p for p in pieces if p["group"] == "ice"),
        "uncorrectedAssetsMatchInheritedHashes": all(
            sha(ROOT / entry["path"]) == entry["sha256"]
            for entry in read("review/inherited-assets.json")["assets"]
            if entry["path"] not in {
                "masks/" + change["mask"] + ".webp"
                for change in read("review/mask-correction-result.json")["changes"]
            } | {'masks/' + name + '.webp' for name in repaired_hashes}
            | {"masks/shore-band.webp", "sheets/icefall-summit.webp"}),
        "correctedMasksMatchRecordedHashes": all(
            sha(ROOT / "masks" / (change["mask"] + ".webp")) == (
                repaired_hashes.get(change['mask'],
                    registration['afterMaskSha256'] if change['mask'] == 'icefall-summit' else change["afterSha256"]))
            for change in read("review/mask-correction-result.json")["changes"])
            and sha(ROOT / "masks/shore-band.webp") == read("review/mask-correction-result.json")["shoreAggregateSha256"],
        "currentSolidRepairsMatchRecordedInputs": all(
            sha(ROOT / 'masks' / (name + '.webp')) == value for name, value in repaired_hashes.items())
            and sha(ROOT / solid_repairs['specification']) == solid_repairs['specificationSha256']
            and all(sha(ROOT / change['beforePath']) == change['beforeSha256']
                    and change['witnessSolidOverlapAfter'] == 0
                    and change['addedPixels'] == 0 for change in solid_repairs['changes']),
        "summitRegistrationMatchesRecordedAssets": sha(ROOT / 'sheets/icefall-summit.webp') == registration['afterSheetSha256']
            and sha(ROOT / 'review/before-registration/mask.webp') == registration['beforeMaskSha256']
            and sha(ROOT / 'review/before-registration/sheet.webp') == registration['beforeSheetSha256']
            and all(sha(ROOT / s['path']) == s['sha256'] for s in registration['sourceCells'])
            and registration['unchangedVisibleSheetPixelsOutsideExtension']
            and registration['unchangedSheetAlphaOutsideExtension'],
        "summitLowerWitnessHasEightEffectivePhases": registration['lowerWitnessEffectiveCoveragePixelsByPhase'] == [528]*8
            and registration['lowerWitnessDistinctPaintedRgbPhases'] == 8,
        "semanticMeasurementsMatchCurrentMasks": len(semantic) == 37 and all(
            sha(ROOT / 'masks' / (name+'.webp')) == r['maskSha256'] for name, r in semantic.items())
            and sha(ROOT / reference_results['reference']) == reference_results['referenceSha256'],
        "all12ParticleSamplesMatchCurrentInputs": expected_particle_ids == audited_particle_ids
            and len(audited_particle_ids) == 12
            and particle_audit['layoutSha256'] == sha(ROOT / 'fx-layout.json')
            and particle_audit['referenceSha256'] == sha(ROOT / particle_audit['reference'])
            and all(row['samples'] == 288
                and row['maskSha256'] == sha(ROOT / 'masks' / (row['mask'] + '.webp'))
                and row['sheetSha256'] == sha(ROOT / 'sheets' / next(
                    piece['sheet'] for piece in spot_groups if piece['id'] == row['id']))
                for row in particle_audit['measurements']),
        "sharedParticleGroundLabelsMatchCurrentReference": particle_audit.get('liquidReferenceSha256') == shared_reference_hash,
        "sharedShoreGroundLabelsMatchCurrentReference": shore_audit.get('liquidReferenceSha256') == shared_reference_hash
            and shore_audit['referenceSha256'] == sha(ROOT / shore_audit['reference']),
        "frozenGroundGroupsMatchRegisteredReferences": reference.get('groundPatches')
            == read('review/ground-reference-groups.json')['groups']
            and all((ROOT / item['groundOnlyGrid']).is_file() for item in reference.get('groundPatches', {}).values()),
        "renderInputsMatchCurrentAssets": all(
            sha(ROOT / item["path"]) == item["sha256"]
            for item in preencode.get("inputAssets", [])) and bool(preencode.get("inputAssets")),
        "all18FallMasksHaveEightEffectivePhases": len(loops["frames"]) == 18
            and all(f["distinctVisiblePhases"] == 8
                and f['maskSha256'] == sha(ROOT / 'masks' / (f['id'] + '.webp'))
                and f['sheetSha256'] == sha(ROOT / 'sheets' / next(
                    piece['sheet'] for piece in pieces if piece['mask'] == f['id']))
                for f in loops["frames"]),
        "shoreAggregateEqualsComponentUnion": shore_union.tobytes()
            == Image.open(ROOT / "masks/shore-band.webp").getchannel("A").tobytes(),
        "renderOutputsMatchRecordedHashes": len(preencode.get("contactSheets", [])) == 3 and all(
            sha(ROOT / item["file"]) == item.get("sha256")
            for key in ["pairs", "clips", "contactSheets"] for item in preencode[key])
    }
    write("review/independent-mask-review.json", {
        "method": "Prior ground-only exclusion labels rechecked after targeted mask repairs. These now serve as regression witnesses, not a new independent full-liquid segmentation.", "reference": "review/independent-exclusions.json",
        "resolution": "2x", "measurements": mask_results,
        "semanticOutsidePercentVerifiedForAllMasks": False,
        "knownFailures": [m["id"] for m in mask_results if m["status"] == "fails-3-percent"],
        "limitations": labels["limitations"]
    })
    write("mask-review.json", {
        "maskResolution": "2x",
        "measurements": [{"id": m["id"], "maskRectPx": m["maskRectPx"],
                          "maskSizePx": m["size"], "maskPixels": m["selectedPixels"],
                          "outsideDrawnLiquidPercent": None,
                          "outsideDrawnLiquidPercentUpperBound": semantic[m['id']]['outsidePercentUpperBound'],
                          "liquidReferenceStatus": semantic[m['id']]['status'],
                          "leakageUpperBoundWithin3Percent": semantic[m['id']]['status'] == 'upper-bound-within-3-percent',
                          "fullSemanticAcceptanceVerified": False} for m in mask_results],
        "semanticOutsidePercentVerified": False,
        "explanation": "Current counts after inherited repairs and summit registration. "
            + str(sum(row['status'] == 'upper-bound-within-3-percent' for row in semantic.values()))
            + " masks have conservative <=3% upper bounds from separate ground-only liquid labels. Remaining support is unknown; full pack acceptance remains incomplete.",
        "liquidReferenceEvidence": "review/liquid-reference-result.json",
        "regressionEvidence": "review/independent-mask-review.json",
        "knownCoverageGap": "review/coverage-witness-result.json"
    })
    acceptance_failures = [
        m["id"] + ": confirmed independent solid-interior leakage >3%"
        for m in mask_results if m["status"] == "fails-3-percent"
    ]
    if witness["status"] == "fails-12-world":
        acceptance_failures.append("shore-band-ice: selected pixels proven farther than 12 world units from any real bank")
    if coverage["uncoveredWitnessPixels"]:
        acceptance_failures.append(
            "Summit lower cascade: " + str(coverage["uncoveredWitnessPixels"])
            + " independently labelled falling-water pixels have no current effect mask")
    acceptance_failures.extend([
        "Semantic <=3% leakage upper bounds remain unverified for " + str(sum(r['status'] != 'upper-bound-within-3-percent' for r in semantic.values())) + " of 37 masks",
        "Global coverage of every painted waterfall and smooth visual playback remain unverified",
        "Actual shore-bank references are partial; full bank-distance verification remains incomplete",
        "All 12 particle pieces sampled at 288 times; partial ground-only flat/falling labels leave flat-only placement unresolved"
    ])
    report = {
        "technicalChecks": technical, "sheetChecks": sheet_results, "clipChecks": clips,
        "preencodeDistinctFrameCounts": {c["file"]: c["distinctFrames"] for c in preencode["clips"]},
        "layoutSha256": sha(ROOT / "fx-layout.json"),
        "acceptanceComplete": False,
        "allTechnicalChecks": all(technical.values()),
        "coverageWitness": coverage,
        "acceptanceFailures": acceptance_failures,
        "gameIntegrationTested": False,
        "visualPlaybackReviewed": False
    }
    write("review/delivery-verification.json", report)
    print(json.dumps({"technicalChecks": technical, "knownMaskFailures": [m["id"] for m in mask_results if m["status"] == "fails-3-percent"],
                      "shoreWitness": witness, "acceptanceComplete": False}, ensure_ascii=False, indent=2))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
