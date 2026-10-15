# Yama zone 2–4 animation library

Open `/outfits/` on the pilot server, for example http://127.0.0.1:8793/outfits/.
The page switches between Thai, Asia, West and CyberHell and previews all four animation types.
This is an isolated art deliverable; no production map, UI, save data or character loader was changed.

Each new zone contains 62 frames:

| Animation | Frames | Atlas | Frame size | Anchor | Timing |
| --- | ---: | --- | --- | --- | --- |
| Book idle | 16 | 4 columns × 4 direction rows | 320×480 | 160,440 | 1000,320,100,480 ms |
| Book walk | 32 | 8 columns × 4 direction rows | 320×480 | 160,440 | 100 ms each |
| Sword idle | 6 | 6 columns × 1 row | 640×640 | 240,570 | 1000,240,420,100,100,260 ms |
| Sword attack | 8 | 8 columns × 1 row | 640×640 | 240,570 | 85,80,60,35,40,80,100,100 ms |

Book direction rows are down, left, right, up. Sword poses face right. Each folder includes transparent PNG atlases, individual generated pose PNGs, per-direction GIFs, contacts, source images, prompts and metadata. Sheet URLs in metadata are relative to this `outfits/` directory. Frame rectangles are in atlas coordinates; anchors are in individual frame coordinates.

ImageGen drew the three new animation types per zone using the approved Thai motion sheet as a pose reference and the repository's original zone costume as a visual reference. `prepare.py` only extracts transparent cells and packs them with one uniform isotropic scale per source sheet. Book walk uses a stable headwear height, preserving foot depth rather than pinning every lowest toe. No CSS breathing scale or procedural repaint is used. Costume variants are newly drawn artwork; they do not have pixel-identical silhouettes to the Thai source.

Sword attacks are reused from `img/yama-sword-v4/hero-yama-{zone}-sword.webp`, preserving the decoded pixels and original timing. The new sword idles and existing attacks remain separate sheets.

Rebuild technical exports from the repository root:

```sh
output/spa-pilot-20261015/.venv/bin/python output/spa-pilot-20261015/outfits/prepare.py
```

The Thai gallery points to the existing pilot sheets, including the final ear-v6 walk cleanup. Ear cleanup preserves all 32 body/leg regions; see `../map-book-v1/ear-v6/verification.json`. Browser checks cover all four zones and all four book directions, pause, frame scrubbing, and atlas/GIF links. `gallery-proof.png` is a browser screenshot. This work uses ImageGen plus technical Pillow/Canvas assembly; native SPA/Aseprite execution is not verified because Aseprite is not installed.
