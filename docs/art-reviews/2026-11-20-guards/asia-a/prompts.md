# ImageGen production specifications — asia/a

Tool: built-in `image_gen`; 5 calls. This records the production prompt specifications and reference roles, not API/CLI commands. No external image generation service was used.

Mandatory approved reference attached to every call:
`docs/art-reviews/2026-11-20-guard-designs/guard-guanyu-asia-v1.webp`.

Common identity constraint: respectful human Guan Yu, red face, stern dignified eyes, long black beard, emerald headdress with gold trim and green jewel, green cloak, black-green lamellar armor with elaborate gold dragon relief. Match the approved clean bold outlines, chibi proportions and rich fantasy shading. No horse features, text, watermark, blood or humiliating treatment.

## 1 — Standing map sprite

Use case: identity-preserve. Approved reference supplies identity and style; old `img/Asia/crew-guard-asia-v2.webp` supplies the map-asset role and standing composition. Replace the horse-headed guard with approved Guan Yu. Full body, three-quarter view facing right, upright green-dragon crescent guandao with gold dragon relief, green cape, both boots fully drawn. One character, isolated genuine transparent background, no ground plane or pedestal. Preserve all defining costume details. Final canvas 1254×1254 RGBA; align footprint to old ground anchor after generation.

Also used for the two 512×512 RGBA event sprites after resizing and baseline alignment. No extra generation for those slots.

## 2 — Portrait

Use case: identity-preserve. Approved image is the mandatory identity/style reference. Old `img/Asia/crew-guard-asia-profile.webp` supplies square crop and misty Asian gate backdrop. Replace the horse-headed guard entirely. Chest-up three-quarter portrait facing slightly right, prominent readable face and beard, green-dragon guandao blade partly visible beside him. Subtle misty blue-green traditional stone gate landscape. Square opaque scene, one character, no frame. Final 512×512 RGB.

Also used for `img/z2-events/boss-guanyu-asia-profile.webp` without another generation.

## 3 — Seated tea rest

Use case: identity-preserve. Approved image supplies identity/style; old `img/tea-rest/crew-guard-asia-sit-v1.webp` supplies seated asset role. Calm dignified Guan Yu sitting cross-legged, eyes closed, both hands holding a small pale green tea cup. Green cloak and same gold dragon armor. Boots and crossed legs form a horizontal base. Entire hat, cloak and feet visible; no floating parts. No weapon required for tea rest. Genuine transparency, no scene, floor shadow, pedestal or text. Final 170×229 RGBA.

## 4 — Sweeping cutscene

Use case: identity-preserve. Approved image is the mandatory Guan Yu identity/style. Old `img/Asia/crew-guard-asia-cutscene.webp` is the composition edit target: red Chinese underworld gate, lanterns, stone steps, fire, sweeping gold energy arc and airborne stones. Replace the horse-headed samurai entirely with approved Guan Yu, performing a two-handed sweeping polearm strike. Weapon must be the green-dragon crescent guandao with gold dragon relief, not a straight spear. Show full body and both boots, retain wide scene layout and energy arc, no additional characters. Requested approximate boot positions left `(350,663)` and right `(989,717)` on 1375×768. Final 1375×768 RGB. Post-generation whole-frame alignment uses separately measured contact landmarks recorded in production.json.

## 5 — Unconscious pose

Use case: identity-preserve. Approved image supplies Guan Yu identity/style. `img/ko-pose-v1/th/guard.webp` supplies only the horizontal pose and framing, not its skin color or costume. Guan Yu lying safely unconscious on his back, eyes closed, head LEFT and booted feet RIGHT. Long black beard over chest, green cloak beneath him, exact green/gold dragon armor. Entire body, both relaxed hands and both legs visible, no injuries or torn clothes. Green-dragon guandao rests detached horizontally below body, safely away from face. Oblique top-down side view similar to pose reference. Wide 640×320 genuine transparent canvas, body approximately 380 px long before final scale alignment, around 200 px high, generous margins. No floor, shadow, text or watermark. Final body length aligned to 0.9–1.0 of standing body height at the event sprite's 512 px canvas scale.
