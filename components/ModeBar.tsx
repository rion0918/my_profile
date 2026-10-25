"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { welcomeStorageKey } from "../lib/world-zones";

export function rememberWorldModeChoice() {
  try {
    window.sessionStorage.setItem(welcomeStorageKey, "seen");
  } catch {
    /* Optional storage. */
  }
}

const readingPositionKey = "portfolio-reading-position";

export function enterWorld() {
  rememberWorldModeChoice();
  try {
    sessionStorage.setItem(readingPositionKey, JSON.stringify({
      href: location.pathname + location.search + location.hash,
      y: window.scrollY,
    }));
  } catch { /* Optional storage. */ }
}

export function ModeBar({ mode }: { mode: "world" | "profile" }) {
  const [readingHref, setReadingHref] = useState("/");
  useEffect(() => {
    let frame = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(readingPositionKey) || "null");
      if (saved?.href?.startsWith("/") && !saved.href.startsWith("//")) {
        if (mode === "world") setReadingHref(saved.href);
        else if (saved.href === location.pathname + location.search + location.hash && Number.isFinite(saved.y)) {
          frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => window.scrollTo({ top: saved.y, behavior: "instant" }));
          });
        }
      }
    } catch { /* Optional storage. */ }
    return () => cancelAnimationFrame(frame);
  }, [mode]);
  return (
    <header className={`modeBar ${mode === "world" ? "modeBarDark" : ""}`}>
      {mode !== "world" && <Link className="wordmark" href="/#top" aria-label="RH Rion Hashimoto ホーム">
        RH{" "}<span>Rion Hashimoto</span>
      </Link>}
      <nav className="modeSwitch" aria-label="表示モード">
        {mode === "world" ? (
          <span aria-current="page">3Dワールド</span>
        ) : (
          <Link href="/?mode=world" prefetch={false} onNavigate={enterWorld}>3Dワールド</Link>
        )}
        {mode === "profile" ? (
          <span aria-current="page">通常表示</span>
        ) : (
          <Link href={readingHref} scroll={false} onNavigate={rememberWorldModeChoice}>通常表示</Link>
        )}
      </nav>
    </header>
  );
}
