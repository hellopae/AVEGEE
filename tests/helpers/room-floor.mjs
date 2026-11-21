// Works with both rectangular and polygon walk areas in station rooms.
export function onRoomFloor(walk, [x, y]) {
  if (typeof walk[0] === 'number') {
    const [left, top, right, bottom] = walk;
    return x >= left && x <= right && y >= top && y <= bottom;
  }
  return walk.some(({poly}) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[j], [bx, by] = poly[i];
      if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
    }
    return inside;
  });
}
