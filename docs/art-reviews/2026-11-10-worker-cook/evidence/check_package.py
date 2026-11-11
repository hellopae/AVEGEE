"""Check delivery scope/size and references; write evidence, never git metadata."""
from pathlib import Path
import hashlib
import json
import subprocess

OUT = Path(__file__).resolve().parents[1]
REPO = OUT.parents[2]
REPORT = OUT / "evidence/package-check.json"
PREFIX = OUT.relative_to(REPO).as_posix() + "/"
manifest = json.loads((OUT / "worker-cook.json").read_text())
status = subprocess.check_output(
    ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"], cwd=REPO
).decode().split("\0")
changed = [line[3:] for line in status if line]
outside = [path for path in changed if not path.startswith(PREFIX)]
required = {"README.md", "queue-check.json", "loop-review.json", "worker-cook.json"}
required.update(f"compare-{z}.jpg" for z in ("th","asia","west","cyberhell"))
for entry in manifest["animations"]:
    required.add(entry["file"])
    required.add(f"preview/worker-{entry['zone']}-{entry['anim']}-{entry['dir']}.gif")
missing = sorted(p for p in required if not (OUT / p).is_file())
files = sorted(p for p in OUT.rglob("*") if p.is_file() and p != REPORT)
base_size = sum(p.stat().st_size for p in files)
report = {
    "status": "incomplete", "meaning": "Package integrity only; not art acceptance or QA.",
    "limitBytes": 30000000,
    "scope": PREFIX, "changedFileCount": len(changed), "outsideScope": outside,
    "requiredFilesMissing": missing, "files": [
        {"file": p.relative_to(OUT).as_posix(), "bytes": p.stat().st_size,
         "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in files
    ],
    "reportExcludedFromInventory": "Avoid self-referential hash; total includes report.",
    "totalBytesIncludingReport": 0, "underLimit": True,
}
for _ in range(10):
    serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    total = base_size + len(serialized.encode())
    if total == report["totalBytesIncludingReport"]:
        break
    report["totalBytesIncludingReport"] = total
    report["underLimit"] = total <= report["limitBytes"]
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n")
print(json.dumps({k:report[k] for k in ("totalBytesIncludingReport","underLimit","changedFileCount","outsideScope","requiredFilesMissing")}, indent=2))
raise SystemExit(bool(outside or missing or not report["underLimit"]))
