import json
from prepare import OUT, write_json

COMMON = '''Use case: style-transfer. Asset type: registered 2x game terrain detail redraw, one crop of an existing painted Asia hell map. Image 1 is the exact edit target, not a loose reference. Redraw its surface detail at twice the source resolution. Keep the exact same framing, camera, projection, palette, illumination, and all large shapes; every shoreline, plaza outline, stair tread, bridge deck, cliff silhouette, paving joint and rock must stay at the same normalized pixel coordinates. No crop, zoom, rotation, perspective change or new objects. Preserve the Chinese/Japanese underworld hand-painted game style: cool blue-grey individually articulated stone slabs and crags, fine fissures, mortar grains, scattered tiny leaves, moss crevices, crisp crimson maple foliage, dark green pine needles. Add real fine painted detail with clean sharp edges, no blur/DOF, no sharpening halos or noise. Preserve liquid and fog as a painted base at their exact original extent: teal river with white foam, waterfalls and cloud/mist. Preserve the existing exact density and placement of major foliage and bones outside walking ground. Do not reinterpret geometry or change the size of stones. No text, grid, border, UI or watermark. Deliver only the edited image filling the entire canvas, maintaining the exact input aspect ratio.'''
RAILS = ''' Remove ALL gold vertical posts, finials, balustrades and handrails beside bridges and stairs, including partial posts at image edges; reconstruct the stone/river/ground hidden behind them continuously. Keep every bridge floor and stair tread intact at the original position and width. Keep the gold circular inlay of the plaza; it is a floor pattern, not a railing. Do not remove cliffs, rock edges, retaining walls, trees, or structural deck supports.'''
KEEP = ''' Keep the inaccessible forest, rocks and bones in the water. Do not add any trees, props, bones, or boulders to paved areas. Preserve the outlines of the open paving and banks exactly.'''

if __name__=='__main__':
    plan=json.loads((OUT/'crop-plan.json').read_text())
    prompts=[]
    for chunk,data in plan.items():
        for p in data['parts']:
            w,h=p['inputSize']
            rails=chunk=='r3-c3' or (chunk=='r3-c4' and p['id']=='q11')
            prompts.append(dict(chunk=chunk,part=p['id'],input=f'{chunk}/inputs/{p["id"]}-source.webp',
                prompt=COMMON+(RAILS if rails else KEEP)+f' Source crop is {w}x{h}; requested output {w*2}x{h*2} pixels.'))
    write_json(OUT/'generation-prompts.json',prompts)
