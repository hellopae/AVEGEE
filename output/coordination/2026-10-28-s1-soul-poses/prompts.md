# Artwork provenance and pending prompts


## S1-ART2 actual prompts — 29 October 2026

Built-in `image_gen` only; 4 calls, one per distinct original, no retries, CLI or Shado. Each call supplied the original through `referenced_image_paths` with `transparent_background: true`. Outputs copied byte-for-byte; no resampling, compositing or alpha edits. pol/gen reuse the existing officer drawing. New drawings cover nun/novice, star, lord, monk/prophet. Registry reuse also makes the same original/type available for orchard and hunter/gadget; no additional images generated for those cases.

### woman / caught_lie

Reference: `img/Thai/spirit-woman-th-v2.png`

Saved: `img/soul-poses/woman-th-caught-lie-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, caught_lie reaction. Edit the reference image, preserving this EXACT same fictional character, facial identity, age, hairstyle, costume, accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change ONLY facial expression to startled at being caught lying: very wide eyes, raised eyebrows, open shocked mouth, and clearly visible sweat drops at temples and cheeks drawn into the sprite. Sweat is NOT tears; no crying. Keep original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference. Keep hands, outfit, objects and tail in their existing positions. Actual transparent RGBA background. No scene, text, new objects, extra people, UI or watermark. One image only. Subject: Thai woman with grey swept updo, gold floral hair ornament and gold earrings, white traditional jacket with gold buttons and belt, grey-gold patterned skirt, dark book held in her hand. Preserve exact feminine face and tail curling right. Canvas 1254 by 1254 pixels.
```

### worker / caught_lie

Reference: `img/Thai/spirit-worker-th-v2.png`

Saved: `img/soul-poses/worker-th-caught-lie-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, caught_lie reaction. Edit the reference image, preserving this EXACT same fictional character, facial identity, age, hairstyle, costume, accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change ONLY facial expression to startled at being caught lying: very wide eyes, raised eyebrows, open shocked mouth, and clearly visible sweat drops at temples and cheeks drawn into the sprite. Sweat is NOT tears; no crying. Keep original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference. Keep hands, outfit, objects and tail in their existing positions. Actual transparent RGBA background. No scene, text, new objects, extra people, UI or watermark. One image only. Subject: Older Thai man with swept silver hair, white standing-collar jacket with gold buttons, grey-gold patterned wrapped trousers, dark walking cane with gold fittings. Preserve elderly face, cane and tail curling right. Canvas 1254 by 1254 pixels.
```

### business / caught_lie

Reference: `img/Thai/spirit-business-th-v2.png`

Saved: `img/soul-poses/business-th-caught-lie-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, caught_lie reaction. Edit the reference image, preserving this EXACT same fictional character, facial identity, age, hairstyle, costume, accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change ONLY facial expression to startled at being caught lying: very wide eyes, raised eyebrows, open shocked mouth, and clearly visible sweat drops at temples and cheeks drawn into the sprite. Sweat is NOT tears; no crying. Keep original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference. Keep hands, outfit, objects and tail in their existing positions. Actual transparent RGBA background. No scene, text, new objects, extra people, UI or watermark. One image only. Subject: Heavyset Thai man with swept dark hair, thick eyebrows, small moustache, glowing white ghost eyes, white traditional suit, gold chain with amulet, rings and watch, patterned wrapped trousers. Preserve round heavy face, white eyes without new pupils, all jewelry, hands and tail. Canvas 1199 by 1312 pixels.
```

### cleric / caught_lie

Reference: `img/Thai/spirit-cleric-th-v2.png`

Saved: `img/soul-poses/cleric-th-caught-lie-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, caught_lie reaction. Edit the reference image, preserving this EXACT same fictional character, facial identity, age, hairstyle, costume, accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change ONLY facial expression to startled at being caught lying: very wide eyes, raised eyebrows, open shocked mouth, and clearly visible sweat drops at temples and cheeks drawn into the sprite. Sweat is NOT tears; no crying. Keep original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference. Keep hands, outfit, objects and tail in their existing positions. Actual transparent RGBA background. No scene, text, new objects, extra people, UI or watermark. One image only. Subject: Elderly bald Thai monk, deeply lined face, grey eyebrows, saffron orange robe, rolled scripture held at left, gold prayer beads in other hand. Preserve elderly identity, robe folds, scripture, beads and existing tail. Canvas 1145 by 1374 pixels.
```


