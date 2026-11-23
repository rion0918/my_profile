import { loadWalkerBytes } from "./world-character-asset";
import { loadWorldMap } from "./world-map-loader";

let pending: Promise<unknown> | undefined;

export function preloadWorld() {
  pending ??= Promise.all([
    import("../components/world/WorldApp"),
    import("../components/world/WorldCanvas"),
    loadWorldMap(),
    loadWalkerBytes(),
  ]).catch(() => { pending = undefined; });
  return pending;
}
