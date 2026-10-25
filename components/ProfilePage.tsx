import { socials } from "../lib/portfolio";
import {
  AboutContent,
  TechContent,
  CareerContent,
  SocialContent,
} from "./PortfolioContent";
import { ProductList } from "./ProductContent";
import { ModeBar } from "./ModeBar";
import WorldPreview from "./world/WorldPreview";

const sections = [
  ["01", "About", "#about"],
  ["02", "Tech Stack", "#tech"],
  ["03", "Career", "#career"],
  ["04", "Social", "#social"],
  ["05", "Products", "#products"],
];

export default function ProfilePage() {
  return (
    <>
      <ModeBar mode="profile" />
      <main>
        <aside className="sideIndex" aria-label="ページ内ナビゲーション">
          {sections.map(([number, label, href]) => (
            <a key={label} href={href}>
              <span>{number}</span>
              {label}
            </a>
          ))}
        </aside>

        <div className="pageShell">
          <header className="profileHeader" id="top">
            <a className="avatar" href="#top" aria-label="ページトップ">
              <img
                src="/images/33CEE35D-5EBF-4A83-BAC5-3669ACB35CB2.JPG"
                alt="橋本怜苑のプロフィール写真"
              />
            </a>
            <div className="identity">
              <p className="jpName">橋本怜苑</p>
              <h1>Rion Hashimoto</h1>
              <p className="role">学生エンジニア</p>
            </div>
            <nav aria-label="外部リンク">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.label}
                </a>
              ))}
            </nav>
          </header>

          <WorldPreview />

          <section className="section about" id="about" aria-label="About">
            <div className="sectionHead">
              <span>01</span>
              <h2>About</h2>
            </div>
            <AboutContent />
          </section>

          <section className="section" id="tech" aria-label="Tech Stack">
            <div className="sectionHead">
              <span>02</span>
              <h2>Tech Stack</h2>
            </div>
            <TechContent />
          </section>

          <section className="section" id="career" aria-label="Career">
            <div className="sectionHead">
              <span>03</span>
              <h2>Career</h2>
            </div>
            <CareerContent />
          </section>

          <section className="section social" id="social" aria-label="Social">
            <div className="sectionHead">
              <span>04</span>
              <h2>Social</h2>
            </div>
            <SocialContent />
          </section>
          <section className="section" id="products" aria-label="Products">
            <div className="sectionHead">
              <span>05</span>
              <h2>Products</h2>
            </div>
            <ProductList />
          </section>
        </div>
      </main>
    </>
  );
}
