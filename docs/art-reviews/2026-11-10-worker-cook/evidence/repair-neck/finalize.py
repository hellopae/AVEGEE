"""Write current review metadata from measured evidence; never promote art status."""
from pathlib import Path
import hashlib,json
EV=Path(__file__).resolve().parent;OUT=EV.parents[1]
def read(p):return json.loads(p.read_text())
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
v=read(EV/'verification.json');audit=read(OUT/'evidence/current-audit.json');rep=read(EV/'repair-report.json');tests=read(EV/'test-results.json')
assert not v['failedChecks'] and not audit['failedChecks'] and all(r['exitCode']==0 for r in tests['results'])
remaining=[
 'ยังไม่ได้ดู GIF เล่นจริง: browser ตอบ The browser access host is unavailable จึงยังรับรองรอยต่อ4→5/8→1 และจังหวะตัก ปั้น วาง หรือก้าวเดินไม่ได้',
 'Cyberhell cook ซ้ายยังมีช่วงขา/สนับเข่าและสัดส่วนลำตัวต่างจาก idle; ทรงตัวและแขนเปลี่ยนที่4→5 การประกอบครั้งนี้แก้เฉพาะคอเสื้อ ไม่ได้แก้ silhouette ทั้งตัว',
 'TH cook ซ้าย กระเป๋าใกล้ตัวในเฟรม7ยังต่างด้านกับกระเป๋าเล็กในเฟรมอื่น; การคืนรายละเอียดเฉพาะเฟรม7จากรอบก่อนยังไม่แก้ความสอดคล้องตลอด loop',
 'Carry TH side ช่วง4→5แขนและถาดเปลี่ยนระดับ ยังต้องตรวจ playback/สัดส่วน และการวางแทน walk down/up ซึ่งเดิมมี renderer fit scale/dx; งานนี้ไม่ได้แก้จุดเสียบเกม'
]
viewed=[
 'evidence/repair-neck/before-after-cyberhell-cook-r1.jpg',
 'evidence/repair-neck/before-after-th-cook-r1.jpg',
 'evidence/repair-neck/before-after-th-carry-r0.jpg',
 'evidence/repair-neck/th-pouch-inspection.jpg',
 'evidence/decoded-th-cook-down-left.jpg','evidence/decoded-cyberhell-cook-down-left.jpg','evidence/decoded-th-carry-side.jpg',
 'evidence/native-alpha-th-carry-side-1-4.jpg','evidence/native-alpha-th-carry-side-5-8.jpg','evidence/native-alpha-cyberhell-cook-down-left-5-8.jpg'
]
# Some diagnostic before/after files were viewed earlier in the repair. Their
# final regenerated versions remain supporting artifacts, not playback evidence.
visual={'run':'20261111T170902Z-d171c309','date':'2026-11-12','animatedPlaybackReviewed':False,'inGameTested':False,
 'method':'Static native-size decoded GIF plates, original-vs-new comparisons and alpha composites; not animated playback.',
 'observations':[
  {'files':['evidence/decoded-cyberhell-cook-down-left.jpg'],'result':'หัวคงเดิมตรงทิศ; คอเสื้อใช้ต้นฉบับเฉพาะmask; ทรงตัว4→5กับช่วงขา/สนับเข่ายังต่างจากidle ไม่รับรองตัวเดิมทั้งสัดส่วน'},
  {'files':['evidence/decoded-th-cook-down-left.jpg','evidence/repair-neck/th-pouch-inspection.jpg'],'result':'รอยต่อคอ/ไหล่ต่อกับหัวมากขึ้นโดยคงมือกับข้าว; เฟรม7ยังมีกระเป๋าใกล้ตัวแต่เฟรมอื่นเป็นกระเป๋าฝั่งไกล จึงยังไม่รับรองรายละเอียดประจำด้าน'},
  {'files':['evidence/decoded-th-carry-side.jpg','evidence/native-alpha-th-carry-side-1-4.jpg','evidence/native-alpha-th-carry-side-5-8.jpg'],'result':'ดูsideครบ8เฟรมบนพื้นขาวดำเขียว ไม่พบขอบแดง/เหลืองใหม่จากการประกอบ; แขน/ถาดเปลี่ยนระดับที่4→5 ยังไม่รับรองความต่อเนื่องจากภาพนิ่ง'},
  {'files':['evidence/native-alpha-cyberhell-cook-down-left-5-8.jpg'],'result':'ดูขอบเฟรม5–8บนขาวดำเขียว ไม่พบขอบแดง/เหลืองใหม่; ช่องโปร่งใสตามขอบส่วนหัวกับแขนยังต้องพิจารณาร่วมกับสัดส่วนจริง'}
 ],'supportingStaticFiles':viewed,'remaining':remaining}
