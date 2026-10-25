"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import type WorldExperience from "./world/WorldExperience";

const World = dynamic(() => import("./world/WorldExperience"), {
  ssr: false,
  loading: () => <div className="worldLoading" role="status">街を準備しています</div>,
});

export default function HomeView({ profile, worldProps }: {
  profile: ReactNode;
  worldProps: ComponentProps<typeof WorldExperience>;
}) {
  const query = useSearchParams();
  return query.get("mode") === "world" || query.has("detail") ? <World {...worldProps} /> : profile;
}
