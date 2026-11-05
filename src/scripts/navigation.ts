import { navigate } from "astro:transitions/client";
import type { TransitionBeforeSwapEvent } from "astro:transitions/client";
import { enterWorld, readingPosition } from "../../lib/reading-position";

function worldLink(event: Event) {
  return event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-world-entry]") : null;
}

function prefetch(event: Event) {
  if (!worldLink(event)) return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
  void import("../../lib/world-preload").then(module => module.preloadWorld()).catch(() => {});
}

document.addEventListener("pointerover", prefetch, { passive: true });
document.addEventListener("focusin", prefetch);
document.addEventListener("click", event => {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && worldLink(event)) enterWorld();
}, { capture: true });

// A meta policy remains enforced for the lifetime of a document. Keep the same
// build-wide script hashes when ClientRouter swaps in another static page.
document.addEventListener("astro:before-swap", event => {
  const incoming = (event as TransitionBeforeSwapEvent).newDocument;
  const policy = document.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]');
  const next = incoming.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]');
  if (policy && next) next.content = policy.content;
});

document.addEventListener("astro:page-load", () => {
  const query = new URLSearchParams(location.search);
  if (location.pathname === "/" && (query.get("mode") === "world" || query.has("detail"))) {
    const anchor = ["#about", "#tech", "#career", "#social", "#products", "#top"].includes(location.hash);
    void navigate(anchor ? `/profile${location.hash}` : `/world${location.search}${location.hash}`, { history: "replace" });
    return;
  }
  if (location.pathname === "/world") return;
  const saved = readingPosition();
  if (saved?.href === location.pathname + location.search + location.hash) {
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: saved.y, behavior: "instant" })));
  }
});
