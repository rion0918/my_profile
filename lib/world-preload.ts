import { products } from "./products";

let pending: Promise<unknown> | undefined;

export function preloadWorld() {
  pending ??= Promise.all([
    import("../components/world/WorldExperience"),
    import("../components/world/WorldCanvas"),
    ...[
      "/models/rion-walker.glb",
      "/textures/onsen/stone-color.webp",
      "/textures/onsen/stone-normal.webp",
      "/textures/onsen/stone-arm.webp",
      "/images/brands/github-invertocat-white.png",
      "/images/brands/zenn-mark.png",
      "/images/brands/x-logo-white.png",
      ...products.flatMap(product => product.media?.[0] ? [product.media[0].src] : []),
    ].map(url => fetch(url, { cache: "force-cache", priority: "low" })),
  ]).catch(() => { pending = undefined; });
  return pending;
}