write(EV/'visual-review.json',visual)
write(EV/'playback-access.json',{'run':'20261111T170902Z-d171c309','tool':'mcp__cua_repl.js','action':'cua.createBrowserTab("iab", "about:blank", { visible: false })','observedResult':'The browser access host is unavailable','animatedPlaybackReviewed':False,'fallback':'Decoded actual GIF frames for static inspection only; no playback acceptance.'})
write(EV/'check-history.json',{'firstRun':{'evidence':['first-test-results.json','first-audit.json'],'pixelChecks':597,'pixelFailures':0,'atlasAuditChecks':106,'atlasAuditFailures':['th-cook-down-right no detached alpha>40 pixels','th-cook-down-left no detached alpha>40 pixels','th-carry-side no detached alpha>40 pixels','th-carry-side-left no detached alpha>40 pixels']},'correction':'Do not replace existing silhouette with transparent source pixels. Reject disconnected source additions at localized mask boundary; protect hands/rice with 3px ink margin. Re-run repair from unmodified latest input, then regenerate changed GIFs and re-run checks.','final':{'pixelChecks':v['checkCount'],'pixelFailures':len(v['failedChecks']),'atlasAuditChecks':audit['checkCount'],'atlasAuditFailures':len(audit['failedChecks'])},'newImageGenCalls':0})
max_error=max(abs(f['soleBandMidX']-row['sourceSole']['soleBandMidX']) for row in v['rows'] if '-cook-' in row['row'] for f in row['frameSoles'])
review={'status':'incomplete','date':'2026-11-12','reviewRound':'20261111T170902Z-d171c309','inputDelivery':'20261111T165435Z-427eb5ef','generation':v['generation'],'generationLog':'evidence/repair-neck/generation-log.json',
 'editedAtlases':sorted(rep['outputHashes']),'retainedAtlases':rep['retainedAtlases'],
 'stationaryCutoutEditedCells':len(rep['operations']),'changedPixels':sum(op['changedPixels'] for op in rep['operations']),
 'alphaChangedPixelsInsideCollarMasks':sum(op['alphaChangedPixels'] for op in rep['operations']),
 'alphaAbove40AddedPixels':sum(op['filledAlphaAbove40Pixels'] for op in rep['operations']),
 'alphaAbove40RemovedPixels':sum(op['removedAlphaAbove40Pixels'] for op in rep['operations']),
 'decodedPixelCheckCount':v['checkCount'],'decodedPixelFailures':v['failedChecks'],'technicalCheckCount':audit['checkCount'],'technicalFailures':audit['failedChecks'],
 'compositingInvariantCheckCount':rep['checks'],'compositingInvariantFailures':rep['failures'],
 'headOpaqueRGBMismatchPixels':sum(sum(r['headRGBMismatchPixels']) for r in v['rows']),
 'drawnMotionBelowY182UnchangedAll96Cells':True,'protectedHandsRiceInkUnchangedAll96Cells':True,
 'foot':{'drawAnchor':[160,320],'cookBaselineY':{'th':319,'asia':319,'west':319,'cyberhell':314},'maximumCookSoleBandMidpointErrorPx':max_error,'feetBelowY280RGBAUnchangedAll96Cells':True,'alphaUnchangedOutsideCollarMasks':True,'anatomicalRegistrationCertified':False,'rendererFitCompatibilityCertified':False,'method':'largest alpha>40 component, lower eight rows, raw 320px cell; source idle direction matched','evidence':'evidence/repair-neck/verification.json'},
 'animatedPlaybackReviewed':False,'inGameTested':False,'smoothLoopAccepted':False,
 'seams':[{'row':r['key'],'adjacentMeanRGBDifferencesIncluding8to1':r['adjacentMeanAbsoluteDifferencesIncludingSeam'],'smoothnessAccepted':False} for r in audit['rows']],
 'acceptance':[{'criterion':1,'status':'incomplete','cookZones':4,'directionsPerZone':2,'framesPerDirection':8,'originalHeadRGBExact96Frames':True,'sourceCookBaselineMatched':True,'wholeBodyIdentityCertified':False,'smoothLoopAccepted':False},
 {'criterion':2,'status':'incomplete','thDirections':['side','side-left','down','up'],'framesPerDirection':8,'alphaDetachedPixelCheckAll32Frames':True,'sideAlphaStaticReview8Frames':True,'unexpectedNewRedYellowFringeObservedInReviewedPlates':False,'drawnFramesPreserved':True,'carryBodyAndPlaybackAccepted':False}],
 'remaining':remaining,'optionalCarryOmitted':['asia','west','cyberhell'],
 'testResults':'evidence/repair-neck/test-results.json','visualReview':'evidence/repair-neck/visual-review.json','technicalAudit':'evidence/current-audit.json','packageReport':'evidence/package-check.json'}
write(OUT/'loop-review.json',review)
write(OUT/'queue-check.json',{'status':'incomplete','evidence':[
 'worker-{th,asia,west,cyberhell}-cook-v1.webp: cook4โซน สองทิศ ทิศละ8เฟรม RGBA320×320ต่อช่อง',
 'worker-th-carry-v1.webp และ worker-cook.json: side/side-left/down/up ทิศละ8เฟรม',
 f"evidence/repair-neck/verification.json: {v['checkCount']} checks, {len(v['failedChecks'])} failures; หัวตรงsheetต้นฉบับทั้ง96ช่อง เท้าและmotion y182ลงไปคงRGBAเดิม",
 f"evidence/current-audit.json: {audit['checkCount']} checks, {len(audit['failedChecks'])} failures; decode GIF12ไฟล์ครบ96เฟรมตรงatlas, alphaไม่หลุด",
 'evidence/repair-neck/repair-report.json: 40ช่อง, 7,133พิกเซลเปลี่ยนเฉพาะmask, ไม่ลบsilhouette alpha>40เดิม; นอกmaskคงเดิม',
 'evidence/repair-neck/generation-log.json: งบแก้จริง16/16, รอบนี้0ครั้ง; เก็บlogต้นทางทั้ง4ชุด',
 'evidence/repair-neck/visual-review.json: ตรวจภาพนิ่งแล้ว ยังพบสัดส่วนCyberhellและกระเป๋าTHไม่สอดคล้อง',
 'evidence/repair-neck/playback-access.json: browserไม่พร้อมใช้งาน ยังไม่ได้ดูGIFเล่นจริง',
 'evidence/package-check.json: ดูขนาดรวม/ไฟล์บังคับ/git scopeจากผลตรวจแพ็กจริง'
 ],'remaining':remaining})
print(json.dumps({'status':review['status'],'pixelChecks':v['checkCount'],'auditChecks':audit['checkCount'],'maxCookSoleErrorPx':max_error,'repairTotal':v['generation']['repairTotal']}))
