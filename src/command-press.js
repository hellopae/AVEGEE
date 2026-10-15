// Keep the original button as the pointer target while async sprite/menu placement
// completes. Activation remains native click only (also supports keyboard/AT).
export function bindCommandPress(root) {
  if (!root) return;
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const button = event.target.closest('button, [data-foe-id], [data-crew-pick]');
    if (!button || !root.contains(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    try { button.setPointerCapture(event.pointerId); } catch { /* Pointer already released/cancelled. */ }
  }, true);
}
