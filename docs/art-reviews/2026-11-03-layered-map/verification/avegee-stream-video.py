from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1200,'height':830},record_video_dir='/private/tmp/avegee-stream-video',record_video_size={'width':1200,'height':830});page=context.new_page()
 page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/play.html');page.wait_for_function('window.layerStreamReview?.ready&&layerStreamReview.stats.pending===0',timeout=60000);box=page.locator('#scene').bounding_box();video=page.video
 # Record a crop of the actual running canvas, retaining genuine loading and movement.
 page.evaluate('layerStreamReview.goTo(layerStreamReview.meta.goals[0])');page.wait_for_timeout(6500);page.locator('#closer').click();page.wait_for_timeout(2500);page.locator('#scene').screenshot(path=str(out/'stream-current-close.png'));page.locator('#near').click();page.wait_for_timeout(1500)
 report=page.evaluate('''()=>({hero:layerStreamReview.hero,stats:layerStreamReview.stats,view:layerStreamReview.camera.view,direction:layerStreamReview.actorDirection})''');context.close();source=video.path();browser.close()
subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(source),'-vf',f"crop=1200:675:0:{int(box['y'])},scale=960:540",'-r','30','-an','-c:v','libx264','-crf','23','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'camera-stream-demo.mp4')],check=True)
(out/'stream-video-review.json').write_text(json.dumps(report,indent=2));print(json.dumps({'video':'camera-stream-demo.mp4','bytes':(out/'camera-stream-demo.mp4').stat().st_size,'stats':report['stats']}))

# Trim the setup interval while retaining the genuine movement/zoom sequence.
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(out/'camera-stream-demo.mp4')]))
subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(max(0,duration-13)),'-i',str(out/'camera-stream-demo.mp4'),'-t','13','-an','-c:v','libx264','-crf','23','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'camera-follow-demo.mp4')],check=True)
