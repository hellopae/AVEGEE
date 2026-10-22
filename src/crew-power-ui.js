// crew-power-ui.js — ไอคอนพลังยมทูต + แผ่นรายละเอียดพลัง (P4 §3)
// ป้ายกลมมุมล่างขวาของรูปโปรไฟล์ = ท่าสู้ (CREW_POWER[k].icon) · ป้ายเล็กมุมล่างซ้าย = หน้าที่คุมงาน (CREW_POWER[k].jobIcon)
// ไฟล์ภาพจริงของ Codex อยู่ที่ img/ui/power-*.webp / job-*.webp — เปลี่ยนไอคอนที่ CREW_POWER[k].icon ที่เดียว ไม่ต้องแตะโค้ดตรงนี้
import { CREW, CREW_POWER, BATTLE, GUARD, crewName } from './data.js';
import { keeperRole } from './interrogation.js';
import { crewAbility } from './command-wheel.js';
import { t, getLang } from './i18n.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const POWER_KEYS = Object.freeze(Object.keys(CREW_POWER));
export const powerName = k => getLang() === 'en' ? t(`power.${k}.name`) : CREW_POWER[k]?.name || '';
const crewLabel = (k, zone) => k === 'guard' ? GUARD.name : crewName(CREW.find(c => c.k === k), zone);

/** ป้ายไอคอน (span role=button เพื่อซ้อนในปุ่ม/การ์ดที่เป็น <button> ได้) — ผูกคลิกด้วย bindPowerBadges() ครั้งเดียวระดับเอกสาร */
export function powerBadgeHtml(k, { zone = 'th', job = true, actor = null } = {}) {
  const p = CREW_POWER[k];
  if (!p) return '';
  const name = powerName(k), ability = crewAbility(actor || k, zone);
  const label = `${name} — ${ability}`;
  const jobIcon = job && p.jobIcon
    ? `<span class="job-badge" role="img" aria-label="${esc(t('power.job'))}" title="${esc(t('power.job'))}"><img src="${esc(p.jobIcon)}" alt=""></span>` : '';
  return `<span class="power-badges"><span class="power-badge" role="button" tabindex="0" data-power="${esc(k)}" aria-label="${esc(t('power.open', { name }))}" title="${esc(label)}"><img src="${esc(p.icon)}" alt="" style="--tint:${esc(p.tint)}"></span>${jobIcon}</span>`;
}

/** HTML แผ่นรายละเอียดพลังของยมทูตคนหนึ่ง — ตัวเลขจากฟังก์ชัน/ค่าชุดเดียวกับโต๊ะนิรา (ไม่พิมพ์เลขซ้ำ) */
export function powerSheetHtml(g, k) {
  const p = CREW_POWER[k];
  if (!p) return '';
  const def = k === 'guard' ? null : CREW.find(c => c.k === k);
  const actor = k === 'guard' ? g.guard : g.crewOf(k);
  const name = powerName(k), who = crewLabel(k, g.zone);
  const ability = crewAbility(actor || k, g.zone);
  const cd = k === 'guard' ? GUARD.battleCd : BATTLE.crewCd;
  const role = k === 'guard' ? null : keeperRole(k);
  const hired = k === 'guard' ? !!g.guard : !!actor;
  const price = k === 'guard' ? GUARD.hire : def?.hire;
  const inParty = !!actor && k !== 'guard' && (g.party?.members || []).includes(k);
  const canTeam = hired && k !== 'guard' && !def?.reader;
  const buttons = !hired
    ? `<button type="button" class="gold" data-power-hire="${esc(k)}" ${g.coin < price ? 'disabled' : ''}>${esc(t('power.hire', { n: price }))}</button>`
    : canTeam ? `<button type="button" class="gold" data-power-party="${esc(k)}">${esc(t(inParty ? 'power.leaveTeam' : 'power.joinTeam'))}</button>` : '';
  return `<div class="power-sheet" role="dialog" aria-modal="true" aria-label="${esc(name)}">
    <header class="pw-head"><span class="pw-big"><img src="${esc(p.icon)}" alt=""></span>
      <div><h3>${esc(name)}</h3><p>${esc(t('power.of', { name: who }))}</p></div></header>
    <dl class="pw-rows">
      <div><dt>${esc(t('power.effect'))}</dt><dd>${esc(ability)}</dd></div>
      <div><dt>${esc(t('power.cooldown'))}</dt><dd>${esc(t('power.cooldownLine', { n: cd }))}${k === 'guard' ? '' : esc(t('power.moraleLine', { n: BATTLE.crewMorale }))}</dd></div>
      ${role ? `<div><dt>${esc(t('power.job'))}</dt><dd>${p.jobIcon ? `<img class="pw-job" src="${esc(p.jobIcon)}" alt="">` : ''}<b>${esc(role.name)}</b><br>${esc(role.benefit)}<br><small>${esc(role.cost)}</small></dd></div>` : ''}
    </dl>
    <footer class="pw-foot"><button type="button" data-power-close>${esc(t('power.close'))}</button>${buttons}</footer>
  </div>`;
}
