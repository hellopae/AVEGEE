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
    # All five upstream schemas must place known chunk origins and partition
    # the true map, especially the narrow last column and short last row.
    inputs = {chunk: m.normalize(chunk, path) for chunk, path in m.inventory().items()}
    assert sum(map(len, inputs.values())) == 70
    assert inputs['r1-c2'][0]['corePx1x'] == [1024, 0, 512, 512]
    assert inputs['r2-c2'][0]['corePx1x'] == [1024, 1024, 512, 512]
    assert inputs['r2-c4'][0]['contextPx1x'] == [3008, 960, 640, 640]
    assert inputs['r4-c1'][0]['corePx1x'] == [0, 3072, 512, 205]
    assert inputs['r4-c5'][-1]['corePx1x'] == [4506, 3072, 409, 205]
    # Registered synthetic 2x inputs with shifted global origins reconstruct an
    # exact known image: catches axis swaps, 1x/2x offsets and half-pixel shifts.
    import tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory(dir=m.O) as temp:
        path = Path(temp)
        painting = rng.integers(0, 256, (160, 320, 3), dtype=np.uint8)
        parts = []
        for tid, x, w in [('q11', 0, 128), ('q12', 32, 128)]:
            native = painting[:, x*2:(x+w)*2]
            f = path/(tid+'.webp')
            Image.fromarray(native).save(f, lossless=True)
            parts.append(dict(id=tid, chunk='oracle', contextPx1x=[91+x, 73, w, 80],
                nativeFile=str(f.relative_to(m.O)), nativeSize=list(Image.open(f).size),
                nativeToContextPx1x=[[.5,0,-.25],[0,.5,-.25]]))
        joined, origin, valid = m.compose_parts(parts)
        assert origin == (182,146)
        assert np.array_equal(joined, painting)
        assert valid.all()
    # Where one native has no real sample, no reflected sample may leak into
    # the blend; the other contributor must win, independent of seam position.
    va = np.ones(a.shape[:2], bool)
    vb = np.ones(b.shape[:2], bool)
    va[:, 85:125] = False
    vb[:, 40:96] = False
    joined, valid = m.seam(a, b, 85, 'test-invalid-samples', va, vb)
    # Colour compensation is bounded by 8, so a selected real source cannot
    # differ from it by more than 8 even when the other colour is unrelated.
    assert abs(joined[:,85:125].astype(float)-b[:,:40]).max() <= 8
    assert abs(joined[:,125:181].astype(float)-a[:,125:181]).max() <= 8
    assert valid.all()
    print('7 check groups succeeded: horizontal, vertical, overlap locality/extent, five-schema registration, 70-part coverage, direct-native pixel-centre placement, invalid-domain source selection.')


if __name__ == '__main__':
    run()
