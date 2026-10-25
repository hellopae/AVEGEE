# A2 — one minute on a cushion at the tea pavilion

Crew, Guard and workers sent to tea reserve separate floor cushions, then rest seated for 60 seconds after arrival. The existing Yama tea seat and bed are separate. Room rendering uses fixed positions and regional seated art; it does not loop walking frames. Workers resting inside are hidden on the map and cannot be selected there.

The shared tea-staff-rest module owns arrival, seat reservation and exact completion time. Guard's former 120-second save is capped to the new minute. Worker boolean tea orders migrate to an actual journey and minute; structured worker rest state survives normalization and roster snapshots. Completion restores morale/hunger (and worker stamina), position and worker's previous mode. Repeated orders cannot reset the clock; changing worker mode cancels the reservation. World, battle and room recovery use the same state and wall clock.

This does not change Yama's sleep/tea timings or Nira's separate story recovery event. It does not change maps, masks, worker walking animation, courier spacing or other queue items. Images are new seated poses derived from the project's regional character references, cropped with alpha into img/tea-rest; original art stays intact. Existing worker rest images are reused.

Tests cover all four zones with five crew, Guard and six workers concurrently, real save/restore, no movement during rest, 59,999/60,000 ms boundaries, cancellation, old saves and existing rest/item tests updated to the owner's minute requirement. Browser fixture and evidence are external to production. Codex self-check only; owner visual acceptance pending. Worktree retained per handoff.
