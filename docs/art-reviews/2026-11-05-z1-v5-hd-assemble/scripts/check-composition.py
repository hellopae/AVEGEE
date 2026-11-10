"""Small pixel-oracle checks for joins/axis handling, no output files or source edits."""
import numpy as np
from PIL import Image

import assemble as m


def run():
    rng = np.random.default_rng(20261110)
    world = rng.integers(0, 256, size=(173, 271, 3), dtype=np.uint8)
    # Two independently cropped views of one known painting must reconstruct exactly,
    # regardless of arbitrary adaptive path and feather: checks origin and rounding.
    horizontal = m.seam(world[:, :175], world[:, 79:], 79, 'test-horizontal')
    assert horizontal.shape == world.shape
    assert np.array_equal(horizontal, world)
    vertical = m.seam(world[:123].transpose(1, 0, 2), world[27:].transpose(1, 0, 2), 27,
        'test-vertical').transpose(1, 0, 2)
    assert np.array_equal(vertical, world)
    # Different neighbours may change only their shared overlap, not either core.
    a = rng.integers(0, 256, (97, 181, 3), dtype=np.uint8)
    b = rng.integers(0, 256, (97, 163, 3), dtype=np.uint8)
    joined = m.seam(a, b, 85, 'test-locality')
    assert joined.shape == (97, 248, 3)
    assert np.array_equal(joined[:, :85], a[:, :85])
    assert np.array_equal(joined[:, 181:], b[:, 96:])
    # A fallback must preserve original structure inside its core and every pixel
    # outside its declared context. This also catches x/y or 1x/2x confusion.
    original_defs = m.STRUCTURE_FALLBACKS
    m.STRUCTURE_FALLBACKS = [dict(id='oracle', core=[70, 72, 104, 109])]
    reference = Image.fromarray(rng.integers(0, 256, (180, 180, 3), dtype=np.uint8))
    current = rng.integers(0, 256, (360, 360, 3), dtype=np.uint8)
    before = current.copy()
    restored = m.restore_structure(current, reference)
    target = np.array(reference.crop((22, 24, 152, 157)).resize((260, 266), Image.Resampling.LANCZOS))
    assert np.array_equal(restored[144:218, 140:208], target[96:170, 96:164])
    outside = np.ones((360, 360), bool)
    outside[48:314, 44:304] = False
    assert np.array_equal(restored[outside], before[outside])
    m.STRUCTURE_FALLBACKS = original_defs
    print('5 pixel-oracle checks succeeded: horizontal, vertical, output extent, overlap locality, fallback geometry/locality.')


if __name__ == '__main__':
    run()
