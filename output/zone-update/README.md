# Zone introductions and case-aware spirit art

Restore the Zone 1 boss introduction before the case-10 fight. Zone arrival captions and controls occupy the image's lower black band; small screens allow extra caption space. Welcome scenes introduce the friendly seated heads of Zones 2–4. All six crew power scenes use the current branch's artwork. Yama and Nira follow the same bridge polyline with their feet anchored to it.

Each zone has ten new transparent spirit sprites: worker, executive, officer, cleric, mature woman, clerk, boy, girl, business, elderly woman. Case identity takes precedence over obsolete numbered portraits. Saved queues, held souls, stations, prison sentences, closed cases, afterlife walkers and returns are reconciled. Children and women cannot inherit the older male business portrait. Age terms about a caregiver's parent do not age the caregiver. Artwork loads on demand and semantic image paths also resolve before the asynchronous manifest finishes loading.

- `art-preview.html`: full cast and three friendly-head welcomes.
- `routes.html`: bridge path overlay.
- `intro-asia-proof.png`: rendered arrival dialog.
- `spirit-prompts.json` and `intro-prompts.json`: native image-generation prompts and source provenance.
- `claude-review-log.txt`: independent read-only review, with fixes described above; follow-up review confirmed these fixes and identified the manifest-loading fallback, which was then covered by a regression test.

Original assets are preserved; v2 images are selected through the manifest and semantic aliases.
