"""Pixel-oracle regressions for axis/origin handling, overlap locality and schemas."""
import json
from pathlib import Path
import shutil
import tempfile

import numpy as np
from PIL import Image

import assemble as assembly


def run():
    rng = np.random.default_rng(20261114)
    world = rng.integers(0, 256, size=(173, 271, 3), dtype=np.uint8)
    horizontal = assembly.seam(world[:, :175], world[:, 79:], 79, 'oracle-horizontal')
    assert np.array_equal(horizontal, world)
    vertical = assembly.seam(world[:123].transpose(1, 0, 2), world[27:].transpose(1, 0, 2),
                             27, 'oracle-vertical').transpose(1, 0, 2)
    assert np.array_equal(vertical, world)
    left = rng.integers(0, 256, (97, 181, 3), dtype=np.uint8)
    right = rng.integers(0, 256, (97, 163, 3), dtype=np.uint8)
    joined = assembly.seam(left, right, 85, 'oracle-locality')
    assert joined.shape == (97, 248, 3)
    assert np.array_equal(joined[:, :85], left[:, :85])
    assert np.array_equal(joined[:, 181:], right[:, 96:])
    assert assembly.SEAMS[-1]['correctionAbsMax'] <= 8
    path = np.array(assembly.SEAMS[-1]['pathInOverlapOutputPx'])
    assert np.all(np.abs(np.diff(path)) <= 1)
    assert path.min() >= 10 and path.max() < 86

    with tempfile.TemporaryDirectory(prefix='.composition-', dir=assembly.O) as temporary:
        directory = Path(temporary)
        # Four exact views of one painting must reconstruct every crossing pixel.
        world2x = rng.integers(0, 256, size=(346, 542, 3), dtype=np.uint8)
        parts = []
        for tid, box in [('q11', [0, 0, 175, 123]), ('q12', [79, 0, 271, 123]),
                         ('q21', [0, 27, 175, 173]), ('q22', [79, 27, 271, 173])]:
            x0, y0, x1, y1 = box
            path = directory / f'{tid}-native.webp'
            Image.fromarray(world2x[y0 * 2:y1 * 2, x0 * 2:x1 * 2]).save(path, lossless=True)
            parts.append(dict(id=tid, chunk='oracle', nativeFile=str(path.relative_to(assembly.O)),
                              contextRectPx1x=box, coreRectPx1x=box,
                              nativeToContextPx1x=[[.5, 0, 0], [0, .5, 0]]))
        result, origin, coverage = assembly.compose_parts(parts)
        assert origin == (0, 0) and np.array_equal(result, world2x)
        assert all(item['reflectedContextPixels2x'] == 0 for item in coverage)
        result, origin, _ = assembly.compose_parts(parts[:2])
        assert origin == (0, 0) and np.array_equal(result, world2x[:246])

        inventory = json.loads((assembly.O / 'inventory.json').read_text())
        # The shipping verifier exercises all three schemas. Here reject broken
        # global/context agreement and broken core coverage before any rendering.
        part = inventory['chunks']['r1-c1'][0]
        source = (assembly.O / part['registrationFile']).parent
        for image in source.glob('*-native.webp'):
            shutil.copyfile(image, directory / image.name)
        original = json.loads((source / 'registration.json').read_text())
        registration = directory / 'registration.json'
        registration.write_text(json.dumps(original))
        assert len(assembly.normalize('r1-c1', registration)) == 4
        wrong_matrix = json.loads(json.dumps(original))
        wrong_matrix['tiles'][0]['nativePixelToMasterPx1x'][0][2] += 1
        registration.write_text(json.dumps(wrong_matrix))
        expect_rejection(registration)
        wrong_core = json.loads(json.dumps(original))
        wrong_core['tiles'][1]['coreMasterPx1x'][0] -= 1
        registration.write_text(json.dumps(wrong_core))
        expect_rejection(registration)
        original_output = assembly.O
        original_patches = assembly.STRUCTURE_FALLBACKS
        try:
            assembly.O = directory
            assembly.STRUCTURE_FALLBACKS = [dict(id='oracle', core=[70, 72, 104, 109])]
            reference = Image.fromarray(rng.integers(0, 256, (180, 180, 3), dtype=np.uint8))
            current = rng.integers(0, 256, (360, 360, 3), dtype=np.uint8)
            before = current.copy()
            patches = assembly.restore_structure(current, reference)
            target = np.array(reference.crop((22, 24, 152, 157)).resize((260, 266), Image.Resampling.LANCZOS))
            assert np.array_equal(current[144:218, 140:208], target[96:170, 96:164])
            outside = np.ones((360, 360), bool)
            outside[48:314, 44:304] = False
            assert np.array_equal(current[outside], before[outside])
            assert patches[0]['contextRectPx1x'] == [22, 24, 152, 157]
        finally:
            assembly.O = original_output
            assembly.STRUCTURE_FALLBACKS = original_patches
    print('8 regression groups succeeded: horizontal, vertical, locality/path, four-way crossing, short last row, schema normalization, invalid registration rejection, fallback core/locality.')


def expect_rejection(registration):
    try:
        assembly.normalize('r1-c1', registration)
    except AssertionError:
        return
    raise AssertionError('Invalid registration was accepted')


if __name__ == '__main__':
    run()
