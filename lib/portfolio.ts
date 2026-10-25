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
  ["Offer", "合同会社DMM.com / 27卒"],
  ["Internship", "Sky株式会社 / 2025年3月 - 現在"],
];

export const techGroups = [
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

export const career = [
  {
    period: "2027卒",
    title: "合同会社DMM.com",
    description: "27卒 Webフロントエンドエンジニアとして内定。",
    tags: ["Offer"],
  },
  {
    period: "2026.04",
    title: "We部 community",
    prefix: "神戸電子専門学校非公認",
    suffix: "",
    description: "実務インターン合格をサポートするコミュニティを立ち上げ。",
    tags: ["Community", "Internship Support"],
  },
  {
    period: "2025.03 - 現在",
    title: "Sky株式会社",
    description: "社内システム部 労務管理チームに配属。",
    tags: ["長期インターン", "Next.js", "BFF", "NestJS"],
  },
  {
    period: "在学中",
    title: "神戸電子専門学校",
    prefix: "",
    suffix: "ITエキスパート学科",
    description: "機械学習やスクラム開発の手法について学習。",
    tags: ["Student", "Engineering", "Machine Learning", "Scrum"],
  },
];

export const careerGroups = [
  { id: 'experience', title: '実務経験・活動', items: [career[2], career[1]] },
  { id: 'history', title: '学歴・社歴', items: [
    { period: '高校', title: profile.find(([label]) => label === 'High School')![1],
      description: '出身高校。', tags: ['High School'] },
    career[3], career[0],
  ] },
];
