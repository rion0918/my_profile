import { benches, buildings, entranceGardens, hallIconSites, isOnRoad, landmark, lightSupports, ponds, projectExhibits, streetlights } from './world-layout.ts';
import { bikeStation } from './world-bike.ts';
import { gamingPC } from './world-gaming-pc.ts';
import { pastaKitchen } from './world-pasta.ts';
import { getHarborDeckHeight } from './world-harbor.ts';
import { isOnsenClearing } from './world-onsen.ts';
import { isWildlifeClearing } from './world-wildlife.ts';
import { distanceToShore } from './world-navigation.ts';
import { meadowAttempts, visitMeadow } from './world-meadow.ts';

export function buildMeadowMask() {
  const landmarkCos = Math.cos(landmark.rotation),
    landmarkSin = Math.sin(landmark.rotation);
  const furniturePads = [{ ...gamingPC, rotation: 0 }, gamingPC.specBoard, { ...pastaKitchen, rotation: 0 }, ...hallIconSites, ...entranceGardens.map(p => ({ ...p, rotation: 0, width: p.radius * 2, depth: p.radius * 2 })), ...benches, ...streetlights, ...projectExhibits].map((p) => ({
    ...p, c: Math.cos(p.rotation), s: Math.sin(p.rotation),
  }));
  const mask = new Uint8Array(Math.ceil(meadowAttempts / 8));
  let length = 0;
  visitMeadow((attempt, x, z) => {
    if (
      Math.hypot(x, z) < 4 ||
      ponds.some(
        (p) =>
          Math.abs(x - p.x) < p.width / 2 + 0.5 &&
          Math.abs(z - p.z) < p.depth / 2 + 0.5,
      )
    )
      return false;
    if (
      buildings.some(
        (b) =>
          Math.abs(x - b.x) < b.width / 2 + 0.45 &&
          Math.abs(z - b.z) < b.depth / 2 + 0.6,
      )
    )
      return false;
    if (Math.abs(x - bikeStation.x) < bikeStation.width / 2 + 0.1 && Math.abs(z - bikeStation.z) < bikeStation.depth / 2 + 0.1) return false;
    const localX = (x - landmark.x) * landmarkCos - (z - landmark.z) * landmarkSin,
      localZ = (x - landmark.x) * landmarkSin + (z - landmark.z) * landmarkCos;
    if (
      (localX / (landmark.width / 2 + 0.1)) ** 2 +
      (localZ / (landmark.depth / 2 + 0.1)) ** 2 < 1
    ) return false;
    if (furniturePads.some((p) =>
      Math.abs((x - p.x) * p.c - (z - p.z) * p.s) < p.width / 2 + 0.15 &&
      Math.abs((x - p.x) * p.s + (z - p.z) * p.c) < p.depth / 2 + 0.15) ||
      lightSupports.some((p) => Math.hypot(x - p.x, z - p.z) < 0.35)) return false;
    if (isWildlifeClearing({ x, z })) return false;
    if (getHarborDeckHeight({ x, z }, -0.2) !== null) return false;
    if (isOnsenClearing({ x, z }, .15)) return false;
    if (distanceToShore({ x, z }) > -3.5) return false;
    if (isOnRoad({ x, z }, 0.35)) return false;
    const byte = attempt >> 3;
    mask[byte] |= 1 << (attempt & 7);
    length = byte + 1;
    return true;
  });
  return Buffer.from(mask.subarray(0, length)).toString('base64');
}
