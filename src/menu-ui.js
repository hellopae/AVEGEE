// Presentation helpers only: inventory and battle rules remain in game.js.
export const BAG_SECTIONS = ['items', 'outfits', 'weapons'];
export const PROFILE_SECTIONS = ['status', 'powers', 'bag', 'crew'];
export function carriedItems(inventory, definitions, filter = 'all') {
  return Object.entries(inventory || {}).filter(([key, count]) => {
    const item = definitions[key];
    return item && count > 0 && (filter === 'all' ||
      (filter === 'recovery' && !!(item.hp || item.hpRatio || item.mp || item.mpRatio)) ||
      (filter === 'material' && !!item.material) ||
      (filter === 'other' && !item.material && !(item.hp || item.hpRatio || item.mp || item.mpRatio)));
  });
}
// Compare the additive normal-attack bonus, not damage or special-effect strength.
export function weaponBonusComparison(weapons, equipped, candidate) {
  const current = Math.round((weapons[equipped]?.atk || 0) * 100);
  const next = Math.round((weapons[candidate]?.atk || 0) * 100);
  return { current, next, delta:next - current };
}

// Roving focus is shared by inventory and profile tabs. Panels keep stable IDs.
export function bindMenuTabs(root, selector, activate) {
  const buttons = [...root.querySelectorAll(selector)];
  buttons.forEach((button, index) => {
    button.onclick = () => activate(button.dataset.menuTab);
    button.onkeydown = event => {
      const offsets = { ArrowRight:1, ArrowLeft:-1 };
      let next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : event.key in offsets ? (index + offsets[event.key] + buttons.length) % buttons.length : null;
      if (next === null) return;
      event.preventDefault();
      activate(buttons[next].dataset.menuTab);
      buttons[next].focus();
    };
  });
}
