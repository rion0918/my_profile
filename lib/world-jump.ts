export function createJumpController() {
  let height = 0;
  let velocity = 0;
  let airborne = false;
  return {
    get height() { return height; },
    get airborne() { return airborne; },
    start() {
      if (airborne) return false;
      velocity = 4.9;
      airborne = true;
      return true;
    },
    update(delta: number) {
      if (!airborne || delta <= 0) return;
      height += velocity * delta - 7 * delta * delta;
      velocity -= 14 * delta;
      if (height <= 0) {
        height = 0;
        velocity = 0;
        airborne = false;
      }
    },
    reset() {
      height = 0;
      velocity = 0;
      airborne = false;
    },
  };
}
