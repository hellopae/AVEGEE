"""Freeze contours transcribed from v7 ground-only grids; never read production masks.
Coordinates are native 2x. This is editable contour annotation, not frame synthesis.
Use run3-start snapshot so reruns do not compound labels.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main():
 ref=json.loads((ROOT/'review/run3-start-liquid-reference.json').read_text())
 groups=json.loads((ROOT/'review/run3-start-ground-reference-groups.json').read_text())
 patches={}
 def add(name,target,polygons,note):
  item={'groundRectMap1x':ref['masks'][target]['groundRectMap1x'],
        'definiteLiquidPolygons':polygons,'unlabelledPolygons':[],
        'groundOnlyGrid':f'review/boundary/run3-{target}-ground-grid.webp',
        'referencePolicy':note,'sameAiReviewer':True,'notHumanQA':True}
  patches[name]=item
  ref['groundPatches'][name]=item;groups['groups'][name]=item
  ref['masks'][target].setdefault('unionReferences',[]).append(name)
  groups['attach'].setdefault(target,[]).append(name)
 add('run3-ice-east-water-ground','ice-stream-flat-east',[
  [[0,18],[25,21],[50,25],[75,28],[99,31],[111,29],[103,39],
   [95,48],[88,57],[80,67],[73,78],[66,91],[60,104],[57,116],
   [52,118],[47,119],[44,124],[42,117],[38,111],[35,106],[35,98],
   [33,88],[31,80],[27,73],[24,70],[20,69],[16,70],[10,73],[3,81],[0,82]],
  [[166,51],[190,57],[220,68],[250,81],[265,83],[274,90],[295,95],
   [309,100],[309,110],[316,118],[326,122],[343,125],[355,129],[375,134],
   [385,140],[408,148],[425,151],[440,158],[462,166],[485,171],[510,179],
   [529,182],[529,213],[519,215],[513,223],[509,228],[503,218],
   [494,201],[483,189],[473,184],[461,183],[449,188],[439,197],[431,210],
   [423,232],[418,257],[414,273],[409,278],[404,269],[399,265],[391,266],
   [382,278],[375,294],[370,281],[366,269],[359,257],[351,248],[341,243],
   [332,248],[327,242],[319,239],[311,244],[305,238],[300,231],
   [294,226],[287,226],[283,230],[278,235],[269,232],[265,219],
   [261,193],[254,163],[247,139],[240,120],[233,110],[225,104],[216,101],
   [206,102],[198,107],[189,115],[181,126],[174,138],[169,132],[167,125]]
 ],'Open flowing cyan water bounded by the far cliff toes and foreground spires. '
   'Trace is inset on the water side. Snow-capped silhouettes, foliage and narrow uncertain antialiased edges remain unknown.')
 add('run3-ice-mouth-water-ground','ice-stream-flat-mouth',[
  [[0,0],[151,0],[149,14],[155,21],[158,27],[161,43],[167,47],
   [178,51],[193,51],[205,52],[219,54],[234,54],[243,52],[246,53],
   [242,61],[234,62],[229,61],[222,64],[214,64],[207,66],[199,66],
   [190,64],[181,64],[170,59],[162,54],[156,48],[148,45],
   [143,40],[137,37],[132,33],[125,32],[120,29],[114,29],
   [111,26],[111,22],[105,18],[110,15],[110,10],[102,8],
   [95,11],[89,10],[84,14],[80,13],[76,8],[72,6],[68,6],[63,9],
   [60,10],[55,13],[49,13],[44,18],[41,23],[38,22],[36,18],
   [30,19],[25,21],[23,19],[20,18],[18,12],[14,9],[9,7],[6,8],[3,5],[0,6]],
  [[111,34],[120,36],[128,39],[135,44],[143,49],[150,53],[157,62],
   [167,68],[179,71],[190,73],[198,74],[199,81],[187,83],[174,82],
   [161,78],[153,70],[147,64],[140,61],[131,59],[124,59],[118,62],
   [113,60],[113,54],[110,51],[111,45]]
 ],'Only the cyan flowing water above the near leaves and around the isolated boulder. '
   'Purple receiving river is not labelled as ice stream. Leaf tips, cliff, boulder and bank antialiasing remain unknown.')
 add('run3-lava-upper-left-curtain-ground','lavafall-upper-left',[
  [[22,0],[99,0],[100,23],[99,47],[98,65],[97,82],[94,99],
   [90,116],[84,134],[79,143],[67,146],[48,143],[29,139],
   [14,135],[4,132],[7,112],[10,83],[14,53],[18,24]],
  [[105,98],[113,97],[119,96],[119,103],[109,107],[102,111],
   [97,119],[92,132],[86,142],[80,146],[75,145],[82,131],
   [88,116],[93,108],[99,102]],
  [[0,144],[19,147],[38,150],[59,152],[84,152],[106,154],
   [112,157],[99,161],[83,164],[67,169],[51,174],[39,181],
   [29,189],[19,196],[0,197],[0,184],[14,176],[27,168],
   [39,162],[50,158],[32,156],[13,155],[0,153]]
 ],'Falling curtain and narrow right flowing ribbon traced from the smooth vertical strands. '
   'Receiving water is separate from the foreground rough rock rim; uncertain glowing cliff stays unknown.')
 add('run3-lava-mouth-curtain-ground','lavafall-mouth',[
  [[95,60],[129,60],[129,100],[133,119],[136,126],[132,150],
   [128,180],[123,207],[116,233],[108,249],[99,260],[89,261],
   [84,252],[82,236],[88,222],[93,200],[97,173],[99,148],
   [101,125],[100,110],[97,90]],
  [[111,245],[123,241],[130,236],[139,224],[145,211],[151,202],
   [156,201],[153,218],[148,236],[146,251],[147,260],[156,263],
   [170,266],[171,274],[154,277],[136,277],[117,275],[104,276],
   [91,273],[86,268],[97,264],[105,255]]
 ],'Smooth continuous lava strands in the centre-right curtain and white/orange receiving foam. '
   'The faceted right cliff is excluded; no red-colour classifier or production mask was consulted for these contours.')
 ref['latestGroundContinuation']={'worktree':'20261111T121657Z-35a18a5c',
  'source':'scripts/continue_run3_references.py','groundOnly':True,
  'productionMasksReadOrChanged':False,'labelsFrozenBeforeMeasurement':True,
  'sameAiReviewer':True,'notHumanQA':True,
  'unknownPolicy':'Unlabelled pixels remain unknown; only the visible ground contours are labelled.'}
 (ROOT/'review/liquid-reference.json').write_text(json.dumps(ref,ensure_ascii=False,indent=2)+'\n')
 groups['latestContinuation']=ref['latestGroundContinuation']
 (ROOT/'review/ground-reference-groups.json').write_text(json.dumps(groups,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'newGroups':list(patches)}))
if __name__=='__main__':main()
