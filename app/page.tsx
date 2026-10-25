import WorldExperience from "../components/world/WorldExperience";
import { AboutContent, TechContent, CareerContent, SocialContent } from "../components/PortfolioContent";
import { HallContent } from "../components/HallContent";
import { halls } from "../lib/world-halls";
import { createWorldMapData } from "../lib/world-map-data";

export default function Home() {
  return <WorldExperience
    map={createWorldMapData()}
    hallPanels={Object.fromEntries(halls.map(h => [h.id, <HallContent key={h.id} id={h.id} />]))}
    panels={{
      about: <><AboutContent /><h3 className="panelSectionTitle">技術スタック</h3><TechContent /><h3 className="panelSectionTitle">外部リンク</h3><SocialContent /></>,
      tech: <TechContent />,
      career: <CareerContent />,
      social: <SocialContent />,
    }}
  />;
}
