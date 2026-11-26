// FB3-EV5 test helpers: a called helper stands in the team and the player picks its acts (game.js `summon:<k>` = the call, `helper:move` / `helper:attack` = one act of the standing helper).
/** Call a helper from the lamp (the caller's turn) and close that command. Returns the result of the call. */
export function callHelper(g, k = 'hanuman', who = 'you') {
  g.battle.actorId = who;
  const ok = g.confirmBattleCommand(`summon:${k}`, 'you'); if (ok) g.finishBattleCommand(); return ok;
}
/** One act of the standing helper (what = 'helper:move' | 'helper:attack'); `finish` = close the command like the UI does when the animation is over. */
export function helperAct(g, what = 'helper:move', k = 'hanuman', finish = true) {
  g.battle.actorId = `summon:${k}`;
  const ok = g.confirmBattleCommand(what, 'you'); if (ok && finish) g.finishBattleCommand(); return ok;
}
