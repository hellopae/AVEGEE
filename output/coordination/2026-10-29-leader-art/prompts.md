# LEADER-ART — built-in image_gen

Two built-in image_gen edits; no Shado or CLI generation. Original asset preserved.
Image 1: `img/West/hero-boss-west-v2.png` (edit target, 512×512).
Image 2: `img/theme-v4/town-judgment-west-v2.webp` (perspective reference only).
Generated square output was normalized to 512×512 with nearest-neighbor sampling, preserving RGBA transparency. No manual painting, masking or chair removal with PIL; PIL only normalizes canvas size and makes evidence composites.

## First prompt

Use case: precise-object-edit
Asset type: production pixel-art transparent game sprite, exact 512x512 canvas.
Input image 1 is the edit target: the existing seated western ruler sprite. Input image 2 is supporting perspective reference ONLY: the stone throne already supplied by the game environment.
Primary request: remove ALL furniture from image 1. Draw ONLY the same ruler sitting, ready to composite onto the empty stone throne in image 2. No chair, no red backrest, no gold wooden armrests, no chair legs, no platform, no ground shadow. Actual transparent background.
Keep the SAME character identity: red skin, stern yellow eyes, large white beard, silver horned helmet, blue-silver fur-trimmed armor, orange leather straps, red boots, spear in left hand. Keep raven above left shoulder, supported on the spear if necessary instead of chair. Match existing crisp blocky pixel art and original palette, no smooth painted rendering.
Pose: seated front view seen slightly from above, knees apart, thighs foreshortened towards viewer, boots below knees, hips at about y=360 of 512, boots bottom y=500. Right hand resting on right thigh, left hand grips spear. This will fit the center of the stone throne seat. Keep original head and armor proportions and position very close to original. No new props. Do not render the throne reference into the result. Entire ruler, spear and bird remain within canvas.

## Correction prompt

Input: normalized first edit, `img/West/hero-boss-west-seated-v2.png`.

Use case: precise-object-edit. Edit this transparent game sprite with ONE tiny correction only: remove the short floating brown/gold chair-post fragment directly underneath the raven's feet (upper left quadrant, around x=390 y=280 on this source canvas). Keep raven exactly in place as a hovering familiar with feet tucked, leave empty transparency beneath it. Preserve EVERYTHING else pixel for pixel as closely as possible: same red-skinned ruler, face, white beard, horned helmet, armor, seated pose, fur cloak, spear, boots, proportions, colors and pixel-art style. No chair or furniture. Transparent background. Keep square canvas.
