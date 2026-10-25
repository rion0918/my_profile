import {
  AboutContent,
  TechContent,
  CareerContent,
  SocialContent,
} from "./PortfolioContent";
import { ModeBar } from "./ModeBar";
import { sections } from "../lib/sections";

const content = {
  about: AboutContent,
  tech: TechContent,
  career: CareerContent,
  social: SocialContent,
};
type Section = keyof typeof content;

export function sectionMetadata(section: Section) {
  return {
    title: `${sections.find((item) => item.id === section)?.title} | 橋本怜苑`,
  };
}

export function SectionPage({ section }: { section: Section }) {
  const Content = content[section];
  return (
    <>
      <ModeBar mode="profile" />
      <main className="detailPage">
        <a className="textLink" href={`/profile#${section}`}>
          ← プロフィール一覧
        </a>
        <h1>{sections.find((item) => item.id === section)?.title}</h1>
        <Content />
      </main>
    </>
  );
}
