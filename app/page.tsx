const socials = [
  {
    label: "GitHub",
    href: "https://github.com/rion0918",
    display: "github.com/rion0918",
  },
  {
    label: "Zenn",
    href: "https://zenn.dev/riozenn",
    display: "zenn.dev/riozenn",
  },
  {
    label: "X",
    href: "https://x.com/rioi7_0918",
    display: "x.com/rioi7_0918",
  },
];

const profile = [
  ["Name", "橋本怜苑 / Rion Hashimoto"],
  ["Age", "22"],
  ["School", "神戸電子専門学校"],
  ["High School", "上宮高等学校"],
  ["Offer", "合同会社DMM.com / 27卒"],
  ["Internship", "Sky株式会社 / 2025年3月 - 現在"],
];

const techGroups = [
  {
    title: "Language",
    items: ["TypeScript", "Python", "Go"],
  },
  {
    title: "Framework",
    items: ["Next.js", "React", "NestJS", "Storybook", "Jest"],
  },
  {
    title: "DataBase",
    items: ["MySQL", "PostgreSQL", "SQLite", "Redis"],
  },
  {
    title: "Cloud",
    items: ["AWS", "MinIO"],
  },
  {
    title: "Middleware",
    items: ["Docker"],
  },
  {
    title: "Other",
    items: [
      "Git",
      "GitHub Actions",
      "GraphQL",
      "gRPC",
      "REST",
      "Microservices Architecture",
    ],
  },
];

const career = [
  {
    period: "2027卒",
    title: "合同会社DMM.com",
    description: "27卒として内定。",
    tags: ["Offer"],
  },
  {
    period: "2026.04",
    title: (
      <>
        <small>神戸電子専門学校非公認</small>
        We部
      </>
    ),
    description: "実務インターン合格をサポートするコミュニティを立ち上げ。",
    tags: ["Community", "Internship Support"],
  },
  {
    period: "2025.03 - 現在",
    title: "Sky株式会社",
    description: "Webアプリケーション開発に参加。",
    tags: ["長期インターン", "Next.js", "React", "NestJS"],
  },
  {
    period: "在学中",
    title: (
      <>
        神戸電子専門学校
        <small>ITエキスパート学科</small>
      </>
    ),
    description: "Web開発を中心に学習。",
    tags: ["Student", "Engineering"],
  },
];

const sections = [
  ["01", "About", "#about"],
  ["02", "Tech Stack", "#tech"],
  ["03", "Career", "#career"],
  ["04", "Social", "#social"],
];

export default function Home() {
  return (
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
              <a key={social.label} href={social.href} target="_blank">
                {social.label}
              </a>
            ))}
          </nav>
        </header>

        <section className="section about" id="about" aria-label="About">
          <div className="sectionHead">
            <span>01</span>
            <h2>About</h2>
          </div>
          <div className="aboutGrid">
            {profile.map(([label, value]) => (
              <article key={label} className="factRow">
                <p>{label}</p>
                <h3>{value}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="tech" aria-label="Tech Stack">
          <div className="sectionHead">
            <span>02</span>
            <h2>Tech Stack</h2>
          </div>
          <div className="techGrid">
            {techGroups.map((group) => (
              <article key={group.title} className="techGroup">
                <h3>{group.title}</h3>
                <div className="pillList">
                  {group.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="career" aria-label="Career">
          <div className="sectionHead">
            <span>03</span>
            <h2>Career</h2>
          </div>
          <div className="careerFlow">
            {career.map((item, index) => (
              <article key={item.period} className="careerItem">
                <div className="flowMeta">
                  <span>{String(career.length - index).padStart(2, "0")}</span>
                  <time>{item.period}</time>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="miniTags">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section social" id="social" aria-label="Social">
          <div className="sectionHead">
            <span>04</span>
            <h2>Social</h2>
          </div>
          <div className="socialList">
            {socials.map((social) => (
              <a key={social.label} href={social.href} target="_blank">
                <span>{social.label}</span>
                <small>{social.display}</small>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
