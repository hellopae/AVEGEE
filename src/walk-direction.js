// Screen-space movement: retain the last facing at rest and at exact diagonals.
export function walkDirection(dx, dy, previous = 'down') {
  if (Math.hypot(dx, dy) <= .15) return previous;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  if (Math.abs(dy) > Math.abs(dx)) return dy < 0 ? 'up' : 'down';
  return previous;
}
