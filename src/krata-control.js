// G5: real-time cooldowns; game ticks are work periods, not calendar days.
export const STOKE_COOLDOWN = 20_000;
export const TRAIN_COOLDOWN = 300_000;
export const FIRE_BONUS_PER_LEVEL = .03;   // Claudy 10 ต.ค.: ลด .05 → .03 หลัง G4 ทำให้ cyber breach เป็นหน้าผา (สูงสุด 3 ระดับ = +9%)
export const KRATA_WALK = [{poly:[[.12,.44],[.84,.44],[.84,.49],[.74,.52],[.73,.68],[.79,.72],[.79,.79],[.59,.79],[.59,1],[.41,1],[.41,.79],[.23,.79],[.21,.70],[.15,.66],[.15,.59],[.10,.58]]}];
export function normalizeFireControl(value) {
  const out = { actors:{}, stokeReadyAt:0 };
  if (!value || typeof value !== 'object') return out;
  out.stokeReadyAt = Number.isFinite(value.stokeReadyAt) ? Math.max(0,value.stokeReadyAt) : 0;
  for (const [id, state] of Object.entries(value.actors || {})) {
    if (!state || typeof state !== 'object') continue;
    out.actors[id] = { level:Math.max(0,Math.min(3,Math.floor(Number(state.level)||0))), readyAt:Number.isFinite(state.readyAt)?Math.max(0,state.readyAt):0 };
  }
  return out;
}
export const stokePosition = elapsed => .5 + .44 * Math.sin(elapsed * Math.PI / 850);
export const stokeHit = pos => pos >= .42 && pos <= .58;
export const trainingRadius = elapsed => 2.2 - (elapsed % 2200) / 2200 * 1.65;
export const trainingHit = radius => Math.abs(radius - 1) <= .12;
export function trainingAttempt(state, hit) {
  if (state.done) return state;
  const next = {...state, hits:state.hits + (hit?1:0), misses:state.misses + (hit?0:1)};
  next.done = next.hits >= 5 || next.misses >= 3;
  next.won = next.hits >= 5;
  return next;
}
export const krataMethods = {
  fireActorId(actor = 'yama') { return actor === 'yama' ? 'yama' : actor && typeof actor === 'object' && actor.k === 'plerng' ? actor.id || `${actor.homeZone || this.zone}:plerng` : null; },
  fireControlState(actor = 'yama') { return this.fireControl?.actors?.[this.fireActorId(actor)] || {level:0,readyAt:0}; },
  controlledFireDamage(base, actor = 'yama') { return Math.round(base * (1 + FIRE_BONUS_PER_LEVEL * this.fireControlState(actor).level)); },
  krataSlots(st, now = Date.now()) {
    if (!st || !this.stations.includes(st) || st.def.k !== 'krata' || st.build || st.repair || st.fire >= 100) return [];
    return st.slots.filter(s => (!s.pendingUntil || s.pendingUntil <= now) && s.progress < s.need);
  },
  stokeWhy(st, now = Date.now()) {
    if (!this.krataSlots(st,now).length) return 'g5.noSouls';
    return (this.fireControl?.stokeReadyAt || 0) > now ? 'g5.cooldown' : '';
  },
  beginStoke(st, now = Date.now()) {
    if (this.stokeWhy(st,now) || this._krataSession) return null;
    this.fireControl = normalizeFireControl(this.fireControl);
    this.fireControl.stokeReadyAt = now + STOKE_COOLDOWN;
    const session = {kind:'stoke',st,zone:this.zone}; this._krataSession = session;
    this.save(); return session;
  },
  finishStoke(session, hit, now = Date.now()) {
    if (!session || this._krataSession !== session || session.kind !== 'stoke') return false;
    this._krataSession = null;
    this.fireControl.stokeReadyAt = now + STOKE_COOLDOWN;
    if (session.zone !== this.zone || !this.stations.includes(session.st)) return false;
    if (hit) for (const slot of this.krataSlots(session.st,now)) slot.progress += (slot.need-slot.progress)*.2;
    this.save(); return true;
  },
  fireTrainingWhy(actor, now = Date.now()) {
    const id = this.fireActorId(actor);
    if (!id || (actor !== 'yama' && !this.crew.includes(actor))) return 'g5.unavailable';
    const state = this.fireControlState(actor);
    return state.level >= 3 ? 'g5.max' : state.readyAt > now ? 'g5.trainWait' : '';
  },
  beginFireTraining(actor, now = Date.now()) {
    if (this.fireTrainingWhy(actor,now) || this._krataSession) return null;
    const session = {kind:'training',actor,id:this.fireActorId(actor),zone:this.zone,hits:0,misses:0,done:false};
    this._krataSession = session; return session;
  },
  attemptFireTraining(session, hit, now = Date.now()) {
    if (!session || this._krataSession !== session || session.kind !== 'training' || session.zone !== this.zone) return null;
    if (session.actor !== 'yama' && !this.crew.includes(session.actor)) { this._krataSession=null; return null; }
    Object.assign(session,trainingAttempt(session,hit));
    if (session.done) {
      this._krataSession = null;
      if (session.won) {
        this.fireControl = normalizeFireControl(this.fireControl);
        const state = this.fireControlState(session.actor);
        this.fireControl.actors[session.id] = {level:Math.min(3,state.level+1),readyAt:now+TRAIN_COOLDOWN};
        this.save();
      }
    }
    return session;
  },
  cancelKrata(session) { if (this._krataSession === session) this._krataSession = null; },
};
