"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

const World = dynamic(() => import("./world/WorldApp"), {
  ssr: false,
  loading: () => <div className="worldLoading" role="status">街を準備しています</div>,
});

export default function HomeView({ profile }: {
  profile: ReactNode;
}) {
  const query = useSearchParams();
  return query.get("mode") === "world" || query.has("detail") ? <World /> : profile;
}
