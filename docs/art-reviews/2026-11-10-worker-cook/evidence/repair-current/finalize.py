"""Write current delivery metadata. Historical evidence remains attributed to its run."""
from pathlib import Path
import hashlib
import json
import shutil
EV=Path(__file__).resolve().parent
OUT=EV.parents[1]
INPUT=Path('/Users/agapae/agapae-work/.toby-worktrees/.codex-worktrees/20261111T121621Z-c330d056/docs/art-reviews/2026-11-10-worker-cook')
run='20261111T162400Z-6a49dc9c'
for name in ('README.md','loop-review.json','queue-check.json','worker-cook.json'):
    shutil.copyfile(INPUT/name,EV/f'inherited-121621-{name}')
manifest=json.loads((OUT/'worker-cook.json').read_text())
manifest['status']='incomplete'
manifest['reviewRound']=run
manifest['mirrorSemantics']='mirroredFrom records direction provenance; independent repairs can change pixels afterward'
for entry in manifest['animations']:
    edited=entry['zone']=='cyberhell' or entry['anim']=='carry'
    entry['revision']=f'{run}: '+('original direction-matched stationary neck cutout, drawn body/hands/props retained' if edited else 'retained latest inherited artwork without redrawing')
    entry['registrationEvidence']='evidence/repair-current/preservation-check.json'
