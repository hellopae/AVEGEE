"""Run delivery image checks and retain real exit codes and output."""
from pathlib import Path
import json
import subprocess
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]
REPO=OUT.parents[2]
results=[]
for relative in ['evidence/repair-identity/verify_identity.py','evidence/audit_current.py','evidence/repair-current/verify.py']:
    command=['python3',str((OUT/relative).relative_to(REPO))]
    result=subprocess.run(command,cwd=REPO,capture_output=True,text=True)
    results.append({'command':command,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
report={'run':'20261111T162400Z-6a49dc9c','scope':'Delivery asset verification','results':results,'allCommandsExitedZero':all(result['exitCode']==0 for result in results),'visualContinuityAccepted':False,'inGameTested':False}
(EV/'test-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(not report['allCommandsExitedZero'])
