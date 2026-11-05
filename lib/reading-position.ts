const readingPositionKey = "portfolio-reading-position";
import { welcomeStorageKey } from "./world-zones.ts";

export function rememberWorldModeChoice() {
  try { sessionStorage.setItem(welcomeStorageKey, "seen"); } catch { /* Optional storage. */ }
}

export function enterWorld() {
  rememberWorldModeChoice();
  try {
    sessionStorage.setItem(readingPositionKey, JSON.stringify({
      href: location.pathname + location.search + location.hash,
      y: window.scrollY,
    }));
  } catch { /* Optional storage. */ }
}

export function readingPosition(): { href: string; y: number } | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(readingPositionKey) || "null");
    if (typeof saved?.href !== "string" || !saved.href.startsWith("/")) return null;
    const url = new URL(saved.href, location.origin);
    if (url.origin !== location.origin || url.pathname === "/world" || url.searchParams.has("detail") || url.searchParams.get("mode") === "world") return null;
    if (!Number.isFinite(saved.y) || saved.y < 0) return null;
    return { href: url.pathname + url.search + url.hash, y: saved.y };
  } catch { return null; }
}
