# Asset preloading — 5 October 2026

Boot loads shared images, the saved branch (Thai for new games), the equipped Yama's images and all three music files. Every branch arrival/return waits behind a modal loading screen before its introduction; the world remains paused. Images include wide rooms, regional introductions, punishment/frontier scenes and ability cutscenes. Other branches are not downloaded in the background.

Three image requests at a time, with image decode, a per-file timeout and one automatic retry. Failed files show a retry button or an explicit option to continue with what is available; no automatic 15-second escape. Successful URLs are reused during the session. Map/sprite images load last and background art warming yields to the loading queue. Failed canvas images retry after ten seconds rather than staying broken for the session.

Music is fetched completely and stored in Blob URLs on the existing audio tracks. This avoids relying on iOS `preload=auto`; playback still starts only after a user gesture. There are currently three shared songs (title, zone, battle), not separate songs per branch. Music adds about 8 MB; branch image bundles are substantial, so first loading on mobile data can take time. Preloading is not permanent offline storage, and physical iOS hardware still needs checking.

When shipping images: stage production images, then run `node scripts/make-preload-catalog.mjs`, and commit `img/preload-catalog.json` alongside them. The catalog reads tracked/staged images only and excludes `img/raw/`; it does not alter `img/manifest.json` (art key routing). Do not include `output/` evidence.

Validation: `node --test tests/*.test.mjs` (452 passed); browser boot reaches title without errors, and the isolated branch loader displays progress and completes each branch without touching the player's save. The new tests cover zone/outfit selection, file existence, decode waiting, request concurrency, retry/deduplication, music download without autoplay, and pausing/arrival ordering for new and returning branches.
