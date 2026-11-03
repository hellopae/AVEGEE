from pathlib import Path
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':900});page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/');page.wait_for_function('!!window.layerReview');print(page.evaluate('''async()=>{const {DUNGEON_CORRIDOR:c}=await import('/src/route-geometry.js');const {nav,structure}=layerReview;let at=c[0];const paths=[];for(const i of [7,15,23,30]){const goal=c[i],path=nav.path(at,goal);paths.push({index:i,reachable:path.length>0,walkable:nav.walkable(goal)});if(path.length)at=goal;}return {paths,blockedPixels:structure.blocked.reduce((a,b)=>a+b,0)};}'''));b.close()
