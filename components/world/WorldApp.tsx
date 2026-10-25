"use client";

import { useEffect, useState } from "react";
import { AboutContent, TechContent, CareerContent, SocialContent } from "../PortfolioContent";
import { HallContent } from "../HallContent";
import { halls } from "../../lib/world-halls";
import { loadWorldMap } from "../../lib/world-map-loader";
import type { WorldMapData } from "../../lib/world-map-data";
import WorldExperience from "./WorldExperience";

const hallPanels = Object.fromEntries(halls.map(hall => [hall.id, <HallContent key={hall.id} id={hall.id} />]));
const panels = {
  about: <><AboutContent /><h3 className="panelSectionTitle">技術スタック</h3><TechContent /><h3 className="panelSectionTitle">外部リンク</h3><SocialContent /></>,
  tech: <TechContent />,
  career: <CareerContent />,
  social: <SocialContent />,
};

export default function WorldApp() {
  const [map, setMap] = useState<WorldMapData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadWorldMap().then(data => { if (active) setMap(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  return <WorldExperience map={map} mapFailed={failed} hallPanels={hallPanels} panels={panels} />;
}
