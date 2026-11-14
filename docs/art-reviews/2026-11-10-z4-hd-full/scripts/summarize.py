"""Summarize delivered files and quality evidence without asserting acceptance."""
import json
from prepare import OUT, CHUNKS, write_json

parts=json.loads((OUT/'parts.json').read_text())
generations=json.loads((OUT/'generations.json').read_text())
delivered={(g['chunk'],g['part']) for g in generations if (OUT/g['nativeFile']).exists()}
chunks=[];pending=[]
for chunk in CHUNKS:
    folder=OUT/chunk
    missing=[p['part'] for p in parts if p['chunk']==chunk and not (folder/f"{p['part']}-native.webp").exists()]
    if missing or not (folder/'structure.json').exists():
        pending.append(dict(chunk=chunk,missingParts=missing,assemblyMissing=not (folder/f'{chunk}-2x.webp').exists()));continue
    s=json.loads((folder/'structure.json').read_text())
    reg=json.loads((folder/'registration.json').read_text())['parts']
    from PIL import Image
    chunks.append(dict(chunk=chunk,imageGenCalls=sum(g['chunk']==chunk for g in generations),
        nativeSizes={q:r['nativeSize'] for q,r in reg.items()},outputSize=list(Image.open(folder/f'{chunk}-2x.webp').size),
        sharpness=s['sharpness'],structureMaxPx1x=None,
        siftInlierResidualMaxPx1x=max(r['registrationEvidence']['inlierResidualMaxPx1x'] for r in reg.values()),
        sourceEdgeNearestDistanceProxy=s['sourceEdgeNearestDistanceProxy'],
        semanticStructureAcceptance='unconfirmed; texture evidence is not a semantic bound',
        qualityDecision='pending Claude review'))
total=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
summary=dict(task='Z234-HD-FULL / Zone 4 / set 4 of 5',source='img/map-zone4/v3/r*-c*.webp',repairsApplied=False,
    chunks=chunks,imageGenCalls=len(generations),imageGenCallLimit=16,plannedParts=14,deliveredParts=len(delivered),
    pendingGenerationOrAssembly=pending,pendingQuality=['Semantic geometry <=4px requires reviewer decision','Internal seam invisibility requires reviewer decision'],
    totalBytesAtSummary=total,budgetBytes=80000000,installedInGame=False,
    templateAvailability='Referenced plaza-detail and hd-full worktree directories unavailable. Followed supplied brief and min-cost solver documented in local Z1 v7r assemble script.',
    noRegenerationForMetrics=True,visualCorrection='Two additional calls for r4-c1 removed invented cyan water/cracks. Superseded native pixels omitted; attempts and rejected hashes retained in generations.json.')
write_json(OUT/'run-summary.json',summary)
rows=[]
for c in chunks:
    e=c['sourceEdgeNearestDistanceProxy']
    rows.append(f"| {c['chunk']} | {c['imageGenCalls']} | {'×'.join(map(str,c['outputSize']))} | {c['sharpness']['ratio']:.2f}× | {c['siftInlierResidualMaxPx1x']:.2f} | {e['p95Px1x']:.2f} / {e['maxPx1x']:.2f} |")
