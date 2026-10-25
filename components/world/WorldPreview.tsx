"use client";

import Link from "next/link";
import { useEffect } from "react";
import { enterWorld } from "../ModeBar";
import { preloadWorld } from "../../lib/world-preload";

export default function WorldPreview() {
  useEffect(() => {
    let cancel = () => {};
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(() => void preloadWorld(), { timeout: 3000 });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(() => void preloadWorld(), 800);
        cancel = () => clearTimeout(id);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => { window.removeEventListener("load", schedule); cancel(); };
  }, []);

  return <Link className="worldPreview" href="/?mode=world" aria-label="3Dの街を歩く" prefetch={false} onNavigate={enterWorld}
    onMouseEnter={() => void preloadWorld()} onFocus={() => void preloadWorld()}>
    <img src="/images/world-preview.jpg" width="660" height="408" alt="作品の館や温泉が並ぶ3Dの街" />
    <span className="worldPreviewCopy"><strong>3Dの街を歩く</strong><span>作品の展示や、温泉のある街を探索できます。</span></span>
    <span className="worldPreviewArrow" aria-hidden="true">→</span>
  </Link>;
}
