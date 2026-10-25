import type { HallId } from "./world-halls.ts";

export type WorldNavigation = {
  walkTo: (id: string) => void;
  explore: () => void;
  focusTo: (id: HallId | "fork") => Promise<boolean>;
  cancelFocus: () => void;
  position: { x: number; z: number };
};

export function mapPoint(point: { x: number; z: number }) {
  return { x: (point.x + 48) / 96 * 100, y: (point.z + 51) / 94 * 100 };
}