readme='''# โซน 4 cyberhell — HD FULL ชุด 4/5

ส่งเฉพาะ r3-c3, r3-c4, r3-c5, r4-c1 ในโฟลเดอร์นี้ ไม่ได้ติดตั้งเข้าเกมหรือแก้ src/tests/img เดิม
ใช้ built-in ImageGen เท่านั้น ไม่มี Shado ไม่มีการวาดซ้ำเพื่อไล่ตัวเลข; มีแก้ข้อผิดพลาดภาพ r4-c1 สองส่วนเพื่อลบร่องน้ำ/แสงฟ้าที่วาดเพิ่มผิดจากต้นฉบับ

## วิธีและไฟล์

อ่าน master WebP v3 ที่เกมโหลดจริง (4915×3277); repairs=false ตาม src/zone-skin.js
แบ่ง core 2×2; c5 แบ่ง 410/409 px; r4 แบ่ง 2 ส่วน 512×205 px; ขยาย context 64 px แต่ละด้านและตัดที่ขอบแผนที่
ภาพ input และ walkmask overlay อยู่ในแต่ละ chunk/inputs; generation-prompts.json เก็บ prompt จริงทุกครั้ง
native เป็นภาพที่ ImageGen คืนโดยไม่ย่อ/ขยาย แปลงเป็น WebP lossless และเทียบ decoded pixels กับ PNG แล้วตรงกัน
registration.json เก็บ affine native→local context 1×, native size/hash และ core/context rect ในพิกัด master [x0,y0,x1,y1]
SIFT + Lowe ratio .78 + affine RANSAC 2.5 px; warp ไป 2× ด้วย Lanczos4, ริมที่ affine เผยออกใช้ reflect101
ต่อเฉพาะภายใน chunk ด้วย min-cost seam (Gaussian5 RGB squared error, step -1/0/+1, เว้นริม overlap 10 output px, smoothstep feather ±8 output px)
ไม่มีการทับพื้นเก่าเพื่อซ่อน geometry drift หรือ sharpen ภาพหลังวาด ขอบกับ chunk เพื่อนบ้านยังไม่ตัดต่อ ให้ ASSEMBLE ใช้ native+context

พาธต้นแบบโซน 1 สองแห่งที่ใบงานระบุไม่มีอยู่ในเครื่อง จึงไม่ได้อ้างว่าใช้สคริปต์ต้นแบบนั้นโดยตรง
ใช้วิธีในใบงาน และ solver ที่อธิบายไว้ใน docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py เป็นหลักฐานวิธี min-cost
สคริปต์ทั้งหมดที่ใช้กับงานนี้เก็บใน scripts/ เพื่อทำซ้ำได้ใน worktree นี้

## ผลวัดเพื่อให้ Claude ตัดสิน

| chunk | ImageGen | output 2× | sharpness ratio | SIFT residual max (1× px) | nearest-edge p95 / max (1× px) |
|---|---:|---|---:|---:|---:|
'''+ '\n'.join(rows)+f'''

ImageGen {len(generations)}/16 ครั้ง, native ที่ส่ง {len(delivered)}/14 ส่วน; ขนาดไฟล์ ณ summary {total/1000000:.2f} MB จากเพดาน 80 MB

Sharpness = grayscale Laplacian variance ของภาพประกอบ 2× / master เดิมขยาย Lanczos 2× ที่ขนาดเดียวกัน ค่าแสดงรายละเอียด/contrast ร่วมกัน ไม่ใช่คะแนนความสวย
SIFT residual วัดเฉพาะจุดที่ RANSAC จัดเป็น inlier จึง **ไม่ใช่** structure max ของขอบลาน/บันได/หน้าผา/ตลิ่งทั้งหมด
Nearest-edge เป็น Canny 60/130 จาก source ไปหาขอบใหม่ที่ใกล้ที่สุด มีขอบ texture ปน จึง **ไม่ใช่** semantic displacement เช่นกัน; บาง max เกิน 4 px และไม่ได้รันซ้ำให้ตัวเลขผ่าน
structureMaxPx1x ของ semantic geometry จึงบันทึก null อย่างตรงไปตรงมา: **เกณฑ์ ≤4 px ยังไม่ยืนยัน**
ดูแต่ละ chunk/structure-overlay.jpg (สีเขียวคือขอบ source), structure-points.json และ inputs/walkmask-overlay.jpg ประกอบการตัดสิน

## Self-check ตามเกณฑ์รับงาน

1. ครบทุกส่วน: ดู run-summary.json และ file-checks.json; sharpness รายงานในตาราง ส่วน structure ≤4 px ยังรอ reviewer ไม่สรุปว่าผ่าน
2. ต่อภายใน chunk ด้วย min-cost แล้ว มี seam-check.jpg ภาพรวมและ seam-strips.jpg ที่ pixel output จริงให้ตรวจรอยต่อ; ผลมองด้วยตาราย chunk อยู่ใน visual-review.json ไม่ใช้สคริปต์ตัดสินความไร้รอย
   ไม่พบ baked obstacle ที่ต้องลบบนพื้น walkable จากภาพต้นฉบับทั้งสี่ chunk เทียบ walkmask จึง removedIds=[]; objects-inventory.json ระบุเหตุผลคงราว/เสา/คริสตัลริมทางไว้
   คงพื้นสะพาน บันได ของเหลว และหมอกในบริเวณเดิม; ของเหลว/หมอกเป็นฐานภาพนิ่ง
3. ส่ง native lossless และ registration พร้อม core/context ทุกส่วนสำหรับ ASSEMBLE; ไม่มีส่วน generation/assembly ค้างเมื่อ pendingGenerationOrAssembly=[]

## การตรวจที่รัน

- python3 -m py_compile scripts/prepare.py scripts/assemble.py scripts/ingest.py scripts/review.py scripts/verify.py scripts/summarize.py (ใช้ path เต็มจาก repo)
- prepare.py ตัด input จาก master; ingest.py ตรวจ pixel-exact lossless conversion ของ native แต่ละภาพ
- assemble.py register/ต่อภาพ/บันทึก metric; r4-c1 ประกอบใหม่หลังแก้ข้อผิดพลาดภาพ ส่วนอีกสาม chunk ประกอบครั้งเดียว
- review.py สร้างภาพตรวจรอยต่อและ nearest-edge proxy; ไม่ตั้ง quality gate
- verify.py ตรวจเฉพาะไฟล์ครบ เปิดได้ ขนาด 2×/native ถูก JSON/affine อ่านได้ WebP เป็น VP8L และขนาดรวม ≤80 MB; ผลจริงใน file-checks.json
- ไม่รัน game test suite เพราะไม่ได้เปลี่ยนโค้ดหรือภาพที่เกมโหลด และไม่ได้อ้าง QA ผ่าน

## ส่วนค้างและข้อจำกัด

รอ Claude ตัดสิน geometry ≤4 px และรอยต่อภายใน chunk จากหลักฐาน; ASSEMBLE ยังต้องต่อขอบกับเพื่อนบ้าน
จุดตรวจเพิ่ม: เสา/ขอบทองและรายละเอียดขั้นเล็ก ๆ ใน r3-c4/q22 และ r3-c5/q21–q22 เด่นกว่าต้นฉบับ ให้เทียบกับ walkmask และรูปทรงเดิม ไม่รับรองว่าเป็น texture อย่างเดียวทั้งหมด
สอง native รุ่นแรกของ r4-c1 ไม่ส่งเพราะเพิ่มแสงฟ้าคล้ายร่องน้ำที่ไม่มีใน source; generations.json เก็บขนาด/hash ของรุ่นที่ถูกแทนไว้ และส่งเฉพาะ native ที่เลือก
ภาพ compare เป็น centre crop ที่ 2.8 display px/world (master 1.28 px/world), ไม่ใช่ screenshot จาก runtime
ยังไม่ได้ทดสอบในเกมหรือ browser และไม่ได้ commit/push/merge/deploy
'''
(OUT/'README.md').write_text(readme)
print(json.dumps(dict(chunks=len(chunks),nativeParts=len(delivered),pending=pending,bytes=total)))
