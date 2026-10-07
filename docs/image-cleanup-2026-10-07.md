# Unused image archive — 7 October 2026

Archived **74 images (31.6 MiB)** from `img/` to local `AVEGEE-backup/2026-10-07/img/`, preserving original subdirectories and filenames. No image was deleted from the local archive. All moved bytes were checked against SHA-256 before and after moving.

## Scope and evidence

Reviewed 1,366 image files under `img/`, runtime asset resolvers and dynamic name construction, module imports, preload catalog, manifest, tests, and authoring scripts. Naming or age alone was not evidence of non-use.

| Archived group | Images | Reason |
| --- | ---: | --- |
| Superseded theme-v4 station sprites | 36 | Nine station keys in each zone resolve to map-v5. |
| Sword animation v1 | 4 | Live renderer imports v2 metadata; Thai uses the corrected v3 sheet. Old v1 module is unreachable. |
| Roar cutscene v3 | 4 | Current power resolver selects v4 in all four outfits. |
| Legacy Yama attack/fire/ice/hypnosis/mirror JPEGs | 20 | Versioned power image resolver returns before these legacy branches. Other JPEG powers remain. |
| Duplicate guard sprites | 3 | Thai, Asia and Cyber guard selectors use v2; West original remains active and was retained. |
| Superseded covers, stories and scene layers | 7 | Two covers, two Cyber story versions, two previous scenes and unused foreground layer. |

Kept raw source artwork, new reference/UI files, all active images, fallback backgrounds and sprites, legacy maps used for walking masks, geometry reference station PNGs, and duplicate boss art used by verification tests. Also retained West/Cyber original ruler sprites because old-manifest fallback tests require them. The Thai sword v2 sheet remains because the facing-correction export script reads it to build v3.

`AVEGEE-backup/` is ignored by Git and will not be served by GitHub Pages. Git history remains an additional recovery source. `docs/image-archive-2026-10-07.json` records every original path, archive path, byte count, checksum, replacement and reason. A copy is stored alongside the archive.

## Loading lists

Removed archived entries only from the existing manifest's `critical`, `rest` and `zones` lists. Retained bounding boxes and station sizes unchanged. Regenerated the tracked-only preload catalog, and updated manifest/catalog cache versions. The catalog generator skips missing tracked paths while an archive move awaits staging.

## Verification

- All 164 resolved asset selections across four zones and both fire upgrade states are identical before and after cleanup.
- All 1,210 manifest/catalog entries resolve to existing files and exclude archived paths.
- All 476 existing tests pass, including old-manifest fallback and walking checks.
- Browser preload check: all four zones loaded; no new missing image responses or page errors. Both original and cleaned loading lists produce the same pre-existing optional `img/hero-yama-side.png` probe (404); that file is absent in the original checkout and the renderer falls back to the normal hero pose.

Repeat the asset audit from the repository root with `node scripts/check-image-archive.mjs`. It also verifies backup checksums when the local archive is present; the archive itself is not required on another checkout.

## Recovery

For a particular image, copy its `backup` path from the JSON back to its `original` path, creating its parent directory if necessary. Do not move the entire archive back indiscriminately. Before reactivating restored artwork, update the relevant selector and loading lists, regenerate the preload catalog, and rerun checks. The audit baseline should change only after reviewing which images are now active.