Recovered from run 20261028T164249Z-a6fd375e diff.patch:
- originals/spirit-officer-th-v2.png (1254×1254 RGBA)
- originals/spirit-recruit-th-v3.png
- officer-caught-lie-source.png (1254×1254 RGBA), copied byte-for-byte to img/soul-poses/officer-th-caught-lie-v1.png.

The previous run's actual generation prompt/provider is NOT present in the patch. It cannot be recovered from these files; no claim is made that the following prompts were used. No new generation was performed in this run. Shado status returned: “MCP tool call requires approval, but approval policy is never”.

Prepared prompt for a future officer revision (not executed):
Edit the provided spirit-officer-th-v2.png. Preserve the same fictional Thai officer: grey swept hair, pale blue ghost skin, white uniform, gold epaulettes, aiguillette, belt, sword and ghost tail, pixel-painted outlines and palette. Draw a startled reaction after his false statement is exposed: wide eyes, recoiling raised hand and sweat drawn into the sprite itself. Keep the 1254×1254 canvas, full-body framing, scale and bottom anchor; transparent RGBA background. No text, no scene or extra people.

Prepared necessity prompt (not executed):
Edit originals/spirit-recruit-th-v3.png, preserving the exact same fictional young recruit's face, hair, uniform, palette, line style, canvas size, scale and bottom anchor. Show him crying after someone finally listens to the truth of the abuse he suffered: slumped shoulders, bowed head, hands held close and tears drawn into his face. Transparent RGBA background. Do not add UI particles, text, scenery or other characters. Save as a new image; retain the original.

Remaining artwork: all selected original/type pairs in case-review.md marked ค้างวาด. Group by original image and type; reuse a drawing only where both match. Never use this Thai officer as the Asia/West/CyberHell costume.


## S1-ART1 actual prompts — 29 October 2026

Built-in `image_gen` only; 6 calls, one per original, no retries or CLI/Shado calls. Every call supplied the original as `referenced_image_paths` and `transparent_background: true`. Outputs copied byte-for-byte to the project; no resampling, compositing or alpha edits. Historical pending notes above describe the previous run. This section records the new work.

### recruit

Reference: `img/Thai/spirit-recruit-th-v3.png`

Saved: `img/soul-poses/recruit-th-necessity-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, necessity reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change only the expression to visibly crying with grief: inner eyebrows raised, sorrowful downturned mouth, clear tears flowing from BOTH eyes onto cheeks, head slightly bowed and shoulders subtly slumped. Tears must be drawn into the sprite. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, sweat, UI or watermark. This is sadness, not startled surprise. Subject: young Thai recruit with short dark hair and olive military uniform. Preserve the ghost tail curl. One image only.
```

### girl

Reference: `img/Thai/spirit-girl-th-v2.png`

Saved: `img/soul-poses/girl-th-necessity-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, necessity reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change only the expression to visibly crying with grief: inner eyebrows raised, sorrowful downturned mouth, clear tears flowing from BOTH eyes onto cheeks, head slightly bowed and shoulders subtly slumped. Tears must be drawn into the sprite. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, sweat, UI or watermark. This is sadness, not startled surprise. Subject: Thai schoolgirl with dark ponytail, cream hair ribbon, white blouse, navy bow and pleated skirt, shoulder bag. Preserve all these details. One image only.
```

### boy

Reference: `img/Thai/spirit-boy-th-v2.png`

Saved: `img/soul-poses/boy-th-necessity-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, necessity reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change only the expression to visibly crying with grief: inner eyebrows raised, sorrowful downturned mouth, clear tears flowing from BOTH eyes onto cheeks, head slightly bowed and shoulders subtly slumped. Tears must be drawn into the sprite. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, sweat, UI or watermark. This is sadness, not startled surprise. Subject: Thai schoolboy with side-swept dark hair, white short sleeve shirt with gold buttons and chest emblem, navy shorts and shoulder bag. Keep his exact youthful face, bag and tail. One image only.
```

### sergeant

Reference: `img/Thai/spirit-officer-th-v2.png`

