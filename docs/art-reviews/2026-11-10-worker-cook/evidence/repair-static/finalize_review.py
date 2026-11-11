"""Refresh factual review metadata after inspecting the final images."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageOps,ImageDraw
EV=Path(__file__).resolve().parent;OUT=EV.parents[1];REPO=OUT.parents[2]
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
audit=json.loads((OUT/'evidence/current-audit.json').read_text());identity=json.loads((OUT/'evidence/repair-identity/identity-foot-check.json').read_text());generation=json.loads((EV/'generation-log.json').read_text());manifest=json.loads((OUT/'worker-cook.json').read_text())
# Native-size lower-body comparisons, decoded from the final delivery.
for z in ['th','asia','west','cyberhell']:
 src=Image.open(REPO/f'img/workers/worker-{z}-sheet-v2.webp').convert('RGBA');col=0 if z=='asia' else 1;src=src.crop((col*320,0,(col+1)*320,320));atlas=Image.open(OUT/f'worker-{z}-cook-v1.webp').convert('RGBA')
 plate=Image.new('RGBA',(1600,330),(229,230,233,255));draw=ImageDraw.Draw(plate)
 for r in range(2):
  ref=ImageOps.mirror(src) if r else src
  for j,f in enumerate([ref]+[atlas.crop((i*320,r*320,(i+1)*320,(r+1)*320)) for i in [0,3,4,7]]):
   plate.alpha_composite(f.crop((0,185,320,320)),(j*320,r*165+22));draw.text((j*320+4,r*165+4),f'{z} {"left" if r else "right"} / '+['source idle','f1','f4','f5','f8'][j],fill='black');draw.line((j*320,r*165+157,j*320+319,r*165+157),fill='#555555')
 plate.convert('RGB').save(EV/f'foot-{z}.jpg',quality=85)
atlas=Image.open(OUT/'worker-th-cook-v1.webp').convert('RGBA');plate=Image.new('RGBA',(640,320),(229,230,233,255))
for j,i in enumerate([5,6]):plate.alpha_composite(atlas.crop((i*320,320,(i+1)*320,640)),(j*320,0))
plate.convert('RGB').save(EV/'th-f6-f7-final.jpg',quality=90)
playback={'run':'20261111T115315Z-ccb558be','method':'cua.getState; cua.getApp(com.apple.finder)','browserError':'Browsers: Error: The browser access host is unavailable','nativeAttempt':'Computer Use was not approved to use Finder','animatedPlaybackObserved':False,'decodedGifFramesInspected':True,'offlineReviewPage':'preview/index.html'}
write(OUT/'evidence/playback-access.json',playback)
remaining=[
 'TH cook ซ้ายเฟรม7 แทนสีกระเป๋าด้วยผ้าแล้ว แต่แสงเงา/ขอบผ้าบริเวณสะโพกยังเป็นปื้นและต้องเก็บให้กลืนกับเสื้อก่อนรับรองภาพ',
 'ยังไม่ได้ดู GIF เล่นต่อเนื่องจริง: browser host unavailable และ native Finder ไม่ได้รับสิทธิ์ จึงยังไม่รับรอง loop 4→5/8→1',
 'ท่าคืนมือ/ช้อน 8→1 ยังต่าง โดยเฉพาะ asia และตำแหน่งถาด/ช่วงขา carry TH ยังต้องตัดสินความต่อเนื่องจาก playback',
 'หัวตรง source ในขอบเขต opaque RGB แต่เสื้อ/อุปกรณ์และรูปทรงลำตัวไม่ตรงต้นฉบับทุกจุด เช่น แผงอก cyberhell และตำแหน่งกระเป๋าในบางมุม จึงยังไม่รับรอง identity ทั้งตัว',
 'ตรวจฐาน alpha และกึ่งกลางแถบรองเท้าแล้ว แต่รูปทรง/จุดสัมผัสเท้าทางกายวิภาคและสัดส่วนทั้งตัวตลอด loop ยังไม่รับรอง'
]
visual={'run':'20261111T115315Z-ccb558be','method':'Static native-size decoded GIF contacts, compare source idle/walk, foot plates, TH carry alpha on white/black/green. No real-time playback.','acceptedSmoothLoop':False,'findings':[
 {'zone':'cyberhell','anim':'cook','result':'หัวคงเดิมทั้งแถว; ตราแขน source อยู่ต่อเนื่อง 4→5 และเก็บตราซ้อนเฟรม7; ฐาน y314 คงเดิม. แผงอก/เครื่องแต่งกายยังไม่เหมือน source ทุกจุด','evidence':['evidence/decoded-cyberhell-cook-down-left.jpg','evidence/decoded-cyberhell-cook-down-right.jpg','compare-cyberhell.jpg']},
 {'zone':'th','anim':'cook','result':'หัวและสีหน้าคงเดิม 4→5/8→1; ซ้ายเฟรม7 แทนสีกระเป๋าใกล้ด้วยเนื้อผ้าจากf6 รักษาalpha/ชายกางเกง/ขาเดิม แต่แสงเงาบริเวณสะโพกยังเป็นปื้น. ยังไม่รับรองภาพ/ท่ามือ loop และรายละเอียดด้านเดียวทั้งตัว','evidence':['evidence/decoded-th-cook-down-left.jpg','evidence/repair-static/th-f6-f7-final.jpg','compare-th.jpg']},
 {'zone':'asia','anim':'cook','result':'หัว/หมวก/สี source คงเดิม; ท่าช้อน f8 ต่ำกว่า f1 และอุปกรณ์กลับด้านตามแถว mirror; ยังไม่รับรอง loop','evidence':['compare-asia.jpg','evidence/decoded-asia-cook-down-right.jpg']},
 {'zone':'west','anim':'cook','result':'หัว/หมวก source คงเดิม; ลำตัวและเท้าจัดตรงแนวต้นฉบับขึ้น แต่รูปทรง stance/เสื้อยังไม่เหมือน source ทุกจุด','evidence':['compare-west.jpg','evidence/decoded-west-cook-down-right.jpg','evidence/repair-static/foot-west.jpg']},
 {'zone':'th','anim':'carry','result':'4ทิศอย่างละ8เฟรม มีขาก้าวและถือถาด2ก้อน; หัว source ตรงทิศและคอเสื้อ side ประกอบจาก source โดยกันข้าวปั้นไว้ด้านหน้า. ตรวจ alpha 32เฟรม ไม่เห็นขอบแดง/เหลืองส่วนเกินชัดเจน สีแดงผิว/ขอบทองเป็นตัวละคร. ยังไม่รับรองจังหวะรอยต่อและสัดส่วนทั้งตัว','evidence':['compare-th.jpg','evidence/decoded-th-carry-side.jpg','evidence/native-alpha-th-carry-*.jpg']}
 ],'remaining':remaining,'reviewedArtworkHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('worker-*-v1.webp')}}
write(OUT/'evidence/visual-review.json',visual)
maxerr=max(abs(v) for row in identity['cookingFeet'] for v in row['soleBandMidpointErrorsPx'])
review={'status':'incomplete','date':'2026-11-11','reviewRound':'20261111T115315Z-ccb558be','inputDelivery':'20261111T112241Z-92b49ab0','artworkEditedThisRound':True,'generation':{k:v for k,v in generation.items() if k not in ['uniquePriorRepairBatches','calls','note']},'generationLog':'evidence/repair-static/generation-log.json','changedArt':[r['file'] for r in audit['preservation'] if not r['sameAsLatestInput']],'technicalCheckCount':audit['checkCount'],'technicalFailures':audit['failedChecks'],'technicalAudit':'evidence/current-audit.json','identityFootCheckCount':len(identity['checks']),'identityFootFailures':identity['failedChecks'],'headOpaqueRGBMismatchPixels':sum(sum(r['sourceRGBMismatchAbove0PixelCountsByFrame']) for r in identity['heads']),'foot':{'drawAnchor':[160,320],'method':'alpha>40 bottom eight pixel rows, not anatomical contact','maximumSoleBandMidpointErrorPx':maxerr,'sourceBaselineY':{'th':319,'asia':319,'west':319,'cyberhell':314},'anatomicalRegistrationCertified':False,'evidence':'evidence/repair-identity/identity-foot-check.json'},'animatedPlaybackReviewed':False,'inGameTested':False,'smoothLoopAccepted':False,'visualReview':'evidence/visual-review.json','acceptance':[{'criterion':1,'status':'incomplete','fourZonesEightFramesTwoDirections':True,'opaqueSourceHeadRGBExactAll96Frames':True,'bodyIdentityAndProportionsExact':False,'smoothLoopAccepted':False},{'criterion':2,'status':'incomplete','thAllFourDirectionsEightFrames':True,'thCarryAlphaViewedAll32Frames':True,'unexpectedRedYellowFringeObserved':False,'fullBodyAndContinuityCertified':False}],'seams':[{'row':r['key'],'meanRGBDifference8to1':r['seam8to1'],'smoothnessAccepted':False} for r in audit['rows']],'remaining':remaining,'optionalCarryOmitted':['asia','west','cyberhell'],'packageReport':'evidence/package-check.json','testResults':'evidence/repair-static/test-results.json'}
write(OUT/'loop-review.json',review)
write(OUT/'queue-check.json',{'status':'incomplete','evidence':[
 'worker-*-cook-v1.webp + worker-cook.json — cook4โซน×2ทิศ×8เฟรม; carryTH4ทิศ×8เฟรม; RGBA320×320ต่อช่อง',
 f"evidence/current-audit.json — {audit['checkCount']}เงื่อนไขโครงสร้าง; failures={len(audit['failedChecks'])}; ถอด12GIF/96เฟรมจริง",
 f"evidence/repair-identity/identity-foot-check.json — {len(identity['checks'])}เงื่อนไข; failures={len(identity['failedChecks'])}; opaque-head RGB mismatch=0; sole-band X errorสูงสุด{maxerr}px",
 'evidence/repair-static/repair-report.json + compare-*.jpg + evidence/decoded-*.jpg — เก็บมือ/อุปกรณ์/ขาที่วาดไว้; แก้หัว ฐานเท้า THซ้ายf7 และตราแขนcyberhell',
 'evidence/visual-review.json + evidence/native-alpha-th-carry-*.jpg — ดูalpha32เฟรมTHบนขาว/ดำ/เขียว ไม่เห็นขอบแดง/เหลืองส่วนเกินชัดเจน; ยังไม่รับรองidentityทั้งตัว/loop',
 'evidence/playback-access.json — browser host unavailable; Finderไม่อนุมัติการใช้ จึงไม่ได้ดูplaybackจริง',
 'evidence/repair-static/generation-log.json — repairTotal16/16; รอบนี้0ครั้ง; เก็บgeneration log/promptเดิม',
 'evidence/package-check.json — รายการไฟล์ ขนาดจริง และgit scope หลังเขียนรายงานครบ'
 ],'remaining':remaining})
write(EV/'check-history.json',{'notes':'Observed intermediate failures, resolved/reviewed before final checks. Not a QA claim.','observations':[{'stage':'inherited delivery initial verify','checks':28,'failedChecks':15,'headOpaqueRGBMismatchPixels':21386},{'stage':'exact head stamp before stance registration','checks':28,'failedChecks':7,'headOpaqueRGBMismatchPixels':0},{'stage':'first local technical audit','failedRows':['th-carry-side detached alpha','th-carry-side-left detached alpha'],'fix':'largest connected alpha component cleanup'},{'stage':'visual rejected intermediate','findings':['TH leather hues were caught by an overbroad skin mask; replaced with hand-contour geometry','source sleeve badge initially sat outside cyberhell left shoulder; moved inward and old f7 duplicate removed','collar patch crossed raised rice; protected original rice surface + outline'],'finalAcceptance':'See current visual-review and queue-check; not ready.'}]})
print(json.dumps({'status':'incomplete','headOpaqueRGBMismatchPixels':review['headOpaqueRGBMismatchPixels'],'maxSoleBandMidpointErrorPx':maxerr,'repairTotal':generation['repairTotal']},indent=2))
