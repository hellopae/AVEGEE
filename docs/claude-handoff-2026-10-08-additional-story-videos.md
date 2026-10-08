# Additional story videos — 8 October 2026

Owner supplied four additional clips. Inspected frame sequences: usable with corresponding story scenes. All run 6.041667 seconds.

- Thai deva praise and warning: `img/deva-intro/deva-intro-th-beggar-v2.mp4`, full 1280×720. Existing innocent-beggar case and translated captions remain.
- Controlled rulers: `img/story-cyberhell-02-v3.mp4`, crop 1276×536 at y=104.
- Final confrontation: `img/story-cyberhell-03-v4.mp4`, crop 1280×544 at y=88.
- Victory: `img/story-ending-01-v4.mp4`, crop 1276×584 at y=70 to preserve characters through the moving camera. Some letterboxing remains initially because the camera expands the painted content over time.

Reuses story video renderer: muted inline autoplay, controls allow unmuting/replay, manual next/back/skip, still fallback on errors. Audio tracks in final confrontation/victory preserved; other two source clips are silent. Original files/video clips unchanged. No new story events or rewards added, no image-preload catalog changes required for MP4 media.

Validation: 24 relevant tests passed, no failures, including existing story event/save flows and new media mapping/fallback files. All four output clips decoded with ffmpeg. Browser inspected media playback and corresponding captions.