(OUT/'worker-cook.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
audit=json.loads((OUT/'evidence/current-audit.json').read_text())
identity=json.loads((OUT/'evidence/repair-identity/identity-foot-check.json').read_text())
preservation=json.loads((EV/'preservation-check.json').read_text())
repair=json.loads((EV/'repair-report.json').read_text())
generation=json.loads((EV/'generation-log.json').read_text())
remaining=[
    'ยังไม่ได้ดู GIF เล่นต่อเนื่องจริง เครื่องมือ browser ตอบ The browser access host is unavailable จึงยังยืนยันรอยต่อมือ ช้อน ข้าวปั้น และช่วงขา 4→5/8→1 ไม่ได้',
    'รายละเอียดลำตัวและสัดส่วนยังต่างจาก idle ต้นฉบับบางจุด เช่น เข็มขัด แผงอกและสนับเข่า cyberhell รวมถึงด้าน/ตำแหน่งกระเป๋าของ TH cook ต้องเก็บต่อโดยรักษามือและอุปกรณ์ที่วาดจริง',
    'ฐาน alpha cook และกึ่งกลางแถบรองเท้าตรงค่าที่วัด แต่ยังต้องยืนยันจุดสัมผัสเท้าทางกายวิภาค และความต่อเนื่องของสัดส่วนตลอด loop จาก playback'
]
visual={
    'run':run,'animatedPlaybackReviewed':False,
    'staticReview':[
        {'images':['evidence/repair-current/current-cyberhell-cook-down-left.jpg','evidence/repair-current/before-cyberhell-cook-1.jpg'],'observed':'4→5/8→1 หัวเดิมคงรูป สี และตำแหน่งในภาพนิ่ง รอยต่อคอใช้ source ตรงทิศ ลำตัว/เข็มขัดยังเปลี่ยนรูปตามชุดวาดเดิม'},
        {'images':['evidence/repair-current/current-th-cook-down-left.jpg','evidence/repair-current/before-th-cook-1.jpg'],'observed':'เฟรม7 จากฐานล่าสุดแก้ปื้นผ้าแล้ว จึงเก็บเฟรมนี้ไว้ทั้งภาพ มือและข้าวปั้นเคลื่อนลงจริง ด้านกระเป๋ายังต่างจาก idle ต้นฉบับ'},
        {'images':[f'evidence/repair-current/current-th-carry-{direction}.jpg' for direction in ('side','side-left','down','up')],'observed':'ถาดและขาแต่ละเฟรมยังเป็นภาพวาดเดิม ซ่อมคอโดยแยกจากอาหาร ยังยืนยันจังหวะเดินขณะเล่นไม่ได้'},
        {'images':[f'evidence/native-alpha-th-carry-{direction}-{start}-{start+3}.jpg' for direction in ('side','side-left','down','up') for start in (1,5)],'observed':'ดู carry TH ครบ32เฟรมบนพื้นขาว ดำ เขียว ไม่พบขอบแดงหรือเหลืองที่แยกออกจากสีผิว/ลายทองของตัวละคร บางมุมมีรอยต่อคอเสื้อเข้มจากการประกอบที่ควรดูอีกครั้งระหว่าง playback'},
        {'images':[f'evidence/repair-current/current-{zone}-cook-down-right.jpg' for zone in ('th','asia','west','cyberhell')],'observed':'cook ครบ8เฟรมต่อทิศ รูปมือ ช้อนและข้าวปั้นเปลี่ยนตามท่าที่วาดเดิม แถว8คืนช้อนเข้าแถว1มีความต่างที่ต้องตัดสินเมื่อเล่นจริง'}
    ],'remaining':remaining
}
(OUT/'evidence/visual-review.json').write_text(json.dumps(visual,ensure_ascii=False,indent=2)+'\n')
playback={'run':run,'attempted':'cua.createBrowserTab("iab", "about:blank", {visible:true})','result':'The browser access host is unavailable','observedRealTimeGIFPlayback':False,'gifDecodeEvidence':'evidence/current-audit.json'}
(OUT/'evidence/playback-access.json').write_text(json.dumps(playback,ensure_ascii=False,indent=2)+'\n')
loop={
    'status':'incomplete','date':'2026-11-11','reviewRound':run,'inputDelivery':'20261111T121621Z-c330d056',
    'generation':{**generation,'repairLimit':16,'remainingSharedRepairAllowance':0},
    'generationLog':'evidence/repair-current/generation-log.json',
    'editedAtlases':['worker-cyberhell-cook-v1.webp','worker-th-carry-v1.webp'],
    'retainedAtlases':['worker-th-cook-v1.webp','worker-asia-cook-v1.webp','worker-west-cook-v1.webp'],
    'technicalCheckCount':audit['checkCount'],'technicalFailures':audit['failedChecks'],
    'identityFootCheckCount':len(identity['checks']),'identityFootFailures':identity['failedChecks'],
    'decodedPreservationCheckCount':len(preservation['checks']),'decodedPreservationFailures':preservation['failedChecks'],
    'compositingInvariantCheckCount':len(repair['checks'])*5,'compositingInvariantFailures':repair['failures'],
    'headOpaqueRGBMismatchPixels':sum(sum(head['sourceRGBMismatchAbove0PixelCountsByFrame']) for head in identity['heads']),
    'foot':{'drawAnchor':[160,320],'method':'alpha>40 lower eight rows in raw 320px cells','maximumCookSoleBandMidpointErrorPx':max(abs(delta) for row in identity['cookingFeet'] for delta in row['soleBandMidpointErrorsPx']),
            'sourceBaselineY':{zone:next(row['source']['bottomY'] for row in identity['cookingFeet'] if row['row'].startswith(zone+'-')) for zone in ('th','asia','west','cyberhell')},'anatomicalRegistrationCertified':False,'carrySourceAndOutputMeasurements':'evidence/repair-current/preservation-check.json'},
    'animatedPlaybackReviewed':False,'inGameTested':False,'smoothLoopAccepted':False,
    'seams':[{'row':row['key'],'adjacentMeanRGBDifferencesIncluding8to1':row['adjacentMeanAbsoluteDifferencesIncludingSeam'],'smoothnessAccepted':False} for row in audit['rows']],
    'acceptance':[{'criterion':1,'status':'incomplete','cookZones':4,'directionsPerZone':2,'framesPerDirection':8,'headAndMeasuredFootRegistrationVerified':True,'completeBodyIdentityCertified':False,'smoothLoopAccepted':False},
                  {'criterion':2,'status':'incomplete','thDirections':4,'framesPerDirection':8,'thCarryAlphaViewedAll32Frames':True,'unexpectedRedYellowFringeObserved':False,'fullBodyAndContinuityCertified':False}],
    'technicalAudit':'evidence/current-audit.json','testResults':'evidence/repair-current/test-results.json','visualReview':'evidence/visual-review.json',
    'remaining':remaining,'optionalCarryOmitted':['asia','west','cyberhell'],'packageReport':'evidence/package-check.json'
}
(OUT/'loop-review.json').write_text(json.dumps(loop,ensure_ascii=False,indent=2)+'\n')
queue={'status':'incomplete','evidence':[
    'worker-cook.json และ atlas 5 ไฟล์ มี cook 4โซน × 2ทิศ × 8เฟรม และ carry TH 4ทิศ × 8เฟรม รวม96ช่อง RGBA 320×320',
    f"evidence/current-audit.json ตรวจ {audit['checkCount']} ข้อ ข้อผิดพลาด {len(audit['failedChecks'])} ถอด GIF12ไฟล์ 96เฟรม เวลา120/130ms สลับกัน loop=0",
    f"evidence/repair-identity/identity-foot-check.json ตรวจ {len(identity['checks'])} ข้อ ข้อผิดพลาด {len(identity['failedChecks'])} หัว opaque RGB ตรง source และฐาน cook y319/314",
    f"evidence/repair-current/preservation-check.json ตรวจ {len(preservation['checks'])} ข้อ ข้อผิดพลาด {len(preservation['failedChecks'])} หัวตรง source และ RGBA y192ลงไปคงเดิมทั้ง96เฟรม",
    'evidence/repair-current/repair-report.json ตรวจ240เงื่อนไขของmask ไม่มีข้อผิดพลาด ซ่อมคอเฉพาะcyberhell/carry ไม่วาดทดแทนมือ อาหาร หรือขา',
    'evidence/repair-current/generation-log.json นับlog4ชุด ชุดละ4ครั้ง repairTotal=16 รอบนี้0ครั้ง',
    'evidence/visual-review.json และ compare-*.jpg บันทึกภาพนิ่ง จุดที่ยังต่างจากต้นฉบับ และ alpha บนขาว/ดำ/เขียว',
    'evidence/playback-access.json browser host unavailable ยังไม่ได้ดูGIFเล่นจริง',
    'evidence/package-check.json ตรวจไฟล์ที่ต้องมี ขนาดไม่เกิน30000000ไบต์ และ git changes เฉพาะโฟลเดอร์ส่งออก'
], 'remaining':remaining}
(OUT/'queue-check.json').write_text(json.dumps(queue,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'incomplete','generationRepairTotal':generation['repairTotal'],'remaining':len(remaining)}))
