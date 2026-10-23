"""Run the existing Node files independently with a wall-clock bound per file."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess,json,time,re,os
root=Path(__file__).resolve().parents[2]
files=sorted(root.glob('tests/*.test.mjs'))
timeout=int(os.environ.get('F12_TEST_TIMEOUT','240'))
def run(file):
 start=time.monotonic()
 try:
  p=subprocess.run(['node','--test',str(file.relative_to(root))],cwd=root,capture_output=True,text=True,timeout=timeout)
  return {'file':str(file.relative_to(root)),'exit':p.returncode,'seconds':round(time.monotonic()-start,2),'output':p.stdout+p.stderr}
 except subprocess.TimeoutExpired as e:
  return {'file':str(file.relative_to(root)),'exit':'timeout','seconds':timeout,'output':(e.stdout or b'').decode(errors='replace')+(e.stderr or b'').decode(errors='replace')}
with ThreadPoolExecutor(max_workers=4) as pool:
 results=list(pool.map(run,files))
(root/'output/f12-code/suite-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
(root/'output/f12-code/suite-full.txt').write_text('\n'.join('FILE '+r['file']+' EXIT '+str(r['exit'])+'\n'+r['output'] for r in results))
summary={'files':len(results),'completed':sum(r['exit']==0 for r in results),'reportedTests':sum(int(m[1]) for r in results if r['exit']==0 and (m:=re.search(r'ℹ tests (\d+)',r['output']))),'reportedFailures':sum(int(m[1]) for r in results if r['exit']==0 and (m:=re.search(r'ℹ fail (\d+)',r['output']))),'timeouts':[r['file'] for r in results if r['exit']=='timeout'],'otherFailures':[r['file'] for r in results if r['exit'] not in [0,'timeout']]}
(root/'output/f12-code/suite-summary.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
