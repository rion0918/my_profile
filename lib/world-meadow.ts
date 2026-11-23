// Each candidate consumes two random numbers for its position. Only planted
// candidates consume the next four for size and rotation, in both build and play.
export const meadowCapacity = 22000;
export const meadowAttempts = 80000;
export function visitMeadow(
  accept: (attempt: number, x: number, z: number) => boolean,
  plant?: (index: number, x: number, z: number, size: number, rx: number, ry: number, rz: number) => void,
) {
  let seed = 1568310018;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let count = 0;
  for (let attempt = 0; attempt < meadowAttempts && count < meadowCapacity; attempt++) {
    const x = (random() - .5) * 86, z = (random() - .5) * 76;
    if (!accept(attempt, x, z)) continue;
    const size = .6 + random() * .9;
    const rx = (random() - .5) * .25, ry = random() * 6, rz = (random() - .5) * .25;
    plant?.(count, x, z, size, rx, ry, rz);
    count++;
  }
  return { count, seed };
}
