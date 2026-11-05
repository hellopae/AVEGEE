"""Trace v5 fluid ROIs, restrict by visible color, preserve occluding terrain.
Coordinates below refer to the 1500 x 1000 inspection proxy; PNGs use master pixels.
No generated animation pixels are created by this script.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
im=np.asarray(Image.open(ROOT/'master-v5.webp').convert('RGB'))
H,W=im.shape[:2]; sx=W/1500; sy=H/1000
rgb=im.astype(float);r,g,b=rgb.transpose(2,0,1)
hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV)
(ROOT/'masks').mkdir(exist_ok=True)
(ROOT/'masks/regions').mkdir(exist_ok=True)
colors={'lava':(255,80,0),'lavafall':(255,220,0),'spirit-river':(220,0,255),'ice-stream':(0,230,255),'waterfall':(0,90,255),'fog':(130,255,130)}
aggregate={k:np.zeros((H,W),np.uint8) for k in colors}
regions=[]

def add(id,kind,points,flow,fall=False):
    roi=np.zeros((H,W),np.uint8)
    poly=np.array([(round(x*sx),round(y*sy)) for x,y in points],np.int32)
    cv2.fillPoly(roi,[poly],255)
    if kind in ('lava','lavafall'):
        color=(r>150)&(g>65)&(r>g*1.12)&(g>b*1.65)&(hsv[:,:,1]>110)
    elif kind=='spirit-river':
        color=(b>r*.89)&(b>g*1.28)&(r>g*1.15)&(b>55)
    elif kind in ('ice-stream','waterfall'):
        color=(b>r*1.18)&(g>r*1.12)&(b>90)&(g>75)
        # The white threads/splash are included only when connected to cyan.
        cyan=cv2.dilate(color.astype(np.uint8),np.ones((11,11),np.uint8))>0
        color|=cyan&(r>150)&(g>165)&(b>180)&(b>r*.98)
    else:
        color=(r>104)&(g>100)&(b>115)&(hsv[:,:,1]<90)
    mask=(color&(roi>0)).astype(np.uint8)*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    mask[roi==0]=0
    count,labels,stats,_=cv2.connectedComponentsWithStats(mask)
    keep=np.zeros(count,np.uint8)
    keep[1:]=(stats[1:,cv2.CC_STAT_AREA]>=24)*255
    mask=keep[labels]
    # Separate vertical falls from horizontal surface channels.
    aggregate[kind]=cv2.bitwise_or(aggregate[kind],mask)
    yy,xx=np.where(mask>0)
    if not len(xx):raise ValueError(id)
    x,y,x2,y2=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
    path=f'masks/regions/{id}.png'
    Image.fromarray(mask[y:y2,x:x2]).save(ROOT/path,optimize=True)
    contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    outer=[];holes=[]
    for ci,c in enumerate(contours):
        if cv2.contourArea(c)<12:continue
        c=cv2.approxPolyDP(c,1.0,True)
        pointsW=[[round(float(a)*3840/W,3),round(float(bb)*2560/H,3)] for a,bb in c[:,0]]
        (outer if hierarchy[0][ci][3]<0 else holes).append(pointsW)
    reg={'id':id,'kind':kind,'polygonWorld':max(outer,key=len),'additionalPolygonsWorld':outer[1:] if len(outer)>1 else [],'holesWorld':holes,'flowDir':flow,'mask':path,'maskRectPx':[x,y,x2-x,y2-y],'rectWorld':[round(x*3840/W,5),round(y*2560/H,5),round((x2-x)*3840/W,5),round((y2-y)*2560/H,5)],'coveredPixels':len(xx),'boundaryAuthority':'raster mask; polygon contours are simplified by <=1 source pixel'}
    # Keep all outer polygons, including the largest, without duplicates.
    reg['additionalPolygonsWorld']=[p for p in outer if p is not reg['polygonWorld']]
    regions.append(reg)

# Narrow hand traced corridors exclude plazas, stairs, foliage and bridge decks.
add('lava-upper','lava',[(95,84),(151,52),(179,45),(192,88),(217,77),(228,52),(252,56),(274,82),(313,88),(324,104),(361,109),(385,131),(385,179),(420,186),(427,213),(396,237),(345,231),(321,201),(330,179),(344,158),(345,132),(305,120),(276,115),(267,86),(247,82),(225,99),(218,123),(176,135),(151,122),(151,105),(112,112),(99,103)], [0,1])
add('lava-left','lava',[(0,179),(46,181),(53,208),(82,222),(105,246),(99,272),(144,280),(159,303),(139,320),(106,305),(74,311),(49,291),(43,273),(56,245),(46,230),(21,220),(0,223)], [0,1])
add('lava-middle','lava',[(332,244),(375,248),(381,274),(377,307),(396,324),(445,336),(452,355),(400,369),(374,358),(350,349),(324,325),(325,293)], [0,1])
add('lava-lower','lava',[(320,382),(367,380),(378,417),(392,435),(425,450),(424,480),(451,501),(463,536),(457,565),(478,580),(513,597),(525,634),(517,658),(484,671),(454,652),(449,614),(422,611),(409,626),(400,657),(367,675),(345,664),(362,636),(358,613),(371,593),(404,579),(410,560),(390,531),(379,502),(360,489),(351,452),(328,437)], [0,1])
add('lava-left-bottom','lava',[(80,346),(111,361),(114,386),(135,407),(113,418),(99,394),(76,386),(70,365)], [0,1])
add('lava-southwest','lava',[(98,531),(124,529),(144,547),(159,560),(175,583),(176,600),(165,611),(145,590),(128,583),(117,563),(101,552)], [0,1])
lavafalls=[('volcano',[(220,22),(242,23),(251,70),(229,73)]),('upper-left',[(141,75),(157,75),(157,105),(139,105)]),('upper-step',[(342,129),(371,131),(374,178),(345,179)]),('west',[(56,224),(85,224),(92,267),(63,276)]),('bridge',[(339,262),(376,266),(375,309),(344,312)]),('middle',[(332,391),(365,392),(373,443),(341,446)]),('lower-step',[(410,513),(450,514),(452,556),(424,562)]),('mouth',[(368,623),(390,620),(398,659),(367,668)])]
for id,poly in lavafalls:add('lavafall-'+id,'lavafall',poly,[0,1],True)
add('river-main','spirit-river',[(0,685),(88,680),(161,677),(216,689),(303,680),(357,670),(396,663),(461,649),(514,654),(553,649),(583,674),(638,686),(690,684),(719,679),(725,747),(713,762),(638,758),(602,752),(559,763),(516,761),(476,770),(435,755),(398,771),(355,751),(317,762),(277,753),(226,764),(185,757),(147,750),(125,761),(94,742),(84,733),(72,735),(59,755),(0,755)], [1,0])
add('river-east','spirit-river',[(782,678),(828,684),(846,683),(848,707),(887,721),(910,714),(899,687),(943,672),(1008,669),(1092,672),(1164,679),(1201,671),(1241,666),(1286,658),(1338,670),(1390,674),(1440,683),(1500,679),(1500,773),(1444,778),(1389,767),(1367,774),(1332,763),(1274,770),(1245,762),(1173,771),(1118,758),(1073,769),(1020,754),(964,764),(933,752),(864,766),(817,757),(786,760)], [1,0])
add('ice-upper','ice-stream',[(1137,180),(1176,176),(1182,191),(1173,212),(1204,227),(1230,240),(1248,256),(1296,265),(1302,278),(1265,282),(1234,265),(1192,254),(1163,240),(1148,217),(1121,214)], [-0.4,1])
add('ice-central','ice-stream',[(1067,281),(1069,300),(1048,318),(1043,340),(1024,351),(1002,366),(995,387),(982,386),(960,385),(974,362),(992,349),(1009,328),(1025,308),(1046,302)], [-0.55,1])
add('ice-lower','ice-stream',[(947,408),(983,408),(982,436),(966,448),(1005,461),(1031,474),(1079,482),(1107,494),(1161,493),(1195,486),(1201,515),(1200,535),(1215,552),(1220,577),(1229,592),(1245,609),(1221,613),(1203,598),(1187,578),(1179,555),(1174,529),(1150,520),(1104,511),(1058,509),(1021,492),(991,480),(970,463),(945,457),(934,445)], [0.6,1])
add('ice-mouth','ice-stream',[(1241,628),(1283,623),(1288,647),(1303,653),(1298,666),(1259,665),(1250,651)], [0.4,1])
add('ice-east','ice-stream',[(1418,324),(1457,321),(1468,339),(1466,363),(1499,372),(1500,400),(1477,393),(1452,378),(1439,367),(1440,343),(1423,341)], [0.3,1])
icefalls=[('summit',[(1353,84),(1375,83),(1372,132),(1361,150),(1349,140)]),('upper-bridge',[(1145,181),(1176,177),(1173,207),(1154,217),(1142,207)]),('upper-right',[(1218,211),(1233,210),(1234,244),(1215,252),(1207,244)]),('plaza-right',[(1281,246),(1302,245),(1304,273),(1283,278)]),('center-step',[(1029,309),(1050,305),(1045,337),(1026,347),(1017,337)]),('center-bridge',[(955,410),(980,410),(980,436),(962,449),(945,442)]),('lower-1',[(1178,485),(1198,486),(1199,514),(1181,521),(1172,514)]),('lower-2',[(1187,530),(1204,531),(1210,552),(1195,560),(1185,550)]),('lower-3',[(1190,562),(1217,562),(1220,588),(1204,597),(1189,587)]),('mouth',[(1253,633),(1285,628),(1286,649),(1272,660),(1256,655)]),('east-cliff',[(1438,328),(1460,325),(1460,363),(1443,376),(1431,363)])]
for id,poly in icefalls:add('waterfall-ice-'+id,'waterfall',poly,[0,1],True)
# Fog only in visible recesses; exclude ambiguous white patches touching walkable land.
fogs=[('west-upper',[(414,65),(449,70),(469,62),(491,73),(489,103),(462,118),(451,144),(433,156),(415,138),(424,113)]),('west-middle',[(0,432),(40,431),(58,449),(89,451),(105,480),(99,499),(74,503),(51,483),(22,493),(0,486)]),('west-mouth',[(0,601),(30,617),(50,618),(70,642),(103,640),(116,661),(95,678),(69,669),(42,676),(20,666),(0,676)]),('gold-upper',[(793,145),(818,149),(826,173),(847,177),(860,197),(892,207),(916,231),(911,253),(884,261),(867,245),(844,244),(831,222),(808,217),(799,192)]),('gold-lower',[(969,257),(995,261),(1011,282),(1005,303),(982,312),(965,301),(950,286)]),('east-valley',[(1363,410),(1381,417),(1389,432),(1414,438),(1407,455),(1395,471),(1367,470),(1353,454)]),('south-center',[(990,611),(1012,605),(1036,620),(1046,642),(1020,651),(994,642),(978,646),(972,630)])]
for id,poly in fogs:add('fog-bank-'+id,'fog',poly,[0,0])

# Make aggregate channels disjoint, with the fall masks owning vertical sections.
for surface,fall in [('lava','lavafall'),('ice-stream','waterfall')]:
    aggregate[surface][aggregate[fall]>0]=0
for reg in regions:
    x,y,w,h=reg['maskRectPx'];a=np.asarray(Image.open(ROOT/reg['mask'])).copy()
    a[aggregate[reg['kind']][y:y+h,x:x+w]==0]=0
    Image.fromarray(a).save(ROOT/reg['mask'],optimize=True)
    reg['coveredPixels']=int(np.count_nonzero(a))
    contours,hierarchy=cv2.findContours(a,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    outer=[];holes=[]
    for ci,c in enumerate(contours):
        if cv2.contourArea(c)<12:continue
        c=cv2.approxPolyDP(c,1.0,True)
        pointsW=[[round(float(ax+x)*3840/W,3),round(float(ay+y)*2560/H,3)] for ax,ay in c[:,0]]
        (outer if hierarchy[0][ci][3]<0 else holes).append(pointsW)
    reg['polygonWorld']=max(outer,key=len)
    reg['additionalPolygonsWorld']=[p for p in outer if p is not reg['polygonWorld']]
    reg['holesWorld']=holes
    if reg['id']=='ice-upper':reg['flowDir']=[.4,1]
for kind,m in aggregate.items():
    Image.fromarray(m).save(ROOT/f'masks/{kind}-1x.png',optimize=True)
    Image.fromarray(m).resize((W*2,H*2),Image.Resampling.NEAREST).save(ROOT/f'masks/{kind}-2x.png',optimize=True)
overlay=im.copy().astype(float)
for kind,m in aggregate.items():
    sel=m>0;overlay[sel]=overlay[sel]*.48+np.array(colors[kind])*.52
preview=Image.fromarray(overlay.astype('uint8'));preview.thumbnail((1800,1200))
draw=ImageDraw.Draw(preview)
for i,(kind,col) in enumerate(colors.items()):
    draw.rectangle((10,10+i*24,200,32+i*24),fill='black');draw.text((16,14+i*24),kind,fill=col)
preview.save(ROOT/'masks-overlay.jpg',quality=94)
(ROOT/'regions.json').write_text(json.dumps({'masterSize':[W,H],'worldSize':[3840,2560],'nominalPixelsPerWorldUnit':1.28,'exactScale':[W/3840,H/2560],'regions':regions,'omitted':['white/snow surrounding upper ice plaza: not valley fog','sky clouds and distant cloud deck: no moving sky requested','ambiguous pale patches on walkable plazas','lava steam and airborne embers omitted to prevent haze']},ensure_ascii=False,indent=2))
print('regions',len(regions),'channels', {k:int(np.count_nonzero(m)) for k,m in aggregate.items()})
