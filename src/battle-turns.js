// Deterministic round queue shared by the combat rules and visible timeline.
const ALLY_SPEED = {yama:12,nira:10,kan:11,dam:10,boon:8,plerng:8,taan:7,guard:6};
export function combatUnits(game) {
  const b=game.battle;if(!b)return [];
  return [...game.battleActors().filter(a=>a.id!=='you'||b.youHp>0)
    .map(a=>({id:a.id,side:'ally',name:a.name || (a.kind==='guard'?'ยักษ์ทวารบาล':'ยมทูต'),k:a.k||a.kind,speed:Number.isFinite(a.speed)?a.speed:ALLY_SPEED[a.k||a.kind]||8})),
    ...b.foes.filter(f=>f.hp>0).map(f=>({id:f.id,side:'foe',name:f.who,k:f.sp,
      speed:Number.isFinite(f.speed)?f.speed:9}))];
}
const bySpeed=(a,b)=>b.speed-a.speed||a.side.localeCompare(b.side)||String(a.id).localeCompare(String(b.id));
const legacyOrder=units=>units.slice().sort(bySpeed).map(({id,side})=>({id,side}));

// F3 (owner 15 Nov): "the enemy is alone, the team is many - by the time the round comes round the enemy is far too weak".
// RULE (one sentence for the player): in every round the enemy side acts as many times as the team has members standing (never fewer than one turn each).
//   * the extra turns go to the enemies in speed order, spread evenly (1 foe vs 4 = 4 turns; 2 foes vs 5 = 3 + 2), the same foe is never given two turns in a row while another foe could act
//   * the turns are woven BETWEEN the team's turns, so a foe never acts twice in a row while it has a team member to wait for: the move a boss announces on one of its turns is always
//     followed by at least one of OUR turns before it is used (BOSS-SKILLS "the player gets a whole round in between" still holds)
//   * the queue shows every one of them: the "next" strip lists the repeated portraits.
// TURN_RULE.ratio = share of the team size the foes get (1 = as many turns as the team, 0 = the old rule: one turn each). Tests / sims set FOE_TURN_RATIO to compare.
// DAMAGE: the extra turns come with lighter blows - a foe that acts n times a round hits for 1/n^damageExp of its blow (1 = its damage per ROUND stays what it was, the fights keep
// their difficulty and only the rhythm changes).  T1b (owner 16 Nov: "make it harder"): damageExp 0.8 = a foe with n turns a round deals n^0.2 times what it did (x1.25 at 3 turns, x1.48 at 7),
// so the enemy's total strength per round really goes up with the team; the fights listed in foe-turn-fit.js / encounter-balance.js are then re-fitted to their new win % targets
// (scripts/fit-t1b-harder.mjs, fit-t1b-frontier.mjs) and the fights that were not fitted (mobs, souls) get their own rows (crowd rows of encounter-balance.js).
// Per-fight corrections live in the data (hp / atk) as before.
export const TURN_RULE={ratio:1,damageExp:0.8};
if(typeof process!=='undefined'&&process.env?.FOE_TURN_RATIO!=null&&process.env.FOE_TURN_RATIO!=='')TURN_RULE.ratio=Number(process.env.FOE_TURN_RATIO)||0;
if(typeof process!=='undefined'&&process.env?.FOE_TURN_DAMAGE_EXP!=null&&process.env.FOE_TURN_DAMAGE_EXP!=='')TURN_RULE.damageExp=Number(process.env.FOE_TURN_DAMAGE_EXP)||0;
/** blow scale of a foe that acts `perRound` times in a round */
export const foeHitScale=(perRound,exp=TURN_RULE.damageExp)=>Math.max(1,perRound||1)**-exp;
/** how many turns the foe side gets in a round (pure) */
export const foeTurnTotal=(allies,foes,ratio=TURN_RULE.ratio)=>foes<=0?0:Math.max(foes,Math.round(allies*ratio));
/** one round's order (pure, deterministic): units = [{id,side,speed}] */
export function orderRound(units,ratio=TURN_RULE.ratio){
  const allies=units.filter(u=>u.side==='ally').sort(bySpeed),foes=units.filter(u=>u.side==='foe').sort(bySpeed);
  const total=foeTurnTotal(allies.length,foes.length,ratio);
  if(!allies.length||total<=foes.length)return legacyOrder(units);
  const per=foes.map((_,i)=>Math.floor(total/foes.length)+(i<total%foes.length?1:0)),seq=[];
  for(let r=0;r<Math.max(...per);r++)foes.forEach((f,i)=>{if(per[i]>r)seq.push(f);});   // round-robin: A B A B ..., never A A while B is also owed a turn
  const slots=[...allies.map((u,j)=>({u,t:(j+.5)/allies.length})),...seq.map((u,m)=>({u,t:(m+.5)/seq.length}))].sort((a,b)=>a.t-b.t||bySpeed(a.u,b.u));
  let q=slots.map(x=>({id:x.u.id,side:x.u.side}));
  if(total<=allies.length){   // enough team turns to keep every foe turn apart: no two foe turns side by side, in the round or across the round change
    for(let i=0;i<q.length-1;i++)if(q[i].side==='foe'&&q[i+1].side==='foe'){const j=q.findIndex((x,k)=>k>i+1&&x.side==='ally');if(j>0){const [a]=q.splice(j,1);q.splice(i+1,0,a);}}
    if(q[0].side==='foe'&&q.at(-1).side==='foe'){const j=q.findLastIndex((x,k)=>k<q.length-1&&x.side==='ally');if(j>=0){const [a]=q.splice(j,1);q.push(a);}}
  }
  return q;
}
const ordered=units=>orderRound(units);
/** turns one foe gets in a round at the current team size (pure view of orderRound) */
export function foeTurnsOf(game,id){
  const q=orderRound(combatUnits(game));return Math.max(1,q.filter(t=>t.side==='foe'&&t.id===id).length);
}
export function ensureTurnQueue(game) {
  const b=game.battle;
  if(!b||b.over||['dad','yama'].includes(b.kind)||b.pendingWave)return null;
  const units=combatUnits(game);
  if(!b.turnQueue||b.turnQueue.version!==1||!Array.isArray(b.turnQueue.remaining)||!Number.isInteger(b.turnQueue.round)||b.turnQueue.round<1||b.turnQueue.wave!==(b.wave||0))b.turnQueue={version:1,wave:b.wave||0,round:1,remaining:ordered(units)};
  const q=b.turnQueue;
  q.remaining=q.remaining.filter(t=>units.some(u=>u.id===t.id&&u.side===t.side));
  if(!q.remaining.length&&units.some(u=>u.side==='ally')&&units.some(u=>u.side==='foe')){
    q.round++;q.remaining=ordered(units);
  }
  return q;
}
export function activeCombatUnit(game) {
  const q=ensureTurnQueue(game),turn=q?.remaining[0];
  return turn?combatUnits(game).find(u=>u.id===turn.id&&u.side===turn.side):null;
}
export function completeCombatTurn(game,turn) {
  const q=game.battle?.turnQueue;
  if(!q||!turn)return false;
  const i=q.remaining.findIndex(u=>u.id===turn.id&&u.side===turn.side);
  if(i<0)return false;
  if (turn.side === 'ally') {
    const b = game.battle;
    (b.actorTurns ||= {})[turn.id] = (b.actorTurns?.[turn.id] || 0) + 1;
    const protection = b.protection?.[turn.id];
    if (protection && b.actorTurns[turn.id] >= protection.expires) delete b.protection[turn.id];
    // QUEST-REWARDS: rope/gauze and taunt end after the affected / casting ally's own turn count passes `until`
    if (b.sealed?.[turn.id] && b.actorTurns[turn.id] >= b.sealed[turn.id].until) delete b.sealed[turn.id];
    if (b.taunt?.id === turn.id && b.actorTurns[turn.id] >= b.taunt.until) { delete b.taunt; if (b.defending) delete b.defending[turn.id]; }
    if (turn.id === 'you' && game.isFinalBattle?.()) game.finalEventState().teamCooldownTurns = game.teamJudgmentRemaining();
  }
  q.remaining.splice(i,1);ensureTurnQueue(game);return true;
}
export function combatTimeline(game) {
  const q=ensureTurnQueue(game);if(!q)return [];
  const units=combatUnits(game),resolve=(t,round)=>({...units.find(u=>u.id===t.id&&u.side===t.side),round});
  return [...q.remaining.map(t=>resolve(t,q.round)),...ordered(units).map(t=>resolve(t,q.round+1))];
}

// T1c (owner 18 Nov): fire on a foe lasts in ROUNDS of the foe (ticks = rounds x its turns per round) but its TOTAL stays what it was before F3 (turns x dmg).
// The total is split over the ticks (whole numbers, the rounding is carried so the sum is exact).
export function makeFoeBurn(ignite,perRound=1){
 const n=Math.max(1,perRound||1),ticks=Math.max(1,ignite.turns*n);
 return {turns:ticks,dmg:ignite.dmg,ticks,total:Math.round(ignite.turns*ignite.dmg),paid:0};
}
/** damage of the NEXT tick of a burn made by makeFoeBurn (call before decrementing burn.turns) */
export function burnTickDamage(burn){
 if(!burn||!burn.ticks)return burn?.dmg||0;
 const k=burn.ticks-burn.turns+1,due=Math.round(burn.total*k/burn.ticks),dmg=Math.max(0,due-burn.paid);
 burn.paid=due;return dmg;
}
