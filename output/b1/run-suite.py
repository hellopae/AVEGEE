"""Bound each existing test file so a synchronous asset/pathfinding test cannot hide other results."""
from pathlib import Path
import concurrent.futures, subprocess, os, signal, json, time
root=Path(__file__).resolve().parents[2]
out=root/'output/b1/suite';out.mkdir(exist_ok=True)
def run(path):
 start=time.monotonic(); log=out/(path.stem+'.log')
 with log.open('w') as f:
  p=subprocess.Popen(['node','--test',str(path)],cwd=root,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
  try:
   code=p.wait(timeout=90);status='completed'
  except subprocess.TimeoutExpired:
   os.killpg(p.pid,signal.SIGKILL);p.wait();code=None;status='timeout'
 return dict(file=str(path.relative_to(root)),exitCode=code,status=status,seconds=round(time.monotonic()-start,2))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 results=list(pool.map(run,sorted((root/'tests').glob('*.test.mjs'))))
(out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'files':len(results),'exit0':sum(r['exitCode']==0 for r in results),'nonzero':[r for r in results if r['exitCode']!=0]},indent=2))
