from pathlib import Path
from PIL import Image,ImageDraw
import json, math,re
O=Path(__file__).resolve().parents[1]
S=Path('/Users/agapae/Documents/Work PAE/Claude/AVEGEE-reference/files/UI New map/New Pic Map Zone1')
L=Path('/Users/agapae/agapae-work/.toby-worktrees/z1-layout/docs/art-reviews/2026-11-05-zone1-layout/layout.json')
meta=json.loads(L.read_text());manifest=json.loads(Path('/Users/agapae/agapae-work/.toby-worktrees/z1-layout/img/map-zone1/v6/manifest.json').read_text());layout=json.loads((O/'inputs/game-layout.json').read_text());files=json.loads((O/'inputs/owner-files.json').read_text())
# Coordinates manually surveyed on the 1600px overview; convert to the exact 4915x3277 atlas/world.
# Continuous shrub beds are one object; independent trees/posts/rails have individual records.
items=[];scale=4915/1600;WX=3840/4915;WY=2560/3277
colors={'extract-redraw':'#ff6478','replace':'#49ded6','keep-baked':'#a8a1bf'}
refs={'tree':51,'shrub':23,'green-tree':18,'green-shrub':22,'snow-tree':20,'rock':26,'lamp':31}
def add(id,kind,box,action=None,foot=None,note=''):
 x,y,w,h=box;w=min(w,1600-x);h=min(h,3277/scale-y);foot=foot or [x+w*.5,y+h*.92]
 act=action or ('replace:'+Path(files[refs[kind]]).name if kind in refs else 'extract-redraw')
 wp=[round(x*scale*WX,3),round(y*scale*WY,3),round(w*scale*WX,3),round(h*scale*WY,3)];fp=[round(foot[0]*scale*WX,3),round(foot[1]*scale*WY,3)]
 chunks=[]
 for r in range(1,5):
  for c in range(1,6):
   ax=(c-1)*1024;ay=(r-1)*1024
   if x*scale<min(c*1024,4915) and (x+w)*scale>ax and y*scale<min(r*1024,3277) and (y+h)*scale>ay:chunks.append(f'r{r}-c{c}')
 items.append(dict(id=id,kind=kind,bboxWorld=wp,footWorld=fp,chunk=chunks,action=act,note=note))
