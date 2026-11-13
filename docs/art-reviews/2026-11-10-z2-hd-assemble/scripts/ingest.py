"""Archive only supplied native, registration and review evidence; sources read-only."""
from pathlib import Path
import shutil
from assemble import O, SOURCES, RUNS, sha, write_json


def ingest():
    files = []
    chunks = set()
    for i, run in enumerate(RUNS, 1):
        root = SOURCES/run/'docs/art-reviews/2026-11-10-z2-hd-full'
        assert root.is_dir(), root
        for reg in sorted(root.glob('r*/registration.json')):
            chunk = reg.parent.name
            assert chunk not in chunks, f'Duplicate chunk {chunk}'
            chunks.add(chunk)
            evidence = [reg, *sorted(reg.parent.glob('q*-native.webp'))]
            evidence += [reg.parent/f for f in ['structure.json', 'removed.json'] if (reg.parent/f).is_file()]
            for source in evidence:
                dest = O/'inputs'/chunk/source.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, dest)
                assert sha(source) == sha(dest)
                files.append(dict(source=str(source), local=str(dest.relative_to(O)), bytes=dest.stat().st_size, sha256=sha(dest)))
        for name in ['README.md', 'visual-review.json', 'run-summary.json']:
            source = root/name
            if source.is_file():
                dest = O/'inputs'/f'run-{i}'/name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, dest)
                files.append(dict(source=str(source), local=str(dest.relative_to(O)), bytes=dest.stat().st_size, sha256=sha(dest)))
    assert len(chunks) == 20
    assert sum(f['local'].endswith('-native.webp') for f in files) == 69
    write_json(O/'source-provenance.json', dict(referenceCommit='8c8f339f', referenceWorktreeMissing=True,
        sourceRuns=RUNS, files=files, nativeCount=69, missingParts=['r2-c3/q22'], imageGenCalls=0))
    print(f'Archived {len(files)} files; 69 natives, 20 registrations, one missing native.')


if __name__ == '__main__':
    ingest()
