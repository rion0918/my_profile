import { SectionPage, sectionMetadata } from "../../components/SectionPage";

export const metadata = sectionMetadata("about");

export default function Page() {
  return <SectionPage section="about" />;
}
