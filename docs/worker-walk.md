# A3 — natural worker escort walking

The escort job previously overrode the selected animation row for every direction, forcing row3 (arm held forward) even while walking. All four regions now use normal side/down/up walking rows while moving, and idle when stationary. The v1 fallback also walks normally. Carrying and work poses retain their existing precedence.

advanceWorkerEscort derives moving and heading from actual changes in the shared escort timeline position. A repeated position no longer animates a walk in place. Routes, speed, soul progress, lead distance, pickup/release and ledger are unchanged; A4 courier spacing remains a separate queued task. No new artwork or atlas edits; measured foot fit and frame insets are reused.

Regression coverage executes the real escort updater and drawWorker across all four regions, directions and atlas columns. Existing regional route/delivery, work, fit and rest regressions are run before release. Browser evidence is external, with isolated memory-only fixtures. Codex self-check; owner visual acceptance pending. Branch/worktree retained.