# Whole-map survey: each distant forest cluster intentionally stays baked.
for i,b in enumerate([(0,0,330,120),(310,0,340,125),(650,0,270,130),(900,0,270,140),(1260,0,340,150),(0,260,110,140),(0,700,150,140),(1360,120,240,180),(1450,400,150,140),(0,990,270,77),(1000,1010,600,57)]):add(f'distant-{i:02}','cliff-forest',b,'keep-baked',note='กลุ่มป่าหินฉากไกล/ขอบโลก ตรวจเป็นกลุ่ม ไม่ใช่วัตถุแยก')
# Red biome: independent foreground trees and tall plants around all three courts / paths.
for i,b in enumerate([(20,142,26,65),(56,148,32,72),(257,128,42,70),(272,223,32,56),(54,260,33,70),(20,302,34,62),(237,300,34,65),(286,313,35,62),(24,401,29,55),(48,420,28,53),(265,424,33,62),(284,445,32,56),(40,537,36,60),(270,533,38,65),(267,609,39,68),(18,633,30,55),(24,837,40,65),(290,831,45,68)]):add(f'west-tree-{i:02}','tree',b)
for i,b in enumerate([(67,223,53,22),(94,289,48,25),(210,279,57,25),(241,376,53,30),(25,366,55,30),(6,483,45,30),(203,491,58,32),(60,505,55,30),(6,611,60,31),(235,662,58,31),(29,723,60,31),(150,680,64,28)]):add(f'west-bed-{i:02}','shrub',b)
# Warm city and north/heaven terraces, independent tall trees beside the pavement.
for i,b in enumerate([(635,219,42,59),(666,183,43,75),(769,137,43,60),(780,195,43,60),(820,217,48,71),(868,208,48,73),(880,258,48,63),(941,255,40,67),(986,290,43,67),(570,435,41,74),(609,475,47,69),(667,493,42,72),(753,473,42,64),(859,453,44,66),(905,480,43,69),(983,483,42,63),(1013,531,45,76),(1053,565,44,75)]):add(f'city-tree-{i:02}','green-tree',b)
for i,b in enumerate([(601,334,45,31),(674,326,48,35),(803,321,42,35),(842,344,45,32),(688,516,45,34),(737,549,46,31),(846,547,52,35),(889,612,50,34)]):add(f'city-bed-{i:02}','green-shrub',b)
for i,b in enumerate([(939,147,28,52),(951,184,30,49),(1154,149,28,50),(1164,216,34,53),(1250,279,31,60),(1270,232,32,60),(1415,291,28,58),(1495,258,29,55),(1330,397,32,64),(1442,422,30,58),(1490,469,32,62)]):add(f'ice-tree-{i:02}','snow-tree',b)
for i,b in enumerate([(1282,518,37,65),(1301,524,40,70),(1416,560,39,68),(1501,556,40,71),(1570,582,30,67)]):add(f'east-tree-{i:02}','green-tree',b)
# Pilot: plants/rocks beside stairs, center promenade and south plaza.
for i,b in enumerate([(542,280,43,59),(552,355,42,65),(548,580,41,68),(599,641,39,66),(468,793,34,58),(508,827,34,60),(645,830,34,64),(687,873,38,66),(634,966,35,69),(1069,850,38,69),(1090,917,42,71),(958,928,39,65),(1016,997,40,70)]):add(f'pilot-red-tree-{i:02}','tree',b)
for i,b in enumerate([(684,630,29,54),(701,900,36,64),(901,900,35,64),(681,977,34,64)]):add(f'pilot-gold-tree-{i:02}','green-tree',b)
for i,b in enumerate([(496,814,58,36),(532,881,52,35),(590,859,48,36),(629,887,48,34),(645,925,47,36),(693,984,52,35),(880,972,48,35),(916,1030,52,32),(1041,854,54,36),(1026,922,55,36),(1086,965,56,38),(1172,942,54,36),(1168,819,60,35),(489,1011,52,34),(396,919,52,32),(1290,971,60,32),(1452,878,62,36),(1518,1012,61,36)]):add(f'south-bed-{i:02}','shrub',b)
for i,b in enumerate([(347,879,49,69),(416,937,45,62),(562,879,55,67),(593,829,39,50),(1089,906,47,59),(995,855,39,51),(1268,865,43,55),(1412,945,40,61),(1550,874,45,58)]):add(f'south-rock-{i:02}','rock',b)
# All bridge rail systems: deck and steps remain terrain. Rear/front never one combined sprite.
for tag,back,front in [('lava-upper',(302,234,147,33),(299,259,150,42)),('lava-lower',(332,378,106,28),(332,399,110,38)),('ice-upper',(1175,154,124,28),(1178,178,123,37)),('ice-mid',(1007,405,75,22),(1006,424,79,30)),('ice-lower',(1296,630,103,25),(1297,652,105,32)),('river',(764,606,21,214),(817,606,20,214))]:
 add(tag+'-back','bridge-rail',back,foot=[back[0]+back[2]/2,back[1]+back[3]],note='เฉพาะราว/เสาหลัง พื้นสะพานอยู่ใน terrain')
 add(tag+'-front','bridge-rail',front,foot=[front[0]+front[2]/2,front[1]+front[3]],note='เฉพาะราว/เสาหน้า พื้นสะพานอยู่ใน terrain')
for id,b in [('pier-back',(905,697,14,65)),('pier-front',(951,696,17,69)),('south-stair-west',(766,959,15,38)),('south-stair-east',(819,959,15,38))]:add(id,'pillar',b,note='เสาแยก ไม่รวมขั้นบันได')
# Exclude things rendered separately by the existing game; keep this audit list separate from baked inventory.
(O/'existing-scenery-exclusions.json').write_text(json.dumps({'source':'src/town-layout.js TOWN_PROP_SITES; src/town-scenery.js TOWN_TREES','objects':layout['props'],'note':'ไม่สร้างรายการซ้ำจากตำแหน่งโค้ด; inventory มาจากภาพพื้นเท่านั้น'},ensure_ascii=False,indent=2))
mask=Image.open(O/'inputs/walkmask-brief.png').convert('L')
import cv2,numpy as np
expanded=cv2.dilate(np.array(mask),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(63,63)))
for a in items:
 x,y,w,h=a['bboxWorld'];x0=int(x/WX);y0=int(y/WY);x1=min(4915,math.ceil((x+w)/WX));y1=min(3277,math.ceil((y+h)/WY));a['nearWalk24']=bool(np.any(expanded[max(0,y0):y1,max(0,x0):x1]))
 a['survey']='manual overview bbox; continuous vegetation grouped'
