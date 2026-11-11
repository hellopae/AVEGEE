"""Run delivery image checks; this is not an art-acceptance or game QA claim."""
from pathlib import Path
import subprocess,json
EV=Path(__file__).resolve().parent;OUT=EV.parents[1];REPO=OUT.parents[2]
results=[]
for rel in ['evidence/repair-identity/verify_identity.py','evidence/audit_current.py']:
 p=subprocess.run(['python3',str(OUT/rel)],cwd=REPO,capture_output=True,text=True)
 results.append({'command':['python3',str((OUT/rel).relative_to(REPO))],'exitCode':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
report={'run':'20261111T115315Z-ccb558be','scope':'Delivered images and metadata only; not game tests or QA','results':results,'allCommandsExitedZero':all(x['exitCode']==0 for x in results)}
(EV/'test-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(not report['allCommandsExitedZero'])
