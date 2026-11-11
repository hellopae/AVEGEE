"""Write factual delivery status; leave unmet artistic criteria explicit."""
from pathlib import Path
import json
EV=Path(__file__).resolve().parent;OUT=EV.parents[1]
def write(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
run='20261111T165435Z-427eb5ef'
audit=json.loads((OUT/'evidence/current-audit.json').read_text())
verify=json.loads((EV/'verification.json').read_text())
repair=json.loads((EV/'repair-report.json').read_text())
generation=json.loads((EV/'generation-log.json').read_text())
remaining=[
 'ยังตรวจ GIF เล่นจริงไม่ได้: cua.createBrowserTab ตอบ The browser access host is unavailable จึงยังรับรอง loop 4→5 และ 8→1 รวมมือ ช้อน ข้าวปั้น และจังหวะเดินไม่ได้',
 'Cyberhell ยังมีสัดส่วนลำตัว/ช่วงขาและสนับเข่าต่างจาก idle รวมการเปลี่ยนทรงช่วง4→5 การแก้ครั้งนี้ซ่อมเฉพาะแผงเสื้อและเข็มขัดภายใน ไม่ได้แก้ silhouette ทั้งตัว',
 'TH cook กระเป๋าและลายเสื้อยังไม่ตรงด้าน/ตำแหน่งกับ idle ครบทุกเฟรม เฟรมซ้าย7คืนรายละเอียดกระเป๋าต้นฉบับใต้มือแล้ว แต่ต้องเก็บความสอดคล้องกับเฟรมข้างเคียงต่อ',
 'Carry TH คงภาพล่าสุดทั้ง32เฟรม หัวตรง walk ตรงทิศ แต่คอเสื้อ/ไหล่ สัดส่วนลำตัว และจังหวะก้าวยังต้องเทียบต้นฉบับพร้อม playback; ฐาน alpha ไม่ใช่หลักฐานจุดสัมผัสเท้าทางกายวิภาค'
]
alpha_images=[f'evidence/native-alpha-th-carry-{d}-{s}-{s+3}.jpg' for d in ('side','side-left','down','up') for s in (1,5)]
visual={'run':run,'date':'2026-11-12','animatedPlaybackReviewed':False,'inGameTested':False,
 'observations':[
 {'images':['evidence/repair-sourcebody/before-after-cyberhell.jpg','evidence/decoded-cyberhell-cook-down-left.jpg'],'result':'ดูภาพนิ่ง4→5/8→1แล้ว แผงอก/เข็มขัดใช้พิกเซลเดิมตรงทิศ หัวคงเดิม มือและอุปกรณ์ยังเป็นชุดวาดเดิม ช่วงล่างยังเปลี่ยนรูปและต่างจากidle'},
 {'images':['evidence/repair-sourcebody/before-after-th.jpg','compare-th.jpg'],'result':'ซ้ายเฟรม7มีรายละเอียดกระเป๋าต้นฉบับใต้ข้อมือ โดยไม่แตะมือและอาหาร ยังไม่ถือว่าตำแหน่งกระเป๋าตรงกันครบทั้งloop'},
 {'images':['compare-th.jpg','compare-asia.jpg','compare-west.jpg','compare-cyberhell.jpg'],'result':'เทียบต้นฉบับกับเฟรมใหม่สเกล1ต่อ1แล้ว หัวคงสีและรูปหน้าเดิม ตัว/เสื้อ/ขาบางส่วนยังต่าง จึงยังไม่รับรองตัวเดิมครบสัดส่วน'},
 {'images':alpha_images,'result':'ดูcarry THครบ32เฟรมบนพื้นขาว ดำ เขียว ไม่พบขอบแดงหรือเหลืองแยกจากสีผิว/ลายทอง ขอบalphaส่งออกคงเดิมทุกพิกเซล บริเวณคอ/ไหล่ยังต้องเก็บรายละเอียดตามremaining'}],
 'remaining':remaining}
write(EV/'visual-review.json',visual)
write(EV/'playback-access.json',{'run':run,'attempted':'cua.createBrowserTab("iab", "about:blank", {visible:true})','result':'The browser access host is unavailable','observedRealTimeGIFPlayback':False,'gifDecodeOnly':'evidence/current-audit.json'})
acceptance=[{'criterion':1,'status':'incomplete','cookZones':4,'directionsPerZone':2,'framesPerDirection':8,'originalHeadRGBExact96Frames':True,'sourceCookBaselineMatched':True,'wholeBodyIdentityCertified':False,'smoothLoopAccepted':False},
 {'criterion':2,'status':'incomplete','thDirections':['side','side-left','down','up'],'framesPerDirection':8,'alphaStaticReviewAll32Frames':True,'unexpectedRedYellowFringeObserved':False,'drawnFramesPreserved':True,'carryBodyAndPlaybackAccepted':False}]
loop={'status':'incomplete','date':'2026-11-12','reviewRound':run,'inputDelivery':'20261111T162400Z-6a49dc9c',
 'generation':generation,'generationLog':'evidence/repair-sourcebody/generation-log.json',
 'editedAtlases':['worker-cyberhell-cook-v1.webp','worker-th-cook-v1.webp'],
 'retainedAtlases':['worker-th-carry-v1.webp','worker-asia-cook-v1.webp','worker-west-cook-v1.webp'],
 'technicalCheckCount':audit['checkCount'],'technicalFailures':audit['failedChecks'],
 'decodedPixelCheckCount':verify['checkCount'],'decodedPixelFailures':verify['failedChecks'],
 'compositingInvariantCheckCount':repair['checks'],'compositingInvariantFailures':repair['failures'],
 'headOpaqueRGBMismatchPixels':sum(sum(r['headRGBMismatchPixels']) for r in verify['rows']),
 'foot':{'drawAnchor':[160,320],'cookBaselineY':{'th':319,'asia':319,'west':319,'cyberhell':314},'maximumCookSoleBandMidpointErrorPx':max(abs(f['soleBandMidX']-r['sourceSole']['soleBandMidX']) for r in verify['rows'] if r['sourceSole'] for f in r['frameSoles']),
 'method':'largest alpha>40 component, lower eight rows, raw 320px cell','alphaUnchangedAll96Cells':True,'anatomicalRegistrationCertified':False,'evidence':'evidence/repair-sourcebody/verification.json'},
 'animatedPlaybackReviewed':False,'inGameTested':False,'smoothLoopAccepted':False,
 'seams':[{'row':r['key'],'adjacentMeanRGBDifferencesIncluding8to1':r['adjacentMeanAbsoluteDifferencesIncludingSeam'],'smoothnessAccepted':False} for r in audit['rows']],
 'acceptance':acceptance,'remaining':remaining,'optionalCarryOmitted':['asia','west','cyberhell'],
 'testResults':'evidence/repair-sourcebody/test-results.json','visualReview':'evidence/repair-sourcebody/visual-review.json','technicalAudit':'evidence/current-audit.json','packageReport':'evidence/package-check.json'}
write(OUT/'loop-review.json',loop)
queue={'status':'incomplete','evidence':[
 'worker-cook.json: cook4โซน×2ทิศ×8เฟรม และcarryTH4ทิศ×8เฟรม รวม96ช่องRGBA320×320',
 f"evidence/current-audit.json: {audit['checkCount']} checks, failures={len(audit['failedChecks'])}; GIF12ไฟล์ decodeครบ96เฟรม 8fps loop=0",
 f"evidence/repair-sourcebody/verification.json: {verify['checkCount']} checks, failures={len(verify['failedChecks'])}; head RGBตรงsourceจริง96เฟรม alpha/feetคงเดิม",
 f"evidence/repair-sourcebody/repair-report.json: 9งานประกอบ {repair['checks']}เงื่อนไข failures={len(repair['failures'])}; ภาพเคลื่อนไหวนอกmaskคงเดิม",
 'evidence/repair-sourcebody/generation-log.json: log4ชุด entries/callsชุดละ4 สะสมrepairTotal=16 รอบนี้0ครั้ง',
 'evidence/repair-sourcebody/before-after-*.jpg และcompare-*.jpg: รูปก่อน/หลังและเทียบidle/walkตรงทิศสเกล1ต่อ1',
 'evidence/repair-sourcebody/visual-review.json: ดูcarryTH32เฟรมบนพื้นขาว/ดำ/เขียว ไม่พบขอบสีแปลกแยก แต่สัดส่วนทั้งตัวยังไม่รับรอง',
 'evidence/repair-sourcebody/playback-access.json: browser host unavailable; ยังไม่ได้ดูGIFเล่นจริง',
 'evidence/package-check.json: ขนาดจริง ไฟล์บังคับ และขอบเขตgit; integrityเท่านั้น'
 ],'remaining':remaining}
write(OUT/'queue-check.json',queue)
# Explain test-implementation failure without concealing the first result.
write(EV/'check-history.json',{'firstVerification':'first-verification.json','firstFailure':'Counter read only calls, missed entries schema in two inherited logs; reported 8 instead of16. Pixel checks had no failures.','fix':'Read calls or entries arrays, then count the four distinct logs. Rechecked against their cumulative totals 4/8/12/16.','finalVerification':'verification.json'})
print(json.dumps({'status':'incomplete','remaining':len(remaining),'generationRepairTotal':generation['repairTotal']}))