(O/'objects-inventory.json').write_text(json.dumps(items,ensure_ascii=False,indent=2))
im=Image.open(O/'master-1x.jpg');d=ImageDraw.Draw(im)
for a in items:
 x,y,w,h=a['bboxWorld'];box=[x/WX,y/WY,(x+w)/WX,(y+h)/WY];c=colors.get(a['action'],colors['replace']);d.rectangle(box,outline=c,width=5);d.text((box[0]+2,box[1]+2),a['id'],fill='white',stroke_fill='black',stroke_width=1)
for r in range(1,5):
 for c in range(1,6):
  x=(c-1)*1024;y=(r-1)*1024;d.rectangle([x,y,min(x+1023,4914),min(y+1023,3276)],outline='#ffff99',width=3);d.text((x+12,y+14),f'r{r}-c{c}',fill='white',stroke_fill='black',stroke_width=3)
im.save(O/'inventory-overlay.jpg',quality=92)
# Mapping from full-size source metadata, never guessing from thumbnail filenames.
byStation={x['station']:x for x in manifest['objects'] if x.get('station')}
def source_for(obj):
 h=Path(obj['src']).stem.replace('spr-','').split('-')[0];return meta['sprites'].get(h,{})
lines=['# จับคู่ภาพใหม่กับที่ตั้งเดิม (ข้อเสนอ ไม่ย้ายผัง)','', 'ขนาดเป็น world units; ยึดความกว้างเดิม แล้วคำนวณสูงจากสัดส่วน alpha crop ต้นฉบับเต็ม ข้อมูล v6 ใช้ระบุชื่อชิ้นเท่านั้น ไม่ใช้ตำแหน่ง v6', '', '| id เดิม | ภาพต้นฉบับเต็ม / sprite ชุดใหม่ | foot เดิม | ขนาดเสนอ กว้าง×สูง | สถานะ |','|---|---|---|---|---|']
for key,s in layout['stations'].items():
 obj=byStation.get(key);md=source_for(obj) if obj else {};crop=md.get('crop',[0,0,1,1]);h=s['bw']*(crop[3]-crop[1])/(crop[2]-crop[0]);lines.append(f"| {key} | {md.get('sourceFile','ไม่มีชัดเจน')} / {obj['src'] if obj else '—'} | {s['bx']},{s['by']} | {s['bw']}×{h:.1f} | {'เสนอใช้' if obj else 'รอคุณเป้'} |")
# Canteen is house slot 3, not a station key in this checkout.
h=layout['houses'][3];lines.append(f"| canteen (house[3]) | ไม่มีชัดเจน | {h['x']},{h['y']} | {h['w']}×{h['h']:.1f} (slot เดิม) | รอคุณเป้ |")
for i,h in enumerate(layout['houses']):
 if i==3:continue
 idx=50 if 'two' in h['key'] else 43;lines.append(f"| house[{i}] {h['key']} | {Path(files[idx]).name} | {h['x']},{h['y']} | {h['w']}×{h['h']:.1f} (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |")
d=layout['dais'];lines.append(f"| TOWN_DAIS | {Path(files[44]).name} | {d['x']},{d['y']} | {d['w']}×ประมาณ 206 | เสนอใช้; ไม่รวมบันไดพื้นเดิม |")
f=layout['frontier'];lines.append(f"| TOWN_FRONTIER | {Path(files[53]).name} | {f['bx']},{f['by']} | {f['bw']}×ประมาณ 164 | รอคุณเป้: ประตูใหม่ใหญ่กว่าเดิมมาก |")
for p in layout['props']:
 if p['kind'] in ['lamp','torch']:
  idx=31 if p['kind']=='lamp' else 32;lines.append(f"| {p['id']} ({p['kind']}) | {Path(files[idx]).name} | {p['x']},{p['y']} | {p['w']}×{p['h']} | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |")
lines+=['','ป่าดาบ `dab`, ต้นงิ้ว `ngiw`, โรงอาหาร `canteen`: **รอคุณเป้** ไม่แทนด้วยต้นไม้หรืออาคารที่เดาเอง','', 'ไฟล์ในตารางอ่านจากต้นฉบับเต็ม; งานนี้ไม่คัดลอกอาคารทั้งชุด ไม่ได้ประกอบเข้าเกม']
(O/'station-mapping.md').write_text('\n'.join(lines))
print('Inventory',len(items),'across',len(set(c for a in items for c in a['chunk'])),'chunks')
