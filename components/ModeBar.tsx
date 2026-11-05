"use client";

import { useEffect, useState } from "react";
import { readingPosition, rememberWorldModeChoice } from "../lib/reading-position";

export function ModeBar({ mode }: { mode: "world" | "profile" }) {
  const [readingHref, setReadingHref] = useState("/");
  useEffect(() => {
    let frame = 0;
    try {
      const saved = readingPosition();
      if (saved) {
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
      {mode !== "world" && <a className="wordmark" href="/#top" aria-label="RH Rion Hashimoto ホーム">
        RH{" "}<span>Rion Hashimoto</span>
      </a>}
      <nav className="modeSwitch" aria-label="表示モード">
        {mode === "world" ? (
          <span aria-current="page">3Dワールド</span>
        ) : (
          <a href="/world" data-world-entry>3Dワールド</a>
        )}
        {mode === "profile" ? (
          <span aria-current="page">通常表示</span>
        ) : (
          <a href={readingHref} onClick={rememberWorldModeChoice}>通常表示</a>
        )}
      </nav>
    </header>
  );
}
