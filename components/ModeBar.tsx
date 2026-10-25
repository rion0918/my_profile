"use client";

import Link from "next/link";
import { welcomeStorageKey } from "../lib/world-zones";

export function rememberWorldModeChoice() {
  try {
    window.sessionStorage.setItem(welcomeStorageKey, "seen");
  } catch {
    /* Optional storage. */
  }
}

export function ModeBar({ mode }: { mode: "world" | "profile" }) {
  return (
    <header className={`modeBar ${mode === "world" ? "modeBarDark" : ""}`}>
      {mode !== "world" && <Link className="wordmark" href="/profile#top" aria-label="RH Rion Hashimoto ホーム">
        RH{" "}<span>Rion Hashimoto</span>
      </Link>}
      <nav className="modeSwitch" aria-label="表示モード">
        {mode === "world" ? (
          <span aria-current="page">3Dワールド</span>
        ) : (
          <Link href="/" onNavigate={rememberWorldModeChoice}>3Dワールド</Link>
        )}
        {mode === "profile" ? (
          <span aria-current="page">通常表示</span>
        ) : (
          <Link href="/profile" onNavigate={rememberWorldModeChoice}>通常表示</Link>
        )}
      </nav>
    </header>
  );
}
