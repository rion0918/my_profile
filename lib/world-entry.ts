type Point = { x: number; z: number };
type Building = {
  id: string;
  entry: Point & { width: number; inside: Point; outside: Point };
};
export function createEntryController(buildings: Building[]) {
  let previous: Point | null = null;
  let active: Building | null = null;
  let suppressed: Building | null = null;
  let airborneCrossing: Building | null = null;
  return {
    update(point: Point, grounded = true): string | null {
      if (airborneCrossing &&
        (Math.abs(point.x - airborneCrossing.entry.x) >= airborneCrossing.entry.width / 2 - 0.32 ||
          point.z > airborneCrossing.entry.z - 0.4 || point.z < airborneCrossing.entry.z - 1.2))
        airborneCrossing = null;
      if (
        suppressed &&
        (Math.abs(point.x - suppressed.entry.x) > 2.4 ||
          Math.abs(point.z - suppressed.entry.z) > 3)
      )
        suppressed = null;
      const crossed =
        !active &&
        previous &&
        buildings.find(
          (b) =>
            b !== suppressed &&
            Math.abs(point.x - b.entry.x) < b.entry.width / 2 - 0.32 &&
            Math.abs(previous!.x - b.entry.x) < b.entry.width / 2 &&
            previous!.z > b.entry.z - 0.4 &&
            point.z <= b.entry.z - 0.4 &&
            point.z >= b.entry.z - 1.2,
        );
      previous = { x: point.x, z: point.z };
      if (crossed) airborneCrossing = crossed;
      if (!active && grounded && airborneCrossing) {
        active = airborneCrossing;
        airborneCrossing = null;
        return active.id;
      }
      return null;
    },
    close(): Point | null {
      if (!active) return null;
      const outside = { ...active.entry.outside };
      suppressed = active;
      active = null;
      previous = outside;
      return outside;
    },
  };
}
