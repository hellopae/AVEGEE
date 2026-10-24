# A1 — Guard special cutscene before physical melee

The B1 physical melee path returned through runDash before the ordinary special-attack cutscene code. The Guard special `guard` therefore spent morale/cooldown and hit correctly but showed no cutscene. The direct before-browser reproduction records zero cuts, one60HP hit, morale100→92 and cooldown20000ms.

runDash now mounts the existing Guard cutscene after sprite setup and before starting its monotonic dash timeline. Its1.3second lead-in shifts launch, pose, contact and return together. Payment and damage remain inside the one guarded confirmBattleCommand call at contact. Skip dismisses the picture only; it does not apply damage or create another command. A missing/unmounted cutscene adds no empty delay. Ordinary strikes/other melee, ranged, healing, enemy moves and the legacy action path retain their previous timings. Reduced motion keeps the readable cutscene but translates no sprite.

Guard cutscene lookup uses the actual guard's home branch, independent of Yama outfit. The title uses GUARD.name plus the shared CREW_POWER move name. No assets, balance, geometry, unlocks or save schema changed. Import-map UI and battle-dash versions retain previous release tokens.

Regressions execute production runDash against real createGame combat commands with a controlled clock: no cost/hit before contact, one payment, turn held until return, blocked double input, replacement/closed battle no late payment, reduced motion and missing-cut fallback. Regional image lookup covers all four branches. Browser compares the pre-fix UI and final UI through isolated memory fixtures; artifacts outside this repository. Owner visual acceptance pending. Worktree retained per handoff. Remaining queued tea/rest/map work is separate.
