# Q5 — built-in imagegen prompt set

Tool: built-in `image_gen.imagegen`; four edits, no CLI/API fallback. All inputs were viewed before editing. No layout guide or colored mask was supplied to the drawing tool.

1. **shore-generated.png**, input `inputs/shore-sw.png`: precise-object-edit. Keep exact crop framing, shoreline position, stone paving, lava waterfall and river rocks. Remove the small unwanted pier on the right including all gold posts, rails and projecting stairs; replace with continuous shallow stone bank and matching water. Flatten the cliff at image x50–192 and x832–975 into low gently sloping banks, retaining bank top position. Preserve lava and everything away from those bank stretches. Detailed painted jade stone, teal river, no new props or text. The output added white letterboxing: trim recorded in composite-settings.json. Use only the two masked shore patches; do not use its altered lava.

2. **pier-generated.png**, input `inputs/pier-se.png`: precise-object-edit. Repair into one symmetric small rectangular jade landing, aligned vertically, centered at crop x149. Two straight vertical parallel rails and four identical gold corner posts. Keep stairs. Requested deck x112–187/y128–166 in the 256×231 crop. Lower bank x21–156 near y90 into shallow smooth shore. Preserve paving, water and texture. No boats/buildings/text. **Not selected directly:** output contained six posts and rail slope.

3. **seam-generated.png**, inputs `inputs/seam-ne.png` (authoritative north) and `inputs/seam-se.png` (south edit target, begins 14 canvas pixels lower). compositing. Return one crop in southern framing 554×261. Make watercourse, rock banks, waterfalls and plants continue northern coordinates. Preserve path, plaza and cliff positions; retain southernmost content below overlap. Remove duplicate branches, doubled edges and textures. Match subdued jade and teal palette, no new stairs/props/text/layout changes. Same registered result composited into both NE and SE.

4. **pier-four-posts.png**, input `edits/pier-generated.png`, final prompt verbatim:

> Edit this exact image ONLY to remove the middle pair of gold ball-topped posts at the stair foot, halfway between the back and front pairs. There must be precisely FOUR corner posts total, two at top corners and two at bottom corners, matching equal height. Join the two remaining pairs with continuous straight vertical parallel gold rails. Keep original image dimensions, all paving, stone pier deck, staircase, water, colors and textures unchanged. No new objects. Keep the rectangular deck aligned vertical with perfectly parallel rail lines.

Then geometrically register the painted rails to preview x873/921 using the recorded row mesh. Composite through the local soft mask into SE and the SW overlap. This is image registration/compositing, not a runtime change. All selected patch registration/mask files are retained.