Saved: `img/soul-poses/officer-th-necessity-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, necessity reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change only the expression to visibly crying with grief: inner eyebrows raised, sorrowful downturned mouth, clear tears flowing from BOTH eyes onto cheeks, head slightly bowed and shoulders subtly slumped. Tears must be drawn into the sprite. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, sweat, UI or watermark. This is sadness, not startled surprise. Subject: older Thai officer with swept grey hair, small grey moustache, white ceremonial uniform, gold epaulettes, gold aiguillette, gold belt and sword held at his side. Retain all uniform insignia and sword, existing ghost-tail shape. One image only.
```

### hammer

Reference: `img/Thai/spirit-elder-woman-th-v2.png`

Saved: `img/soul-poses/elder-woman-th-necessity-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, necessity reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change only the expression to visibly crying with grief: inner eyebrows raised, sorrowful downturned mouth, clear tears flowing from BOTH eyes onto cheeks, head slightly bowed and shoulders subtly slumped. Tears must be drawn into the sprite. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, sweat, UI or watermark. This is sadness, not startled surprise. Subject: elderly Thai woman with silver bun, gold hair ornament and earrings, cream-gold traditional wrap blouse, patterned gold skirt, hands holding the same white handkerchief at her chest. Preserve elderly facial features and existing ghost-tail curl to the left. Canvas must remain 1145 by 1374 pixels with identical character placement. One image only.
```

### healer

Reference: `img/Thai/spirit-worker-th-v2.png`

Saved: `img/soul-poses/worker-th-necessity-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, necessity reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change only the expression to visibly crying with grief: inner eyebrows raised, sorrowful downturned mouth, clear tears flowing from BOTH eyes onto cheeks, head slightly bowed and shoulders subtly slumped. Tears must be drawn into the sprite. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, sweat, UI or watermark. This is sadness, not startled surprise. Subject: older Thai man with swept silver hair, white traditional standing-collar jacket with gold buttons, grey-gold patterned wrapped trousers, dark walking cane with gold fittings in his hand. Keep same youthful-chibi proportions, elderly identity, cane and ghost tail. One image only.
```

## S1-ART3 actual prompts — 29 October 2026

Built-in image_gen only, two calls, no retries. Originals used as edit references every time. Outputs copied byte-for-byte; no resampling or alpha edits. orchard reuses woman; hunter/gadget reuse business from ART2 (actual prompts above), no duplicate generation.

### trader / accountant / heir

Reference: `img/Thai/spirit-executive-th-v2.png`

Saved: `img/soul-poses/executive-th-caught-lie-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, caught_lie reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change ONLY the facial expression: startled at being caught lying, eyebrows raised, eyes visibly widened, small open shocked mouth, clearly visible sweat droplets on the temples and cheeks drawn into the sprite. Not tears or crying. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions 1254 by 1254 pixels and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit, accessories and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, UI or watermark. One image only. Subject: elderly Thai male executive with swept silver hair, thick grey eyebrows and fine moustache, cream standing-collar jacket with gold buttons and insignia, gold rings and brown gold-trimmed walking cane. Preserve his elderly facial features and cane.
```

### sister

Reference: `img/Thai/spirit-clerk-th-v2.png`

Saved: `img/soul-poses/clerk-th-caught-lie-v1.png`

```text
Use case: identity-preserve. Asset type: interrogation game sprite, caught_lie reaction. Edit the reference image, preserving this EXACT same fictional character, face identity, age, hairstyle, costume and accessories, pale ghost skin, original palette, pixel-painted chibi linework and pixel density. Change ONLY the facial expression: startled at being caught lying, eyebrows raised, eyes visibly widened, small open shocked mouth, clearly visible sweat droplets on the temples and cheeks drawn into the sprite. Not tears or crying. Keep the original full-body silhouette, character scale, orientation, framing, margins, canvas dimensions 1254 by 1254 pixels and bottom ghost-tail anchor exactly aligned with the reference; keep hands, outfit, accessories and tail in their existing positions. Actual transparent RGBA background. No scene, text, extra objects, characters, UI or watermark. One image only. Subject: Thai female clerk with dark grey updo, gold floral hair ornament, cream standing-collar blouse with gold buttons and nameplate, grey-gold patterned Thai skirt, holding a grey folder against her chest. Preserve her exact youthful face, folder, hairstyle and tail.
```
