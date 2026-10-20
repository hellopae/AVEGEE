# Border dungeons and harbour travel

Approved flow: defeat a city's boss → exit its border → traverse its three named checkpoint locations and win the encounter at each → enter the next city → interact with its harbour → travel by boat between activated harbours. Boss victory alone does not discover or activate a destination port. Yama and Nira use the existing `moveZone` follower/saved-city mechanics.

`src/zone-travel.js` owns persisted rules only. Dungeon presentation, movement, enemy spawning, combat and boat animation belong to the game/UI. The three checkpoints and enemy kinds are provisional content; they are intentionally explicit, deterministic and editable rather than randomly awarding progress.

## Persistence

- New game: `initializeZoneTravel(g)` after current zone and boss state exist. Home harbour starts active.
- Restore: after loading `zone`, `zoneSave` and `bossCleared`, run `initializeZoneTravel(g, d.zoneTravel)`.
- Snapshot: include `zoneTravel: this.zoneTravel` in normal saves and `snapshot(false)` (zone entry snapshots).
- Saves without this module retain current and stored cities as visited/active ports. Merely having beaten a boss does not migrate its next city as visited.
- Restoring a route keeps victories already earned but clears pending encounter tokens, since existing battle objects are not saved. A retried fight receives a fresh token.

## Game hooks

```js
canMoveZone(k) { return canTravelZone(this, k); }
```

Place the guard inside `moveZone`, so callers cannot bypass it with a direct API call. Capture source and mode before the existing city switch:

```js
const from = this.zone;
const mode = dungeonStatus(this)?.ready ? 'dungeon' : 'boat';
// Existing city snapshot and follower transition...
this.zone = k;
finishZoneArrival(this, from, k, mode);
// Existing entry snapshot, onChange, etc.
```

This finalization must happen before the tail `snapshot(false)` and before observers can save. `finishZoneArrival` validates source, target, victories and mode; it does not activate a new port. Any view listing next-city boss unlocks should instead display `openDungeonRoutes(this)`. Existing cross-zone character availability should use `zoneTravel.visited[homeZone]`, since `canMoveZone` now checks actual travel permission and busy state.

At the border's physical interaction point:

```js
beginDungeon(g, 'asia'); // only adjacent outgoing route after source boss victory
```

At the current checkpoint's physical interaction point (UI must verify player proximity first):

```js
const e = nextDungeonEncounter(g);
if (!e) return;
// Use an existing mob fight, with a uniquely identified temporary dungeon mob.
const mob = { id:`dungeon-${e.token}`, kind:e.kindIdx /* position/render fields */ };
g.mobs.push(mob);
const battle = g.startMobBattle(g.mobs.indexOf(mob));
if (battle) battle.dungeonToken = e.token;
else {
  g.mobs = g.mobs.filter(m => m !== mob);
  resolveDungeonEncounter(g, e.token, false);
}
```

When `endBattle` captures `B` and clears `this.battle`, resolve **only** `B.dungeonToken` using `B.over === 'win'`. Defeat or fleeing clears the pending token and retains the checkpoint for retry; ordinary fights cannot advance a dungeon. Clean up its temporary mob on all battle outcomes. Save after resolution. Mob fights avoid `startFrontierBattle`'s mandatory stationed crew and unrelated frontier-wave rewards.

At the harbour's physical interaction point call `activateHarbour(g)` and save, then list `harbourDestinations(g)`. Selecting one invokes existing `moveZone`; presentation can animate Yama and Nira boarding before that operation and place them at the destination harbour after arrival. No coin cost or time cost is specified by the user, so none is imposed.

`leaveDungeon(g)` cancels an inactive route and returns the UI to the city; active combat cannot be abandoned through this helper. Leaving resets that route's checkpoint progress. Revisiting discovered cities by boat keeps their local buildings and crew through existing `zoneSave` mechanics.

## Verified rules

Run `node --test tests/zone-travel.test.mjs`. Eight tests cover boss-only unlock rejection, adjacent route gates, losses/retries/stale results, first arrival vs port activation, boat return, checkpoint persistence, legacy migrations, malformed state, busy gates and the complete four-city chain.

The helpers reject malformed indices/evidence and unknown routes/ports. As a local game they do not claim tamper-proof saves: a user editing the entire save can fabricate progress. Physical checkpoint/harbour proximity must be enforced by the caller that knows map coordinates.

## 2026-10-21 patrol extension

Zone 1–2 now has six optional real patrol encounters between the three story checkpoints. They roam short lanes on the authored road, use proximity dispatch with a second game-side physical position check, and use normal combat/reward/cleanup hooks. Patrol victories persist in `active.patrolDefeated`, independent of `cleared` and `checkpoint`; they cannot unlock a gate. Remaining patrols can still be fought after the cave is cleared, including during the boss-guided expedition. Fleeing retreats away from that patrol and grants the existing four-second grace period. Restore sanitizes patrol IDs and clears interrupted battle tokens for a fresh retry.

Browser preview verified movement, proximity callback and one separate patrol victory; it resolves the callback automatically, so it is not proof of playing the full battle UI. Gameplay tests exercise real battle creation, result cleanup, save/restore, loss, stale results and gate separation.
