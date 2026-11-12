// HOME-SLOTS: independent snapshots; the legacy key is retained as a copy-only migration backup.
export const SAVE_SLOT_COUNT = 3;
export const LEGACY_SAVE_KEY = 'avegee.save.v2';
export const ACTIVE_SLOT_KEY = 'avegee.save.active-slot.v1';
export const SLOT_MIGRATION_KEY = 'avegee.save.slots-migrated.v1';
export const validSlot = id => Number.isInteger(id) && id >= 1 && id <= SAVE_SLOT_COUNT;
export const slotKey = id => validSlot(id) ? `avegee.save.slot.${id}.v1` : null;
const storageOf = supplied => { try { return supplied === undefined ? globalThis.localStorage : supplied; } catch { return null; } };
export function supportedSave(data) {
  return !!data && typeof data === 'object' && [2,3,4].includes(data.v) &&
    Array.isArray(data.stations) && Array.isArray(data.crew) && Array.isArray(data.queue) &&
    ['tick','coin','order','karma'].every(k => typeof data[k] === 'number' && Number.isFinite(data[k]));
}
export function readSaveSlot(id, supplied) {
  if (!validSlot(id)) return { id, status:'invalid', data:null };
  try {
    const storage = storageOf(supplied); if (!storage) return {id,status:'unavailable',data:null};
    const raw = storage.getItem(slotKey(id));
    if (raw === null) return {id,status:'empty',data:null};
    let data;try {data=JSON.parse(raw);}catch{return {id,status:'invalid',data:null};}
    return supportedSave(data) ? {id,status:'occupied',data} : {id,status:'invalid',data:null};
  } catch { return {id,status:'unavailable',data:null}; }
}
export function listSaveSlots(supplied) { return Array.from({length:SAVE_SLOT_COUNT},(_,i)=>readSaveSlot(i+1,supplied)); }
export function writeSaveSlot(id, data, supplied) {
  if (!validSlot(id) || !supportedSave(data)) return false;
  try { const storage=storageOf(supplied);if(!storage || !['empty','occupied'].includes(readSaveSlot(id,storage).status))return false;storage.setItem(slotKey(id),JSON.stringify({...data,savedAt:Date.now()}));return true; } catch { return false; }
}
export function readActiveSlot(supplied) {
  try { const value=storageOf(supplied)?.getItem(ACTIVE_SLOT_KEY);const id=value===null||value===undefined?null:Number(value);return validSlot(id)?id:null; } catch { return null; }
}
export function selectSaveSlot(id, supplied) {
  if (!validSlot(id)) return false;
  try { const storage=storageOf(supplied);if(!storage)return false;storage.setItem(ACTIVE_SLOT_KEY,String(id));return true; } catch { return false; }
}
export function clearSaveSlot(id, supplied) {
  if (!validSlot(id)) return false;
  try {
    const storage=storageOf(supplied);if(!storage)return false;
    // Persist this before clearing slot1: restarting must never re-import the old legacy copy.
    storage.setItem(SLOT_MIGRATION_KEY,'1');storage.removeItem(slotKey(id));return true;
  } catch { return false; }
}
export function migrateLegacySave(supplied) {
  try {
    const storage=storageOf(supplied);if(!storage)return {ok:false,reason:'unavailable'};
    if(storage.getItem(SLOT_MIGRATION_KEY)==='1')return {ok:true,migrated:false};
    const raw=storage.getItem(LEGACY_SAVE_KEY);if(raw===null)return {ok:true,migrated:false};
    let data;try {data=JSON.parse(raw);}catch{return {ok:false,reason:'invalid-legacy'};}
    if(!supportedSave(data))return {ok:false,reason:'invalid-legacy'};
    if(storage.getItem(slotKey(1))===null){
      storage.setItem(slotKey(1),raw);
      if(storage.getItem(slotKey(1))!==raw)return {ok:false,reason:'unavailable'};
      storage.setItem(SLOT_MIGRATION_KEY,'1');return {ok:true,migrated:true};
    }
    storage.setItem(SLOT_MIGRATION_KEY,'1');return {ok:true,migrated:false};
  } catch { return {ok:false,reason:'unavailable'}; }
}
export function recordPlayTime(game, elapsed, active=true) {
  if(!active || !Number.isFinite(elapsed) || elapsed<=0)return;
  game.playTimeMs=Math.max(0,Number(game.playTimeMs)||0)+Math.min(elapsed,1000);
}
export function saveSlotSummary(data) {
  if(!supportedSave(data))return null;
  const actors=new Map();
  const add=(actor,zone)=>{if(!actor)return;const kind=actor.kind||actor.k;if(!kind)return;const home=kind==='nira'?'global':actor.homeZone||zone;const id=actor.id||`${home}:${kind}`;actors.set(id,{id,kind,zone:home});};
  for(const actor of Object.values(data.roster||{}))add(actor,data.zone||'th');
  for(const actor of data.crew)add(actor,data.zone||'th');if(data.guard)add({...data.guard,k:'guard'},data.zone||'th');
  for(const [zone,branch] of Object.entries(data.zoneSave||{}))if(zone!==(data.zone||'th')){for(const actor of branch.crew||[])add(actor,zone);if(branch.guard)add({...branch.guard,k:'guard'},zone);}
  return {savedAt:Number.isFinite(data.savedAt)&&data.savedAt>0?data.savedAt:null,playTimeMs:Number.isFinite(data.playTimeMs)?Math.max(0,data.playTimeMs):0,
    playTimePartial:!Number.isFinite(data.playTimeMs)||!!data.playTimePartial,coin:data.coin,order:data.order,karma:data.karma,
    zone:data.zone||'th',actors:[...actors.values()]};
}
