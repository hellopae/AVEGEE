"""Summarize existing measurements without rerunning quality measurements or generation."""
from pathlib import Path
import hashlib, json

OUT=Path(__file__).resolve().parents[1]

def main():
    visual=json.loads((OUT/'visual-review.json').read_text())
    manifest=json.loads((OUT/'generation-prompts.json').read_text())
    chunks=[]
    for c in range(1,5):
        chunk=f'r1-c{c}';d=OUT/chunk
        reg=json.loads((d/'registration.json').read_text())
        st=json.loads((d/'structure.json').read_text())
        sharp=json.loads((d/'sharpness.json').read_text())
        chunks.append(dict(chunk=chunk,completeParts=[t['id'] for t in reg['tiles']],pendingParts=visual['chunks'][chunk]['pendingParts'],nativeSizes={t['id']:t['nativeSize'] for t in reg['tiles']},outputSize=[2048,2048],structureMaxReliablePx1x=st['maxReliableDisplacementPx1x'],structureReliableProbes=st['reliableProbes'],structureTotalProbes=st['totalProbes'],sharpnessRatioLaplacian=sharp['rois']['full_chunk']['laplacianRatio'],wholeStructureWithin4pxVerified=False,qualityDecision=visual['chunks'][chunk]['decision']))
    for g in manifest['generations']:
        g['args']['referenced_image_paths']=[f"tmp/z2-hd/{g['chunk']}-{g['id']}-input.png"]
        g['archivedReferenceFileSha256']={p:hashlib.sha256((OUT/p).read_bytes()).hexdigest() for p in g['archivedReferenceImages']}
        g['selectedNative']=True
        g['productionApproved']=False
        g['note']='Only attempt, archived for review; selectedNative means archived attempt, not approval. See visual-review.json.'
    (OUT/'generation-prompts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    result=dict(zone='asia',chunkSet='1/5',status='partial-quality-delivery-for-review',chunks=chunks,imageGenCalls=len(manifest['generations']),generationLimit=16,retries=0,tool='built-in image_gen.imagegen',nativeFormat='lossless WebP VP8L',neighborChunkSeamsApplied=False,qualityDecision='pending Claude decision; known semantic geometry defects',qaPassedClaimed=False,inGameTestRun=False,automatedCheckScope='completeness, decoding, dimensions only; plus lossless archival hash and size integrity',pending='See each chunk pendingParts and visual-review.json; no quality-threshold retry performed.')
    (OUT/'run-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(chunks,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
