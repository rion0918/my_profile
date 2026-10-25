export const socials = [
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

export const profile = [
  ["Name", "橋本怜苑 / Rion Hashimoto"],
  ["Age", "22"],
  ["School", "神戸電子専門学校"],
  ["High School", "上宮高等学校"],
  ["Offer", "合同会社DMM.com / 27卒 Webエンジニア内定"],
  ["Internship", "Sky株式会社 / 2025年3月 - 2026年8月"],
];

export const techGroups = [
  {
    title: "Language",
    items: ["TypeScript", "Python", "Go"],
  },
  {
    title: "Framework",
    items: ["Next.js", "React", "Three.js", "NestJS", "Storybook", "Jest"],
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

export const career = [
  {
    period: "2027卒",
    title: "合同会社DMM.com",
    description: "27卒 Webエンジニアとして内定。",
    tags: ["Offer"],
  },
  {
    period: "2026.04",
    title: "We部 community",
    prefix: "神戸電子専門学校非公認",
    suffix: "",
    description: "実務インターン合格をサポートするコミュニティを立ち上げ。",
    tags: ["Community", "Internship Support"],
    links: [
      { label: "We部の公式サイト", href: "https://join.web-u.dev/" },
      { label: "神戸電子の紹介記事", href: "https://www.kobedenshi.ac.jp/media/article/career_advice/746/" },
    ],
  },
  {
    period: "2025.03 - 2026.08",
    title: "Sky株式会社",
    description: "社内システム部 労務管理チームに配属。",
    tags: ["長期インターン", "Next.js", "BFF", "NestJS"],
  },
  {
    period: "2023 - 2027（在学中）",
    title: "神戸電子専門学校",
    prefix: "",
    suffix: "ITエキスパート学科",
    description: "機械学習やスクラム開発の手法について学習。",
    tags: ["Student", "Engineering", "Machine Learning", "Scrum"],
  },
];

export const careerGroups = [
  { id: 'experience', title: '実務経験・活動', items: [career[2], career[1]] },
  { id: 'history', title: 'Background', items: [
    { period: '2019 - 2022', title: profile.find(([label]) => label === 'High School')![1],
      description: '出身高校。', tags: ['High School'] },
    career[3], career[0],
  ] },
];
