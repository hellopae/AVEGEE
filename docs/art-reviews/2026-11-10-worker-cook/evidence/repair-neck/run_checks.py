"""Run current evidence checks and preserve exit codes/stdout. No asset edits."""
from pathlib import Path
from datetime import datetime,timezone
import json,subprocess,sys
EV=Path(__file__).resolve().parent;OUT=EV.parents[1];REPO=OUT.parents[2]
results=[]
for script in [EV/'verify.py',OUT/'evidence/audit_current.py']:
 cmd=[sys.executable,str(script.relative_to(REPO))]
 r=subprocess.run(cmd,cwd=REPO,capture_output=True,text=True)
 results.append({'command':cmd,'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
(EV/'test-results.json').write_text(json.dumps({'run':'20261111T170902Z-d171c309','atUTC':datetime.now(timezone.utc).isoformat(),'results':results,'note':'Pixel/layout checks only; no real-time playback or QA acceptance.'},ensure_ascii=False,indent=2)+'\n')
for r in results:print(json.dumps(r,ensure_ascii=False))
raise SystemExit(any(r['exitCode'] for r in results))
