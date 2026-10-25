import type { WorldMapData } from "./world-map-data";

let pending: Promise<WorldMapData> | undefined;

export function loadWorldMap(): Promise<WorldMapData> {
  pending ??= fetch("/world-map.json", { cache: "no-cache", priority: "low" })
    .then(response => {
      if (!response.ok) throw new Error(`World map: ${response.status}`);
      return response.json() as Promise<WorldMapData>;
    })
    .catch(error => { pending = undefined; throw error; });
  return pending;
}
