# ART-GRACE — prompts and evidence

Built-in image_gen only. Original asset was edit target; generated female profile was the second identity reference for each remaining image.

- Profile: Change character into an unmistakably adult woman, warm kind nurse and caregiver, feminine face, hair and physique, modest practical clothing. Preserve pixel-art style, square framing, pose, blue-grey skin, curved white horns, pointed ears, brass lantern, leather apron with pockets and tools, burgundy cloak and snowy western castle. No text or sexualization.
- Cutscene: Replace character with same adult woman from profile, preserve scene, pose, magic, framing and pixel art.
- Combat atlas: same character, preserve 4 columns × 2 rows, eight poses, placement and baseline, transparent background; no cropped sprites.
- Idle: same character, preserve four separate frames, original poses, positioning, baseline and transparent background.
- Standing: same character, preserve full-body pose, framing, foot position and transparent background.
- Walk: same character, preserve four walking frames, framing, positions, ground baseline and transparent background.
- Sit: same character, preserve seated pose, framing, feet and transparent background.

All image outputs were resized to original dimensions. Contact sheet shows original left, new right. Walk and combat atlas are drafts only: walk extends beyond existing crop rectangles; combat bottom-left pose crosses the column boundary. They are not wired into the game. Browser unavailable, so animation and in-game visual checks remain outstanding.

Dialogue finding: src/data.js CREW boon shared dialogue uses ผม and ครับ, including for west; tests/fixtures/b1-v3.json records a west recruitment line with ครับ. No dialogue changed.

## Exact prompts sent for remaining images

- Cutscene: Edit first image: cutscene. Replace the character with the same adult woman in second reference, her white swept hair, blue-grey skin, white curved horns, pointed ears, leather apron, burgundy cloak and lantern. Preserve original scene, pose, magic, framing and pixel art. Modest, kind, no text.
- Combat: Edit first image sprite atlas to feature same adult woman as second reference with white hair, blue-grey skin, white horns, pointed ears, leather apron, burgundy cloak, lantern. Preserve exact 4 columns by 2 rows, eight distinct poses, position and ground baseline within each cell; isolated transparent background, no borders or text. Pixel art. Do not crop any sprite.
- Idle: Edit first image sprite sheet to feature same adult woman as second reference with white hair, blue-grey skin, white horns, pointed ears, leather apron, burgundy cloak and lantern. Preserve four separate frames in a single row, exact original poses, scale, positioning, ground baseline and transparent background; pixel art, no text or borders.
- Standing: Edit first image game sprite into the same adult woman from second profile reference, white hair, blue-grey skin, curved white horns, pointed ears, leather apron, burgundy cloak, lantern. Preserve original full body pose, framing, foot position and pixel art; transparent background, modest clothing.
- Walk: Edit first image walking sprite sheet to feature same adult woman as second profile reference, white hair, blue-grey skin, curved white horns, pointed ears, leather apron, burgundy cloak, lantern. Preserve four separate original walk frames in one row, exact framing, positions and ground baseline, consistent appearance and transparent background. Pixel art, no text.
- Sit: Edit first image sitting sprite into same adult woman in second profile reference, white hair, blue-grey skin, curved white horns, pointed ears, leather apron, burgundy cloak. Preserve exact seated pose, framing, feet position, transparent background and pixel art, modest clothing.
