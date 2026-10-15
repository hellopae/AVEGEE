"""Resume actual SPA verification when a licensed/self-built Aseprite is available.
Usage: .venv/bin/python run_native.py /absolute/path/to/aseprite
Run only from this pilot's directory; native outputs stay here.
"""
from pathlib import Path
import json, subprocess, sys

root=Path(__file__).resolve().parent
spa=root/'.venv/bin/spa'
if len(sys.argv)!=2:
    sys.exit('Pass the Aseprite executable path as the only argument.')
executable=str(Path(sys.argv[1]).resolve())
def run(group, operation, request):
    result=subprocess.run([str(spa),group,operation,'--input-json',json.dumps(request)],cwd=root,capture_output=True,text=True,timeout=150)
    (root/f'native-{group}-{operation}.json').write_text(result.stdout)
    if result.returncode:
        sys.exit(result.stdout+result.stderr)
    return json.loads(result.stdout)

source=str(root/'yama-attack-candidate.aseprite')
validation=run('sprite','validate',{'aseprite':executable,'sprite_file':source,'expected':{'width':640,'height':640,'color_mode':'rgb','frame_count':8}})
if validation.get('valid') is not True:
    sys.exit('Native validation did not explicitly return valid:true; inspect its log before exporting.')
run('export','sheet',{
    'aseprite':executable,'source_sprite_file':source,
    'selection':{'kind':'range','from_frame':1,'to_frame':8},
    'layer_composition':{'mode':'visible'},'output_color_mode':'rgb',
    'layout':{'kind':'horizontal'},'trim':'none',
    'padding':{'border':0,'shape':0,'inner':0},'filename_format':'attack-{frame0}',
    'image_destination':{'path':str(root/'native-sheet.png'),'if_exists':'fail'},
    'metadata_destination':{'path':str(root/'native-sheet.json'),'if_exists':'fail'}
})
print('Native SPA validation and sheet export completed. Compare native pixels/timing before adoption.')
