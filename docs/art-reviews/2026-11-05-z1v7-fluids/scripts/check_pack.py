"""Check delivery boundaries/metadata only; exit 0 is NOT art acceptance or QA.
Refresh manifest and byte budget after all art-review outputs are finalized.
"""
import ast
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
PREFIX = str(ROOT.relative_to(REPO)) + '/'


def write(name, data):
    (ROOT/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')


class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[]
    def handle_starttag(self, tag, attrs):
        self.links += [v for k,v in attrs if k in ('src','href','poster') and v]


def main():
    json_count=0
    for p in ROOT.rglob('*.json'):
        json.loads(p.read_text());json_count+=1
    python_count=0
    for p in (ROOT/'scripts').glob('*.py'):
        ast.parse(p.read_text(),filename=str(p));python_count+=1
    refs=[]
    for rel in ['review/index.html','review.html']:
        p=ROOT/rel;parser=Links();parser.feed(p.read_text());refs.extend((p,v) for v in parser.links)
    refs += [(ROOT/'README.md',v) for v in re.findall(r'\]\(([^)]+)\)',(ROOT/'README.md').read_text())]
    broken=[];local=0
    for p,value in refs:
        if re.match(r'^[a-z]+:',value) or value.startswith('#'):continue
        path=(p.parent/unquote(value.split('#')[0].split('?')[0])).resolve();local+=1
        if not path.is_file():broken.append({'source':str(p.relative_to(ROOT)),'link':value})
    whitespace=[]
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix in ['.py','.js','.html','.json','.md']:
            for number,line in enumerate(p.read_text().splitlines(),1):
                if line.rstrip()!=line:whitespace.append(f'{p.relative_to(ROOT)}:{number}')
    status=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=REPO,text=True)
    paths=[line[3:] for line in status.splitlines()]
    outside=[p for p in paths if not p.startswith(PREFIX)]
    diff=subprocess.run(['git','diff','--check'],cwd=REPO,capture_output=True,text=True)
    branch=subprocess.check_output(['git','symbolic-ref','--short','HEAD'],cwd=REPO,text=True).strip()
    queue=json.loads((ROOT/'queue-check.json').read_text())
    acceptance=json.loads((ROOT/'review/delivery-verification.json').read_text())
    synchronized=queue['status']=='incomplete' and not acceptance['acceptanceComplete'] and bool(queue['remaining'])
    checks={'pythonSyntaxFiles':python_count,'jsonFilesParsed':json_count,'textTrailingWhitespace':whitespace,
            'localLinksChecked':local,'brokenLocalLinks':broken,'changedPaths':len(paths),'pathsOutsideDelivery':outside,
            'branch':branch,'gitDiffCheckExit':diff.returncode,'gitDiffCheckOutput':diff.stdout+diff.stderr,
            'queueMatchesUnresolvedAcceptance':synchronized,
            'limitation':'File/schema checks only. git diff --check does not inspect untracked files; their text whitespace is checked above. No game tests/deploy/visual playback QA.'}
    write('review/scope-check.json',checks)
    exclude={'delivery-manifest.json','delivery-size.json','review/scope-check.json'}
    entries=[]
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and str(p.relative_to(ROOT)) not in exclude:
            entries.append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    write('delivery-manifest.json',{'excludesMutableMetadata':sorted(exclude),'files':entries})
    baseline = {item['path']: item['sha256'] for item in
                json.loads((ROOT/'review/20261111T112241Z-copy-receipt.json').read_text())['files']}
    current = {item['path']: item['sha256'] for item in entries}
    changed_assets = [path for path in sorted(set(baseline) | set(current))
                      if path.startswith(('masks/', 'sheets/', 'sources/', 'input/v7/'))
                      and baseline.get(path) != current.get(path)]
    size={'files':0,'totalBytesIncludingThisReport':0,'limitBytes':80000000,'withinLimit':False,
          'definition':'Sum of regular file sizes in this folder, including manifest, scope check and this report; decimal MB.',
          'productionMasksModifiedThisContinuation':any(path.startswith('masks/') for path in changed_assets),
          'productionSheetsModifiedThisContinuation':any(path.startswith('sheets/') for path in changed_assets),
          'sourceFramesAndTerrainModifiedThisContinuation':any(path.startswith(('sources/', 'input/v7/')) for path in changed_assets),
          'changedProductionAssetsComparedToLatestRun':changed_assets}
    # Fixed point includes the digits of this report in its own byte count.
    for _ in range(10):
        write('delivery-size.json',size)
        files=[p for p in ROOT.rglob('*') if p.is_file()]
        total=sum(p.stat().st_size for p in files)
        next_size=dict(size,files=len(files),totalBytesIncludingThisReport=total,withinLimit=total<=80000000)
        if next_size==size:break
        size=next_size
    else:raise RuntimeError('Byte count did not stabilize')
    okay=not broken and not whitespace and not outside and diff.returncode==0 and synchronized and size['withinLimit']
    print(json.dumps({'metadataChecksOkay':okay,'size':size,'scope':checks,'acceptanceComplete':False},ensure_ascii=False,indent=2))
    return 0 if okay else 1


if __name__=='__main__':raise SystemExit(main())
